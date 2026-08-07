import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Paper,
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
  CircularProgress,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { tokens } from "../Theme";
import { useSocket } from "../contexts/SocketContext";

// ---- Config the component owns internally ----
const SCREEN_API_URL = "http://127.0.0.1:8000/screens/screen-position/";

// Fields this panel edits, and how each maps onto the `screen` object's
// keys. Only these are read from `screen` / sent back out.
const FIELD_KEYS = [
  "width",
  "height",
  "x",
  "y",
  "fullscreen",
  "alwaysOnTop",
  "resizable",
  "movable",
  "minimizable",
  "maximizable",
  "visible",
  "menuBarVisible",
  "autoHideMenuBar",
  "opacity",
];

const SCREEN_KEY_MAP = {
  alwaysOnTop: "always_on_top",
  menuBarVisible: "menu_bar_visible",
  autoHideMenuBar: "auto_hide_menu_bar",
};

const NUMERIC_FIELDS = new Set(["width", "height", "x", "y", "opacity"]);
const BOOLEAN_FIELDS = new Set([
  "fullscreen",
  "alwaysOnTop",
  "resizable",
  "movable",
  "minimizable",
  "maximizable",
  "visible",
  "menuBarVisible",
  "autoHideMenuBar",
]);

function formFromScreen(screen) {
  const get = (key) => screen?.[SCREEN_KEY_MAP[key] || key];

  return {
    width: get("width") ?? "",
    height: get("height") ?? "",
    x: get("x") ?? "",
    y: get("y") ?? "",
    fullscreen: get("fullscreen") ?? false,
    alwaysOnTop: get("alwaysOnTop") ?? false,
    resizable: get("resizable") ?? true,
    movable: get("movable") ?? true,
    minimizable: get("minimizable") ?? true,
    maximizable: get("maximizable") ?? true,
    visible: get("visible") ?? true,
    menuBarVisible: get("menuBarVisible") ?? false,
    autoHideMenuBar: get("autoHideMenuBar") ?? true,
    opacity: get("opacity") ?? 1,
  };
}

function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "text.secondary",
      }}
    >
      {children}
    </Typography>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <FormControlLabel
      sx={{
        ml: 0,
        justifyContent: "space-between",
        "& .MuiFormControlLabel-label": {
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 700,
          fontSize: "0.65rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.secondary",
        },
      }}
      labelPlacement="start"
      control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
      label={label}
    />
  );
}

// Fetches its own initial screen data via REST, but uses the shared
// SocketContext connection (via `send`) instead of owning its own socket.
function ScreenControlPanel() {
  const { connected, send, controlledScreen, setControlledScreen } = useSocket();

  const [screen, setScreen] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialForm = useMemo(() => formFromScreen(screen), [screen]);

  const [form, setForm] = useState(initialForm);
  const [baseline, setBaseline] = useState(initialForm);

  // ---- fetch the screen's current state on mount ----
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch(SCREEN_API_URL);
        if (!res.ok) throw new Error(`Failed to fetch screen: ${res.status}`);
        const data = await res.json();
        if (active) {
          setScreen(data);
          setControlledScreen(data);
        }
      } catch (err) {
        console.warn("Could not fetch screen data:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep local `screen` in sync with acks coming through the shared socket
  useEffect(() => {
    if (controlledScreen) {
      setScreen(controlledScreen);
    }
  }, [controlledScreen]);

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

    send(payload);

    setBaseline(form);
  }, [hasChanges, changedProperties, screen, form, send]);

  const numberFieldSx = useMemo(
    () => ({
      "& .MuiOutlinedInput-input": {
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "0.9rem",
      },
      "& .MuiInputLabel-root": { fontFamily: "'Inter', sans-serif" },
      "& .MuiInputAdornment-root": { fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.8rem" },
    }),
    []
  );

  if (loading) {
    return (
      <Paper
        variant="outlined"
        sx={{
          width: "100%",
          borderRadius: 2,
          p: 4,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
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
              sx={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: "1.1rem", lineHeight: 1.25 }}
            >
              Screen Control
            </Typography>
          </Box>
        </Stack>

        <Chip
          size="small"
          label={connected ? "Live" : "Reconnecting…"}
          sx={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            fontSize: "0.65rem",
            bgcolor: connected ? "rgba(63,185,80,0.12)" : "rgba(248,81,73,0.12)",
            color: connected ? "#2E9E4F" : "#D9463D",
            border: "none",
          }}
        />
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
                type="number"
                value={form.width}
                onChange={(e) => handleChange("width", e.target.value)}
                sx={numberFieldSx}
                InputProps={{ endAdornment: <InputAdornment position="end">px</InputAdornment> }}
              />
              <TextField
                label="Height"
                fullWidth
                size="small"
                type="number"
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
                type="number"
                value={form.x}
                onChange={(e) => handleChange("x", e.target.value)}
                sx={numberFieldSx}
              />
              <TextField
                label="Position Y"
                fullWidth
                size="small"
                type="number"
                value={form.y}
                onChange={(e) => handleChange("y", e.target.value)}
                sx={numberFieldSx}
              />
            </Stack>
          </Stack>

     

          <Stack spacing={0.5}>
            <SectionLabel>Window Behavior</SectionLabel>
            <ToggleRow
              label="Fullscreen"
              checked={form.fullscreen}
              onChange={(v) => handleChange("fullscreen", v)}
            />
            <ToggleRow
              label="Always On Top"
              checked={form.alwaysOnTop}
              onChange={(v) => handleChange("alwaysOnTop", v)}
            />
          
          
            
           
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
    </Paper>
  );
}

export default ScreenControlPanel;