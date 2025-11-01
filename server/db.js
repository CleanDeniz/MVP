// server/db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Абсолютный путь к базе
const dbPath = path.join(__dirname, "data.db");

// Асинхронное открытие базы SQLite
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
      role TEXT DEFAULT 'user'
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
      active INTEGER DEFAULT 1
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

  // --- Проверка, есть ли поле role (для старых баз) ---
  const columns = await db.all(`PRAGMA table_info(users);`);
  const hasRole = columns.some(col => col.name === "role");
  if (!hasRole) {
    await db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';`);
    console.log("🛠️ Added missing column 'role' to users table");
  }
})();

export default dbPromise;
