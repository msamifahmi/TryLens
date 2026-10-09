import { Router } from "express";

const DAY = 86400e3;

/** Katalog publik: frame TERBIT milik Mitra aktif (langganan aktif + toko selesai disiapkan). */
export function catalogRouter({ db, svc }) {
  const r = Router();
  r.get("/", (req, res) => {
    svc.settleAll(); // turun paket jatuh tempo → kuota VTO diterapkan sebelum katalog dibaca
    const rows = db.prepare("SELECT f.*, a.doc AS adoc, a.id AS aid FROM frames f JOIN accounts a ON a.id=f.account_id").all();
    const products = [];
    const hidden = []; // id yang tidak boleh tampil (diturunkan/ditarik) — dipakai klien untuk menyaring data statis
    const merchants = new Map();
    let order = 1000;
    for (const row of rows) {
      const doc = JSON.parse(row.adoc);
      const d = JSON.parse(row.data);
      const live = doc.subscription?.status === "active" && doc.store?.setupCompletedAt && row.published && doc.storeSettings?.visible !== false;
      if (!live) { hidden.push(row.id); continue; }
      const s = doc.store;
      const mid = s.merchantId || `s_${row.aid}`;
      if (!merchants.has(mid)) {
        merchants.set(mid, {
          id: mid, name: s.name, city: [s.city, s.province].filter(Boolean).join(", ") || s.city || "", province: s.province || "",
          count: "", rating: "–", initials: s.initials, color: s.color, whatsapp: s.whatsapp, phone: s.phone, links: s.links || {}, custom: true,
          logo: s.logoV ? `/media/store/${row.aid}.jpg?v=${s.logoV}` : null
        });
      }
      const created = Date.parse(row.created_at);
      const disc = d.oldPrice ? Math.round((1 - d.price / d.oldPrice) * 100) : 0;
      products.push({
        id: row.id, name: d.name, style: d.style, colorKey: d.colorKey, price: d.price, oldPrice: d.oldPrice || null,
        merchant: s.name, merchantId: mid, city: (s.city || "").split(",")[0], cat: d.category,
        isNew: Date.now() - created < 14 * DAY, order: order++, flash: false, flashSold: 0,
        badge: disc ? `-${disc}%` : Date.now() - created < 14 * DAY ? "BARU" : null,
        stock: d.stock, vto: d.vto, size: d.size || null, description: d.description || "", buy: d.buy || {},
        // Hanya bila Mitra mengunggah sendiri; selain itu klien memakai /products/<id> bawaan.
        assets: row.photos || row.has_model ? { base: `/media/${row.id}`, photos: row.photos, model: !!row.has_model, rigComplete: !!(row.rig && JSON.parse(row.rig).complete), v: row.media_v } : null
      });
    }
    for (const m of merchants.values()) m.count = `${products.filter((p) => p.merchantId === m.id).length} frame`;
    res.setHeader("Cache-Control", "public, max-age=30");
    res.json({ products, merchants: [...merchants.values()], hidden, generatedAt: new Date().toISOString() });
  });
  return r;
}
