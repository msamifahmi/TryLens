// Katalog TryLens (tabel `merchants` + `products`): pemetaan baris ⇄ objek, validasi, dan bentuk publik untuk /api/catalog.
import { STYLES, COLORS, CATEGORIES } from "./service.js";
import { PLATFORMS, cleanBuyUrl } from "./ecommerce.js";
import { SIZE_FIELDS, cleanSize } from "./frameSize.js";

const DAY = 86400e3;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const SIZE_COL = { lensWidthMm: "lens_width_mm", lensHeightMm: "lens_height_mm", bridgeMm: "bridge_mm", templeMm: "temple_mm", frameWidthMm: "frame_width_mm", weightG: "weight_g" };
const LINK_KEYS = ["instagram", "x", "tokopedia", "shopee"];
const err = (m, status = 400) => Object.assign(new Error(m), { status });
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v) => (v === true || v === 1 || v === "1" || v === "true" ? 1 : 0);

/* ------------------------------------------------------------ toko */

export function merchantOut(r) {
  const links = {};
  for (const k of LINK_KEYS) if (r["link_" + k]) links[k] = r["link_" + k];
  return { id: r.id, name: r.name, city: r.city, province: r.province, initials: r.initials, color: r.color, whatsapp: r.whatsapp, phone: r.phone, links, published: !!r.published, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** b = isian mentah (sebagian), prev = baris lama (untuk PATCH). Mengembalikan kolom siap simpan. */
export function cleanMerchant(b, prev) {
  const o = prev ? { ...prev } : { color: "#427AB5", published: 1, city: "", province: "", whatsapp: "", phone: "", initials: "" };
  if ("name" in b) o.name = str(b.name, 80);
  if (!o.name || o.name.length < 2) throw err("Nama toko minimal 2 karakter.");
  for (const [k, max] of [["city", 80], ["province", 60], ["phone", 30]]) if (k in b) o[k] = str(b[k], max);
  if ("whatsapp" in b) {
    const w = String(b.whatsapp || "").replace(/\D/g, "").replace(/^0/, "62");
    if (w && !/^62\d{8,13}$/.test(w)) throw err("WhatsApp harus nomor Indonesia (mis. 6281234567890).");
    o.whatsapp = w;
  }
  if ("color" in b) {
    if (!/^#[0-9a-fA-F]{6}$/.test(String(b.color))) throw err("Warna harus berbentuk #RRGGBB.");
    o.color = b.color;
  }
  if ("initials" in b) o.initials = str(b.initials, 3).toUpperCase();
  if (!o.initials) o.initials = o.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (b.links && typeof b.links === "object") {
    for (const k of LINK_KEYS) {
      if (!(k in b.links)) continue;
      const raw = b.links[k];
      if (!raw) { o["link_" + k] = null; continue; }
      const u = k === "tokopedia" || k === "shopee" ? cleanBuyUrl(k, raw) : safeHttps(raw, k === "instagram" ? ["instagram.com"] : ["x.com", "twitter.com"]);
      if (!u) throw err(`Tautan ${k} tidak valid (harus https dan domain yang sesuai).`);
      o["link_" + k] = u;
    }
  }
  if ("published" in b) o.published = bool(b.published);
  return o;
}
function safeHttps(raw, hosts) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.protocol === "https:" && hosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h)) ? u.toString() : null;
  } catch { return null; }
}

/* ---------------------------------------------------------- produk */

export function productOut(r) {
  const buy = {}, size = {};
  for (const p of PLATFORMS) if (r["buy_" + p.key]) buy[p.key] = r["buy_" + p.key];
  for (const [k, col] of Object.entries(SIZE_COL)) if (r[col] != null) size[k] = r[col];
  if (r.material) size.material = r.material;
  return {
    id: r.id, merchantId: r.merchant_id, name: r.name, style: r.style, colorKey: r.color_key, category: r.category,
    price: r.price, oldPrice: r.old_price ?? null, stock: r.stock, description: r.description, buy, size: Object.keys(size).length ? size : null,
    vto: !!r.vto, published: !!r.published, photos: r.photos, hasModel: !!r.has_model, rig: r.rig ? JSON.parse(r.rig) : null,
    mediaV: r.media_v, createdAt: r.created_at, updatedAt: r.updated_at
  };
}

export function cleanProduct(b, prev, { merchantExists }) {
  const o = prev ? { ...prev } : { stock: 10, description: "", vto: 0, published: 1, old_price: null };
  const need = (c, m) => { if (!c) throw err(m); };
  if ("name" in b) o.name = str(b.name, 80);
  need(o.name && o.name.length >= 2, "Nama produk minimal 2 karakter.");
  if ("merchantId" in b) o.merchant_id = String(b.merchantId);
  need(o.merchant_id && merchantExists(o.merchant_id), "Toko (merchantId) tidak ditemukan.");
  if ("style" in b) o.style = b.style;
  need(STYLES.includes(o.style), `Gaya tidak dikenal. Pilih: ${STYLES.join(", ")}.`);
  if ("colorKey" in b) o.color_key = b.colorKey;
  need(COLORS.includes(o.color_key), `Warna tidak dikenal. Pilih: ${COLORS.join(", ")}.`);
  if ("category" in b) o.category = b.category;
  need(CATEGORIES.includes(o.category), `Kategori tidak dikenal. Pilih: ${CATEGORIES.join(", ")}.`);
  if ("price" in b) o.price = Math.round(Number(b.price));
  need(Number.isFinite(o.price) && o.price >= 1000 && o.price <= 100_000_000, "Harga tidak valid (1.000–100.000.000).");
  if ("oldPrice" in b) o.old_price = b.oldPrice ? Math.round(Number(b.oldPrice)) : null;
  need(o.old_price == null || (Number.isFinite(o.old_price) && o.old_price > o.price), "Harga coret harus lebih besar dari harga jual.");
  if ("stock" in b) o.stock = Math.round(Number(b.stock));
  need(Number.isInteger(o.stock) && o.stock >= 0 && o.stock <= 99999, "Stok tidak valid.");
  if ("description" in b) o.description = str(b.description, 800);
  if (b.buy && typeof b.buy === "object") {
    for (const p of PLATFORMS) {
      if (!(p.key in b.buy)) continue;
      const raw = b.buy[p.key];
      if (!raw) { o["buy_" + p.key] = null; continue; }
      const u = cleanBuyUrl(p.key, raw);
      need(u, `Tautan ${p.label} tidak valid${p.hosts ? ` (https dan domain ${p.hosts[0]})` : " (harus https)"}.`);
      o["buy_" + p.key] = u;
    }
  }
  if ("size" in b) {
    const c = cleanSize(b.size);
    need(!c.error, c.error);
    for (const col of Object.values(SIZE_COL)) o[col] = null;
    o.material = null;
    for (const [k, col] of Object.entries(SIZE_COL)) if (c.value?.[k] != null) o[col] = c.value[k];
    if (c.value?.material) o.material = c.value.material;
  }
  if ("vto" in b) o.vto = bool(b.vto);
  if ("published" in b) o.published = bool(b.published);
  return o;
}

export const validId = (id) => ID.test(String(id));

/* ------------------------------------------------------ katalog publik */

/** Produk & toko TryLens untuk /api/catalog. Produk/toko yang disembunyikan dilaporkan di `hidden` supaya data statis klien ikut tersaring. */
export function publicCatalog(db) {
  const merchants = db.prepare("SELECT * FROM merchants").all();
  const mById = new Map(merchants.map((m) => [m.id, m]));
  const products = [], hidden = [], outMerchants = [];
  const live = db.prepare("SELECT * FROM products ORDER BY rowid").all();
  const count = new Map();
  for (const r of live) {
    const m = mById.get(r.merchant_id);
    if (!r.published || !m?.published) { hidden.push(r.id); continue; }
    count.set(m.id, (count.get(m.id) || 0) + 1);
    const disc = r.old_price ? Math.round((1 - r.price / r.old_price) * 100) : 0;
    const isNew = Date.now() - Date.parse(r.created_at) < 14 * DAY;
    const p = productOut(r);
    products.push({
      id: r.id, name: r.name, style: r.style, colorKey: r.color_key, price: r.price, oldPrice: r.old_price ?? null,
      merchant: m.name, merchantId: m.id, city: m.city.split(",")[0], cat: r.category, isNew, order: 2000 + products.length,
      flash: false, flashSold: 0, badge: disc ? `-${disc}%` : isNew ? "BARU" : null,
      stock: r.stock, vto: !!r.vto, size: p.size, description: r.description, buy: p.buy,
      assets: r.photos || r.has_model ? { base: `/media/${r.id}`, photos: r.photos, model: !!r.has_model, rigComplete: !!(r.rig && JSON.parse(r.rig).complete), v: r.media_v } : null
    });
  }
  for (const m of merchants) {
    if (!m.published) continue;
    const o = merchantOut(m);
    outMerchants.push({ id: m.id, name: o.name, city: [o.city].filter(Boolean).join(", ") || "", province: o.province, count: `${count.get(m.id) || 0} frame`, rating: "–", initials: o.initials, color: o.color, whatsapp: o.whatsapp, phone: o.phone, links: o.links, logo: null });
  }
  return { products, merchants: outMerchants, hidden };
}

/* ---------------------------------------------------------- iklan */

export const BANNER_ACTIONS = ["try", "merchant", "feed", "promo", "link"];
export const BANNER_THEMES = ["blue", "navy", "sky", "gold"];
export const BANNER_ILLUS = ["face", "collection", "compare", "promo"];

export function bannerOut(r) {
  return { id: r.id, kind: r.kind, headline: r.headline, sub: r.sub, cta: r.cta, action: r.action, link: r.link, theme: r.theme, illustration: r.illustration, sort: r.sort, published: !!r.published, updatedAt: r.updated_at };
}

/** Tautan iklan: alamat dalam situs ("/…") atau https penuh. */
function cleanBannerLink(v) {
  const s = String(v ?? "").trim();
  if (!s || s.length > 300 || /\s/.test(s)) return null;
  if (s[0] === "/" && !s.startsWith("//") && !s.includes("\\")) return s;
  try { const u = new URL(s); return u.protocol === "https:" && u.hostname ? s : null; } catch { return null; }
}

export function cleanBanner(b, prev) {
  const o = prev ? { ...prev } : { kind: "hero", headline: "", sub: "", cta: "", action: "feed", link: null, theme: "blue", illustration: "face", sort: 0, published: 1 };
  const need = (c, m) => { if (!c) throw err(m); };
  if (!prev && "kind" in b) o.kind = String(b.kind);
  need(["hero", "topbar"].includes(o.kind), "Jenis iklan tidak dikenal.");
  if ("headline" in b) o.headline = str(b.headline, o.kind === "topbar" ? 140 : 80);
  need(o.headline.length >= 3, "Judul iklan minimal 3 karakter.");
  if ("sub" in b) o.sub = str(b.sub, 160);
  if ("cta" in b) o.cta = str(b.cta, 24);
  if ("action" in b) o.action = String(b.action);
  need(BANNER_ACTIONS.includes(o.action), "Aksi tombol tidak dikenal.");
  if ("link" in b) {
    const l = String(b.link ?? "").trim();
    o.link = l === "" ? null : cleanBannerLink(l);
    need(l === "" || o.link !== null, "Tautan harus berupa alamat dalam situs (mis. /merchant) atau https penuh.");
  }
  need(o.action !== "link" || o.link, 'Aksi "Buka tautan" memerlukan tautan.');
  if ("theme" in b) o.theme = String(b.theme);
  need(BANNER_THEMES.includes(o.theme), "Warna latar tidak dikenal.");
  if ("illustration" in b) o.illustration = String(b.illustration);
  need(BANNER_ILLUS.includes(o.illustration), "Gambar ilustrasi tidak dikenal.");
  if ("sort" in b) o.sort = Number.parseInt(b.sort, 10) || 0;
  if ("published" in b) o.published = bool(b.published);
  return o;
}

export function publicBanners(db) {
  const out = { hero: [], topbar: [] };
  for (const r of db.prepare("SELECT * FROM banners WHERE published=1 ORDER BY sort, id").all()) {
    const { published, updatedAt, sort, ...b } = bannerOut(r);
    out[r.kind].push(b);
  }
  return out;
}
