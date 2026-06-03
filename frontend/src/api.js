import axios from "axios";

/*
 * In dev:  VITE_API_URL is unset → baseURL is "/api" → Vite proxy forwards to localhost:5000
 * In prod: VITE_API_URL=https://your-backend.railway.app → axios calls the backend directly
 */
const BASE = import.meta.env.VITE_API_URL ?? "";

const API = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15000,
});

/* Attach the JWT session token on every request (read fresh from localStorage) */
API.interceptors.request.use((config) => {
  try {
    const raw  = localStorage.getItem("visionguide_user");
    const user = raw ? JSON.parse(raw) : null;
    if (user?.token) {
      config.headers["x-session-token"] = user.token;
    }
  } catch {}
  return config;
});

export default API;
