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
  return { id: r.id, name: r.name, city: r.city, province: r.province, initials: r.initials, color: r.color, whatsapp: r.whatsapp, phone: r.phone, links, published: !!r.published, highlightUntil: r.highlight_until ?? null, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** b = isian mentah (sebagian), prev = baris lama (untuk PATCH). Mengembalikan kolom siap simpan. */
export function cleanMerchant(b, prev) {
  const o = prev ? { ...prev } : { color: "#427AB5", published: 1, city: "", province: "", whatsapp: "", phone: "", initials: "", highlight_until: null };
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
  if ("highlightUntil" in b) {
    const h = String(b.highlightUntil ?? "").trim();
    if (h && !validDay(h)) throw err("Tanggal Highlighted Brand tidak valid (YYYY-MM-DD).");
    o.highlight_until = h || null;
  }
  if ("published" in b) o.published = bool(b.published);
  return o;
}
/** Tanggal WIB (UTC+7) hari ini ± offset hari, format YYYY-MM-DD — sama dengan today_wib() di PHP. */
export const todayWib = (offsetDays = 0, now = Date.now()) => new Date(now + 7 * 3600e3 + offsetDays * DAY).toISOString().slice(0, 10);
export function validDay(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return false;
  const t = new Date(`${d}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
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
  const highlighted = db.prepare("SELECT id FROM merchants WHERE published=1 AND highlight_until>=?").pluck().all(todayWib());
  const flashItems = flashRows(db).filter((f) => f.live).map((f) => ({ id: f.productId, price: f.price, regular: f.regular, quota: f.quota, sold: f.sold }));
  return { products, merchants: outMerchants, hidden, highlighted, flashItems };
}

/* ---------------------------------------------------------- iklan */

export const BANNER_ACTIONS = ["try", "merchant", "feed", "promo", "link", "none"];
export const BANNER_KINDS = ["hero", "topbar", "login"];
export const BANNER_IMAGE_MAX = 1500 * 1024;

/** Jenis gambar dari byte awal berkas (bukan dari nama): jpg | png | webp | null. */
export function imageExt(b) {
  if (!Buffer.isBuffer(b) || b.length < 13) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}
export const BANNER_THEMES = ["blue", "navy", "sky", "gold"];
export const BANNER_ILLUS = ["face", "collection", "compare", "promo"];

export function bannerOut(r) {
  return { id: r.id, kind: r.kind, image: r.image ? `/media/banner/${r.id}.${r.image}?v=${r.image_v}` : null, headline: r.headline, sub: r.sub, cta: r.cta, action: r.action, link: r.link, theme: r.theme, illustration: r.illustration, sort: r.sort, published: !!r.published, updatedAt: r.updated_at };
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
  need(BANNER_KINDS.includes(o.kind), "Jenis iklan tidak dikenal.");
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
  const out = { hero: [], topbar: [], login: [] };
  for (const r of db.prepare("SELECT * FROM banners WHERE published=1 ORDER BY sort, id").all()) {
    const { published, updatedAt, sort, ...b } = bannerOut(r);
    out[r.kind].push(b);
  }
  return out;
}

/* ---- flash sale: pengaturan acara dari admin (frame didaftarkan Mitra) */
export const FLASH_THEMES = ["brand", "sunset", "ocean", "berry", "midnight"];
const FLASH_DEFAULTS = { enabled: true, title: "Flash Sale", subtitle: "Diskon kilat frame pilihan dari optik lokal", theme: "brand", endsAt: null, minDiscount: 10, maxPerMerchant: 4 };
export function flashGet(db) {
  let j = null;
  try { const r = db.prepare("SELECT v FROM settings WHERE k='flash_sale'").pluck().get(); j = r ? JSON.parse(r) : null; } catch { j = null; }
  return { ...FLASH_DEFAULTS, ...(j && typeof j === "object" ? j : {}) };
}
export function flashClean(b, prev) {
  const o = { ...prev };
  const need = (c, m) => { if (!c) throw err(m); };
  if ("enabled" in b) o.enabled = bool(b.enabled) === 1;
  if ("title" in b) o.title = typeof b.title === "string" ? b.title.trim().slice(0, 40) : "";
  need(o.title.length >= 3, "Judul flash sale minimal 3 karakter.");
  if ("subtitle" in b) o.subtitle = typeof b.subtitle === "string" ? b.subtitle.trim().slice(0, 100) : "";
  if ("theme" in b) o.theme = String(b.theme);
  need(FLASH_THEMES.includes(o.theme), "Tema warna tidak dikenal.");
  if ("endsAt" in b) {
    if (b.endsAt === null || b.endsAt === "") o.endsAt = null;
    else { const t = typeof b.endsAt === "string" ? Date.parse(b.endsAt) : NaN; need(Number.isFinite(t), "Waktu berakhir tidak valid."); o.endsAt = new Date(t).toISOString(); }
  }
  if ("minDiscount" in b) { const v = Number(b.minDiscount); need(Number.isFinite(v) && v >= 0 && v <= 90, "Diskon minimum 0–90%."); o.minDiscount = Math.trunc(v); }
  if ("maxPerMerchant" in b) { const v = Number(b.maxPerMerchant); need(Number.isFinite(v) && v >= 1 && v <= 20, "Batas frame per toko 1–20."); o.maxPerMerchant = Math.trunc(v); }
  return o;
}

/* ---- frame Flash Sale yang diatur admin (tabel flash_items) — sama dengan flash_rows() di PHP */
export function flashRows(db) {
  const cfg = flashGet(db);
  const rows = db.prepare(`SELECT f.*, p.price AS regular, p.name, p.merchant_id, p.published AS ppub, m.published AS mpub FROM flash_items f
    JOIN products p ON p.id=f.product_id JOIN merchants m ON m.id=p.merchant_id`).all();
  rows.sort((a, b) => b.sold / b.quota - a.sold / a.quota || a.created_at.localeCompare(b.created_at));
  const perM = new Map();
  return rows.map((r) => {
    const pct = r.price < r.regular ? Math.round((1 - r.price / r.regular) * 100) : 0;
    let why = null;
    if (!cfg.enabled) why = "Flash Sale sedang dimatikan";
    else if (!r.active) why = "Dinonaktifkan";
    else if (!r.ppub || !r.mpub) why = "Produk atau tokonya disembunyikan";
    else if (r.price >= r.regular) why = "Harga kilat tidak lebih murah dari harga normal";
    else if (pct < cfg.minDiscount) why = `Diskon ${pct}% di bawah minimum ${cfg.minDiscount}%`;
    else if (r.sold >= r.quota) why = "Kuota habis";
    else if ((perM.get(r.merchant_id) || 0) >= cfg.maxPerMerchant) why = `Melebihi batas ${cfg.maxPerMerchant} frame per toko`;
    if (why === null) perM.set(r.merchant_id, (perM.get(r.merchant_id) || 0) + 1);
    return { productId: r.product_id, name: r.name, merchantId: r.merchant_id, price: r.price, regular: r.regular, pct, quota: r.quota, sold: r.sold, active: !!r.active, live: why === null, reason: why, updatedAt: r.updated_at };
  });
}
export function flashItemClean(b, prev, regular) {
  const o = prev ? { price: prev.price, quota: prev.quota, sold: prev.sold, active: prev.active } : { price: 0, quota: 20, sold: 0, active: 1 };
  const need = (c, m) => { if (!c) throw err(m); };
  const num = (v) => (v === "" || v === null || typeof v === "boolean" ? NaN : Number(v));
  if ("price" in b) { const v = num(b.price); need(Number.isFinite(v), "Harga kilat tidak valid."); o.price = Math.round(v); }
  need(o.price >= 1000, "Harga kilat minimal Rp1.000.");
  need(o.price * 10 >= regular, "Harga kilat terlalu murah (diskon lebih dari 90%). Periksa lagi jumlah angka nolnya.");
  need(o.price < regular, `Harga kilat harus lebih murah dari harga normal (Rp${regular.toLocaleString("id-ID")}).`);
  if ("quota" in b) { const v = num(b.quota); need(Number.isFinite(v), "Kuota tidak valid."); o.quota = Math.trunc(v); }
  need(o.quota >= 1 && o.quota <= 9999, "Kuota 1–9.999.");
  if ("sold" in b) { const v = num(b.sold); need(Number.isFinite(v), "Jumlah terjual tidak valid."); o.sold = Math.trunc(v); }
  need(o.sold >= 0 && o.sold <= o.quota, "Jumlah terjual harus 0 sampai kuota.");
  if ("active" in b) o.active = bool(b.active);
  return o;
}

/* ---- statistik pengunjung: angka harian teragregasi (tanpa data pribadi) — sama dengan record_event()/admin_stats() di PHP */
export const EVENT_KINDS = ["visit", "view", "try", "buy", "contact"];
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview/i;

/** productExists(id) → boolean. Mengembalikan false bila diabaikan (bot / produk tak dikenal). Batas laju diurus pemanggil. */
export function recordEvent(db, { kind, productId, ua }, productExists) {
  if (BOT.test(ua || "")) return false;
  let pid = "";
  if (kind !== "visit") {
    pid = str(productId, 40);
    if (!pid || !productExists(pid)) return false;
  }
  db.prepare("INSERT INTO stats(day,kind,product_id,n) VALUES(?,?,?,1) ON CONFLICT(day,kind,product_id) DO UPDATE SET n=n+1").run(todayWib(), kind, pid);
  return true;
}

export function adminStats(db, days) {
  const to = todayWib(), from = todayWib(-(days - 1)), pFrom = todayWib(-(2 * days - 1)), pTo = todayWib(-days);
  const zero = () => Object.fromEntries(EVENT_KINDS.map((k) => [k, 0]));
  const tot = (a, b) => {
    const o = zero();
    for (const r of db.prepare("SELECT kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? GROUP BY kind").all(a, b)) if (r.kind in o) o[r.kind] = r.n;
    return o;
  };
  const series = new Map();
  for (let i = days - 1; i >= 0; i--) series.set(todayWib(-i), { day: todayWib(-i), ...zero() });
  for (const r of db.prepare("SELECT day, kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? GROUP BY day, kind").all(from, to)) {
    const s = series.get(r.day);
    if (s && r.kind in s) s[r.kind] = r.n;
  }
  const names = new Map(db.prepare("SELECT p.id, p.name, p.merchant_id, m.name mname FROM products p LEFT JOIN merchants m ON m.id=p.merchant_id").all().map((r) => [r.id, r]));
  const prod = new Map(), mer = new Map();
  for (const r of db.prepare("SELECT product_id, kind, SUM(n) n FROM stats WHERE day BETWEEN ? AND ? AND product_id<>'' GROUP BY product_id, kind").all(from, to)) {
    if (!EVENT_KINDS.includes(r.kind)) continue;
    const p = names.get(r.product_id);
    if (!prod.has(r.product_id)) prod.set(r.product_id, { id: r.product_id, name: p?.name ?? `${r.product_id} (dihapus)`, merchantId: p?.merchant_id ?? null, ...zero() });
    prod.get(r.product_id)[r.kind] += r.n;
    if (p?.merchant_id) {
      if (!mer.has(p.merchant_id)) mer.set(p.merchant_id, { id: p.merchant_id, name: p.mname ?? p.merchant_id, ...zero() });
      mer.get(p.merchant_id)[r.kind] += r.n;
    }
  }
  const score = (x) => x.view + 2 * x.try + 3 * x.buy + 3 * x.contact;
  const fl = flashRows(db);
  return {
    days, from, to, totals: tot(from, to), prev: tot(pFrom, pTo), series: [...series.values()],
    products: [...prod.values()].sort((a, b) => score(b) - score(a)).slice(0, 20),
    merchants: [...mer.values()].sort((a, b) => score(b) - score(a)),
    flashLive: fl.filter((x) => x.live).length, flashTotal: fl.length,
    highlighted: db.prepare("SELECT COUNT(*) FROM merchants WHERE published=1 AND highlight_until>=?").pluck().get(to),
    trackingSince: db.prepare("SELECT MIN(day) FROM stats").pluck().get() || null
  };
}
