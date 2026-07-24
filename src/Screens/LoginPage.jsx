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
  InputAdornment,
} from "@mui/material";

import BoltIcon from "@mui/icons-material/Bolt";
// import { tokens } from "../Theme";

export default function LoginPage({ onLogin }) {

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
      {
        username,
        password,
      }
    );

    const data = response.data;

    // Store tokens
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);

    // Store user details
    localStorage.setItem("user_id", data.user_id);
    localStorage.setItem("username", data.username);
    localStorage.setItem("email", data.email);

    // Update auth state if using it
    if (onLogin) {
      onLogin();
    }

    // Navigate after React has processed the state update
    // setTimeout(() => {
        window.location.reload()
      navigate("/dashboard", { replace: true });
    // }, 0);

  } catch (err) {
    setError(
      err.response?.data?.message ||
      "Invalid username or password."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        position: "relative",
        overflow: "hidden",
        // background: `radial-gradient(1200px 600px at 50% -10%, ${tokens.panelAlt} 0%, ${tokens.bg} 60%)`,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 420,
          width: "100%",
          p: 4,
        //   backgroundColor: tokens.panel,
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                mx: "auto",
                mb: 1.5,
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // background: `linear-gradient(135deg, ${tokens.amber}, #E88A00)`,
              }}
            >
              <BoltIcon sx={{ color: "#1A1200" }} />
            </Box>

            <Typography variant="h5">
              Substation Control
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              mt={0.5}
            >
              Sign in to monitor voltage, current and load across the grid.
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
          >
            <Stack spacing={2}>
              <TextField
                label="Username"
                fullWidth
                autoFocus
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" />
                  ),
                }}
              />

              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" />
                  ),
                }}
              />

              {error && (
                <Typography
                  color="error"
                  variant="body2"
                >
                  {error}
                </Typography>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
              >
                {loading
                  ? "Signing In..."
                  : "Enter Control Room"}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
