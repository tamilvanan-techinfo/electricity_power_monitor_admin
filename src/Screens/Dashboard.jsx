// src/pages/Dashboard.jsx
import React from "react";
import { Box, Typography, Stack, Chip } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import CycleSection from "../components/CycleSection";
import ParticipantSection from "../components/ParticipantSection";
import ParticipantCycleSection from "../components/ParticipantCycleSection";
import LiveDot from "../components/LiveDot";

function Dashboard() {
  return (
    <Box sx={{ p: 3, minHeight: "100vh" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 3 }}
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
                bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(34,211,196,0.14)" : "rgba(15,156,144,0.10)"),
              }}
            >
              <BoltIcon sx={{ fontSize: 20, color: "primary.main" }} />
            </Box>
            <Typography variant="h4" fontWeight={800}>
              Admin Dashboard
            </Typography>
          </Stack>
        
        </Box>

        <Chip
          icon={<LiveDot size={7} sx={{ ml: "6px !important" }} />}
          label="LIVE"
          variant="outlined"
          sx={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            letterSpacing: "0.06em",
            borderColor: "primary.main",
            color: "primary.main",
            "& .MuiChip-icon": { color: "inherit" },
          }}
        />
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
        <CycleSection />
        <ParticipantSection />
      </Stack>
      <Stack sx={{ mt: 3 }}>
        <ParticipantCycleSection />
      </Stack>
    </Box>
  );
}

export default Dashboard;