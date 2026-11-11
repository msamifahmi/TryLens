// Statistik pengunjung untuk /admin (Ringkasan) dan dasbor Mitra (Analitik). Hanya angka harian/per jam teragregasi di server:
// tanpa cookie, tanpa ID pengguna, tanpa IP tersimpan. Hanya terkirim bila situs memakai server (bukan mode demo).
import { apiUrl, backend } from "../api/http.js";
import { catalogInfo } from "./catalog.js";

export const TRACK_KINDS = ["visit", "view", "try", "buy", "contact", "store", "capture", "wish"];
// Kunjungan situs: sekali per sesi tab. Lihat frame / buka halaman toko: sekali per 30 menit per frame/toko
// (muat ulang tidak menggelembungkan angka). Coba virtual, klik beli, hubungi, wishlist: SETIAP kali terjadi.
const WINDOW_MS = { visit: Infinity, view: 30 * 60e3, store: 30 * 60e3 };

/** Kunci de-duplikasi; null = selalu dihitung. Diekspor untuk diuji. */
export const onceKey = (kind, productId) => (kind in WINDOW_MS ? `tl_ev:${kind}:${productId || ""}` : null);
/** true bila kejadian ini masih dalam jendela de-duplikasi (tidak dikirim lagi). */
export function deduped(kind, productId, now = Date.now(), store = safeSession()) {
  const key = onceKey(kind, productId);
  if (!key || !store) return false;
  try {
    const last = Number(store.getItem(key)) || 0;
    if (last && now - last < WINDOW_MS[kind]) return true;
    store.setItem(key, String(now));
  } catch { /* penyimpanan diblokir → tetap kirim */ }
  return false;
}
function safeSession() { try { return typeof sessionStorage === "undefined" ? null : sessionStorage; } catch { return null; } }

export function track(kind, productId) {
  if (!TRACK_KINDS.includes(kind) || !backend.up || catalogInfo.source !== "server") return false;
  if (deduped(kind, productId)) return false;
  try {
    fetch(apiUrl("/api/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-TryLens": "1" },
      body: JSON.stringify(kind === "visit" ? { kind } : { kind, productId }),
      credentials: "include",
      keepalive: true // tetap terkirim walau tab langsung berpindah ke Shopee/WhatsApp
    }).catch(() => {});
  } catch { /* abaikan */ }
  return true;
}
