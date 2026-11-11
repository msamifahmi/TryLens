// Flash Sale: acara diatur admin (server: catalogInfo.flashSale), frame didaftarkan Mitra dari dasbornya (mode demo: akun Mitra di perangkat ini).
import { PRODUCTS } from "../data/mockData.js";
import { usePartner } from "../store/usePartner.js";
import { catalogInfo } from "./catalog.js";
import { backend } from "../api/http.js";

export const FLASH_DEFAULTS = { enabled: true, title: "Flash Sale", subtitle: "Diskon kilat frame pilihan dari optik lokal", theme: "brand", endsAt: null, minDiscount: 10, maxPerMerchant: 4 };

// Warna tiap tema (kontras teks putih ≥ 4.5:1 pada semua titik gradien).
export const FLASH_THEMES = {
  // Palet brand TryLens: biru #406AAF/#427AB5 + kuning #F7DD7D (teks putih di atas biru ≥ 5:1; teks gelap di atas kuning)
  brand: { label: "Brand", from: "#2F559A", to: "#427AB5", glow: "#F7DD7D", chip: "#EEF5FC", accent: "#406AAF", ribbon: "#F7DD7D", ribbonText: "#111827" },
  sunset: { label: "Sunset", from: "#C2410C", to: "#BE123C", glow: "#FDBA74", chip: "#FFF1E6", accent: "#C2410C" },
  ocean: { label: "Ocean", from: "#1D4ED8", to: "#0E7490", glow: "#7DD3FC", chip: "#E6F4FF", accent: "#1D4ED8" },
  berry: { label: "Berry", from: "#7E22CE", to: "#BE185D", glow: "#F0ABFC", chip: "#FBEAFE", accent: "#9333EA" },
  midnight: { label: "Midnight", from: "#0F172A", to: "#312E81", glow: "#A5B4FC", chip: "#EEF0FF", accent: "#4F46E5" }
};

export const flashConfig = () => {
  const c = { ...FLASH_DEFAULTS, ...(catalogInfo.flashSale || {}) };
  // "sunset" (oranye–merah) dulu tema bawaan dan masih tersimpan di pengaturan server lama; di luar palet brand → ditampilkan sebagai brand.
  if (!FLASH_THEMES[c.theme] || c.theme === "sunset") c.theme = "brand";
  return c;
};

/** Waktu berakhir (ms epoch): `endsAt` bila masih di masa depan, selain itu akhir hari ini (acara harian berulang). */
export function flashEndMs(cfg = flashConfig(), now = Date.now()) {
  const t = cfg.endsAt ? Date.parse(cfg.endsAt) : NaN;
  if (Number.isFinite(t) && t > now) return t;
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export const flashPct = (regular, price) => (regular > 0 && price > 0 && price < regular ? Math.round((1 - price / regular) * 100) : 0);

/** Frame Mitra layak tayang bila terdaftar, terbit, harga kilat < harga normal, diskon ≥ minimum, kuota tersisa. */
export function flashEligible(frame, cfg = flashConfig()) {
  const f = frame?.flash;
  if (!f?.on || frame.published === false) return false;
  const pct = flashPct(frame.price, f.price);
  return pct >= cfg.minDiscount && pct > 0 && f.quota > 0 && f.sold < f.quota;
}

/** Daftar produk yang sedang flash sale (terlaris dulu). */
export function flashItems() {
  const cfg = flashConfig();
  if (!cfg.enabled) return [];
  let accounts = {};
  try { accounts = usePartner.getState().accounts || {}; } catch { /* tanpa data Mitra */ }
  // Mode server: daftar dari admin (sudah disaring server: aktif, diskon ≥ minimum, kuota tersisa, batas per toko).
  if (catalogInfo.source === "server" && Array.isArray(catalogInfo.flashItems)) {
    const list = serverFlashItems(catalogInfo.flashItems);
    // Akun Mitra masih mode demo (server tanpa akun Mitra): frame yang didaftarkan Mitra yang sedang masuk ikut tampil
    // di perangkatnya sendiri. Setelah akun Mitra ada di server (Update 45) pendaftaran ini dikirim ke server.
    return backend.partner ? list : mergeOwnFlash(list, cfg);
  }
  const accs = catalogInfo.source === "server" ? [] : Object.values(accounts).filter((a) => a?.store?.merchantId);
  const partnerMode = accs.some((a) => (a.frames || []).some((f) => f.flash));
  if (!partnerMode) return PRODUCTS.filter((p) => p.flash).sort((a, b) => b.flashSold - a.flashSold);
  const out = [];
  for (const a of accs) {
    let n = 0;
    for (const fr of a.frames || []) {
      if (n >= cfg.maxPerMerchant) break;
      const p = PRODUCTS.find((x) => x.id === fr.id);
      if (!p || !flashEligible(fr, cfg)) continue;
      const pct = flashPct(fr.price, fr.flash.price);
      out.push({ ...p, price: fr.flash.price, oldPrice: fr.price, flash: true, badge: `-${pct}%`, flashSold: Math.round((fr.flash.sold / fr.flash.quota) * 100), flashLeft: fr.flash.quota - fr.flash.sold });
      n++;
    }
  }
  return out.sort((a, b) => b.flashSold - a.flashSold);
}

/** Bentuk kartu Flash Sale dari daftar server [{ id, price, regular, quota, sold }]. Produk yang tidak ada di katalog dilewati. */
export function serverFlashItems(list, products = PRODUCTS) {
  const out = [];
  for (const f of list) {
    const p = products.find((x) => x.id === f.id);
    if (!p || !(f.quota > 0) || !(f.price < f.regular)) continue;
    const pct = flashPct(f.regular, f.price);
    out.push({ ...p, price: f.price, oldPrice: f.regular, flash: true, badge: `-${pct}%`, flashSold: Math.min(100, Math.round((f.sold / f.quota) * 100)), flashLeft: Math.max(0, f.quota - f.sold) });
  }
  return out.sort((a, b) => b.flashSold - a.flashSold);
}

/** Tambahkan frame Flash Sale milik akun Mitra yang sedang masuk (mode demo) ke daftar server, tanpa duplikat, dengan batas per toko. */
export function mergeOwnFlash(list, cfg = flashConfig(), state = safeState()) {
  const acc = state?.session && state.accounts?.[state.session.email];
  const mid = acc?.store?.merchantId;
  if (!mid || !Array.isArray(acc.frames)) return list;
  const have = new Set(list.map((p) => p.id));
  let n = list.filter((p) => p.merchantId === mid).length;
  const extra = [];
  for (const fr of acc.frames) {
    if (n >= cfg.maxPerMerchant) break;
    if (have.has(fr.id) || !flashEligible(fr, cfg)) continue;
    const p = PRODUCTS.find((x) => x.id === fr.id);
    if (!p) continue;
    const pct = flashPct(fr.price, fr.flash.price);
    extra.push({ ...p, price: fr.flash.price, oldPrice: fr.price, flash: true, badge: `-${pct}%`, flashSold: Math.round((fr.flash.sold / fr.flash.quota) * 100), flashLeft: fr.flash.quota - fr.flash.sold, own: true });
    n++;
  }
  return extra.length ? [...list, ...extra].sort((a, b) => b.flashSold - a.flashSold) : list;
}
function safeState() { try { return usePartner.getState(); } catch { return null; } }
