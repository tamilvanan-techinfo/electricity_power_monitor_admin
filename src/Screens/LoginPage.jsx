import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Alert,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import LiveDot from "../components/LiveDot";
import { tokens } from "../Theme";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { data: response } = await axios.post(
        "http://127.0.0.1:8000/api/admin/login/",
        { username, password }
      );

      const data = response.data;

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("username", data.username);
      localStorage.setItem("email", data.email);

      if (onLogin) onLogin();

      // Single navigation — the previous version called both
      // window.location.reload() and navigate() back to back, which meant
      // the reload tore the page down before navigate could ever run.
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        position: "relative",
        overflow: "hidden",
        bgcolor: tokens.ink,
        backgroundImage: `
          radial-gradient(900px 500px at 15% -10%, rgba(34,211,196,0.10) 0%, transparent 60%),
          radial-gradient(700px 500px at 100% 110%, rgba(255,176,32,0.08) 0%, transparent 60%)
        `,
      }}
    >
      {/* faint grid — reads as a control-panel schematic, kept quiet */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${tokens.line}22 1px, transparent 1px), linear-gradient(90deg, ${tokens.line}22 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 0%, transparent 70%)",
        }}
      />

      <Paper
        elevation={0}
        sx={{
          maxWidth: 420,
          width: "100%",
          p: 4.5,
          position: "relative",
          bgcolor: tokens.panel,
          border: `1px solid ${tokens.line}`,
          borderRadius: "16px",
        }}
      >
        <Stack spacing={3.5}>
          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                mx: "auto",
                mb: 2,
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${tokens.current}, ${tokens.currentDark})`,
                boxShadow: `0 0 24px ${tokens.current}40`,
              }}
            >
              <BoltIcon sx={{ color: "#032420", fontSize: 28 }} />
            </Box>

            <Typography
              sx={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 800,
                fontSize: "1.5rem",
                color: "#E7ECF3",
                letterSpacing: "-0.01em",
              }}
            >
              Substation Control
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ mt: 1 }}
            >
              <LiveDot size={7} color={tokens.current} />
              <Typography
                variant="body2"
                sx={{ color: "#8B95A7", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem" }}
              >
                grid telemetry online
              </Typography>
            </Stack>
          </Box>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Username"
                fullWidth
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: tokens.panelAlt,
                    "& fieldset": { borderColor: tokens.line },
                  },
                  "& .MuiInputLabel-root": { color: "#8B95A7" },
                }}
              />

              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: tokens.panelAlt,
                    "& fieldset": { borderColor: tokens.line },
                  },
                  "& .MuiInputLabel-root": { color: "#8B95A7" },
                }}
              />

              {error && (
                <Alert severity="error" variant="outlined" sx={{ borderRadius: "8px" }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.3,
                  bgcolor: tokens.current,
                  color: "#032420",
                  fontWeight: 700,
                  "&:hover": { bgcolor: tokens.currentDark, color: "#fff" },
                }}
              >
                {loading ? "Signing In…" : "Enter Control Room"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}