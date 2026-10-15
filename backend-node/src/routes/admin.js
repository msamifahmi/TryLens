// API admin katalog TryLens. Auth: header `Authorization: Bearer <ADMIN_TOKEN>` (+ X-TryLens: 1 seperti rute lain).
// Dipakai halaman /admin dan agen (Hermes). Semua perubahan lewat validasi server; tidak ada JSON mentah yang ditulis tangan.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import express from "express";
import { inspectGlb, isJpeg } from "../glb.js";
import { bad } from "./util.js";
import { cleanMerchant, cleanProduct, merchantOut, productOut, validId } from "../catalogStore.js";

const VARIANTS = ["main", "side", "detail", "close"];
const sha = (s) => crypto.createHash("sha256").update(s).digest();
const now = () => new Date().toISOString();

export function adminRouter({ config, db }) {
  const r = Router();
  const fails = new Map(); // ip → { n, until }

  r.use((req, res, next) => {
    const tok = config.adminToken;
    if (!tok || tok.length < 24) return bad(res, "API admin nonaktif: set ADMIN_TOKEN (≥ 24 karakter) di server.", 503);
    const f = fails.get(req.ip);
    if (f && f.n >= 10 && Date.now() < f.until) return bad(res, "Terlalu banyak percobaan. Coba lagi nanti.", 429);
    const given = /^Bearer (.+)$/.exec(req.headers.authorization || "")?.[1] || "";
    if (!crypto.timingSafeEqual(sha(given), sha(tok))) {
      const cur = fails.get(req.ip) || { n: 0, until: 0 };
      fails.set(req.ip, { n: cur.n + 1, until: Date.now() + 10 * 60e3 });
      return bad(res, "Token admin salah.", 401);
    }
    fails.delete(req.ip);
    next();
  });

  const merchantExists = (id) => !!db.prepare("SELECT 1 FROM merchants WHERE id=?").get(id);
  const getM = (id) => db.prepare("SELECT * FROM merchants WHERE id=?").get(id);
  const getP = (id) => db.prepare("SELECT * FROM products WHERE id=?").get(id);
  const dirOf = (id) => path.join(config.uploadsDir, id);

  r.get("/ping", (req, res) => res.json({ ok: true }));

  /* ---- toko */
  r.get("/merchants", (req, res) => res.json({ merchants: db.prepare("SELECT * FROM merchants ORDER BY rowid").all().map(merchantOut) }));
  r.post("/merchants", (req, res) => {
    const id = req.body?.id ? String(req.body.id) : `m${db.prepare("SELECT COUNT(*) c FROM merchants").get().c + 1 + Math.floor(Math.random() * 1000)}`;
    if (!validId(id)) return bad(res, "ID toko tidak valid (huruf/angka/_/-, ≤ 40).");
    if (getM(id)) return bad(res, "ID toko sudah ada.", 409);
    const o = cleanMerchant(req.body || {});
    const t = now();
    db.prepare(`INSERT INTO merchants(id,name,city,province,initials,color,whatsapp,phone,link_instagram,link_x,link_tokopedia,link_shopee,published,created_at,updated_at)
      VALUES(@id,@name,@city,@province,@initials,@color,@whatsapp,@phone,@link_instagram,@link_x,@link_tokopedia,@link_shopee,@published,@t,@t)`)
      .run({ link_instagram: null, link_x: null, link_tokopedia: null, link_shopee: null, ...o, id, t });
    res.status(201).json({ merchant: merchantOut(getM(id)) });
  });
  r.patch("/merchants/:id", (req, res) => {
    const prev = getM(req.params.id);
    if (!prev) return bad(res, "Toko tidak ditemukan.", 404);
    const o = cleanMerchant(req.body || {}, prev);
    db.prepare(`UPDATE merchants SET name=@name,city=@city,province=@province,initials=@initials,color=@color,whatsapp=@whatsapp,phone=@phone,
      link_instagram=@link_instagram,link_x=@link_x,link_tokopedia=@link_tokopedia,link_shopee=@link_shopee,published=@published,updated_at=@t WHERE id=@id`).run({ ...o, t: now() });
    res.json({ merchant: merchantOut(getM(prev.id)) });
  });
  r.delete("/merchants/:id", (req, res) => {
    if (!getM(req.params.id)) return bad(res, "Toko tidak ditemukan.", 404);
    const n = db.prepare("SELECT COUNT(*) c FROM products WHERE merchant_id=?").get(req.params.id).c;
    if (n) return bad(res, `Toko masih punya ${n} produk. Pindahkan/hapus dulu, atau sembunyikan toko (published:false).`, 409);
    db.prepare("DELETE FROM merchants WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  });

  /* ---- produk */
  r.get("/products", (req, res) => {
    const rows = db.prepare("SELECT * FROM products ORDER BY rowid").all().map(productOut);
    const q = String(req.query.merchantId || "");
    res.json({ products: q ? rows.filter((p) => p.merchantId === q) : rows });
  });
  r.get("/products/:id", (req, res) => {
    const p = getP(req.params.id);
    return p ? res.json({ product: productOut(p) }) : bad(res, "Produk tidak ditemukan.", 404);
  });

  const COLS = ["merchant_id", "name", "style", "color_key", "category", "price", "old_price", "stock", "description", "buy_tokopedia", "buy_shopee", "buy_lazada", "buy_tiktokshop", "buy_website", "lens_width_mm", "lens_height_mm", "bridge_mm", "temple_mm", "frame_width_mm", "weight_g", "material", "vto", "published"];
  const nextId = () => {
    const nums = db.prepare("SELECT id FROM products").all().map((x) => /^f(\d+)$/.exec(x.id)?.[1]).filter(Boolean).map(Number);
    return "f" + (Math.max(23, ...nums) + 1);
  };
  r.post("/products", (req, res) => {
    const b = req.body || {};
    const id = b.id ? String(b.id) : nextId();
    if (!validId(id)) return bad(res, "ID produk tidak valid (huruf/angka/_/-, ≤ 40).");
    if (getP(id) || db.prepare("SELECT 1 FROM frames WHERE id=?").get(id)) return bad(res, "ID produk sudah dipakai.", 409);
    const o = cleanProduct(b, null, { merchantExists });
    const t = now();
    const full = Object.fromEntries(COLS.map((c) => [c, o[c] ?? null]));
    db.prepare(`INSERT INTO products(id,${COLS.join(",")},created_at,updated_at) VALUES(@id,${COLS.map((c) => "@" + c).join(",")},@t,@t)`).run({ ...full, id, t });
    res.status(201).json({ product: productOut(getP(id)) });
  });
  r.patch("/products/:id", (req, res) => {
    const prev = getP(req.params.id);
    if (!prev) return bad(res, "Produk tidak ditemukan.", 404);
    const o = cleanProduct(req.body || {}, prev, { merchantExists });
    db.prepare(`UPDATE products SET ${COLS.map((c) => `${c}=@${c}`).join(",")},updated_at=@t WHERE id=@id`).run({ ...Object.fromEntries(COLS.map((c) => [c, o[c] ?? null])), id: prev.id, t: now() });
    res.json({ product: productOut(getP(prev.id)) });
  });
  r.delete("/products/:id", (req, res) => {
    if (!getP(req.params.id)) return bad(res, "Produk tidak ditemukan.", 404);
    db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
    fs.rmSync(dirOf(req.params.id), { recursive: true, force: true });
    res.json({ ok: true });
  });

  /* ---- berkas: PUT /products/:id/assets/photo-0..3 | model  (badan = JPEG / GLB mentah) */
  const raw = express.raw({ type: () => true, limit: Math.max(config.maxGlbBytes, config.maxPhotoBytes) + 1024 });
  const slotOf = (s) => (s === "model" ? { file: "model.glb" } : /^photo-[0-3]$/.test(s) ? { file: `${VARIANTS[+s.slice(6)]}.jpg`, index: +s.slice(6) } : null);
  const countPhotos = (id) => { let n = 0; while (n < config.maxPhotos && fs.existsSync(path.join(dirOf(id), `${VARIANTS[n]}.jpg`))) n++; return n; };
  const refresh = (id, rig) => {
    const hasModel = fs.existsSync(path.join(dirOf(id), "model.glb")) ? 1 : 0;
    db.prepare("UPDATE products SET photos=?, has_model=?, rig=?, media_v=media_v+1, updated_at=? WHERE id=?")
      .run(countPhotos(id), hasModel, hasModel ? (rig === undefined ? getP(id).rig : rig && JSON.stringify(rig)) : null, now(), id);
    // vto otomatis menyala saat model ada (tetap bisa dimatikan manual lewat PATCH).
    if (hasModel && rig) db.prepare("UPDATE products SET vto=1 WHERE id=?").run(id);
    if (!hasModel) db.prepare("UPDATE products SET vto=0 WHERE id=?").run(id);
  };
  r.put("/products/:id/assets/:slot", raw, (req, res) => {
    const p = getP(req.params.id);
    if (!p) return bad(res, "Produk tidak ditemukan. Buat produknya dulu.", 404);
    const slot = slotOf(req.params.slot);
    if (!slot) return bad(res, "Slot tidak dikenal. Pakai photo-0..photo-3 atau model.");
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let rig, warnings = [];
    if (slot.file === "model.glb") {
      const info = inspectGlb(buf, config.maxGlbBytes);
      if (!info.ok) return bad(res, info.error, 415);
      rig = info.rig; warnings = info.warnings;
    } else {
      if (buf.length > config.maxPhotoBytes) return bad(res, "Foto melebihi 5 MB.", 413);
      if (!isJpeg(buf)) return bad(res, "Foto harus JPEG.", 415);
      if (slot.index > countPhotos(p.id)) return bad(res, "Isi foto utama (photo-0) dulu.");
    }
    fs.mkdirSync(dirOf(p.id), { recursive: true });
    fs.writeFileSync(path.join(dirOf(p.id), slot.file), buf);
    refresh(p.id, rig);
    res.json({ product: productOut(getP(p.id)), warnings });
  });
  r.delete("/products/:id/assets/:slot", (req, res) => {
    const p = getP(req.params.id);
    const slot = slotOf(req.params.slot);
    if (!p || !slot) return bad(res, "Produk atau slot tidak ditemukan.", 404);
    fs.rmSync(path.join(dirOf(p.id), slot.file), { force: true });
    if (slot.index !== undefined) for (let i = slot.index; i < config.maxPhotos - 1; i++) {
      const from = path.join(dirOf(p.id), `${VARIANTS[i + 1]}.jpg`);
      if (fs.existsSync(from)) fs.renameSync(from, path.join(dirOf(p.id), `${VARIANTS[i]}.jpg`));
    }
    refresh(p.id, null);
    res.json({ product: productOut(getP(p.id)) });
  });

  /* ---- cadangan */
  r.get("/export", (req, res) => res.json({
    exportedAt: now(),
    merchants: db.prepare("SELECT * FROM merchants ORDER BY rowid").all().map(merchantOut),
    products: db.prepare("SELECT * FROM products ORDER BY rowid").all().map(productOut)
  }));

  // Galat validasi (cleanMerchant/cleanProduct) membawa `status` → balas JSON, bukan 500.
  // eslint-disable-next-line no-unused-vars
  r.use((err, req, res, next) => {
    if (err.status) return bad(res, err.message, err.status);
    if (/CHECK constraint|FOREIGN KEY|UNIQUE/.test(err.message || "")) return bad(res, "Data tidak memenuhi aturan basis data.", 400);
    next(err);
  });

  return r;
}
