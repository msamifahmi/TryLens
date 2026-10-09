// Katalog publik. Data statis (mockData) tetap menjadi dasar; bila backend hidup, frame Mitra dari server
// digabungkan ke dalam PRODUCTS/MERCHANTS (diubah di tempat, SEBELUM App dimuat — lihat main.jsx).
import { MERCHANTS, PRODUCTS } from "../data/mockData.js";
import { api, apiUrl, backend } from "../api/http.js";

export const catalogInfo = { source: "static", loadedAt: null };

/** Alamat aset frame: unggahan Mitra (/media/<id>) bila ada, jika tidak berkas bawaan /products/<id>. */
export function assetBase(productId) {
  const p = PRODUCTS.find((x) => x.id === productId);
  return p?.assets ? apiUrl(p.assets.base) : `/products/${productId}`;
}
export const assetUrl = (productId, file) => {
  const p = PRODUCTS.find((x) => x.id === productId);
  const v = p?.assets?.v ? `?v=${p.assets.v}` : "";
  return `${assetBase(productId)}/${file}${v}`;
};
/** true bila berkas tersebut diketahui ada (unggahan Mitra) atau produk statis (cek tersedia lewat fetch/onerror). */
export const hasUploadedModel = (productId) => PRODUCTS.find((x) => x.id === productId)?.assets?.model === true;

export function mergeCatalog(data) {
  const hidden = new Set(data.hidden || []);
  for (let i = PRODUCTS.length - 1; i >= 0; i--) if (hidden.has(PRODUCTS[i].id)) PRODUCTS.splice(i, 1);
  for (const p of data.products) {
    const i = PRODUCTS.findIndex((x) => x.id === p.id);
    if (i >= 0) {
      // Produk bawaan: hanya data yang bisa diubah Mitra yang ditimpa; urutan/flash/label tetap.
      const cur = PRODUCTS[i];
      const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
      PRODUCTS[i] = {
        ...cur, name: p.name, style: p.style, colorKey: p.colorKey, cat: p.cat, description: p.description, buy: p.buy, price: p.price, oldPrice: p.oldPrice, stock: p.stock, vto: p.vto, size: p.size || null, assets: p.assets,
        flash: cur.flash && !!p.oldPrice, badge: disc ? `-${disc}%` : cur.isNew ? "BARU" : null
      };
    } else PRODUCTS.push(p);
  }
  for (const m of data.merchants) {
    if (m.logo && m.logo.startsWith("/media/")) m.logo = apiUrl(m.logo);
    const i = MERCHANTS.findIndex((x) => x.id === m.id);
    if (i >= 0) MERCHANTS[i] = { ...MERCHANTS[i], ...m, count: MERCHANTS[i].count, rating: MERCHANTS[i].rating };
    else MERCHANTS.push(m);
  }
}

export async function loadCatalog() {
  if (!backend.up) return false;
  try {
    mergeCatalog(await api("GET", "/api/catalog"));
    Object.assign(catalogInfo, { source: "server", loadedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}
