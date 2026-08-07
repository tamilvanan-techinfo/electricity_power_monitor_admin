import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import TvIcon from '@mui/icons-material/Tv';
import ScoreboardIcon from '@mui/icons-material/Scoreboard';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';

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
  {
    segment: "FreeTextManager",
    title: "Free Text",
    icon: <TextSnippetIcon />,
  },
];

export default NAVIGATION;