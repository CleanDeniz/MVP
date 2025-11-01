// server/telegramAuth.js
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

/**
 * Верификация initData по доке Telegram Web Apps:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
function verifyInitData(initData, botToken) {
  // initData приходит как строка "query_id=...&user=...&auth_date=...&hash=..."
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  // соберём data-check-string
  const data = [];
  for (const [key, value] of Array.from(params.entries()).sort()) {
    data.push(`${key}=${value}`);
  }
  const dataCheckString = data.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(calc, "hex"), Buffer.from(hash, "hex"));
}

export function authMiddleware(req, res, next) {
  try {
    const botToken = process.env.BOT_TOKEN;
    // берём init data из заголовка (клиент отправляет) или из hash URL (если проксируем напрямую)
    const headerInit = req.headers["x-telegram-init-data"];
    let initData = headerInit || "";

    if (!initData && req.query && req.query.tgWebAppData) {
      initData = req.query.tgWebAppData;
    }
    // DEV: спец-режим, чтобы не тормозить демо (укажи ?dev=1&tg_id=... в запросах)
    if (process.env.NODE_ENV !== "production" && req.query?.dev === "1") {
      const fakeId = req.query.tg_id || "999999";
      req.tgUser = { id: String(fakeId), username: "dev_user" };
      return next();
    }

    if (!botToken || !initData) {
      return res.status(401).json({ error: "missing initData" });
    }

    if (!verifyInitData(initData, botToken)) {
      return res.status(401).json({ error: "bad initData" });
    }

    // распарсим user из initData
    const params = new URLSearchParams(initData);
    const userJson = params.get("user");
    if (userJson) {
      const user = JSON.parse(decodeURIComponent(userJson));
      req.tgUser = { id: String(user.id), username: user.username || null };
    } else {
      req.tgUser = null;
    }
    next();
  } catch (e) {
    console.error("auth error:", e);
    res.status(401).json({ error: "auth failed" });
  }
}
