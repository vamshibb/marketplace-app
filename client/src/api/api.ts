import axios from "axios";
import { env } from "../lib/env";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: env.API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;