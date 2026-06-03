import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const authAPI = axios.create({ baseURL: "/api/auth", timeout: 12000 });

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* Restore session from localStorage on mount */
  useEffect(() => {
    const raw = localStorage.getItem("visionguide_user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        /* Only restore if a token is present — stale entries without tokens are cleared */
        if (parsed?.token) setUser(parsed);
        else               localStorage.removeItem("visionguide_user");
      } catch {
        localStorage.removeItem("visionguide_user");
      }
    }
    setLoading(false);
  }, []);

  const _saveSession = (u) => {
    setUser(u);
    localStorage.setItem("visionguide_user", JSON.stringify(u));
  };

  /* ── Sign Up ── */
  const signUp = async (name, email, password) => {
    try {
      const { data } = await authAPI.post("/register", { name, email, password });
      _saveSession({ id: data.id, name: data.name, email: data.email, token: data.token });
      return { success: true };
    } catch (err) {
      if (err.response?.status === 409)
        return { success: false, error: "Email already registered. Please sign in." };
      const msg = err.response?.data?.message || "Registration failed. Check your connection and try again.";
      return { success: false, error: msg };
    }
  };

  /* ── Sign In ── */
  const signIn = async (email, password) => {
    try {
      const { data } = await authAPI.post("/login", { email, password });
      _saveSession({ id: data.id, name: data.name, email: data.email, token: data.token });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || "Sign in failed. Check your connection and try again.";
      return { success: false, error: msg };
    }
  };

  /* ── Sign Out ── */
  const signOut = () => {
    setUser(null);
    localStorage.removeItem("visionguide_user");
    localStorage.removeItem("visionguide_users"); // clear legacy fallback storage
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
