import { useEffect, useState } from "react";
import { assetUrl } from "./catalog.js";

export const PHOTO_VARIANTS = ["main", "side", "detail", "close"];
const cache = new Map();

/** true bila gambar benar-benar ada (server SPA bisa membalas index.html untuk berkas yang tak ada → onerror). */
function probe(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    }));
  }
  return cache.get(url);
}

/**
 * Daftar foto produk yang ADA di folder (main/side/detail/close). Hanya yang ada yang dikembalikan,
 * jadi galeri tidak memajang ilustrasi untuk foto yang belum diunggah. `ready` = semua pengecekan selesai.
 */
export function useProductPhotos(productId) {
  const [state, setState] = useState({ id: productId, photos: [], ready: false });
  useEffect(() => {
    let alive = true;
    setState({ id: productId, photos: [], ready: false });
    Promise.all(PHOTO_VARIANTS.map((v) => probe(assetUrl(productId, `${v}.jpg`)))).then((found) => {
      if (alive) setState({ id: productId, photos: PHOTO_VARIANTS.filter((_, i) => found[i]), ready: true });
    });
    return () => { alive = false; };
  }, [productId]);
  return state.id === productId ? state : { photos: [], ready: false };
}
