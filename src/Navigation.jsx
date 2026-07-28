import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

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
    icon: <ShoppingCartIcon />,
  },
  {
    segment: "ManualScoring",
    title: "Manual Scoring",
    icon: <ShoppingCartIcon />,
  },
];

export default NAVIGATION;