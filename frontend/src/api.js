import axios from "axios";

// All /api calls go through the Vite proxy (same origin) → no mixed-content issues
const API = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: {
    "x-api-key": "vg_2024_k9mPqR7nXs3wLjT",
  },
});

export default API;
