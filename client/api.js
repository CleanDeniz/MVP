// client/api.js
import axios from "axios";

// из .env.front: VITE_SERVER_URL=http://localhost:3001
const BASE = import.meta.env?.VITE_SERVER_URL || "";

function getInitData() {
  // Telegram WebApp даст initData тут
  const fromWebApp = window?.Telegram?.WebApp?.initData;
  if (fromWebApp) return fromWebApp;

  // fallback: если фронт открыт вне Telegram — можно прокинуть через URL
  // ?tgWebAppData=<...>
  const hash = window.location.hash || "";
  const m = hash.match(/tgWebAppData=([^&]+)/);
  if (m) return decodeURIComponent(m[1]);

  return "";
}

const api = axios.create({
  baseURL: BASE,
  withCredentials: false,
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  const initData = getInitData();
  if (initData) cfg.headers["X-Telegram-Init-Data"] = initData;
  return cfg;
});

export async function apiGET(url) {
  const { data } = await api.get(url);
  return data;
}

export async function apiPOST(url, body) {
  const { data } = await api.post(url, body);
  return data;
}
