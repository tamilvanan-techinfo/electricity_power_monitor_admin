import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TvIcon from '@mui/icons-material/Tv';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';

const NAVIGATION = [
  {
    kind: "header",
    title: "Main items",
  },
  {
    segment: "dashboard",
    title: "Dashboard",
    icon: <DashboardIcon />,
  },
  {
    segment: "ScreenManager",
    title: "Screen Manager",
    icon: <TvIcon />,
  },
  {
    segment: "ManualScoring",
    title: "Manual Scoring",
    icon: <ScoreboardIcon />,
  },
];

export default NAVIGATION;