// server/db.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Определяем путь к базе данных
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data.db");

// Подключаемся к базе (синхронно, моментально)
const db = new Database(dbPath);
console.log(`✅ SQLite ready: ${dbPath}`);

// --- Таблица пользователей ---
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id TEXT UNIQUE,
    username TEXT,
    phone TEXT,
    balance INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// --- Таблица услуг ---
db.prepare(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    partner TEXT,
    description TEXT,
    price INTEGER,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// --- Таблица покупок ---
db.prepare(`
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  )
`).run();

console.log("✅ Tables initialized");

// --- Автоматическое назначение админов из .env ---
if (process.env.ADMIN_TG_IDS) {
  const admins = process.env.ADMIN_TG_IDS.split(",").map(id => id.trim());
  for (const tg_id of admins) {
    const existing = db.prepare("SELECT * FROM users WHERE tg_id = ?").get(tg_id);
    if (existing && existing.role !== "admin") {
      db.prepare("UPDATE users SET role = 'admin' WHERE tg_id = ?").run(tg_id);
      console.log(`⭐ Updated admin role for TG ${tg_id}`);
    } else if (!existing) {
      db.prepare(
        "INSERT INTO users (tg_id, username, role, balance) VALUES (?, ?, 'admin', 0)"
      ).run(tg_id, "admin");
      console.log(`👑 Created new admin user for TG ${tg_id}`);
    }
  }
}

export default db;
