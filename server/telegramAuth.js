import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const data = {};
  for (const [k, v] of params.entries()) data[k] = v;

  try {
    if (data.user) data.user = JSON.parse(data.user);
  } catch {}
  return data;
}

function checkTelegramAuth(initData) {
  // верификация по официальной схеме
  const data = parseInitData(initData);
  const hash = data.hash;
  const pairs = Object.keys(data)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const signature = crypto.createHmac("sha256", secret).update(pairs).digest("hex");

  return signature === hash ? data : null;
}

export function authMiddleware(req, res, next) {
  // initData клиент шлёт в заголовке "x-telegram-init-data"
  const initData = req.headers["x-telegram-init-data"];
  if (!initData) return res.status(401).json({ error: "missing initData" });

  const tg = checkTelegramAuth(initData);
  if (!tg) return res.status(401).json({ error: "invalid initData" });

  req.tgUser = tg.user || null;
  next();
}
