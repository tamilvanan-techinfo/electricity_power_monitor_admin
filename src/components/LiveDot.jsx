// src/components/LiveDot.jsx
//
// The one signature element of this design: a small glowing dot with a soft
// pulse, used anywhere something is real-time (live WebSocket connection,
// an active screen, the brand mark). Ties the visual language directly to
// the product's subject — live power telemetry — instead of decorating.
import React from "react";
import { Box } from "@mui/material";

export default function LiveDot({ size = 8, color, sx = {} }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: color || "primary.main",
        animation: "livePulse 2s ease-in-out infinite",
        flexShrink: 0,
        ...sx,
      }}
    />
  );
}