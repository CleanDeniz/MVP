// server/db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

// --- Путь к текущей директории ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Абсолютный путь к файлу базы данных ---
const dbPath = path.join(__dirname, "data.db");

// --- Асинхронное подключение SQLite ---
const dbPromise = open({
  filename: dbPath,
  driver: sqlite3.Database
});

(async () => {
  const db = await dbPromise;

  // --- Таблица пользователей ---
  await db.exec(`
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

  // --- Таблица услуг ---
  await db.exec(`
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

  // --- Таблица покупок ---
  await db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      service_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );
  `);

  console.log(`✅ SQLite ready: ${dbPath}`);

  // --- Проверка старой структуры users ---
  const columns = await db.all(`PRAGMA table_info(users);`);
  const hasRole = columns.some(col => col.name === "role");
  if (!hasRole) {
    await db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';`);
    console.log("🛠️ Added missing column 'role' to users table");
  }

  // --- Автоматическое создание админов из .env ---
  if (process.env.ADMIN_TG_IDS) {
    const admins = process.env.ADMIN_TG_IDS.split(",").map(id => id.trim()).filter(Boolean);
    for (const tg_id of admins) {
      const existing = await db.get("SELECT * FROM users WHERE tg_id = ?", tg_id);
      if (existing && existing.role !== "admin") {
        await db.run("UPDATE users SET role = 'admin' WHERE tg_id = ?", tg_id);
        console.log(`⭐ Updated admin role for TG ${tg_id}`);
      } else if (!existing) {
        await db.run("INSERT INTO users (tg_id, username, role, balance) VALUES (?, ?, 'admin', 0)", tg_id, "admin");
        console.log(`👑 Created new admin user for TG ${tg_id}`);
      }
    }
  }
})().catch(err => console.error("❌ DB init error:", err));

export default dbPromise;
