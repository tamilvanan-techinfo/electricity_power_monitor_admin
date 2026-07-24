// src/components/CycleSection.jsx
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/Delete";

const API_BASE = "http://172.25.32.1:8000";

function CycleSection() {
  const theme = useTheme(); // access light/dark mode
  const isDark = theme.palette.mode === "dark";

  const [cycles, setCycles] = useState([]);
  const [cycleForm, setCycleForm] = useState({
    id: null,
    cycle_no: "",
    controller_no: "",
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false); // modal open/close

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/cycles/`);
      const data = await res.json();
      setCycles(data.data || []);
    } catch (err) {
      console.error("Error fetching cycles:", err);
      alert("Failed to load cycles");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () =>
    setCycleForm({ id: null, cycle_no: "", controller_no: "" });

  const handleOpenAdd = () => {
    resetForm();
    setOpen(true);
  };

  const handleOpenEdit = (cycle) => {
    setCycleForm({
      id: cycle.id,
      cycle_no: cycle.cycle_no,
      controller_no: cycle.controller_no,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCycleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!cycleForm.id;
      const url = isEdit
        ? `${API_BASE}/api/admin/cycles/${cycleForm.id}/`
        : `${API_BASE}/api/admin/cycles/`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        cycle_no: cycleForm.cycle_no,
        controller_no: cycleForm.controller_no,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.status) {
        console.error(data);
        alert(data.message || "Failed to save cycle");
        return;
      }

      handleClose();
      fetchCycles();
    } catch (err) {
      console.error("Error saving cycle:", err);
      alert("Error saving cycle");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this cycle?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/cycles/${id}/`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete cycle");
        return;
      }

      fetchCycles();
    } catch (err) {
      console.error("Error deleting cycle:", err);
      alert("Error deleting cycle");
    }
  };

  // DataGrid columns
  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        width: 80,
      },
      {
        field: "cycle_no",
        headerName: "Cycle No",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color="primary"
            size="small"
            sx={{ fontWeight: 500 }}
          />
        ),
      },
      {
        field: "controller_no",
        headerName: "Controller No",
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            sx={{
              fontWeight: 500,
              bgcolor: isDark
                ? "rgba(144, 202, 249, 0.2)" // soft blue on dark
                : "#e3f2fd", // light mode
            }}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        width: 220,
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const row = params.row;
          return (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Tooltip title="Edit cycle">
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
              <Tooltip title="Delete cycle">
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
    [isDark]
  );

  return (
    <Box sx={{ flex: 1 }}>
      <Card
        sx={[
          (theme) => ({
            borderRadius: 3,
            boxShadow: 4,
            backgroundColor: theme.palette.background.paper,
            backgroundImage: "none",
          }),
          // extra styling when theme is dark
          (theme) =>
            theme.applyStyles?.("dark", {
              boxShadow: 6,
            }) || {},
        ]}
      >
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" fontWeight={600}>
                Cycles
              </Typography>
              {cycles.length > 0 && (
                <Chip
                  label={`${cycles.length} total`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Stack>
          }
          subheader="Manage your cycles like product units with unique identifiers."
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
              >
                New Cycle
              </Button>
            </Stack>
          }
          sx={{
            pb: 0,
            "& .MuiCardHeader-subheader": {
              fontSize: 13,
              opacity: 0.8,
            },
          }}
        />
        <CardContent sx={{ pt: 1 }}>
          <Box
            sx={{
              height: 420,
              width: "100%",
              "& .MuiDataGrid-root": {
                borderRadius: 2,
                border: `1px solid ${
                  isDark
                    ? theme.palette.divider
                    : "rgba(0,0,0,0.06)"
                }`,
                backgroundColor: theme.palette.background.paper,
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: isDark
                  ? theme.palette.background.default
                  : "#f5f5f5",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: isDark
                  ? "rgba(144, 202, 249, 0.08)"
                  : "rgba(25, 118, 210, 0.04)",
              },
            }}
          >
            <DataGrid
              rows={cycles}
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
          {cycleForm.id ? "Edit Cycle" : "Create New Cycle"}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, mt: 0.5 }}
          >
            A cycle is a physical unit with a unique cycle number and controller
            number. Use this form to keep them consistent.
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Cycle No"
              name="cycle_no"
              value={cycleForm.cycle_no}
              onChange={handleChange}
              required
              size="small"
              fullWidth
              placeholder="e.g. CYCLE-001"
            />
            <TextField
              label="Controller No"
              name="controller_no"
              value={cycleForm.controller_no}
              onChange={handleChange}
              required
              size="small"
              fullWidth
              placeholder="e.g. CTRL-ABC-123"
            />

            {/* hidden submit to allow Enter key */}
            <button type="submit" style={{ display: "none" }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {cycleForm.id ? "Update Cycle" : "Save Cycle"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CycleSection;