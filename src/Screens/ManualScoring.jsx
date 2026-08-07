// src/Screens/ScoreUpdate.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  InputAdornment,
  Avatar,
  Typography,
  CircularProgress,
  Stack,
  Chip,
  Snackbar,
  Alert,
  Paper,
  FormHelperText,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import BoltIcon from "@mui/icons-material/Bolt";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import config from "../config.json";

const API_BASE = config.apiBase;
const NUMBER_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

function ManualScoring() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // currently active participant row
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [flashRowId, setFlashRowId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  // Uncontrolled inputs — no React state/re-render on every keystroke.
  // Values are read directly off the DOM node at submit time.
  const powerRef = useRef(null);
  const voltageRef = useRef(null);
  const amperageRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  useEffect(() => {
    fetchAllocations();
    return () => flashTimeoutRef.current && clearTimeout(flashTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/participant-cycles/`);
      const data = await res.json();
      const rows = data.data || [];
      setAllocations(rows);
      setSelected((prevSelected) => {
        if (!prevSelected) return prevSelected;
        const fresh = rows.find((r) => r.id === prevSelected.id);
        return fresh || prevSelected;
      });
    } catch (err) {
      console.error("Error fetching allocations:", err);
      showToast("Failed to load participant data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, severity = "success") =>
    setToast({ open: true, message, severity });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return allocations;
    const q = search.trim().toLowerCase();
    return allocations.filter(
      (r) =>
        r.participent_name?.toLowerCase().includes(q) ||
        String(r.cycle_no).toLowerCase().includes(q) ||
        String(r.controller_no).toLowerCase().includes(q)
    );
  }, [allocations, search]);

  const clearInputs = () => {
    if (powerRef.current) powerRef.current.value = "";
    if (voltageRef.current) voltageRef.current.value = "";
    if (amperageRef.current) amperageRef.current.value = "";
  };

  // Picking a row loads it into the quick-entry panel and focuses the first field.
  const handleSelectRow = (row) => {
    setSelected(row);
    setErrors({});
    clearInputs();
    setTimeout(() => powerRef.current?.focus(), 50);
  };

  // Clear the "invalid" state for a field the moment the user edits it again.
  const handleInput = (field) => () => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Enter moves Power -> Voltage -> Amperage -> Submit, so a whole reading can be
  // typed and saved without touching the mouse.
  const handleKeyDown = (nextRef) => (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (nextRef) {
      nextRef.current?.focus();
    } else {
      handleAddReading();
    }
  };

  const readValues = () => ({
    power: powerRef.current?.value?.trim() || "",
    voltage: voltageRef.current?.value?.trim() || "",
    amperage: amperageRef.current?.value?.trim() || "",
  });

  const validate = (values) => {
    const fields = ["power", "voltage", "amperage"];
    const nextErrors = {};
    let hasAny = false;
    for (const field of fields) {
      const val = values[field];
      if (val !== "") {
        hasAny = true;
        if (!NUMBER_PATTERN.test(val)) {
          nextErrors[field] = "Up to 999.99";
        }
      }
    }
    setErrors(nextErrors);
    if (!hasAny) {
      showToast("Enter at least one reading before adding.", "error");
      return false;
    }
    return Object.values(nextErrors).every((v) => !v);
  };

  // Adds the typed current reading on top of the participant's existing total —
  // this does NOT overwrite the total, the backend accumulates it.
  const handleAddReading = async () => {
    if (!selected) return;
    const values = readValues();
    if (!validate(values)) return;

    setSaving(true);
    try {
      const payload = {};
      if (values.power !== "") payload.power = parseFloat(values.power);
      if (values.voltage !== "") payload.voltage = parseFloat(values.voltage);
      if (values.amperage !== "") payload.amperage = parseFloat(values.amperage);

      const res = await fetch(`${API_BASE}/api/admin/participant-cycles/${selected.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.status) {
        showToast(data.message || "Failed to add reading.", "error");
        return;
      }

      // Reflect the new totals returned by the server if present, otherwise
      // optimistically add to what we already had.
      const updatedRow = data.row
        ? data.row
        : {
            ...selected,
            total_power: (parseFloat(selected.total_power) || 0) + (payload.power || 0),
            total_voltage: (parseFloat(selected.total_voltage) || 0) + (payload.voltage || 0),
            total_amperage: (parseFloat(selected.total_amperage) || 0) + (payload.amperage || 0),
          };

      setAllocations((prev) => prev.map((r) => (r.id === selected.id ? updatedRow : r)));
      setSelected(updatedRow);

      setFlashRowId(selected.id);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashRowId(null), 900);

      showToast(`Added to ${selected.participent_name}'s total.`);
      clearInputs();
      powerRef.current?.focus(); // ready for the next reading immediately
    } catch (err) {
      console.error("Error adding reading:", err);
      showToast("Error adding reading.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "participent_name",
        headerName: "Participant",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 1 }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 13, flexShrink: 0 }}>
              {params.value?.[0]?.toUpperCase() || "P"}
            </Avatar>
            <span>{params.value}</span>
          </Box>
        ),
      },
      { field: "cycle_no", headerName: "Cycle No", width: 100 },
      { field: "controller_no", headerName: "Controller No", width: 130 },
      {
        field: "total_power",
        headerName: "Total Power (W)",
        width: 130,
        renderCell: (p) => <span>{parseFloat(p.value ?? 0).toFixed(2)}</span>,
      },
      {
        field: "total_voltage",
        headerName: "Total Voltage (V)",
        width: 140,
        renderCell: (p) => <span>{parseFloat(p.value ?? 0).toFixed(2)}</span>,
      },
      {
        field: "total_amperage",
        headerName: "Total Amperage (A)",
        width: 150,
        renderCell: (p) => <span>{parseFloat(p.value ?? 0).toFixed(2)}</span>,
      },
    ],
    []
  );

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        boxSizing: "border-box",
      }}
    >
      {/* Sticky quick-entry panel — always visible, never a modal, so repeated
          entries never require opening/closing anything. */}
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          p: 2,
          flexShrink: 0,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap">
          <BoltIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>
            Add Reading
          </Typography>
          {selected ? (
            <Chip
              avatar={<Avatar>{selected.participent_name?.[0]?.toUpperCase()}</Avatar>}
              label={`${selected.participent_name} — Cycle ${selected.cycle_no}`}
              color="primary"
              variant="outlined"
              onDelete={() => {
                setSelected(null);
                setErrors({});
                clearInputs();
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select a participant below to begin
            </Typography>
          )}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
          <TextField
            inputRef={powerRef}
            label="Current Power (W)"
            defaultValue=""
            onInput={handleInput("power")}
            onKeyDown={handleKeyDown(voltageRef)}
            error={Boolean(errors.power)}
            helperText={errors.power}
            disabled={!selected || saving}
            size="small"
            fullWidth
            inputMode="decimal"
          />
          <TextField
            inputRef={voltageRef}
            label="Current Voltage (V)"
            defaultValue=""
            onInput={handleInput("voltage")}
            onKeyDown={handleKeyDown(amperageRef)}
            error={Boolean(errors.voltage)}
            helperText={errors.voltage}
            disabled={!selected || saving}
            size="small"
            fullWidth
            inputMode="decimal"
          />
          <TextField
            inputRef={amperageRef}
            label="Current Amperage (A)"
            defaultValue=""
            onInput={handleInput("amperage")}
            onKeyDown={handleKeyDown(null)}
            error={Boolean(errors.amperage)}
            helperText={errors.amperage}
            disabled={!selected || saving}
            size="small"
            fullWidth
            inputMode="decimal"
          />
          <Button
            variant="contained"
            onClick={handleAddReading}
            disabled={!selected || saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddCircleIcon />}
            sx={{ height: 40, minWidth: 140, flexShrink: 0 }}
          >
            {saving ? "Adding…" : "Add to Total"}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Tip: press Enter to jump between fields — Enter on the last field adds the reading instantly.
          Values you type here are added on top of the participant's existing total.
        </Typography>
      </Paper>

      <Card
        sx={{
          borderRadius: 3,
          boxShadow: 4,
          backgroundColor: theme.palette.background.paper,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <CardHeader
          title={
            <Typography variant="h6" fontWeight={800}>
              Participants
            </Typography>
          }
          subheader="Click a row to select that participant for the entry panel above."
          action={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 1, mt: 1 }}>
              {loading && <CircularProgress size={20} />}
              <Button
                onClick={fetchAllocations}
                disabled={loading}
                size="small"
                startIcon={<RefreshIcon fontSize="small" />}
              >
                Refresh
              </Button>
            </Stack>
          }
          sx={{
            pb: 0.5,
            flexShrink: 0,
            "& .MuiCardHeader-subheader": { fontSize: 13, opacity: 0.8 },
          }}
        />

        <Box sx={{ px: 2, pb: 1, flexShrink: 0 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Find a participant by name, cycle, or controller no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <CardContent sx={{ pt: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: 0, pb: "8px !important" }}>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              "& .MuiDataGrid-root": {
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                height: "100%",
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: isDark ? theme.palette.background.default : "#f5f5f5",
                color: theme.palette.text.primary,
                fontSize: 13,
                fontWeight: 600,
              },
              "& .MuiDataGrid-cell": { borderBottomColor: theme.palette.divider },
              "& .MuiDataGrid-row": { cursor: "pointer" },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: isDark ? theme.palette.action.hover : "rgba(25, 118, 210, 0.06)",
              },
              "& .row-selected": {
                backgroundColor: isDark ? "rgba(25, 118, 210, 0.22)" : "rgba(25, 118, 210, 0.10)",
              },
              "& .row-flash": {
                backgroundColor: isDark ? "rgba(76, 175, 80, 0.25)" : "rgba(76, 175, 80, 0.15)",
                transition: "background-color 0.4s ease",
              },
              "& .MuiDataGrid-virtualScroller": { overflowX: "auto" },
            }}
          >
            <DataGrid
              rows={filteredRows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              density="compact"
              pageSizeOptions={[10, 25, 50]}
              onRowClick={(params) => handleSelectRow(params.row)}
              getRowClassName={(params) => {
                if (params.row.id === flashRowId) return "row-flash";
                if (selected && params.row.id === selected.id) return "row-selected";
                return "";
              }}
              columnVisibilityModel={{ controller_no: !isMobile }}
              initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            />
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={toast.open}
        autoHideDuration={2000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          icon={toast.severity === "success" ? <CheckCircleIcon fontSize="small" /> : undefined}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ManualScoring;