// src/Screens/ScoreUpdate.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Avatar,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BoltIcon from "@mui/icons-material/Bolt";

import config from "../config.json";

const API_BASE = config.apiBase;
const defaultForm = {
  id: null,
  participent_name: "",
  cycle_no: "",
  power: "",
  voltage: "",
  amperage: "",
};

function ManualScoring() {
  return (
    <div>ManualScoring</div>
  )
}

export default ManualScoring