import axios from "axios";

const API = axios.create({
  baseURL: "/api",
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
