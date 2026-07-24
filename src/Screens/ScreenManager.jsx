// src/pages/ScreenManager.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Grid,
  CardMedia,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Switch,
  FormControlLabel,
  CardActions,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { styled } from "@mui/system";
import RefreshIcon from "@mui/icons-material/Refresh";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/Delete";

const API_BASE = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws/screen/admin/";

const ScreenCard = styled("div")(({ theme }) => ({
  borderRadius: 16,
  boxShadow: theme.shadows[4],
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.paper,
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
  "&:hover": {
    transform: "translateY(-3px)",
    boxShadow: theme.shadows[8],
  },
}));

function ScreenManager() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    id: null,
    name: "",
    path: "",
    is_live: false,
    thumbnail: null,
  });

  useEffect(() => {
    fetchScreens();
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const fetchScreens = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/screens/`);
      const data = await res.json();
      setScreens(data.data || []);
    } catch (err) {
      console.error("Error fetching screens:", err);
      alert("Failed to load screens");
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("Screen WebSocket connected");
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "update" && msg.screen) {
            setScreens((prev) =>
              prev.map((s) => (s.id === msg.screen.id ? msg.screen : s))
            );
          } else if (msg.type === "create" && msg.screen) {
            setScreens((prev) => [...prev, msg.screen]);
          } else if (msg.type === "delete" && msg.id) {
            setScreens((prev) => prev.filter((s) => s.id !== msg.id));
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };

      socket.onclose = () => {
        console.log("Screen WebSocket closed");
      };

      socket.onerror = (err) => {
        console.error("Screen WebSocket error:", err);
      };
    } catch (err) {
      console.error("Failed to connect WebSocket:", err);
    }
  };

  const openAddDialog = () => {
    setForm({
      id: null,
      name: "",
      path: "",
      is_live: false,
      thumbnail: null,
    });
    setFormOpen(true);
  };

  const openEditDialog = (screen) => {
    setForm({
      id: screen.id,
      name: screen.name || "",
      path: screen.path || "",
      is_live: !!screen.is_live,
      thumbnail: null,
    });
    setFormOpen(true);
  };

  const closeDialog = () => {
    setFormOpen(false);
    setForm({
      id: null,
      name: "",
      path: "",
      is_live: false,
      thumbnail: null,
    });
  };

  const handleFormChange = (e) => {
    const { name, value, checked, files, type } = e.target;
    if (name === "thumbnail") {
      setForm((prev) => ({ ...prev, thumbnail: files[0] || null }));
    } else if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveScreen = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit
        ? `${API_BASE}/api/admin/screens/${form.id}/`
        : `${API_BASE}/api/admin/screens/`;
      const method = isEdit ? "PUT" : "POST";

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("path", form.path);
      formData.append("is_live", form.is_live ? "true" : "false");
      if (form.thumbnail) {
        formData.append("thumbnail", form.thumbnail);
      }

      const res = await fetch(url, { method, body: formData });
      const data = await res.json();

      if (!res.ok || !data.status) {
        console.error(data);
        alert(data.message || "Failed to save screen");
        return;
      }

      closeDialog();
      fetchScreens();
    } catch (err) {
      console.error("Error saving screen:", err);
      alert("Error saving screen");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteScreen = async (screen) => {
    if (!window.confirm(`Delete screen "${screen.name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/screens/${screen.id}/`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete screen");
        return;
      }

      setScreens((prev) => prev.filter((s) => s.id !== screen.id));
    } catch (err) {
      console.error("Error deleting screen:", err);
      alert("Error deleting screen");
    }
  };

  // Toggle live status for one screen
const handleToggleLive = async (screen) => {
  try {
    const newIsLive = !screen.is_live;


    // Optimistic update in UI:
    setScreens((prev) =>
      prev.map((s) => {
        if (s.id === screen.id) {
          return { ...s, is_live: newIsLive };
        }
        // if we just set one live, force all others to false
        if (newIsLive) {
          return { ...s, is_live: false };
        }
        return s;
      })
    );

    // WebSocket notify backend / other clients
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "set_live_screen",      // <- match your Channels event name
          screen_id: screen.id,
          is_live: newIsLive,
        })
      );
    }
  } catch (err) {
    console.error("Error toggling live status:", err);
    alert("Error toggling live status");
  }
};

  return (
    <Box
      sx={{
        p: 3,
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Screen Manager
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage and monitor all screens with live status updates.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh screens">
            <span>
              <IconButton onClick={fetchScreens} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
          >
            Add Screen
          </Button>
        </Stack>
      </Box>

      {/* Grid */}
      {screens.length === 0 && !loading ? (
        <Box
          sx={{
            mt: 4,
            textAlign: "center",
            color: theme.palette.text.secondary,
          }}
        >
          <Typography variant="body1">
            No screens found. Click “Add Screen” to create one.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {screens.map((screen) => (
            <Grid
                      // ✅ OK here, this is MUI Grid
                key={screen.id}
                xs={12}
                sm={6}
                md={4}
                lg={3}
                >
              <ScreenCard>
                <CardHeader
                  title={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        noWrap
                      >
                        {screen.name}
                      </Typography>
                      {screen.is_live && (
                        <Chip
                          icon={<LiveTvIcon sx={{ fontSize: 16 }} />}
                          label="Live"
                          size="small"
                          color="error"
                          sx={{
                            ml: 0.5,
                            height: 22,
                            "& .MuiChip-label": { px: 0.5 },
                          }}
                        />
                      )}
                    </Box>
                  }
                  subheader={screen.path}
                  sx={{
                    pb: 0,
                    "& .MuiCardHeader-subheader": {
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  }}
                  action={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit screen">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(screen)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete screen">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteScreen(screen)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  }
                />

              {screen.thumbnail && (
  <Box
    sx={{
      mt: 1.5,
      mx: 2,
      borderRadius: 2,
      overflow: "hidden",          // clip image to rounded corners
      height: 150,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "background.default", // subtle backdrop in dark mode
    }}
  >
    <CardMedia
      component="img"
      image={`${API_BASE}${screen.thumbnail}`}
      alt={screen.name}
      sx={{
        width: "100%",
        height: "100%",
        objectFit: "cover",        // fill container without stretching
        display: "block",
      }}
    />
  </Box>
)}

                <CardContent sx={{ flexGrow: 1, pt: screen.thumbnail ? 1 : 2 }}>
  <Typography variant="body2" color="text.secondary" noWrap>
    Path: {screen.path}
  </Typography>

  {/* OLD: Chip inside Typography (invalid) */}
  {/* 
  <Typography
    variant="body2"
    color="text.secondary"
    sx={{ mt: 0.5 }}
  >
    Status:{" "}
    <Chip
      label={screen.is_live ? "Live" : "Offline"}
      size="small"
      color={screen.is_live ? "success" : "default"}
      variant={isDark && !screen.is_live ? "outlined" : "filled"}
      sx={{ ml: 0.5 }}
    />
  </Typography>
  */}

  {/* NEW: use Box so Chip is not inside <p> */}
  <Box
    sx={{
      mt: 0.5,
      display: "flex",
      alignItems: "center",
      gap: 0.5,
    }}
  >
    <Typography variant="body2" color="text.secondary">
      Status:
    </Typography>
    <Chip
      label={screen.is_live ? "Live" : "Offline"}
      size="small"
      color={screen.is_live ? "success" : "default"}
      variant={isDark && !screen.is_live ? "outlined" : "filled"}
    />
  </Box>
</CardContent>

                <CardActions
                  sx={{
                    px: 2,
                    pb: 2,
                    pt: 0,
                    justifyContent: "space-between",
                  }}
                >
                  {
                    !screen.is_live && (
                        <Button
                    size="small"
                    variant={screen.is_live ? "outlined" : "contained"}
                    color="success"
                    startIcon={<LiveTvIcon />}
                    onClick={() => handleToggleLive(screen)}
                  >
                    Set Live
                  </Button>
                    )
                  }
                </CardActions>
              </ScreenCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={formOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? "Edit Screen" : "Add Screen"}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            onSubmit={handleSaveScreen}
            encType="multipart/form-data"
            sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Screen Name"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              required
              size="small"
              fullWidth
            />
            <TextField
              label="Path"
              name="path"
              value={form.path}
              onChange={handleFormChange}
              required
              size="small"
              fullWidth
              helperText="URL or route where this screen is accessible."
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.is_live}
                  onChange={handleFormChange}
                  name="is_live"
                  color="success"
                />
              }
              label="Is Live"
            />

            <Button
              variant="outlined"
              component="label"
              size="small"
              sx={{ alignSelf: "flex-start" }}
            >
              {form.thumbnail ? "Change Thumbnail" : "Upload Thumbnail"}
              <input
                type="file"
                name="thumbnail"
                accept="image/*"
                hidden
                onChange={handleFormChange}
              />
            </Button>
            {form.thumbnail && (
              <Typography variant="caption" color="text.secondary">
                Selected: {form.thumbnail.name}
              </Typography>
            )}

            <button type="submit" style={{ display: "none" }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} color="inherit" disabled={formLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveScreen}
            variant="contained"
            disabled={formLoading}
          >
            {formLoading
              ? "Saving..."
              : form.id
              ? "Update Screen"
              : "Save Screen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ScreenManager;