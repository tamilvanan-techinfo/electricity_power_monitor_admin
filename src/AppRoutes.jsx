import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./Screens/LoginPage";
import AppShell from "./AppShell";
import DashboardPage from "./Screens/Dashboard";
import ScreenManager from "./Screens/ScreenManager";
const protectedRoutes = [
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
  // Add more protected pages here
  {
    path: "/screenManager",
    element: <ScreenManager />,
  },
];

export default function AppRoutes() {
  const token = localStorage.getItem("access");
  const isAuthenticated = !!token;

  return (
    <Routes>
      <Route
        path="/login"
        element={
         
            <LoginPage />
        }
      />

      {protectedRoutes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={
            isAuthenticated ? (
              <AppShell>{element}</AppShell>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      ))}

      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? "/dashboard" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}