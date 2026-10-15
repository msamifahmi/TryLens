// Memindahkan katalog bawaan (frontend/src/data/mockData.js: 6 toko + 24 produk) ke tabel merchants/products.
// Aman dijalankan di produksi (tidak membuat akun demo). Idempoten: baris yang sudah ada dilewati; --force menimpa.
//   npm run import-catalog [-- --force]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../src/config.js";
import { openDb } from "../src/db.js";
import { MERCHANTS, PRODUCTS } from "../../frontend/src/data/mockData.js";

const force = process.argv.includes("--force");
const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "frontend", "public", "products");
const db = openDb(config.dbPath);
const t = new Date().toISOString();
let m = 0, p = 0;

db.transaction(() => {
  for (const x of MERCHANTS) {
    if (!force && db.prepare("SELECT 1 FROM merchants WHERE id=?").get(x.id)) continue;
    db.prepare(`INSERT INTO merchants(id,name,city,province,initials,color,whatsapp,phone,link_instagram,link_x,link_tokopedia,link_shopee,published,created_at,updated_at)
      VALUES(@id,@name,@city,@province,@initials,@color,@whatsapp,@phone,@ig,@x,@tk,@sp,1,@t,@t)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,city=excluded.city,province=excluded.province,initials=excluded.initials,color=excluded.color,whatsapp=excluded.whatsapp,phone=excluded.phone,
        link_instagram=excluded.link_instagram,link_x=excluded.link_x,link_tokopedia=excluded.link_tokopedia,link_shopee=excluded.link_shopee,updated_at=excluded.updated_at`)
      .run({ id: x.id, name: x.name, city: x.city, province: x.province || "", initials: x.initials, color: x.color, whatsapp: x.whatsapp || "", phone: x.phone || "", ig: x.links?.instagram || null, x: x.links?.x || null, tk: x.links?.tokopedia || null, sp: x.links?.shopee || null, t });
    m++;
  }
  for (const x of PRODUCTS) {
    if (!force && db.prepare("SELECT 1 FROM products WHERE id=?").get(x.id)) continue;
    const hasModel = fs.existsSync(path.join(pub, x.id, "model.glb")) ? 1 : 0;
    db.prepare(`INSERT INTO products(id,merchant_id,name,style,color_key,category,price,old_price,stock,description,vto,published,created_at,updated_at)
      VALUES(@id,@mid,@name,@style,@color,@cat,@price,@old,10,'',@vto,1,@t,@t)
      ON CONFLICT(id) DO UPDATE SET merchant_id=excluded.merchant_id,name=excluded.name,style=excluded.style,color_key=excluded.color_key,category=excluded.category,price=excluded.price,old_price=excluded.old_price,updated_at=excluded.updated_at`)
      .run({ id: x.id, mid: x.merchantId, name: x.name, style: x.style, color: x.colorKey, cat: x.cat, price: x.price, old: x.oldPrice || null, vto: hasModel, t });
    p++;
  }
})();
console.log(`✓ ${m} toko, ${p} produk dimasukkan ke ${config.dbPath}${force ? " (--force)" : ""}`);
db.close();
