import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  InputAdornment,
  Chip,
  Tooltip,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { tokens } from "../Theme";

// Fields this drawer edits, and how each maps onto the `screen` object's
// keys. Only these are read from `screen` / sent back out — the screen
// carries other fields (id, thumbnail, is_live, menu_bar_visible, ...)
// that aren't part of this form.
const FIELD_KEYS = ["width", "height", "x", "y", "fullscreen", "alwaysOnTop"];
const SCREEN_KEY_MAP = { alwaysOnTop: "always_on_top" };
const NUMERIC_FIELDS = new Set(["width", "height", "x", "y"]);

// Builds the form's initial state from whatever the screen currently has,
// falling back to sane defaults for a screen that hasn't been configured yet.
function formFromScreen(screen) {
  const get = (key) => screen?.[SCREEN_KEY_MAP[key] || key];

  return {
    width: get("width") ?? "",
    height: get("height") ?? "",
    x: get("x") ?? "",
    y: get("y") ?? "",
    fullscreen: get("fullscreen") ?? false,
    alwaysOnTop: get("alwaysOnTop") ?? false,
  };
}

// Small section label used to group related fields — reads like a panel
// legend rather than another plain divider.
function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.7rem",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "text.secondary",
      }}
    >
      {children}
    </Typography>
  );
}

function ScreenControlDrawer({ open, onClose, onApply, socket, screen }) {
  const initialForm = useMemo(() => formFromScreen(screen), [screen]);

  const [form, setForm] = useState(initialForm);
  // The comparison baseline — NOT fixed to the screen's original values.
  // It starts there, but every successful Apply moves it forward to
  // whatever was just applied, so those values become "current" and the
  // Apply button goes back to disabled until the next real edit.
  const [baseline, setBaseline] = useState(initialForm);

  // Re-sync both the form and the baseline whenever a different screen is
  // opened, so fields start at that screen's actual current state.
  useEffect(() => {
    setForm(initialForm);
    setBaseline(initialForm);
  }, [initialForm]);

  const handleChange = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setForm(baseline);
  }, [baseline]);

  // Fields whose current form value differs from the baseline — this is
  // both what enables the Apply button and what gets sent.
  const changedProperties = useMemo(() => {
    const out = {};
    for (const key of FIELD_KEYS) {
      const current = form[key];
      const original = baseline[key];

      if (NUMERIC_FIELDS.has(key)) {
        if (current === "" || Number(current) === Number(original)) continue;
        out[key] = Number(current);
      } else if (current !== original) {
        out[key] = current;
      }
    }
    return out;
  }, [form, baseline]);

  const changeCount = Object.keys(changedProperties).length;
  const hasChanges = changeCount > 0;

  const handleApply = useCallback(() => {
    if (!hasChanges) return;

    const payload = {
      type: "window_update",
      screen_id: screen?.id,
      properties: changedProperties,
    };

    if (socket?.current?.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify(payload));
    } else {
      console.warn("Screen control socket is not open — could not send:", payload);
    }

    if (onApply) onApply(changedProperties);

    // The just-applied values are now "current" — move the baseline up to
    // them so Apply disables again until the next edit.
    setBaseline(form);
  }, [hasChanges, changedProperties, socket, onApply, screen, form]);

  const numberFieldSx = useMemo(
    () => ({
      "& .MuiOutlinedInput-input": {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.9rem",
      },
    }),
    []
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      // The dashboard's own AppBar/sidebar chrome can render at a z-index
      // above MUI's default modal layer, which pushes this drawer's header
      // behind it. Force the drawer well above everything in the layout.
      sx={{ zIndex: (theme) => theme.zIndex.modal + 100 }}
      PaperProps={{
        sx: {
          width: 400,
          borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
          zIndex: (theme) => theme.zIndex.modal + 100,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          px: 3,
          pt: 3,
          pb: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(34,211,196,0.14)" : "rgba(15,156,144,0.10)"),
            }}
          >
            <TuneIcon sx={{ fontSize: 19, color: "primary.main" }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.25 }}
            >
              Screen Control
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {screen?.name ? `Configuring "${screen.name}"` : "Configure the Electron display window"}
            </Typography>
          </Box>
        </Stack>

        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ px: 3, py: 2.5, flex: 1, overflowY: "auto" }}>
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <SectionLabel>Dimensions</SectionLabel>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Width"
                fullWidth
                size="small"
                value={form.width}
                onChange={(e) => handleChange("width", e.target.value)}
                sx={numberFieldSx}
                InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
              />
              <TextField
                label="Height"
                fullWidth
                size="small"
                value={form.height}
                onChange={(e) => handleChange("height", e.target.value)}
                sx={numberFieldSx}
                InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
              />
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <SectionLabel>Position</SectionLabel>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Position X"
                fullWidth
                size="small"
                value={form.x}
                onChange={(e) => handleChange("x", e.target.value)}
                sx={numberFieldSx}
              />
              <TextField
                label="Position Y"
                fullWidth
                size="small"
                value={form.y}
                onChange={(e) => handleChange("y", e.target.value)}
                sx={numberFieldSx}
              />
            </Stack>
          </Stack>

          <Stack spacing={0.5}>
            <SectionLabel>Window Behavior</SectionLabel>
            <FormControlLabel
              sx={{ ml: 0, justifyContent: "space-between" }}
              labelPlacement="start"
              control={
                <Switch
                  checked={form.fullscreen}
                  onChange={(e) => handleChange("fullscreen", e.target.checked)}
                />
              }
              label="Fullscreen"
            />
            <FormControlLabel
              sx={{ ml: 0, justifyContent: "space-between" }}
              labelPlacement="start"
              control={
                <Switch
                  checked={form.alwaysOnTop}
                  onChange={(e) => handleChange("alwaysOnTop", e.target.checked)}
                />
              }
              label="Always On Top"
            />
            {/* <FormControlLabel
              sx={{ ml: 0, justifyContent: "space-between" }}
              labelPlacement="start"
              control={
                <Switch
                  checked={form.resizable}
                  onChange={(e) => handleChange("resizable", e.target.checked)}
                />
              }
              label="Resizable"
            /> */}
          </Stack>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          {hasChanges ? (
            <Chip
              label={`${changeCount} change${changeCount > 1 ? "s" : ""} ready`}
              size="small"
              sx={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600,
                fontSize: "0.7rem",
                bgcolor: `${tokens.current}22`,
                color: tokens.currentDark,
              }}
            />
          ) : (
            <Typography variant="caption" color="text.secondary">
              No changes yet
            </Typography>
          )}

          <Tooltip title="Revert to last applied values">
            <span>
              <IconButton size="small" onClick={handleReset} disabled={!hasChanges}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button fullWidth variant="outlined" color="inherit" onClick={handleReset} disabled={!hasChanges}>
            Reset
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleApply}
            disabled={!hasChanges}
            sx={{
              bgcolor: tokens.current,
              color: "#032420",
              "&:hover": { bgcolor: tokens.currentDark, color: "#fff" },
              "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
            }}
          >
            Apply {hasChanges ? `(${changeCount})` : ""}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}

export default ScreenControlDrawer;