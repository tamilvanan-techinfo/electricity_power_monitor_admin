// src/AppSettings.jsx
//
// Admin screen for editing the live AppTheme (colors + theme palettes).
// Pulls the current values from SocketContext's `appTheme` (populated
// on connect / theme_updated broadcasts) and pushes edits back over
// the same socket via send({ type: "update_theme", colors, theme }).
// The backend consumer validates + saves AppTheme, whose post_save
// signal re-broadcasts theme_updated to every connected screen.

import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Grid,
  Typography,
  TextField,
  Button,
  Divider,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import BoltIcon from "@mui/icons-material/Bolt";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckIcon from "@mui/icons-material/Check";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import api from '../config.json'
import { useSocket } from "../contexts/SocketContext";
import { tokens } from "../Theme";

// Field metadata: camelCase key (matches AppTheme.to_payload()) -> label.
// Split into the two palettes the backend stores separately.
const COLOR_FIELDS = [
  { key: "backgroundGradient", label: "Background gradient", wide: true },
  { key: "headerBorder", label: "Header border" },
  { key: "headerBorderShadow", label: "Header border shadow" },
  { key: "white", label: "White" },
  { key: "green", label: "Green" },
  { key: "gold", label: "Gold" },
  { key: "highlightBorder", label: "Highlight border" },
  { key: "highlightShadow", label: "Highlight shadow" },
  { key: "normalRowBorder", label: "Normal row border" },
  { key: "circleBg", label: "Circle background" },
  { key: "circleHighlightBorder", label: "Circle highlight border" },
  { key: "circleHighlightShadow", label: "Circle highlight shadow" },
];

const THEME_FIELDS = [
  { key: "bg", label: "Background" },
  { key: "bgGradient", label: "Background gradient", wide: true },
  { key: "panel", label: "Panel" },
  { key: "panelBorder", label: "Panel border" },
  { key: "panelGlow", label: "Panel glow", wide: true },
  { key: "neon", label: "Neon (primary)" },
  { key: "neonSoft", label: "Neon soft" },
  { key: "gold", label: "Gold" },
  { key: "text", label: "Text" },
  { key: "subtext", label: "Subtext" },
  { key: "muted", label: "Muted" },
  { key: "divider", label: "Divider" },
];

// ---------------------------------------------------------------
// Color parsing helpers — let every field be driven by pickers/
// sliders instead of hand-typed CSS strings.
// ---------------------------------------------------------------

// Matches any color token inside a larger string: #hex (3/4/6/8 digit),
// rgb(...)/rgba(...). Used to find every editable color inside a
// gradient or box-shadow string.
const COLOR_TOKEN_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

const isHex = (v) => typeof v === "string" && /^#([0-9a-fA-F]{3,8})$/.test(v.trim());
const isRgba = (v) => typeof v === "string" && /^rgba?\(/i.test(v.trim());
const isCompound = (v) =>
  typeof v === "string" && (v.includes("gradient(") || (v.match(COLOR_TOKEN_RE) || []).length > 1);

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h.slice(0, 6), 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("");
}

// Splits any single color token (#hex or rgb/rgba(...)) into a plain
// hex (for the native <input type="color">) plus a 0-1 alpha, so a
// hex swatch + opacity slider can represent rgba values too.
function toHexAlpha(value) {
  if (!value) return { hex: "#000000", alpha: 1 };
  const v = value.trim();
  if (isHex(v)) {
    const { r, g, b } = hexToRgb(v);
    let alpha = 1;
    const h = v.replace("#", "");
    if (h.length === 4) alpha = parseInt(h[3] + h[3], 16) / 255;
    if (h.length === 8) alpha = parseInt(h.slice(6, 8), 16) / 255;
    return { hex: rgbToHex(r, g, b), alpha: Math.round(alpha * 100) / 100 };
  }
  const m = v.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
    const [r, g, b, a = 1] = parts;
    return { hex: rgbToHex(r || 0, g || 0, b || 0), alpha: isNaN(a) ? 1 : a };
  }
  // Named CSS colors (e.g. "gold") — no swatch conversion available,
  // caller falls back to a plain select/text control.
  return { hex: null, alpha: 1 };
}

function fromHexAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  if (alpha >= 1) return rgbToHex(r, g, b);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Replaces every color token found inside a compound string (gradient,
// box-shadow) with a new value, in the order they appear.
function replaceColorTokens(source, newTokens) {
  let i = 0;
  return source.replace(COLOR_TOKEN_RE, () => newTokens[i++] ?? "");
}

function extractColorTokens(source) {
  return source.match(COLOR_TOKEN_RE) || [];
}

const APP_THEME_ENDPOINT = api.apiBase+"/api/admin/app-theme/";

// snake_case (REST payload field names) -> camelCase (to_payload() /
// COLOR_FIELDS / THEME_FIELDS key). Used to normalize the initial
// GET /api/admin/app-theme/ response into the same shape the socket's
// theme_updated messages already use.
const COLORS_SNAKE_TO_CAMEL = {
  colors_background_gradient: "backgroundGradient",
  colors_header_border: "headerBorder",
  colors_header_border_shadow: "headerBorderShadow",
  colors_white: "white",
  colors_green: "green",
  colors_gold: "gold",
  colors_highlight_border: "highlightBorder",
  colors_highlight_shadow: "highlightShadow",
  colors_normal_row_border: "normalRowBorder",
  colors_circle_bg: "circleBg",
  colors_circle_highlight_border: "circleHighlightBorder",
  colors_circle_highlight_shadow: "circleHighlightShadow",
};

const THEME_SNAKE_TO_CAMEL = {
  theme_bg: "bg",
  theme_bg_gradient: "bgGradient",
  theme_panel: "panel",
  theme_panel_border: "panelBorder",
  theme_panel_glow: "panelGlow",
  theme_neon: "neon",
  theme_neon_soft: "neonSoft",
  theme_gold: "gold",
  theme_text: "text",
  theme_subtext: "subtext",
  theme_muted: "muted",
  theme_divider: "divider",
};

// Converts the raw REST response's `data` object into the same
// { colors: {...}, theme: {...} } shape the socket sends, so both
// sources can feed the same state.
function normalizeThemePayload(data) {
  const colors = {};
  const theme = {};

  Object.entries(COLORS_SNAKE_TO_CAMEL).forEach(([snakeKey, camelKey]) => {
    if (data[snakeKey] !== undefined) colors[camelKey] = data[snakeKey];
  });
  Object.entries(THEME_SNAKE_TO_CAMEL).forEach(([snakeKey, camelKey]) => {
    if (data[snakeKey] !== undefined) theme[camelKey] = data[snakeKey];
  });

  return { colors, theme };
}

// A single hex swatch + native color picker, optionally paired with
// an opacity slider (for rgba values). onCommit receives the final
// CSS string (hex or rgba) to write back.
function SwatchPicker({ value, onCommit, size = 28 }) {
  const { hex, alpha } = toHexAlpha(value);
  const showAlpha = isRgba(value) || alpha < 1;

  if (!hex) {
    // Named color keyword (e.g. "gold") — no numeric picker possible,
    // fall back to a small text field just for this token.
    return (
      <TextField
        size="small"
        value={value ?? ""}
        onChange={(e) => onCommit(e.target.value)}
        sx={{ width: 110 }}
        placeholder="css color"
      />
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        component="input"
        type="color"
        value={hex}
        onChange={(e) => onCommit(fromHexAlpha(e.target.value, alpha))}
        sx={{
          width: size,
          height: size,
          p: 0,
          border: `1px solid ${tokens.line}`,
          borderRadius: "8px",
          background: "none",
          cursor: "pointer",
        }}
      />
      {showAlpha && (
        <Stack sx={{ width: 90 }} spacing={0}>
          <Typography variant="caption" sx={{ color: tokens.textLightSecondary, lineHeight: 1 }}>
            opacity {Math.round(alpha * 100)}%
          </Typography>
          <Box
            component="input"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={alpha}
            onChange={(e) => onCommit(fromHexAlpha(hex, parseFloat(e.target.value)))}
            sx={{ width: "100%", accentColor: tokens.current, cursor: "pointer" }}
          />
        </Stack>
      )}
    </Stack>
  );
}

// A row of SwatchPickers, one per color token found inside a compound
// value (gradient / box-shadow string). Editing any swatch rebuilds
// the full string with that token swapped in, leaving the surrounding
// gradient/shadow structure untouched.
function CompoundSwatchPicker({ value, onCommit }) {
  const tokens_ = extractColorTokens(value || "");

  if (tokens_.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: tokens.textLightSecondary }}>
        No color stops detected
      </Typography>
    );
  }

  const handleTokenChange = (index, newToken) => {
    const nextTokens = [...tokens_];
    nextTokens[index] = newToken;
    onCommit(replaceColorTokens(value, nextTokens));
  };

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      {tokens_.map((tok, i) => (
        <SwatchPicker key={i} value={tok} onCommit={(v) => handleTokenChange(i, v)} size={24} />
      ))}
    </Stack>
  );
}

function ColorField({ fieldKey, label, value, applied, onChange, onApply, wide }) {
  const isUnapplied = value !== applied;
  const compound = isCompound(value);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Grid item xs={12} sm={wide ? 12 : 6} md={wide ? 12 : 4}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderColor: isUnapplied ? tokens.current : tokens.line,
          borderRadius: "10px",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textLightSecondary }}>
            {label}
          </Typography>
          <Tooltip title={isUnapplied ? "Apply this color now" : "Applied"}>
            <span>
              <IconButton
                size="small"
                onClick={() => onApply(fieldKey)}
                disabled={!isUnapplied}
                sx={{ color: isUnapplied ? tokens.current : tokens.textLightSecondary }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {compound ? (
          <CompoundSwatchPicker value={value} onCommit={(v) => onChange(fieldKey, v)} />
        ) : (
          <SwatchPicker value={value} onCommit={(v) => onChange(fieldKey, v)} />
        )}

        <Button
          size="small"
          onClick={() => setShowRaw((s) => !s)}
          sx={{ mt: 1, px: 0, minWidth: 0, fontSize: "0.7rem", color: tokens.textLightSecondary }}
        >
          {showRaw ? "Hide CSS value" : "Edit CSS value"}
        </Button>

        {showRaw && (
          <TextField
            fullWidth
            multiline
            size="small"
            value={value ?? ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            sx={{ mt: 1 }}
          />
        )}
      </Paper>
    </Grid>
  );
}

function AppSettings() {
  const { appTheme, send, connected } = useSocket();

  // Draft state — what's shown/edited in the inputs.
  const [colors, setColors] = useState({});
  const [themeVals, setThemeVals] = useState({});
  // Applied state — the last values actually sent to (and confirmed
  // by) the receiver. Used to know which fields are still "dirty" vs
  // already live on the connected screens.
  const [appliedColors, setAppliedColors] = useState({});
  const [appliedTheme, setAppliedTheme] = useState({});

  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState(null);

  // True until either the initial REST fetch or the socket's
  // theme_updated has populated state at least once.
  const [initialLoading, setInitialLoading] = useState(true);
  const hasLoadedOnce = React.useRef(false);

  const dirty =
    JSON.stringify(colors) !== JSON.stringify(appliedColors) ||
    JSON.stringify(themeVals) !== JSON.stringify(appliedTheme);

  // Initial load: GET the current theme over REST so the form is
  // populated immediately on mount, without waiting for the socket
  // to connect and push its first theme_updated message. The socket
  // effect below will still take over for live updates afterwards.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(APP_THEME_ENDPOINT);
        const json = await res.json();

        if (cancelled || !json?.status || !json?.data) return;

        const { colors: fetchedColors, theme: fetchedTheme } = normalizeThemePayload(json.data);

        if (!hasLoadedOnce.current) {
          setColors(fetchedColors);
          setThemeVals(fetchedTheme);
          setAppliedColors(fetchedColors);
          setAppliedTheme(fetchedTheme);
          hasLoadedOnce.current = true;
        }
      } catch (err) {
        console.error("Failed to fetch initial app theme:", err);
        if (!cancelled) {
          setToast({ severity: "error", message: "Couldn't load the current theme from the server." });
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync local + applied state whenever a fresh payload arrives from
  // the server (initial connect, another admin's save, or our own
  // update being echoed back) — but don't stomp on in-progress local
  // edits that haven't been applied yet.
  useEffect(() => {
    if (!appTheme) return;
    setAppliedColors(appTheme.colors || {});
    setAppliedTheme(appTheme.theme || {});
    if (!dirty) {
      setColors(appTheme.colors || {});
      setThemeVals(appTheme.theme || {});
    }
    hasLoadedOnce.current = true;
    setInitialLoading(false);
  }, [appTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleColorChange = (key, value) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleThemeChange = (key, value) => {
    setThemeVals((prev) => ({ ...prev, [key]: value }));
  };

  // Sends the CURRENT full colors/theme draft — every color field
  // must be present in every update_theme message the backend
  // applies, so a single-field "Apply" still sends the whole draft,
  // it just lets the user trigger it per-swatch instead of waiting
  // for the bottom Save button.
  const pushUpdate = (nextColors, nextTheme) => {
    const ok = send({
      type: "update_theme",
      colors: nextColors,
      theme: nextTheme,
    });

    if (!ok) {
      setToast({ severity: "error", message: "Socket isn't connected — couldn't send the update." });
    }
    return ok;
  };

  const handleApplyColor = (key) => {
    if (pushUpdate(colors, themeVals)) {
      setAppliedColors((prev) => ({ ...prev, [key]: colors[key] }));
      setToast({ severity: "success", message: `${key} applied to live screens.` });
    }
  };

  const handleApplyTheme = (key) => {
    if (pushUpdate(colors, themeVals)) {
      setAppliedTheme((prev) => ({ ...prev, [key]: themeVals[key] }));
      setToast({ severity: "success", message: `${key} applied to live screens.` });
    }
  };

  const handleReset = () => {
    setColors(appliedColors);
    setThemeVals(appliedTheme);
  };

  const handleSave = () => {
    if (pushUpdate(colors, themeVals)) {
      setAppliedColors(colors);
      setAppliedTheme(themeVals);
      setToast({ severity: "success", message: "Theme sent — live screens will update shortly." });
    }
  };

  const loading = initialLoading && !hasLoadedOnce.current;

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <BoltIcon sx={{ color: tokens.current }} />
          <Typography variant="h5">App Theme</Typography>
        </Stack>
        <Chip
          size="small"
          label={connected ? "Live" : "Disconnected"}
          sx={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            bgcolor: connected ? "rgba(34,211,196,0.12)" : "rgba(255,107,107,0.12)",
            color: connected ? tokens.currentDark : "#E5484D",
            border: `1px solid ${connected ? tokens.current : "#E5484D"}`,
          }}
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Edits here are sent live to every connected screen — save applies immediately, no deploy needed.
      </Typography>

      <Paper variant="outlined" sx={{ borderColor: tokens.line }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, pt: 1, borderBottom: `1px solid ${tokens.line}` }}
        >
          <Tab icon={<PaletteIcon fontSize="small" />} iconPosition="start" label="Ranking / Participant" />
          <Tab icon={<BoltIcon fontSize="small" />} iconPosition="start" label="Go Green (power charts)" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading the current theme…
            </Typography>
          ) : (
            <>
              {tab === 0 && (
                <Grid container spacing={2}>
                  {COLOR_FIELDS.map((f) => (
                    <ColorField
                      key={f.key}
                      fieldKey={f.key}
                      label={f.label}
                      value={colors[f.key]}
                      applied={appliedColors[f.key]}
                      onChange={handleColorChange}
                      onApply={handleApplyColor}
                      wide={f.wide}
                    />
                  ))}
                </Grid>
              )}

              {tab === 1 && (
                <Grid container spacing={2}>
                  {THEME_FIELDS.map((f) => (
                    <ColorField
                      key={f.key}
                      fieldKey={f.key}
                      label={f.label}
                      value={themeVals[f.key]}
                      applied={appliedTheme[f.key]}
                      onChange={handleThemeChange}
                      onApply={handleApplyTheme}
                      wide={f.wide}
                    />
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>

        <Divider sx={{ borderColor: tokens.line }} />

        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ p: 2 }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            disabled={!dirty}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!dirty || loading}
          >
            Save &amp; broadcast
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast && (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}

export default AppSettings;