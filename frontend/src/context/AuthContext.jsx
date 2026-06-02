import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const authAPI = axios.create({ baseURL: "/api/auth", timeout: 12000 });

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("visionguide_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const _saveSession = (u) => {
    setUser(u);
    localStorage.setItem("visionguide_user", JSON.stringify(u));
  };

  /* ─── Sign Up: try Supabase backend first, fall back to localStorage ─── */
  const signUp = async (name, email, password) => {
    try {
      const { data } = await authAPI.post("/register", { name, email, password });
      _saveSession({ id: data.id, name: data.name, email: data.email });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || "";

      // Already registered in Supabase → try sign-in
      if (err.response?.status === 409)
        return { success: false, error: "Email already registered. Please sign in." };

      // Backend unavailable → fall back to localStorage
      const users = JSON.parse(localStorage.getItem("visionguide_users") || "[]");
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase()))
        return { success: false, error: "Email already registered. Please sign in." };

      const newUser = { id: Date.now(), name, email: email.toLowerCase(), password, createdAt: new Date().toISOString() };
      users.push(newUser);
      localStorage.setItem("visionguide_users", JSON.stringify(users));
      _saveSession({ id: newUser.id, name, email: newUser.email });
      return { success: true };
    }
  };

  /* ─── Sign In: try Supabase backend first, fall back to localStorage ─── */
  const signIn = async (email, password) => {
    // Always try backend first (works cross-device + cross-origin)
    try {
      const { data } = await authAPI.post("/login", { email, password });
      _saveSession({ id: data.id, name: data.name, email: data.email });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || "";

      // Email not confirmed in Supabase
      if (err.response?.status === 403)
        return { success: false, error: "Please confirm your email inbox first. (Or ask admin to disable email confirmation in Supabase.)" };

      // Backend unavailable or wrong credentials → try localStorage fallback
      const users = JSON.parse(localStorage.getItem("visionguide_users") || "[]");
      const found = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (found) {
        _saveSession({ id: found.id, name: found.name, email: found.email });
        return { success: true };
      }

      // Nothing found anywhere
      return { success: false, error: "Invalid email or password. If you registered before, please create a new account." };
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("visionguide_user");
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
