import axios from "axios";
import { io } from "socket.io-client";

const BASE = import.meta.env.VITE_API_URL || window.location.origin;

const getToken = () => localStorage.getItem("vpspanel_token");
const setToken = (token) => localStorage.setItem("vpspanel_token", token);
const clearToken = () => localStorage.removeItem("vpspanel_token");

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = error?.config?.url?.includes("/api/auth/login");
    if (error?.response?.status === 401 && !isLogin) {
      clearToken();
      window.location.href = "/login";
    }
    if (!error.response) {
      throw new Error("Network error — is the server running?");
    }
    return Promise.reject(error);
  },
);

const connectSocket = () => io(BASE, { auth: { token: getToken() } });

export { api, connectSocket, getToken, setToken, clearToken };
