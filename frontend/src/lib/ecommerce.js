// Tautan beli e-commerce per produk. Aturan host SAMA dengan backend-node/src/ecommerce.js (diuji agar tidak berbeda).
export const PLATFORMS = [
  { key: "tokopedia", label: "Tokopedia", color: "#03AC0E", hosts: ["tokopedia.com", "tokopedia.link"] },
  { key: "shopee", label: "Shopee", color: "#EE4D2D", hosts: ["shopee.co.id", "shopee.com", "shp.ee"] },
  { key: "lazada", label: "Lazada", color: "#0F146D", hosts: ["lazada.co.id", "lazada.com", "s.lazada.co.id"] },
  { key: "tiktokshop", label: "TikTok Shop", color: "#111111", hosts: ["tiktok.com"] },
  { key: "website", label: "Website toko", color: "#406aaf", hosts: null }
];

const hostOk = (host, allowed) => !allowed || allowed.some((h) => host === h || host.endsWith("." + h));

/** URL https valid untuk platform tersebut, atau null. */
export function cleanBuyUrl(key, raw) {
  const p = PLATFORMS.find((x) => x.key === key);
  const v = String(raw || "").trim();
  if (!p || !v || v.length > 300) return null;
  let u;
  try { u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); } catch { return null; }
  if (u.protocol !== "https:" || !hostOk(u.hostname.toLowerCase(), p.hosts)) return null;
  return u.toString();
}

/** Daftar tombol beli: tautan produk dulu; bila kosong, tautan toko (Tokopedia/Shopee) sebagai cadangan. */
export function buyLinks(product, merchant) {
  const out = [];
  for (const p of PLATFORMS) {
    const own = cleanBuyUrl(p.key, product?.buy?.[p.key]);
    if (own) out.push({ ...p, url: own, scope: "produk" });
  }
  if (!out.length) {
    for (const key of ["tokopedia", "shopee"]) {
      const u = cleanBuyUrl(key, merchant?.links?.[key]);
      if (u) out.push({ ...PLATFORMS.find((x) => x.key === key), url: u, scope: "toko" });
    }
  }
  return out;
}
