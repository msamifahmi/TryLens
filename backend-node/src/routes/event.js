// Pencatat kejadian publik: POST /api/event { kind: visit|view|try|buy|contact, productId? } → 204.
// Hanya angka harian teragregasi (tabel stats). Tanpa cookie, tanpa IP tersimpan; batas laju per IP di memori (60/menit).
import { Router } from "express";
import { ALL_KINDS, STAT_DAYS, merchantStats, recordEvent } from "../catalogStore.js";
import { bad } from "./util.js";

export function eventRouter({ db }) {
  const r = Router();
  const hits = new Map(); // ip → { win, n }
  const exists = (id) => !!(db.prepare("SELECT 1 FROM products WHERE id=?").get(id) || db.prepare("SELECT 1 FROM frames WHERE id=?").get(id));
  r.post("/", (req, res) => {
    const kind = String(req.body?.kind || "");
    if (!ALL_KINDS.includes(kind)) return bad(res, "Jenis kejadian tidak dikenal.");
    const win = Math.floor(Date.now() / 60e3);
    const h = hits.get(req.ip);
    const n = h && h.win === win ? h.n + 1 : 1;
    hits.set(req.ip, { win, n });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.win < win - 1) hits.delete(k);
    if (n <= 60) recordEvent(db, { kind, productId: req.body?.productId, ua: req.headers["user-agent"] }, exists);
    res.setHeader("Cache-Control", "no-store");
    res.status(204).end();
  });
  return r;
}

/** GET /api/stats/merchant/:id?days=1|3|7|30|90 — statistik nyata satu toko untuk dasbor Mitra (angka teragregasi). */
export function statsRouter({ db }) {
  const r = Router();
  r.get("/merchant/:id", (req, res) => {
    if (!db.prepare("SELECT 1 FROM merchants WHERE id=?").get(req.params.id)) return bad(res, "Toko tidak ditemukan.", 404);
    const d = Number(req.query.days);
    res.setHeader("Cache-Control", "no-store");
    res.json(merchantStats(db, req.params.id, STAT_DAYS.includes(d) ? d : 30));
  });
  return r;
}
