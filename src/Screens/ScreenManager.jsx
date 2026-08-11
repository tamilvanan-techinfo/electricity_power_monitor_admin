import React, { useEffect, useState } from "react";
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
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/Delete";
import LiveDot from "../components/LiveDot";
import { tokens } from "../Theme";
import { useSocket } from "../contexts/SocketContext";
import PlayerControllerDrawer from "../components/PlayerControllerDrawer";
import GroupHandlingDrawer from "../components/GroupHandlingDrawer";
import api from "../config.json"
const API_BASE = api.apiBase;

// Control-panel card: hairline border instead of a drop shadow, teal glow
// on the currently-live tile so the grid reads like a bank of monitors.
const ScreenCard = styled("div")(({ theme, islive }) => ({
  borderRadius: 12,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${islive === "true" ? tokens.current : theme.palette.divider}`,
  boxShadow: islive === "true" ? `0 0 0 1px ${tokens.current}33, 0 0 24px ${tokens.current}22` : "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    borderColor: islive === "true" ? tokens.current : theme.palette.text.secondary,
  },
}));

function ScreenManager() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerGroupOpen, setDrawerGroupOpen] = useState(false);
  const [screen, setScreen] = useState(null);
  const [loading, setLoading] = useState(false);

  // Socket state/actions now come from context
  const { screens, setScreens, connected, send } = useSocket();

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

  const openAddDialog = () => {
    setForm({ id: null, name: "", path: "", is_live: false, thumbnail: null });
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
    setForm({ id: null, name: "", path: "", is_live: false, thumbnail: null });
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

  // Toggle live status for one screen — now uses `send` from context
  const handleToggleLive = async (screen) => {
    try {
      const newIsLive = !screen.is_live;

      // Optimistic update in UI: setting one live forces all others off
      setScreens((prev) =>
        prev.map((s) => {
          if (s.id === screen.id) return { ...s, is_live: newIsLive };
          if (newIsLive) return { ...s, is_live: false };
          return s;
        })
      );

      send({
        type: "set_live_screen",
        screen_id: screen.id,
        is_live: newIsLive,
      });
    } catch (err) {
      console.error("Error toggling live status:", err);
      alert("Error toggling live status");
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minHeight: "100vh", backgroundColor: theme.palette.background.default }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: { xs: 2, md: 3 } }}
      >
        <Box>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isDark ? "rgba(34,211,196,0.14)" : "rgba(15,156,144,0.10)",
              }}
            >
              <LiveTvIcon sx={{ fontSize: 19, color: "primary.main" }} />
            </Box>
            <Typography variant="h4" fontWeight={800}>
              Screen Manager
            </Typography>
          </Stack>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
          </Typography>
        </Box>

        <Stack direction={{ xs: "row" }} spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            icon={<LiveDot size={7} color={connected ? tokens.current : theme.palette.text.secondary} sx={{ ml: "6px !important", animation: connected ? "livePulse 2s ease-in-out infinite" : "none" }} />}
            label={connected ? "SOCKET ONLINE" : "RECONNECTING"}
            variant="outlined"
            size="small"
            sx={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.05em",
              borderColor: connected ? "primary.main" : theme.palette.divider,
              color: connected ? "primary.main" : "text.secondary",
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
          <Tooltip title="Refresh screens">
            <span>
              <IconButton onClick={fetchScreens} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAddDialog}>
            Add Screen
          </Button>
        </Stack>
      </Stack>

      {/* Grid */}
      {screens.length === 0 && !loading ? (
        <Box
          sx={{
            mt: 6,
            textAlign: "center",
            color: theme.palette.text.secondary,
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: "12px",
            py: 6,
          }}
        >
          <Typography variant="body1">No screens found. Click "Add Screen" to create one.</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {screens.map((screen) => (
            <Grid key={screen.id} xs={12} sm={6} md={4} lg={3}>
              <ScreenCard islive={screen.is_live ? "true" : "false"}>
                <CardHeader
                  title={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {screen.name}
                      </span>
                      {screen.is_live && (
                        <Chip
                          icon={<LiveDot size={6} color="#032420" sx={{ ml: "5px !important" }} />}
                          label="LIVE"
                          size="small"
                          sx={{
                            ml: 0.5,
                            height: 22,
                            bgcolor: tokens.current,
                            color: "#032420",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            letterSpacing: "0.04em",
                            "& .MuiChip-label": { px: 0.75 },
                            "& .MuiChip-icon": { color: "inherit" },
                          }}
                        />
                      )}
                    </Stack>
                  }
                  subheader={screen.path}
                  sx={{
                    pb: 0,
                    "& .MuiCardHeader-subheader": {
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11.5,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  }}
                  action={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit screen">
                        <IconButton size="small" onClick={() => openEditDialog(screen)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete screen">
                        <IconButton size="small" color="error" onClick={() => handleDeleteScreen(screen)}>
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
                      borderRadius: "8px",
                      overflow: "hidden",
                      height: 150,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "background.default",
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={`${API_BASE}${screen.thumbnail}`}
                      alt={screen.name}
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1, pt: screen.thumbnail ? 1.25 : 2 }}>
                  <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.75 }}>
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

                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  {screen.is_live ? (
                    <>
                    {console.log("Screen is live:", screen)}
                      {/* <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<StopCircleOutlinedIcon />}
                        onClick={() => handleToggleLive(screen)}
                        fullWidth
                      >
                        Stop Live
                      </Button> */}
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={() => {
                          if (screen.path === "/player-analysis" || screen.path === "/live-barchart" ) {
                            setDrawerOpen(true);
                            setScreen(screen);
                          }
                          else if (screen.path === "/group-participants") {
                            setDrawerGroupOpen(true);
                            setScreen(screen);

                          } 
                        }}
                        fullWidth
                      >
                        Control Screen
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<LiveTvIcon />}
                      onClick={() => handleToggleLive(screen)}
                      fullWidth
                      sx={{ bgcolor: tokens.current, color: "#032420", "&:hover": { bgcolor: tokens.currentDark, color: "#fff" } }}
                    >
                      Set Live
                    </Button>
                  )}
                </CardActions>
              </ScreenCard>
            </Grid>
          ))}
        </Grid>
      )}
      {/* Drawer for the Screen Controller */}
      <PlayerControllerDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setScreen(null);
        }}
        screen={screen}
      />
    <GroupHandlingDrawer
    open={drawerGroupOpen}
    onClose={() => setDrawerGroupOpen(false)}
  />

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
                <Switch checked={form.is_live} onChange={handleFormChange} name="is_live" color="success" />
              }
              label="Is Live"
            />

            <Button variant="outlined" component="label" size="small" sx={{ alignSelf: "flex-start" }}>
              {form.thumbnail ? "Change Thumbnail" : "Upload Thumbnail"}
              <input type="file" name="thumbnail" accept="image/*" hidden onChange={handleFormChange} />
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
          <Button onClick={handleSaveScreen} variant="contained" disabled={formLoading}>
            {formLoading ? "Saving..." : form.id ? "Update Screen" : "Save Screen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ScreenManager;