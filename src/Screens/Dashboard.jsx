// src/pages/Dashboard.jsx
import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import CycleSection from "../components/CycleSection";
import ParticipantSection from "../components/ParticipantSection";
import ParticipantCycleSection from "../components/ParticipantCycleSection";

function Dashboard() {
  return (
    <Box sx={{ p: 3, minHeight: "100vh" }}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Admin Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Manage cycles and participants like products and customers.
      </Typography>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} mt={2}>
        <CycleSection />
        <ParticipantSection />
      </Stack>
      <Stack sx={{mt:5}}>
        <ParticipantCycleSection/>
      </Stack>
    </Box>
  );
}

export default Dashboard;