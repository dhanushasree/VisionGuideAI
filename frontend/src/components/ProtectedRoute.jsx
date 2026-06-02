import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#0a0f1e" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;
  return children;
}
