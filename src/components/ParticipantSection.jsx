// src/components/ParticipantSection.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Avatar,
  Chip,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/Delete";

const API_BASE = "http://127.0.0.1:8000";
const MEDIA_BASE = API_BASE;

function ParticipantSection({onDataChange}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [participants, setParticipants] = useState([]);
  const [participantForm, setParticipantForm] = useState({
    id: null,
    name: "",
    dob: "",
    profile: null,
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false); // modal state

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/participants/`);
      const data = await res.json();
      setParticipants(data.data || []);
    } catch (err) {
      console.error("Error fetching participants:", err);
      alert("Failed to load participants");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () =>
    setParticipantForm({ id: null, name: "", dob: "", profile: null });

  const handleOpenAdd = () => {
    resetForm();
    setOpen(true);
  };

  const handleOpenEdit = (p) => {
    setParticipantForm({
      id: p.id,
      name: p.name,
      dob: p.dob,
      profile: null,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profile") {
      setParticipantForm((prev) => ({ ...prev, profile: files[0] || null }));
    } else {
      setParticipantForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!participantForm.id;
      const url = isEdit
        ? `${API_BASE}/api/admin/participants/${participantForm.id}/`
        : `${API_BASE}/api/admin/participants/`;
      const method = isEdit ? "PUT" : "POST";

      const formData = new FormData();
      formData.append("name", participantForm.name);
      formData.append("dob", participantForm.dob);
      if (participantForm.profile) {
        formData.append("profile", participantForm.profile);
      }

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.status) {
        console.error(data);
        alert(data.message || "Failed to save participant");
        return;
      }

      handleClose();
      fetchParticipants();
      onDataChange?.();
    } catch (err) {
      console.error("Error saving participant:", err);
      alert("Error saving participant");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this participant?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/participants/${id}/`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete participant");
        return;
      }

      fetchParticipants();
      onDataChange?.();
    } catch (err) {
      console.error("Error deleting participant:", err);
      alert("Error deleting participant");
    }
  };

  // DataGrid columns
  const columns = useMemo(
    () => [
      {
        field: "profile",
        headerName: "Profile",
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row;
          return row.profile ? (
            <Avatar
              src={`${MEDIA_BASE}${row.profile}`}
              alt={row.name}
              sx={{ width: 36, height: 36 }}
            />
          ) : (
            <Avatar sx={{ width: 36, height: 36 }}>
              {row.name?.[0]?.toUpperCase() || "P"}
            </Avatar>
          );
        },
      },
      {
        field: "name",
        headerName: "Name",
        flex: 1,
        minWidth: 160,
      },
      {
        field: "dob",
        headerName: "DOB",
        width: 130,
      },
      {
        field: "registered_on",
        headerName: "Registered On",
        width: 160,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            color="success"
            variant={isDark ? "filled" : "outlined"}
            sx={{
              bgcolor: isDark
                ? theme.palette.success.dark
                : undefined,
              color: isDark
                ? theme.palette.getContrastText(
                    theme.palette.success.dark
                  )
                : undefined,
            }}
          />
        ),
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
              <Tooltip title="Edit participant">
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
              <Tooltip title="Delete participant">
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
    [isDark, theme.palette.success.dark, theme.palette]
  );

  return (
    <Box sx={{ flex: 1.2 }}>
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: 4,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <CardHeader
          title="Participant List"
          subheader="Manage participant profiles and registration details."
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
                Add Participant
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
              rows={participants}
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
          {participantForm.id ? "Edit Participant" : "Add Participant"}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Name"
              name="name"
              value={participantForm.name}
              onChange={handleChange}
              required
              size="small"
              fullWidth
            />

            <TextField
              label="Date of Birth"
              name="dob"
              type="date"
              value={participantForm.dob}
              onChange={handleChange}
              required
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Used for age and eligibility."
            />

            <Button
              variant="outlined"
              component="label"
              size="small"
              sx={{ alignSelf: "flex-start" }}
            >
              {participantForm.profile ? "Change Profile Image" : "Upload Profile Image"}
              <input
                type="file"
                name="profile"
                accept="image/*"
                hidden
                onChange={handleChange}
              />
            </Button>
            {participantForm.profile && (
              <Typography variant="caption" color="text.secondary">
                Selected: {participantForm.profile.name}
              </Typography>
            )}

            {/* Hidden submit so Enter key works inside dialog */}
            <button type="submit" style={{ display: "none" }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {participantForm.id ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ParticipantSection;