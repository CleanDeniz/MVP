import axios from "axios";

// Укажи адрес API сервера (локальный или ngrok)
const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export async function apiGET(path) {
  const initData = window.Telegram?.WebApp?.initData || "";
  const { data } = await axios.get(`${API_URL}${path}`, {
    headers: { "X-Telegram-Init-Data": initData }
  });
  return data;
}

export async function apiPOST(path, body) {
  const initData = window.Telegram?.WebApp?.initData || "";
  const { data } = await axios.post(`${API_URL}${path}`, body, {
    headers: { "X-Telegram-Init-Data": initData }
  });
  return data;
}

export async function apiPATCH(path, body) {
  const initData = window.Telegram?.WebApp?.initData || "";
  const { data } = await axios.patch(`${API_URL}${path}`, body, {
    headers: { "X-Telegram-Init-Data": initData }
  });
  return data;
}
