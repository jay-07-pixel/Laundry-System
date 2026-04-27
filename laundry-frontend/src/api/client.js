import axios from "axios";
import { clearToken, getToken } from "./authStorage";

/**
 * Must match the API port (e.g. backend `PORT` in .env).
 * Set in laundry-frontend/.env: REACT_APP_API_URL=http://localhost:5001
 */
const baseURL = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const client = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && getToken()) {
      clearToken();
      window.dispatchEvent(new CustomEvent("laundry-auth-lost"));
    }
    return Promise.reject(err);
  }
);

/**
 * Normalizes axios errors for UI messages.
 */
export function getErrorMessage(error) {
  const data = error.response?.data;
  if (data && typeof data === "object") {
    if (typeof data.error === "string") return data.error;
    if (typeof data.message === "string") return data.message;
  }
  if (error.code === "ECONNABORTED") {
    return "Request timed out. Check if the API is running.";
  }
  if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
    return `Cannot reach API at ${baseURL}. Start the backend and check the URL.`;
  }
  return error.message || "Request failed";
}

export { baseURL };
export default client;
