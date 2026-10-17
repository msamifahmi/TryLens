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
    -- Katalog milik TryLens (dikelola lewat /admin atau API admin). Frame buatan Mitra tetap di tabel frames.
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      province TEXT NOT NULL DEFAULT '',
      initials TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#427AB5',
      whatsapp TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      link_instagram TEXT, link_x TEXT, link_tokopedia TEXT, link_shopee TEXT,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      name TEXT NOT NULL,
      style TEXT NOT NULL,
      color_key TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price > 0),
      old_price INTEGER CHECK (old_price IS NULL OR old_price > price),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      description TEXT NOT NULL DEFAULT '',
      buy_tokopedia TEXT, buy_shopee TEXT, buy_lazada TEXT, buy_tiktokshop TEXT, buy_website TEXT,
      lens_width_mm REAL, lens_height_mm REAL, bridge_mm REAL, temple_mm REAL, frame_width_mm REAL, weight_g REAL, material TEXT,
      vto INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      photos INTEGER NOT NULL DEFAULT 0,
      has_model INTEGER NOT NULL DEFAULT 0,
      rig TEXT,                         -- JSON hasil inspeksi .glb
      media_v INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
    CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK (kind IN ('hero','topbar')),
      headline TEXT NOT NULL, sub TEXT NOT NULL DEFAULT '', cta TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL DEFAULT 'feed', link TEXT, theme TEXT NOT NULL DEFAULT 'blue', illustration TEXT NOT NULL DEFAULT 'face',
      sort INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `);
  seedBanners(db);
  return db;
}

export const nextCounter = (db, name) => {
  db.prepare("INSERT INTO counters(name,value) VALUES(?,0) ON CONFLICT(name) DO NOTHING").run(name);
  db.prepare("UPDATE counters SET value=value+1 WHERE name=?").run(name);
  return db.prepare("SELECT value FROM counters WHERE name=?").get(name).value;
};

/** Iklan bawaan (4 slide beranda + 1 teks atas) dimasukkan SEKALI; menghapus semuanya lewat admin tidak memunculkannya lagi. */
function seedBanners(db) {
  if (db.prepare("SELECT 1 FROM counters WHERE name='banners_seeded'").get()) return;
  const t = new Date().toISOString();
  const rows = [
    ["hero", "Coba Kacamata Sebelum Beli", "Lihat langsung bagaimana frame terlihat di wajahmu dengan virtual try-on.", "Coba Sekarang", "try", null, "blue", "face"],
    ["hero", "Ribuan Frame dari Optik Lokal", "Temukan pilihan frame dari toko optik dan UMKM di kotamu.", "Jelajahi Toko", "merchant", null, "navy", "collection"],
    ["hero", "Temukan Frame yang Cocok untukmu", "Bandingkan gaya, bentuk, dan harga dalam satu tempat.", "Mulai Eksplorasi", "feed", null, "sky", "compare"],
    ["hero", "Promo Frame Pilihan", "Temukan penawaran menarik dari merchant TryLens.", "Lihat Promo", "promo", null, "gold", "promo"],
    ["topbar", "Coba kacamata secara virtual — gratis, tanpa install aplikasi", "", "", "feed", null, "blue", "face"]
  ];
  const ins = db.prepare("INSERT INTO banners(kind,headline,sub,cta,action,link,theme,illustration,sort,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)");
  db.transaction(() => {
    rows.forEach((r, i) => ins.run(...r, i + 1, t, t));
    db.prepare("INSERT OR IGNORE INTO counters(name,value) VALUES('banners_seeded',1)").run();
  })();
}
