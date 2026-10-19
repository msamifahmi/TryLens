// Pustaka model 3D siap pakai: frame bawaan TryLens (f0–f19) yang sudah punya model 3D berrig di /products/<id>/model.glb.
// Mitra memilih salah satu saat menambah frame, lalu cukup menambahkan foto, harga, dan stok sendiri.
import { PRODUCTS } from "./mockData.js";

export const LIBRARY_IDS = Array.from({ length: 20 }, (_, i) => `f${i}`);

/** Frame bawaan yang punya model 3D, urut f0…f19. */
export function libraryModels() {
  return LIBRARY_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
}

/** Frame bawaan menurut id, atau null. */
export const libraryProduct = (id) => (id ? PRODUCTS.find((p) => p.id === id) || null : null);

export const isLibraryId =(id) => LIBRARY_IDS.includes(id);

/** Nilai awal formulir frame dari satu model pustaka. Harga/stok/foto sengaja kosong: itu milik toko Mitra. */
export function formFromLibrary(p, base) {
  return {
    ...base,
    name: p.name,
    style: p.style,
    colorKey: p.colorKey,
    category: p.cat,
    description: p.description || "",
    size: p.size ? { ...p.size } : {},
    libraryModel: p.id,
    price: "",
    oldPrice: ""
  };
}
