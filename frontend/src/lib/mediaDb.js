// Penyimpanan berkas (foto produk, model .glb) di IndexedDB — localStorage terlalu kecil (±5 MB) untuk .glb.
// Mode demo tanpa backend: berkas tersimpan di browser mitra. Saat backend siap, ganti isi 4 fungsi ini dengan
// upload ke server (POST ke /api/media → simpan di public/products/<idFrame>/) tanpa mengubah pemanggilnya.
import { useEffect, useState } from "react";
import { ApiError, api, apiUrl, backend } from "../api/http.js";

const DB = "trylens-media";
const STORE = "files";
let dbp = null;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}
const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
};

export const mediaKey = (frameId, slot) => `${frameId}/${slot}`; // slot: "photo-0".."photo-3" | "model"

// Dua mode, antarmuka sama:
//  - server (backend hidup): berkas diunggah ke API (divalidasi server) dan disajikan dari /media/<idFrame>/...
//  - demo (tanpa backend): IndexedDB di browser mitra.
const serverMode = () => backend.up && backend.partner;
const VARIANTS = ["main", "side", "detail", "close"];
const split = (key) => {
  const i = key.indexOf("/");
  return [key.slice(0, i), key.slice(i + 1)];
};
const fileOf = (slot) => (slot === "model" ? "model.glb" : `${VARIANTS[+slot.split("-")[1]]}.jpg`);
export const mediaUrl = (key, v = 0) => {
  const [id, slot] = split(key);
  return apiUrl(`/media/${id}/${fileOf(slot)}?v=${v}`);
};

export const putMedia = async (key, blob) => {
  if (!serverMode()) return tx("readwrite", (s) => s.put(blob, key));
  const [id, slot] = split(key);
  await api("PUT", `/api/partner/frames/${encodeURIComponent(id)}/assets/${slot}`, blob, { raw: true });
};
export const getMedia = async (key) => {
  if (!serverMode()) return tx("readonly", (s) => s.get(key));
  const res = await fetch(mediaUrl(key, Date.now()), { credentials: "include" });
  return res.ok ? res.blob() : null;
};
export const delMedia = async (key) => {
  if (!serverMode()) return tx("readwrite", (s) => s.delete(key));
  const [id, slot] = split(key);
  await api("DELETE", `/api/partner/frames/${encodeURIComponent(id)}/assets/${slot}`).catch((e) => {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
  });
};
export const delFrameMedia = async (frameId, photos = 4) => {
  if (serverMode()) return; // server menghapus berkas bersama frame-nya
  await Promise.all([...Array.from({ length: photos }, (_, i) => delMedia(mediaKey(frameId, `photo-${i}`))), delMedia(mediaKey(frameId, "model"))]);
};

/** Muat blob → URL objek (otomatis dibersihkan). null bila tidak ada / IndexedDB tak tersedia. */
export function useMediaUrl(key, version = 0) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true, made = null;
    if (key && serverMode()) { setUrl(mediaUrl(key, version)); return undefined; }
    if (!key || typeof indexedDB === "undefined") { setUrl(null); return undefined; }
    getMedia(key).then((b) => {
      if (!alive || !b) return setUrl(null);
      made = URL.createObjectURL(b);
      setUrl(made);
    }).catch(() => alive && setUrl(null));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [key, version]);
  return url;
}

/** Perkecil foto ke sisi terpanjang ≤ 1200 px (JPEG 0.85) supaya hemat penyimpanan. */
export async function shrinkImage(file, max = 1200) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Gagal memproses foto"))), "image/jpeg", 0.85));
}

/** Pangkas gambar jadi persegi (tengah) lalu perkecil → JPEG. Dipakai untuk foto profil toko. */
export async function cropSquare(file, size = 256, quality = 0.88) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Pilih gambar JPG, PNG, atau WebP.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Gambar terlalu besar (maks 8 MB).");
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close?.();
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Gagal memproses gambar.");
  const dataUrl = await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(blob);
  });
  return { blob, dataUrl };
}
