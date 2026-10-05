import express, { Router } from "express";
import { nextCounter } from "../db.js";
import { AD_TYPES, INTERVALS, MAX_WEEKS, PLANS, addMonths, endsOn, planLabel, planPrice, todayStr } from "../pricing.js";
import { hmacHex, safeEqualHex } from "../security.js";
import { bad, str, wrap } from "./util.js";
import { requireAuth, sessionMiddleware } from "./auth.js";

const METHODS = ["QRIS", "VA BCA", "VA Mandiri", "GoPay", "OVO", "Kartu Kredit"];
const stampOf = (iso) => iso.slice(0, 10).replace(/-/g, "");

export function billingRouter(ctx) {
  const { db, svc, config } = ctx;
  const r = Router();
  const mw = [sessionMiddleware(ctx), requireAuth];

  /* ---------------------------------------------- hitung pesanan (harga dari server) */
  function buildOrder(accountId, b) {
    const row = svc.q.accById.get(accountId);
    const doc = svc.docOf(row);
    if (b.kind === "subscription") {
      const { plan, interval } = b;
      if (!PLANS[plan] || !INTERVALS[interval]) throw Object.assign(new Error("Paket tidak valid."), { status: 400 });
      const cur = doc.subscription;
      if (cur?.status === "active" && cur.plan === plan && cur.interval === interval) throw Object.assign(new Error("Paket ini sudah aktif."), { status: 409 });
      return { amount: planPrice(plan, interval), payload: { kind: "subscription", plan, interval, label: planLabel(plan, interval) } };
    }
    if (b.kind !== "ad") throw Object.assign(new Error("Jenis pesanan tidak dikenal."), { status: 400 });
    if (doc.subscription?.status !== "active") throw Object.assign(new Error("Langganan belum aktif."), { status: 402 });
    const T = AD_TYPES[b.adType];
    if (!T) throw Object.assign(new Error("Jenis iklan tidak dikenal."), { status: 400 });
    if (T.feature && !PLANS[doc.subscription.plan].features[T.feature]) throw Object.assign(new Error(`${T.label} hanya untuk paket Pro.`), { status: 403 });
    const weeks = Math.round(Number(b.weeks));
    if (!(weeks >= 1 && weeks <= MAX_WEEKS)) throw Object.assign(new Error(`Durasi 1–${MAX_WEEKS} minggu.`), { status: 400 });
    const startsOn = str(b.startsOn, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || startsOn < todayStr()) throw Object.assign(new Error("Tanggal mulai tidak valid."), { status: 400 });
    const p = { kind: "ad", adType: b.adType, weeks, startsOn, endsOn: endsOn(startsOn, weeks), placement: null, slot: null, frameIds: [], banner: null };
    let unit, qty = 1, label;
    if (b.adType === "banner") {
      const pl = T.placements[b.placement];
      if (!pl) throw Object.assign(new Error("Penempatan tidak valid."), { status: 400 });
      const title = str(b.banner?.title, 40);
      if (!title) throw Object.assign(new Error("Judul banner wajib diisi."), { status: 400 });
      Object.assign(p, { placement: b.placement, banner: { title, subtitle: str(b.banner?.subtitle, 80), cta: str(b.banner?.cta, 20) || "Lihat Koleksi" } });
      unit = pl.price;
      label = `${T.label} — ${pl.label}`;
    } else if (b.adType === "highlighted") {
      const slot = Math.round(Number(b.slot));
      if (!(slot >= 1 && slot <= T.slots)) throw Object.assign(new Error("Slot tidak valid."), { status: 400 });
      // Slot tidak boleh bertabrakan tanggal dengan pesanan berbayar akun mana pun.
      const clash = db.prepare("SELECT account_id, payload FROM orders WHERE kind='ad' AND status='paid'").all().some((o) => {
        const q = JSON.parse(o.payload);
        return q.adType === "highlighted" && q.slot === slot && q.startsOn <= p.endsOn && q.endsOn >= startsOn;
      });
      if (clash) throw Object.assign(new Error(`Slot ${slot} sudah dipesan pada tanggal tersebut.`), { status: 409 });
      Object.assign(p, { slot });
      unit = T.price;
      label = `${T.label} — Slot ${slot}`;
    } else {
      const pl = T.placements[b.placement];
      if (!pl) throw Object.assign(new Error("Penempatan tidak valid."), { status: 400 });
      const ids = [...new Set(Array.isArray(b.frameIds) ? b.frameIds : [])];
      const mine = new Set(svc.q.framesOf.all(accountId).map((f) => f.id));
      if (!ids.length || ids.length > T.maxFrames || ids.some((id) => !mine.has(id))) throw Object.assign(new Error(`Pilih 1–${T.maxFrames} frame milik toko Anda.`), { status: 400 });
      Object.assign(p, { placement: b.placement, frameIds: ids });
      unit = pl.price;
      qty = ids.length;
      label = `${T.label} — ${pl.label}`;
    }
    Object.assign(p, { unit, qty, label });
    return { amount: unit * weeks * qty, payload: p };
  }

  /* ---------------------------------------------- finalisasi (idempoten) */
  function finalize(orderId, method) {
    return db.transaction(() => {
      const o = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
      if (!o) throw Object.assign(new Error("Pesanan tidak ditemukan."), { status: 404 });
      if (o.status === "paid") return { account: svc.account(o.account_id), invoiceId: JSON.parse(o.payload).invoiceId };
      const p = JSON.parse(o.payload);
      const row = svc.q.accById.get(o.account_id);
      const doc = svc.docOf(row);
      const iso = new Date().toISOString();
      const n = nextCounter(db, "invoice");
      const num = String(n).padStart(4, "0");
      const invoice = { id: `INV-${stampOf(iso)}-${num}`, date: iso.slice(0, 10), status: "paid", method };
      if (p.kind === "subscription") {
        const end = addMonths(iso, INTERVALS[p.interval].months);
        Object.assign(invoice, { kind: "subscription", label: p.label, plan: p.plan, amount: o.amount });
        doc.subscription = { plan: p.plan, interval: p.interval, status: "active", startedAt: iso, currentPeriodEnd: end, nextBillingAt: end, cancelAtPeriodEnd: false, pendingPlan: null };
      } else {
        const T = AD_TYPES[p.adType];
        const ao = { id: `AO-${stampOf(iso)}-${num}`, type: p.adType, placement: p.placement, label: p.label, weeks: p.weeks, unit: p.unit, total: o.amount, startsOn: p.startsOn, endsOn: p.endsOn, status: "paid", frameIds: p.frameIds, slot: p.slot };
        Object.assign(invoice, { kind: "ad", label: `${p.label} (${p.weeks} minggu)`, amount: o.amount, tab: T.tab });
        doc.adOrders = [ao, ...doc.adOrders];
        if (p.banner) doc.banners = [{ id: `b-${Date.now().toString(36)}`, ...p.banner, placement: p.placement, orderId: ao.id, status: "pending_review", startsAt: p.startsOn, endsAt: p.endsOn, impressions: 0, clicks: 0 }, ...doc.banners];
      }
      doc.invoices = [invoice, ...doc.invoices];
      svc.saveDoc(o.account_id, doc);
      p.invoiceId = invoice.id;
      db.prepare("UPDATE orders SET status='paid', method=?, paid_at=?, payload=? WHERE id=?").run(method, iso, JSON.stringify(p), orderId);
      return { account: svc.account(o.account_id), invoiceId: invoice.id };
    })();
  }

  r.post("/checkout", ...mw, (req, res) => {
    let built;
    try {
      built = buildOrder(req.accountId, req.body || {});
    } catch (e) {
      return bad(res, e.message, e.status || 400);
    }
    const id = "ORD-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    db.prepare("INSERT INTO orders(id,account_id,kind,payload,amount,created_at) VALUES(?,?,?,?,?,?)").run(id, req.accountId, built.payload.kind, JSON.stringify(built.payload), built.amount, new Date().toISOString());
    res.status(201).json({ orderId: id, amount: built.amount, label: built.payload.label, provider: config.paymentProvider, methods: METHODS });
  });

  // Pembayaran UJI: hanya aktif bila PAYMENT_PROVIDER=sandbox. Produksi: konfirmasi datang dari gateway lewat /webhook.
  r.post("/orders/:id/pay", ...mw, (req, res) => {
    if (config.paymentProvider !== "sandbox") return bad(res, "Pembayaran uji dimatikan.", 403);
    const o = db.prepare("SELECT * FROM orders WHERE id=? AND account_id=?").get(req.params.id, req.accountId);
    if (!o) return bad(res, "Pesanan tidak ditemukan.", 404);
    const method = METHODS.includes(req.body?.method) ? req.body.method : "QRIS";
    try {
      const out = finalize(o.id, method);
      res.json(out);
    } catch (e) {
      bad(res, e.message, e.status || 400);
    }
  });

  // Webhook gateway: tubuh mentah + tanda tangan HMAC-SHA256(secret, body) di header X-Signature.
  r.post("/webhook", express.raw({ type: () => true, limit: "64kb" }), (req, res) => {
    if (!config.webhookSecret) return bad(res, "Webhook belum dikonfigurasi.", 503);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!safeEqualHex(req.headers["x-signature"] || "", hmacHex(config.webhookSecret, body))) return bad(res, "Tanda tangan tidak valid.", 401);
    let ev;
    try { ev = JSON.parse(body.toString("utf8")); } catch { return bad(res, "JSON tidak valid."); }
    if (ev.status !== "paid" || typeof ev.orderId !== "string") return res.json({ ok: true, ignored: true });
    const o = db.prepare("SELECT * FROM orders WHERE id=?").get(ev.orderId);
    if (!o) return bad(res, "Pesanan tidak ditemukan.", 404);
    // Jumlah dari gateway harus sama dengan hitungan server.
    if (Number(ev.amount) !== o.amount) return bad(res, "Jumlah tidak cocok.", 422);
    try {
      finalize(o.id, METHODS.includes(ev.method) ? ev.method : "QRIS");
      res.json({ ok: true });
    } catch (e) {
      bad(res, e.message, e.status || 400);
    }
  });

  return r;
}
