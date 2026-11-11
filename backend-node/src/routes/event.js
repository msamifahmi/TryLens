// Pencatat kejadian publik: POST /api/event { kind: visit|view|try|buy|contact, productId? } → 204.
// Hanya angka harian teragregasi (tabel stats). Tanpa cookie, tanpa IP tersimpan; batas laju per IP di memori (60/menit).
import { Router } from "express";
import { EVENT_KINDS, recordEvent } from "../catalogStore.js";
import { bad } from "./util.js";

export function eventRouter({ db }) {
  const r = Router();
  const hits = new Map(); // ip → { win, n }
  const exists = (id) => !!(db.prepare("SELECT 1 FROM products WHERE id=?").get(id) || db.prepare("SELECT 1 FROM frames WHERE id=?").get(id));
  r.post("/", (req, res) => {
    const kind = String(req.body?.kind || "");
    if (!EVENT_KINDS.includes(kind)) return bad(res, "Jenis kejadian tidak dikenal.");
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
