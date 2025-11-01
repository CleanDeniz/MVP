import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";
import { authMiddleware } from "./telegramAuth.js";

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGINS = String(process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const ADMIN_TG_IDS = String(process.env.ADMIN_TG_IDS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const app = express();

// CORS — разрешим локал и ngrok фронта
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CLIENT_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*"); // для теста
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Telegram-Init-Data, x-telegram-init-data");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// Telegram WebApp auth
app.use(authMiddleware);

// вспомогалки
function getUserByTgId(tg_id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE tg_id = ?", [String(tg_id)], (e, row) =>
      e ? reject(e) : resolve(row)
    );
  });
}
function createUserByTgId(tg_id, username) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (tg_id, username, balance, role) VALUES (?, ?, 0, 'user')",
      [String(tg_id), username || ""],
      function (e) {
        if (e) return reject(e);
        db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (e2, row) =>
          e2 ? reject(e2) : resolve(row)
        );
      }
    );
  });
}
function ensureUser(req, res, next) {
  const tg = req.tgUser;
  if (!tg?.id) return res.status(401).json({ error: "no tg user" });

  getUserByTgId(tg.id)
    .then((row) => (row ? row : createUserByTgId(tg.id, tg.username)))
    .then((user) => {
      // авто-админ по списку
      if (ADMIN_TG_IDS.includes(String(tg.id)) && user.role !== "admin") {
        db.run("UPDATE users SET role = 'admin' WHERE id = ?", [user.id], () => {});
        user.role = "admin";
      }
      req.userDb = user;
      next();
    })
    .catch((e) => {
      console.error(e);
      res.status(500).json({ error: "db error" });
    });
}
app.use(ensureUser);

// === Пользовательские роуты ===
app.get("/api/user/me", (req, res) => {
  res.json({ user: req.userDb, tgUser: req.tgUser });
});

app.post("/api/user/phone", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });
  db.run("UPDATE users SET phone = ? WHERE id = ?", [phone, req.userDb.id], (e) => {
    if (e) return res.status(500).json({ error: "db error" });
    db.get("SELECT * FROM users WHERE id = ?", [req.userDb.id], (e2, row) =>
      e2 ? res.status(500).json({ error: "db error" }) : res.json({ user: row })
    );
  });
});

app.get("/api/services", (req, res) => {
  db.all("SELECT * FROM services WHERE active = 1 ORDER BY id DESC", (e, rows) =>
    e ? res.status(500).json({ error: "db error" }) : res.json({ services: rows })
  );
});

app.post("/api/user/redeem", (req, res) => {
  const { serviceId } = req.body;
  if (!serviceId) return res.status(400).json({ error: "serviceId required" });
  const user = req.userDb;

  db.get("SELECT * FROM services WHERE id = ? AND active = 1", [serviceId], (e, svc) => {
    if (e || !svc) return res.status(404).json({ error: "service not found" });

    db.get(
      "SELECT id FROM purchases WHERE user_id = ? AND service_id = ?",
      [user.id, svc.id],
      (e2, own) => {
        if (own) return res.status(409).json({ error: "already purchased" });
        if (user.balance < svc.price) return res.status(400).json({ error: "insufficient balance" });

        db.run("BEGIN");
        db.run("INSERT INTO purchases (user_id, service_id) VALUES (?, ?)", [user.id, svc.id]);
        db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [svc.price, user.id]);
        db.run("COMMIT", (e3) => {
          if (e3) return res.status(500).json({ error: "redeem failed" });
          res.json({ ok: true });
        });
      }
    );
  });
});

app.get("/api/user/purchases", (req, res) => {
  db.all(
    `SELECT p.id, p.created_at, s.title, s.partner, s.price
     FROM purchases p JOIN services s ON s.id = p.service_id
     WHERE p.user_id = ?
     ORDER BY p.id DESC`,
    [req.userDb.id],
    (e, rows) => (e ? res.status(500).json({ error: "db error" }) : res.json({ items: rows }))
  );
});

// === Админка ===
function requireAdmin(req, res, next) {
  if (req.userDb?.role !== "admin") return res.status(403).json({ error: "forbidden" });
  next();
}

app.get("/api/admin/users", requireAdmin, (req, res) => {
  db.all("SELECT id, tg_id, username, phone, balance, role FROM users ORDER BY id DESC", (e, rows) =>
    e ? res.status(500).json({ error: "db error" }) : res.json({ users: rows })
  );
});

app.post("/api/admin/bonus", requireAdmin, (req, res) => {
  const { phone, amount } = req.body;
  const amt = Number(amount);
  if (!phone || !Number.isInteger(amt)) return res.status(400).json({ error: "bad payload" });

  db.get("SELECT * FROM users WHERE phone = ?", [phone], (e, user) => {
    if (e) return res.status(500).json({ error: "db error" });
    if (!user) {
      db.run("INSERT INTO users (phone, balance, role) VALUES (?, ?, 'user')", [phone, amt], function (e2) {
        if (e2) return res.status(500).json({ error: "db error" });
        db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (e3, row) =>
          e3 ? res.status(500).json({ error: "db error" }) : res.json({ ok: true, user: row })
        );
      });
    } else {
      db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [amt, user.id], (e2) => {
        if (e2) return res.status(500).json({ error: "db error" });
        db.get("SELECT * FROM users WHERE id = ?", [user.id], (e3, row) =>
          e3 ? res.status(500).json({ error: "db error" }) : res.json({ ok: true, user: row })
        );
      });
    }
  });
});

app.post("/api/admin/services", requireAdmin, (req, res) => {
  const { title, partner, price, description } = req.body;
  if (!title || price === undefined) return res.status(400).json({ error: "title and price required" });

  db.run(
    "INSERT INTO services (title, partner, price, description, active) VALUES (?, ?, ?, ?, 1)",
    [title, partner || "", Number(price), description || ""],
    function (e) {
      if (e) return res.status(500).json({ error: "db error" });
      db.get("SELECT * FROM services WHERE id = ?", [this.lastID], (e2, row) =>
        e2 ? res.status(500).json({ error: "db error" }) : res.json({ ok: true, service: row })
      );
    }
  );
});

app.patch("/api/admin/services/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { title, partner, price, description, active } = req.body;

  db.get("SELECT * FROM services WHERE id = ?", [id], (e, cur) => {
    if (e || !cur) return res.status(404).json({ error: "not found" });
    const newTitle = title ?? cur.title;
    const newPartner = partner ?? cur.partner;
    const newPrice = price !== undefined ? Number(price) : cur.price;
    const newDesc = description ?? cur.description;
    const newActive = active !== undefined ? Number(active) : cur.active;

    db.run(
      "UPDATE services SET title=?, partner=?, price=?, description=?, active=? WHERE id=?",
      [newTitle, newPartner, newPrice, newDesc, newActive, id],
      (e2) => {
        if (e2) return res.status(500).json({ error: "db error" });
        db.get("SELECT * FROM services WHERE id = ?", [id], (e3, row) =>
          e3 ? res.status(500).json({ error: "db error" }) : res.json({ ok: true, service: row })
        );
      }
    );
  });
});

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "client_build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client_build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ API on http://localhost:${PORT}`);
});
