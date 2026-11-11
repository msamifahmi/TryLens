// Statistik pengunjung untuk tab Ringkasan di /admin. Hanya angka harian teragregasi di server:
// tanpa cookie, tanpa ID pengguna, tanpa IP tersimpan. Hanya terkirim bila situs memakai server (bukan mode demo).
import { apiUrl, backend } from "../api/http.js";
import { catalogInfo } from "./catalog.js";

export const TRACK_KINDS = ["visit", "view", "try", "buy", "contact"];
const ONCE = new Set(["visit", "view", "try"]); // sekali per sesi tab (per produk) supaya muat ulang tidak menggelembungkan angka

/** Kunci de-duplikasi; null = selalu kirim (klik beli/hubungi). Diekspor untuk diuji. */
export const onceKey = (kind, productId) => (ONCE.has(kind) ? `tl_ev:${kind}:${productId || ""}` : null);

export function track(kind, productId) {
  if (!TRACK_KINDS.includes(kind) || !backend.up || catalogInfo.source !== "server") return false;
  const key = onceKey(kind, productId);
  try {
    if (key) {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, "1");
    }
  } catch { /* penyimpanan diblokir → tetap kirim */ }
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
