// src/Screens/ScoreUpdate.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Avatar,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BoltIcon from "@mui/icons-material/Bolt";

import config from "../config.json";

const API_BASE = config.apiBase;
const defaultForm = {
  id: null,
  participent_name: "",
  cycle_no: "",
  power: "",
  voltage: "",
  amperage: "",
};

function ManualScoring() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/participant-cycles/`);
      const data = await res.json();
      setAllocations(data.data || []);
    } catch (err) {
      console.error("Error fetching allocations:", err);
      alert("Failed to load participant data.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (row) => {
    setForm({
      id: row.id,
      participent_name: row.participent_name,
      cycle_no: row.cycle_no,
      power: "",
      voltage: "",
      amperage: "",
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setForm(defaultForm);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async () => {
    const finalPattern = /^\d{1,3}(\.\d{1,2})?$/;
    const fields = ["power", "voltage", "amperage"];
    for (const field of fields) {
      if (form[field] !== "" && !finalPattern.test(form[field])) {
        setErrors((prev) => ({
          ...prev,
          [field]: "Enter a valid number (up to 999.99).",
        }));
        return;
      }
    }
    if (Object.values(errors).some(Boolean)) {
      alert("Please correct the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      if (form.power !== "") payload.power = parseFloat(form.power);
      if (form.voltage !== "") payload.voltage = parseFloat(form.voltage);
      if (form.amperage !== "") payload.amperage = parseFloat(form.amperage);

      const res = await fetch(
        `${API_BASE}/api/admin/participant-cycles/${form.id}/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.status) {
        alert(data.message || "Failed to update scores.");
        return;
      }
      handleClose();
      fetchAllocations();
    } catch (err) {
      console.error("Error updating scores:", err);
      alert("Error updating scores.");
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
        minWidth: 140,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 1 }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 13, flexShrink: 0 }}>
              {params.value?.[0]?.toUpperCase() || "P"}
            </Avatar>
            <span>{params.value}</span>
          </Box>
        ),
      },
      {
        field: "cycle_no",
        headerName: "Cycle No",
        width: 110,
      },
      {
        field: "controller_no",
        headerName: "Controller No",
        width: 130,
      },
      {
        field: "total_power",
        headerName: "Power (W)",
        width: 100,
        renderCell: (params) => <span>{parseFloat(params.value).toFixed(2)}</span>,
      },
      {
        field: "total_voltage",
        headerName: "Voltage (V)",
        width: 100,
        renderCell: (params) => <span>{parseFloat(params.value).toFixed(2)}</span>,
      },
      {
        field: "total_amperage",
        headerName: "Amperage (A)",
        width: 110,
        renderCell: (params) => <span>{parseFloat(params.value).toFixed(2)}</span>,
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        width: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%" }}>
            <Tooltip title="Update scores">
              <Button
                variant="outlined"
                size="small"
                color="primary"
                startIcon={<EditOutlinedIcon fontSize="small" />}
                onClick={() => handleOpenEdit(params.row)}
                sx={{ height: 28, minHeight: 0, py: 0, lineHeight: 1 }}
              >
                Update
              </Button>
            </Tooltip>
          </Box>
        ),
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
        boxSizing: "border-box",
      }}
    >
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
            <Stack direction="row" alignItems="center" spacing={1}>
              <BoltIcon color="primary" sx={{ fontSize: "2rem", verticalAlign: "middle" }} />
              <Typography variant="h4" fontWeight={800}>
                Score Update
              </Typography>
            </Stack>
          }
          subheader="View and manually update power, voltage, and ampere readings per participant."
          action={loading && <CircularProgress size={20} sx={{ mt: 1, mr: 1 }} />}
          sx={{
            pb: 0,
            flexShrink: 0,
            "& .MuiCardHeader-title": { fontSize: "inherit" },
            "& .MuiCardHeader-subheader": { fontSize: 13, opacity: 0.8 },
          }}
        />
        <CardContent
          sx={{
            pt: 1,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            pb: "8px !important",
          }}
        >
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
                backgroundColor: isDark
                  ? theme.palette.background.default
                  : "#f5f5f5",
                color: theme.palette.text.primary,
                fontSize: 13,
                fontWeight: 600,
              },
              "& .MuiDataGrid-cell": {
                borderBottomColor: theme.palette.divider,
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: isDark
                  ? theme.palette.action.hover
                  : "rgba(25, 118, 210, 0.04)",
              },
              "& .MuiDataGrid-virtualScroller": {
                overflowX: "auto",
              },
            }}
          >
            <DataGrid
              rows={allocations}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10, 25]}
              columnVisibilityModel={{
                controller_no: !isMobile,
                total_voltage: !isMobile,
                total_amperage: !isMobile,
              }}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Edit Score Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ lineHeight: 1 }}>
            <BoltIcon color="primary" sx={{ fontSize: "1.1rem" }} />
            
            <Typography variant="h6" fontWeight={700}>
              Update Scores
            </Typography>
            
          </Stack>
          {form.participent_name && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {form.participent_name} — Cycle {form.cycle_no}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 1,
              mb: 1,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              textTransform: "uppercase",
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
            }}
          >
            Current Readings
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Power (W)"
              name="power"
              inputMode="decimal"
              value={form.power}
              onChange={handleChange}
              error={Boolean(errors.power)}
              helperText={errors.power}
              size="small"
              fullWidth
            />
            <TextField
              label="Voltage (V)"
              name="voltage"
              inputMode="decimal"
              value={form.voltage}
              onChange={handleChange}
              error={Boolean(errors.voltage)}
              helperText={errors.voltage}
              size="small"
              fullWidth
            />
            <TextField
              label="Amperage (A)"
              name="amperage"
              inputMode="decimal"
              value={form.amperage}
              onChange={handleChange}
              error={Boolean(errors.amperage)}
              helperText={errors.amperage}
              size="small"
              fullWidth
            />
          </Stack>
          <Divider sx={{ my: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving || Object.values(errors).some(Boolean)}
            startIcon={saving ? <CircularProgress size={14} /> : null}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ManualScoring;