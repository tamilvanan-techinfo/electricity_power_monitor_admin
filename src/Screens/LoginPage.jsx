import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import config from "../config.json";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Alert,
  Divider,
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
      const { data } = await axios.post(
        `${config.apiBase}/api/admin/login/`,
        { username, password }
      );

      const userData = data.data; // ← the actual payload is inside data.data

      localStorage.setItem("access", userData.access);
      localStorage.setItem("refresh", userData.refresh);
      localStorage.setItem("user_id", userData.user_id);
      localStorage.setItem("username", userData.username);
      localStorage.setItem("email", userData.email);

      if (onLogin) onLogin();
      window.location.reload()
      navigate("/dashboard", { replace: true });
    } catch (err) {

        console.log("Error response:", err.response?.data); // add this
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
        bgcolor: tokens.paperLight,
        backgroundImage: `
          radial-gradient(900px 500px at 15% -10%, rgba(15,156,144,0.07) 0%, transparent 60%),
          radial-gradient(700px 500px at 100% 110%, rgba(201,127,0,0.06) 0%, transparent 60%)
        `,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 420,
          width: "100%",
          p: 4.5,
          bgcolor: "#FFFFFF",
          border: `1px solid ${tokens.lineLight}`,
          borderRadius: "16px",
          boxShadow: "0 4px 24px rgba(16,24,40,0.08)",
        }}
      >
        <Stack spacing={3.5}>
          {/* Header */}
          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                mx: "auto",
                mb: 2,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${tokens.currentDark}, ${tokens.current})`,
                boxShadow: `0 4px 14px ${tokens.currentDark}33`,
              }}
            >
              <BoltIcon sx={{ color: "#FFFFFF", fontSize: 26 }} />
            </Box>

            <Typography
              sx={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 800,
                fontSize: "1.4rem",
                color: "#101828",
                letterSpacing: "-0.01em",
              }}
            >
              Energy Monitoring
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: tokens.textLightSecondary,
                fontFamily: "'Inter', sans-serif",
                mt: 0.5,
              }}
            >
              Admin Control Panel
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ mt: 1.5 }}
            >
              <LiveDot size={7} color={tokens.currentDark} />
              <Typography
                variant="caption"
                sx={{
                  color: tokens.textLightSecondary,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.72rem",
                  letterSpacing: "0.04em",
                }}
              >
                grid telemetry online
              </Typography>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: tokens.lineLight }} />

          {/* Form */}
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
                    bgcolor: tokens.paperLight,
                    "& fieldset": { borderColor: tokens.lineLight },
                    "&:hover fieldset": { borderColor: tokens.currentDark },
                    "&.Mui-focused fieldset": { borderColor: tokens.currentDark },
                  },
                  "& .MuiInputLabel-root.Mui-focused": { color: tokens.currentDark },
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
                    bgcolor: tokens.paperLight,
                    "& fieldset": { borderColor: tokens.lineLight },
                    "&:hover fieldset": { borderColor: tokens.currentDark },
                    "&.Mui-focused fieldset": { borderColor: tokens.currentDark },
                  },
                  "& .MuiInputLabel-root.Mui-focused": { color: tokens.currentDark },
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
                  mt: 0.5,
                  bgcolor: tokens.currentDark,
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontFamily: "'Manrope', sans-serif",
                  borderRadius: "8px",
                  "&:hover": {
                    bgcolor: tokens.current,
                    color: "#032420",
                    boxShadow: `0 0 0 3px ${tokens.current}33`,
                  },
                  "&:disabled": { opacity: 0.6 },
                }}
              >
                {loading ? "Signing In…" : "Sign In"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}