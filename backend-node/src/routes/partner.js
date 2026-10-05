import express, { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { PLANS } from "../pricing.js";
import { CATEGORIES, COLORS, STYLES } from "../service.js";
import { inspectGlb, isJpeg } from "../glb.js";
import { PLATFORMS, cleanBuyUrl } from "../ecommerce.js";
import { bad, str, wrap } from "./util.js";
import { requireAuth, sessionMiddleware } from "./auth.js";

const VARIANTS = ["main", "side", "detail", "close"];
const ID = /^[A-Za-z0-9_-]{2,40}$/;
const isActive = (doc) => doc.subscription?.status === "active";

export function partnerRouter(ctx) {
  const { db, svc, config } = ctx;
  const r = Router();
  r.use(sessionMiddleware(ctx), requireAuth);

  const dirOf = (frameId) => path.join(config.uploadsDir, frameId);
  const rmFiles = (frameId) => fs.rmSync(dirOf(frameId), { recursive: true, force: true });

  r.get("/me", (req, res) => res.json({ account: svc.account(req.accountId) }));

  /** Perbarui bagian akun yang BOLEH diubah klien. subscription/adOrders/invoices hanya berubah lewat /billing. */
  r.patch("/me", (req, res) => {
    const b = req.body || {};
    const row = svc.q.accById.get(req.accountId);
    const doc = svc.docOf(row);
    let { name, phone } = row;

    if ("name" in b) {
      name = str(b.name, 80);
      if (name.length < 2) return bad(res, "Nama minimal 2 karakter.");
    }
    if ("phone" in b) phone = str(b.phone, 30);

    if (b.store && typeof b.store === "object") {
      const s = b.store, prev = doc.store || {};
      const links = {};
      for (const k of ["instagram", "x", "tokopedia", "shopee"]) {
        const v = str(s.links?.[k], 200);
        if (v && /^https?:\/\//i.test(v)) links[k] = v;
      }
      const first = !prev.setupCompletedAt;
      doc.store = {
        ...prev,
        name: str(s.name, 80) || prev.name || "",
        description: str(s.description, 600),
        city: str(s.city, 80),
        province: str(s.province, 80),
        address: str(s.address, 200),
        whatsapp: str(s.whatsapp, 20).replace(/[^\d]/g, ""),
        phone: str(s.phone, 30),
        color: /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : prev.color || "#427AB5",
        links,
        merchantId: prev.merchantId || `s_${req.accountId}`,
        initials: (str(s.name, 80) || prev.name || "TL").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "TL",
        setupCompletedAt: prev.setupCompletedAt || new Date().toISOString()
      };
      if (first && !doc.store.name) return bad(res, "Nama toko wajib diisi.");
    }

    if (Array.isArray(b.collections)) {
      const mine = new Set(svc.q.framesOf.all(req.accountId).map((f) => f.id));
      doc.collections = b.collections.slice(0, 50).map((c) => ({
        id: str(c.id, 40) || `c-${Date.now().toString(36)}`,
        name: str(c.name, 60) || "Koleksi",
        published: !!c.published,
        frameIds: (Array.isArray(c.frameIds) ? c.frameIds : []).filter((id) => mine.has(id)).slice(0, 500)
      }));
    }
    if (Array.isArray(b.banners)) {
      const byId = new Map(doc.banners.map((x) => [x.id, x]));
      doc.banners = b.banners.filter((x) => byId.has(x?.id)).map((x) => ({
        ...byId.get(x.id), title: str(x.title, 40) || byId.get(x.id).title, subtitle: str(x.subtitle, 80), cta: str(x.cta, 20)
      }));
    }
    if (b.vto && typeof b.vto === "object") {
      doc.vto = { enabled: !!b.vto.enabled, share: !!b.vto.share, tint: ["clear", "tinted", "dark"].includes(b.vto.tint) ? b.vto.tint : doc.vto.tint };
    }
    if (b.storeSettings && typeof b.storeSettings === "object") {
      const s = b.storeSettings;
      doc.storeSettings = { visible: !!s.visible, showContact: !!s.showContact, autoReply: str(s.autoReply, 300), hours: str(s.hours, 100) };
    }
    if (b.notif && typeof b.notif === "object") {
      for (const ev of Object.keys(doc.notif)) for (const ch of ["email", "whatsapp", "app"]) {
        if (typeof b.notif[ev]?.[ch] === "boolean") doc.notif[ev][ch] = b.notif[ev][ch];
      }
    }
    if (Array.isArray(b.notifRead)) doc.notifRead = [...new Set([...doc.notifRead, ...b.notifRead.map((x) => str(x, 80)).filter(Boolean)])].slice(-500);

    if (b.subscription && typeof b.subscription === "object" && doc.subscription) {
      const s = b.subscription;
      if (typeof s.cancelAtPeriodEnd === "boolean") doc.subscription.cancelAtPeriodEnd = s.cancelAtPeriodEnd;
      if ("pendingPlan" in s) {
        // Hanya turun paket (pro → basic) atau membatalkannya; naik paket wajib lewat pembayaran.
        if (s.pendingPlan === null) doc.subscription.pendingPlan = null;
        else if (s.pendingPlan === "basic" && doc.subscription.plan === "pro") doc.subscription.pendingPlan = "basic";
        else return bad(res, "Perubahan paket tidak valid.");
      }
    }
    svc.saveDoc(req.accountId, doc, { name, phone });
    res.json({ account: svc.account(req.accountId) });
  });

  /* ---------------------------------------------------------------- frame */

  function cleanFrame(b, prev) {
    const v = { ...(prev || {}) };
    const need = (cond, msg) => { if (!cond) throw Object.assign(new Error(msg), { status: 400 }); };
    const name = "name" in b ? str(b.name, 80) : v.name;
    need(name && name.length >= 2, "Nama frame minimal 2 karakter.");
    const style = "style" in b ? b.style : v.style, colorKey = "colorKey" in b ? b.colorKey : v.colorKey, category = "category" in b ? b.category : v.category;
    need(STYLES.includes(style), "Gaya frame tidak dikenal.");
    need(COLORS.includes(colorKey), "Warna tidak dikenal.");
    need(CATEGORIES.includes(category), "Kategori tidak dikenal.");
    const price = "price" in b ? Math.round(Number(b.price)) : v.price;
    need(Number.isFinite(price) && price >= 1000 && price <= 100_000_000, "Harga tidak valid.");
    let oldPrice = "oldPrice" in b ? (b.oldPrice ? Math.round(Number(b.oldPrice)) : null) : v.oldPrice ?? null;
    need(oldPrice === null || (Number.isFinite(oldPrice) && oldPrice > price), "Harga coret harus lebih besar dari harga jual.");
    const stock = "stock" in b ? Math.round(Number(b.stock) || 0) : v.stock ?? 0;
    need(stock >= 0 && stock <= 99999, "Stok tidak valid.");
    const description = "description" in b ? str(b.description, 800) : v.description ?? "";
    let buy = v.buy || {};
    if ("buy" in b) {
      buy = {};
      for (const p of PLATFORMS) {
        const raw = b.buy?.[p.key];
        if (!raw || !String(raw).trim()) continue;
        const u = cleanBuyUrl(p.key, raw);
        need(u, `Tautan ${p.label} tidak valid${p.hosts ? ` (harus https dan domain ${p.hosts[0]})` : " (harus https)"}.`);
        buy[p.key] = u;
      }
    }
    return { name, description, buy, style, colorKey, category, price, oldPrice, stock, vto: "vto" in b ? !!b.vto : v.vto ?? true, published: "published" in b ? !!b.published : v.published ?? true };
  }

  r.put("/frames/:id", (req, res) => {
    const id = req.params.id;
    if (!ID.test(id)) return bad(res, "ID frame tidak valid.");
    const row = svc.frame(id);
    if (row && row.account_id !== req.accountId) return bad(res, "ID frame sudah dipakai.", 409);
    const doc = svc.docOf(svc.q.accById.get(req.accountId));
    if (!isActive(doc)) return bad(res, "Langganan belum aktif.", 402);
    if (!row) {
      // ID gaya katalog statis (f0, f1…) hanya milik akun seed.
      if (/^f\d+$/.test(id)) return bad(res, "ID frame sudah dipakai.", 409);
      if (svc.frameCount(req.accountId) >= PLANS[doc.subscription.plan].frameLimit) return bad(res, `Kuota frame paket ${PLANS[doc.subscription.plan].name} penuh.`, 402);
    }
    let data;
    try {
      const { published, ...rest } = cleanFrame(req.body || {}, row ? JSON.parse(row.data) : null);
      data = { ...rest, published };
    } catch (e) {
      return bad(res, e.message, e.status || 400);
    }
    const now = new Date().toISOString();
    const { published, ...stored } = data;
    if (row) db.prepare("UPDATE frames SET data=?, published=?, updated_at=? WHERE id=?").run(JSON.stringify(stored), published ? 1 : 0, now, id);
    else db.prepare("INSERT INTO frames(id,account_id,data,published,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(id, req.accountId, JSON.stringify(stored), published ? 1 : 0, now, now);
    res.json({ frame: svc.frameOut(svc.frame(id)) });
  });

  r.delete("/frames/:id", (req, res) => {
    const row = svc.frame(req.params.id);
    if (!row || row.account_id !== req.accountId) return bad(res, "Frame tidak ditemukan.", 404);
    db.prepare("DELETE FROM frames WHERE id=?").run(row.id);
    rmFiles(row.id);
    const doc = svc.docOf(svc.q.accById.get(req.accountId));
    doc.collections = doc.collections.map((c) => ({ ...c, frameIds: c.frameIds.filter((x) => x !== row.id) }));
    doc.adOrders = doc.adOrders.map((o) => ({ ...o, frameIds: (o.frameIds || []).filter((x) => x !== row.id) }));
    svc.saveDoc(req.accountId, doc);
    res.json({ ok: true });
  });

  /* ---------------------------------------------------------------- berkas */

  const raw = express.raw({ type: () => true, limit: Math.max(config.maxGlbBytes, config.maxPhotoBytes) + 1024 });

  function ownFrame(req, res) {
    const row = svc.frame(req.params.id);
    if (!row || row.account_id !== req.accountId) { bad(res, "Frame tidak ditemukan. Simpan frame dulu sebelum mengunggah berkas.", 404); return null; }
    return row;
  }
  const slotOf = (s) => {
    if (s === "model") return { file: "model.glb" };
    const m = /^photo-([0-3])$/.exec(s);
    return m ? { file: `${VARIANTS[+m[1]]}.jpg`, index: +m[1] } : null;
  };
  /** Foto = jumlah slot berurutan dari photo-0 yang ada berkasnya. */
  const countPhotos = (frameId) => {
    let n = 0;
    while (n < config.maxPhotos && fs.existsSync(path.join(dirOf(frameId), `${VARIANTS[n]}.jpg`))) n++;
    return n;
  };
  const refresh = (frameId, rig) => {
    const hasModel = fs.existsSync(path.join(dirOf(frameId), "model.glb")) ? 1 : 0;
    db.prepare("UPDATE frames SET photos=?, has_model=?, rig=?, media_v=media_v+1, updated_at=? WHERE id=?").run(
      countPhotos(frameId), hasModel, hasModel ? (rig === undefined ? svc.frame(frameId).rig : rig && JSON.stringify(rig)) : null, new Date().toISOString(), frameId
    );
  };

  // Foto profil toko: JPEG ≤ 1 MB (klien memotong persegi 256px). Disajikan di /media/store/<idAkun>.jpg
  const logoPath = (accId) => path.join(config.uploadsDir, "_store", `${accId}.jpg`);
  r.put("/store/logo", raw, (req, res) => {
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (buf.length > (config.maxLogoBytes || 1024 * 1024)) return bad(res, "Foto profil melebihi 1 MB.", 413);
    if (!isJpeg(buf)) return bad(res, "Foto profil harus berformat JPEG.", 415);
    const row = svc.q.accById.get(req.accountId);
    const doc = svc.docOf(row);
    if (!doc.store?.setupCompletedAt) return bad(res, "Selesaikan setup toko terlebih dahulu.", 409);
    fs.mkdirSync(path.dirname(logoPath(req.accountId)), { recursive: true });
    fs.writeFileSync(logoPath(req.accountId), buf);
    doc.store.logoV = (doc.store.logoV || 0) + 1;
    svc.saveDoc(req.accountId, doc);
    res.json({ account: svc.account(req.accountId) });
  });
  r.delete("/store/logo", (req, res) => {
    fs.rmSync(logoPath(req.accountId), { force: true });
    const doc = svc.docOf(svc.q.accById.get(req.accountId));
    if (doc.store) { doc.store.logoV = 0; svc.saveDoc(req.accountId, doc); }
    res.json({ account: svc.account(req.accountId) });
  });

  r.put("/frames/:id/assets/:slot", raw, (req, res) => {
    const row = ownFrame(req, res);
    if (!row) return;
    const slot = slotOf(req.params.slot);
    if (!slot) return bad(res, "Slot berkas tidak dikenal.");
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let rig;
    let warnings = [];
    if (slot.file === "model.glb") {
      const info = inspectGlb(buf, config.maxGlbBytes);
      if (!info.ok) return bad(res, info.error, 415);
      rig = info.rig;
      warnings = info.warnings;
    } else {
      if (buf.length > config.maxPhotoBytes) return bad(res, "Foto melebihi 5 MB.", 413);
      if (!isJpeg(buf)) return bad(res, "Foto harus berformat JPEG.", 415);
      // Foto harus berurutan: slot ke-n hanya boleh diisi bila slot sebelumnya ada.
      if (slot.index > countPhotos(row.id)) return bad(res, "Isi foto utama terlebih dahulu.");
    }
    fs.mkdirSync(dirOf(row.id), { recursive: true });
    fs.writeFileSync(path.join(dirOf(row.id), slot.file), buf);
    refresh(row.id, rig);
    res.json({ frame: svc.frameOut(svc.frame(row.id)), warnings });
  });

  r.delete("/frames/:id/assets/:slot", (req, res) => {
    const row = ownFrame(req, res);
    if (!row) return;
    const slot = slotOf(req.params.slot);
    if (!slot) return bad(res, "Slot berkas tidak dikenal.");
    fs.rmSync(path.join(dirOf(row.id), slot.file), { force: true });
    if (slot.index !== undefined) {
      // Rapatkan: foto sesudahnya naik satu slot supaya tetap berurutan.
      for (let i = slot.index; i < config.maxPhotos - 1; i++) {
        const from = path.join(dirOf(row.id), `${VARIANTS[i + 1]}.jpg`);
        if (fs.existsSync(from)) fs.renameSync(from, path.join(dirOf(row.id), `${VARIANTS[i]}.jpg`));
      }
    }
    refresh(row.id, null);
    res.json({ frame: svc.frameOut(svc.frame(row.id)) });
  });

  return r;
}
