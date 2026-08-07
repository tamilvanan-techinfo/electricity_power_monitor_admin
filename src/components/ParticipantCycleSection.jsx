// src/components/ParticipantCycleSection.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  Typography,
  TextField,
  MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/Delete";

import config from "../config.json";

const API_BASE = config.apiBase;
const MEDIA_BASE = config.apiBase;
const MEDIA_BASE = API_BASE;

function ParticipantCycleSection({refreshTrigger}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [allocations, setAllocations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [cycles, setCycles] = useState([]);

  const [form, setForm] = useState({
    id: null,
    participant: "",
    cycle: "",
    power: "",
    voltage: "",
    amperage: "",
  });

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false); // modal

  useEffect(() => {
    fetchAll();
  }, [refreshTrigger]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [allocRes, partRes, cycleRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/participant-cycles/`),
        fetch(`${API_BASE}/api/admin/participants/available/`),
        fetch(`${API_BASE}/api/admin/cycles/available`),
      ]);

      const [allocData, partData, cycleData] = await Promise.all([
        allocRes.json(),
        partRes.json(),
        cycleRes.json(),
      ]);

      setAllocations(allocData.data || []);
      setParticipants(partData.data || []);
      setCycles(cycleData.data || []);
    } catch (err) {
      console.error("Error loading participant cycles:", err);
      alert("Failed to load participant cycles or related data");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () =>
    setForm({
      id: null,
      participant: "",
      cycle: "",
      power: "",
      voltage: "",
      amperage: "",
    });

  const handleOpenAdd = () => {
    resetForm();
    setOpen(true);
  };

  const handleOpenEdit = (row) => {
    // Merge current participant into available list if not already present
    setParticipants((prev) =>
      prev.find((p) => p.id === row.participent)
        ? prev
        : [...prev, { id: row.participent, name: row.participent_name }]
    );
    // Merge current cycle into available list if not already present
    setCycles((prev) =>
      prev.find((c) => c.id === row.cycle)
        ? prev
        : [...prev, { id: row.cycle, cycle_no: row.cycle_no }]
    );
    setForm({
      id: row.id,
      participant: row.participent,
      cycle: row.cycle,
      power: row.power ?? "",
      voltage: row.voltage ?? "",
      amperage: row.amperage ?? "",
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleChange = (e) => {
    
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!form.id;
      const url = isEdit
        ? `${API_BASE}/api/admin/participant-cycles/${form.id}/`
        : `${API_BASE}/api/admin/participant-cycles/`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        participent: Number(form.participant),
        cycle: Number(form.cycle),
        power: form.power || 0.0,
        voltage: form.voltage || 0.0,
        amperage: form.amperage || 0.0,
      };

      console.log("Submitting payload:", payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("API response:", res.status, data);
      if (!res.ok || !data.status) {
        console.error(data);
        alert(data.message || "Failed to save allocation");
        return;
      }

      handleClose();
      fetchAll();
    } catch (err) {
      console.error("Error saving allocation:", err);
      alert("Error saving allocation");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this allocation?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/participant-cycles/${id}/`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        alert("Failed to delete allocation");
        return;
      }

      fetchAll();
    } catch (err) {
      console.error("Error deleting allocation:", err);
      alert("Error deleting allocation");
    }
  };

  // DataGrid columns using correct response fields
  const columns = useMemo(
    () => [
      {
        field: "participent_profile",
        headerName: "Profile",
        width: 70,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row;
          return row.participent_profile ? (
            <Avatar src={row.participent_profile} alt={row.participent_name} sx={{ width: 36, height: 36 }} />
          ) : (
            <Avatar sx={{ width: 36, height: 36 }}>
              {row.participent_name?.[0]?.toUpperCase() || "P"}
            </Avatar>
          );
        },
      },
      {
        field: "participent_name",
        headerName: "Participant",
        flex: 1,
        minWidth: 160,
      },
      {
        field: "cycle_no",
        headerName: "Cycle No",
        flex: 0.7,
        minWidth: 120,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            color="primary"
            sx={{ fontWeight: 500 }}
          />
        ),
      },
      {
        field: "controller_no",
        headerName: "Controller No",
        flex: 0.9,
        minWidth: 140,
      },
      
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        width: 200,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const row = params.row;
          return (
            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ width: "100%", height: "65%" }}>
              <Tooltip title="Edit allocation">
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  startIcon={<EditOutlinedIcon fontSize="small" />}
                  onClick={() => handleOpenEdit(row)}
                >
                  Edit
                </Button>
              </Tooltip>
              <Tooltip title="Delete allocation">
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon fontSize="small" />}
                  onClick={() => handleDelete(row.id)}
                >
                  Delete
                </Button>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    [isDark, theme.palette]
  );

  return (
    <Box sx={{ flex: 1 }}>
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: 4,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <CardHeader
          title="Participant Cycle Allocation"
          subheader="Allocate cycles to participants and track their power metrics."
          action={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: { xs: 1, sm: 0 } }}>
              {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
              >
                Allocate Cycle
              </Button>
            </Stack>
          }
          sx={{
            pb: 0,
            flexWrap: "wrap",
            "& .MuiCardHeader-action": { alignSelf: "center", mt: 0 },
            "& .MuiCardHeader-subheader": {
              fontSize: 13,
              opacity: 0.8,
            },
          }}
        />
        <CardContent sx={{ pt: 1 }}>
          <Box
            sx={{
              height: { xs: 360, sm: 420 },
              width: "100%",
              "& .MuiDataGrid-root": {
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
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
              "& .MuiTablePagination-root": {
                color: theme.palette.text.secondary,
              },
            }}
          >
            <DataGrid
              rows={allocations}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Add/Edit modal */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {form.id ? "Edit Allocation" : "Allocate Cycle"}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, mt: 0.5 }}
          >
            Link a participant to a cycle and optionally set the current power,
            voltage, and amperage.
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {/* Participant select */}
            <TextField
              select
              label="Participant"
              name="participant"
              value={form.participant}
              onChange={handleChange}
              required
              size="small"
              fullWidth
            >
              {participants.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>

            {/* Cycle select */}
            <TextField
              select
              label="Cycle"
              name="cycle"
              value={form.cycle}
              onChange={handleChange}
              required
              size="small"
              fullWidth
            >
              {cycles.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.cycle_no}
                </MenuItem>
              ))}
            </TextField>

           

            {/* hidden submit for Enter key */}
            <button type="submit" style={{ display: "none" }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {form.id ? "Update Allocation" : "Save Allocation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ParticipantCycleSection;