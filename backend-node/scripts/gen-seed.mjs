// Membuat frontend/public/api/seed.json (6 toko + 24 produk bawaan) untuk backend PHP, + menyalin admin.html ke sana.
//   npm run gen-seed
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MERCHANTS, PRODUCTS } from "../../frontend/src/data/mockData.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(root, "frontend", "public", "api");
const pub = path.join(root, "frontend", "public", "products");
const seed = {
  merchants: MERCHANTS.map(({ id, name, city, province, initials, color, whatsapp, phone, links }) => ({ id, name, city, province: province || "", initials, color, whatsapp: whatsapp || "", phone: phone || "", links: links || {} })),
  products: PRODUCTS.map((p) => ({ id: p.id, merchantId: p.merchantId, name: p.name, style: p.style, colorKey: p.colorKey, cat: p.cat, price: p.price, oldPrice: p.oldPrice || null, vto: fs.existsSync(path.join(pub, p.id, "model.glb")) }))
};
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "seed.json"), JSON.stringify(seed, null, 1) + "\n");
fs.copyFileSync(path.join(root, "backend-node", "public", "admin.html"), path.join(out, "admin.html"));
console.log(`✓ seed.json (${seed.merchants.length} toko, ${seed.products.length} produk) + admin.html → frontend/public/api/`);
