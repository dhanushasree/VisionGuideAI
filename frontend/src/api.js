import axios from "axios";

/*
 * In dev:  VITE_API_URL is unset → baseURL is "/api" → Vite proxy forwards to localhost:5000
 * In prod: VITE_API_URL=https://your-backend.railway.app → axios calls the backend directly
 */
const BASE = import.meta.env.VITE_API_URL ?? "";

const API = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 40000, // 40 s — matches Render free-tier cold-start window
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

/* Auto sign-out on 401 — handles expired JWT after 30 days */
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("visionguide_user");
      window.location.href = "/signin";
    }
    return Promise.reject(err);
  }
);

export default API;
