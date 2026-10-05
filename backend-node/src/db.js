import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export function openDb(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      doc TEXT NOT NULL,                -- JSON: store, subscription, collections, banners, adOrders, invoices, vto, storeSettings, notif, notifRead
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
    CREATE TABLE IF NOT EXISTS frames (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      data TEXT NOT NULL,               -- JSON: name, style, colorKey, category, price, oldPrice, stock, published, vto
      published INTEGER NOT NULL DEFAULT 1,
      photos INTEGER NOT NULL DEFAULT 0,
      has_model INTEGER NOT NULL DEFAULT 0,
      rig TEXT,                         -- JSON hasil inspeksi .glb
      media_v INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_frames_account ON frames(account_id);
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,               -- subscription | ad
      payload TEXT NOT NULL,            -- JSON pesanan yang sudah dihitung server
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',  -- pending | paid
      method TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT
    );
    CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
  `);
  return db;
}

export const nextCounter = (db, name) => {
  db.prepare("INSERT INTO counters(name,value) VALUES(?,0) ON CONFLICT(name) DO NOTHING").run(name);
  db.prepare("UPDATE counters SET value=value+1 WHERE name=?").run(name);
  return db.prepare("SELECT value FROM counters WHERE name=?").get(name).value;
};
