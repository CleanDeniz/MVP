// server/db.js
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// --- Определяем путь к базе данных ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data.db");

// --- Создаём подключение к SQLite ---
const db = new sqlite3.Database(dbPath, err => {
  if (err) console.error("❌ DB connection error:", err);
  else console.log(`✅ SQLite ready: ${dbPath}`);
});

// --- Инициализация таблиц ---
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_id TEXT UNIQUE,
      username TEXT,
      phone TEXT,
      balance INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      partner TEXT,
      description TEXT,
      price INTEGER,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      service_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );
  `);

  console.log("✅ Tables initialized");
});

// --- Автоматическое назначение админов из .env ---
if (process.env.ADMIN_TG_IDS) {
  const admins = process.env.ADMIN_TG_IDS.split(",").map(id => id.trim());
  admins.forEach(tg_id => {
    db.get("SELECT * FROM users WHERE tg_id = ?", [tg_id], (err, row) => {
      if (err) return console.error("DB error:", err);
      if (row && row.role !== "admin") {
        db.run("UPDATE users SET role = 'admin' WHERE tg_id = ?", tg_id);
        console.log(`⭐ Updated admin role for TG ${tg_id}`);
      } else if (!row) {
        db.run(
          "INSERT INTO users (tg_id, username, role, balance) VALUES (?, ?, 'admin', 0)",
          tg_id,
          "admin"
        );
        console.log(`👑 Created new admin user for TG ${tg_id}`);
      }
    });
  });
}

export default db;
