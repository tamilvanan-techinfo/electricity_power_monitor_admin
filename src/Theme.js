// src/Theme.jsx
//
// Design language: "control room" — this is a substation / power-monitoring
// admin panel, so the palette and type read as instrumentation rather than
// a generic SaaS dashboard. Every numeric value (voltage, amperage, IDs,
// timestamps) renders in a monospace face so it feels like a live readout.
//
// Add this to your index.html <head> once (Google Fonts):
// <link rel="preconnect" href="https://fonts.googleapis.com">
// <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">

import { extendTheme } from "@mui/material/styles";

// Raw tokens — import { tokens } anywhere you need a hex value directly
// (e.g. inline SVGs, canvas, non-MUI markup).
export const tokens = {
  ink: "#0A0F1C",
  panel: "#121A2C",
  panelAlt: "#0E1524",
  line: "#22304A",
  lineLight: "#E3E8F0",
  current: "#22D3C4", // primary — "live signal" teal
  currentDark: "#0F9C90",
  signal: "#FFB020", // secondary — amber warning / bolt accent
  signalDark: "#C97F00",
  paperLight: "#F5F7FA",
  textLightSecondary: "#5B6472",
};

const fontDisplay = "'Manrope', 'Inter', sans-serif";
const fontBody = "'Inter', 'Manrope', sans-serif";
const fontMono = "'IBM Plex Mono', 'Roboto Mono', monospace";

const theme = extendTheme({
  cssVarPrefix: "eem",
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: fontBody,
    h4: { fontFamily: fontDisplay, fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontFamily: fontDisplay, fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontFamily: fontDisplay, fontWeight: 700 },
    subtitle1: { fontFamily: fontBody, fontWeight: 500 },
    subtitle2: { fontFamily: fontBody, fontWeight: 600 },
    button: { fontFamily: fontDisplay, fontWeight: 700, textTransform: "none", letterSpacing: 0 },
    caption: { fontFamily: fontMono, letterSpacing: "0.02em" },
  },
  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: { main: tokens.currentDark, contrastText: "#FFFFFF" },
        secondary: { main: tokens.signalDark, contrastText: "#1A1200" },
        background: { default: tokens.paperLight, paper: "#FFFFFF" },
        text: { primary: "#101828", secondary: tokens.textLightSecondary },
        divider: "rgba(16,24,40,0.08)",
        success: { main: "#12B76A" },
        error: { main: "#E5484D" },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: { main: tokens.current, contrastText: "#032420" },
        secondary: { main: tokens.signal, contrastText: "#1A1200" },
        background: { default: tokens.ink, paper: tokens.panel },
        text: { primary: "#E7ECF3", secondary: "#8B95A7" },
        divider: tokens.line,
        success: { main: "#2FD98A" },
        error: { main: "#FF6B6B" },
      },
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "@keyframes livePulse": {
          "0%": { boxShadow: `0 0 0 0 rgba(34,211,196,0.55)` },
          "70%": { boxShadow: `0 0 0 8px rgba(34,211,196,0)` },
          "100%": { boxShadow: `0 0 0 0 rgba(34,211,196,0)` },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "none",
        }),
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        title: { fontFamily: fontDisplay, fontWeight: 700, fontSize: "1.05rem" },
        subheader: { fontFamily: fontBody },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 16, fontFamily: fontDisplay, fontWeight: 700 },
        contained: ({ theme }) => ({
          "&:hover": {
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 0 0 1px rgba(34,211,196,0.4)"
                : "none",
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: fontMono, fontWeight: 500, borderRadius: 6 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "none",
          fontFamily: fontBody,
          "& .MuiDataGrid-cell": { fontFamily: fontMono, fontSize: "0.85rem", display: "flex", alignItems: "center" },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontFamily: fontDisplay,
            fontWeight: 700,
            fontSize: "0.72rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          },
        },
      },
    },
  },
});

export default theme;