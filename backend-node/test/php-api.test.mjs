// Uji backend PHP katalog (frontend/public/api/index.php) lewat `php -S` + router yang meniru .htaccess. Dilewati bila php tidak ada.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
if (spawnSync("php", ["-v"]).status !== 0) { console.log("php tidak ada — uji PHP dilewati"); process.exit(0); }
assert.equal(fs.readFileSync(path.join(here, "../public/admin.html"), "utf8"), fs.readFileSync(path.join(here, "../../frontend/public/api/admin.html"), "utf8"), "admin.html PHP harus sama dengan Node (jalankan npm run gen-seed)");

const data = fs.mkdtempSync(path.join(os.tmpdir(), "tlphp-"));
const TOKEN = "token-php-untuk-uji-1234567890";
fs.writeFileSync(path.join(data, "config.php"), `<?php return ['adminToken' => '${TOKEN}'];\n`);
const port = 18000 + Math.floor(Math.random() * 1000);
const srv = spawn("php", ["-S", `127.0.0.1:${port}`, path.join(here, "router.php")], { env: { ...process.env, TRYLENS_DATA: data }, stdio: "ignore" });
const base = `http://127.0.0.1:${port}`;
for (let i = 0; i < 50; i++) { try { await fetch(base + "/api/health"); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }

const A = { Authorization: `Bearer ${TOKEN}`, "X-TryLens": "1" };
const call = async (method, url, body, { raw, headers = A } = {}) => {
  const h = { ...headers }; let b;
  if (raw) b = body; else if (body !== undefined) { h["Content-Type"] = "application/json"; b = JSON.stringify(body); }
  const r = await fetch(base + url, { method, headers: h, body: b });
  const ct = r.headers.get("content-type") || "";
  return { status: r.status, body: ct.includes("json") ? await r.json() : Buffer.from(await r.arrayBuffer()), headers: r.headers };
};
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
function glb() {
  const nodes = ["GlassesRoot", "Bridge", "LeftLensCenter", "RightLensCenter", "LeftTemple", "RightTemple"].map((name) => ({ name, ...(name === "GlassesRoot" ? { extras: { trylens: { frameWidthMm: 146, lensWidthMm: 55, lensHeightMm: 50, bridgeWidthMm: 19, templeLengthMm: 140, realWorldScale: 10 } } } : {}) }));
  let j = Buffer.from(JSON.stringify({ asset: { version: "2.0" }, nodes, meshes: [{}] }));
  while (j.length % 4) j = Buffer.concat([j, Buffer.from(" ")]);
  const b = Buffer.alloc(20 + j.length);
  b.writeUInt32LE(0x46546c67, 0); b.writeUInt32LE(2, 4); b.writeUInt32LE(b.length, 8); b.writeUInt32LE(j.length, 12); b.writeUInt32LE(0x4e4f534a, 16); j.copy(b, 20);
  return b;
}
const tests = [];
const test = (n, f) => tests.push([n, f]);

test("health JSON + katalog awal otomatis terisi (6 toko, 24 produk)", async () => {
  assert.equal((await call("GET", "/api/health", undefined, { headers: {} })).body.ok, true);
  const c = (await call("GET", "/api/catalog", undefined, { headers: {} })).body;
  assert.equal(c.products.length, 24); assert.equal(c.merchants.length, 6);
  assert.equal(c.products.find((p) => p.id === "f0").price, 309000);
});
test("auth: tanpa token 401, salah 401, tanpa X-TryLens 403; /api/auth/me → 404 JSON (klien jatuh ke mode demo Mitra)", async () => {
  assert.equal((await call("GET", "/api/admin/products", undefined, { headers: { "X-TryLens": "1" } })).status, 401);
  assert.equal((await call("GET", "/api/admin/products", undefined, { headers: { Authorization: "Bearer salah", "X-TryLens": "1" } })).status, 401);
  assert.equal((await call("POST", "/api/admin/products", {}, { headers: { Authorization: `Bearer ${TOKEN}` } })).status, 403);
  assert.equal((await call("GET", "/api/admin/ping", undefined, { headers: { "X-Admin-Token": TOKEN, "X-TryLens": "1" } })).status, 200, "X-Admin-Token sebagai cadangan");
  const me = await call("GET", "/api/auth/me", undefined, { headers: { "X-TryLens": "1" } });
  assert.equal(me.status, 404); assert.ok(me.body.error);
});
test("produk: validasi, id otomatis f24, PATCH sebagian, ubah harga memengaruhi katalog", async () => {
  assert.equal((await call("POST", "/api/admin/products", { name: "X", merchantId: "m1", style: "round", colorKey: "gold", category: "Wanita", price: 100 })).status, 400);
  assert.equal((await call("POST", "/api/admin/products", { name: "Aurora Round", merchantId: "nope", style: "round", colorKey: "gold", category: "Wanita", price: 249000 })).status, 400);
  assert.equal((await call("POST", "/api/admin/products", { name: "Aurora Round", merchantId: "m1", style: "round", colorKey: "gold", category: "Wanita", price: 249000, buy: { tokopedia: "https://evil.com/x" } })).status, 400);
  const ok = await call("POST", "/api/admin/products", { name: "Aurora Round", merchantId: "m1", style: "round", colorKey: "gold", category: "Wanita", price: 249000, oldPrice: 329000, stock: 12, buy: { tokopedia: "https://tokopedia.com/optikkusuma/aurora" }, size: { lensWidthMm: 52, bridgeMm: 18, templeMm: 140 } });
  assert.equal(ok.status, 201); assert.equal(ok.body.product.id, "f24");
  assert.equal((await call("POST", "/api/admin/products", { name: "Boreal", merchantId: "m1", style: "square", colorKey: "black", category: "Pria", price: 199000 })).body.product.id, "f25");
  const pat = await call("PATCH", "/api/admin/products/f24", { price: 259000, stock: 5 });
  assert.equal(pat.body.product.price, 259000); assert.equal(pat.body.product.size.lensWidthMm, 52); assert.equal(pat.body.product.stock, 5);
  assert.equal((await call("PATCH", "/api/admin/products/f24", { oldPrice: 100 })).status, 400);
  const f0 = await call("PATCH", "/api/admin/products/f0", { price: 299000 });
  assert.equal(f0.body.product.price, 299000);
  const c = (await call("GET", "/api/catalog", undefined, { headers: {} })).body;
  assert.equal(c.products.find((p) => p.id === "f24").badge, "-21%");
  assert.equal(c.products.find((p) => p.id === "f0").price, 299000);
});
test("berkas: non-JPEG 415, foto utama dulu, foto + GLB diterima (vto nyala), disajikan /media, jenis konten benar", async () => {
  assert.equal((await call("PUT", "/api/admin/products/f24/assets/photo-0", Buffer.from("GIF89a....."), { raw: true })).status, 415);
  assert.equal((await call("PUT", "/api/admin/products/f24/assets/photo-1", jpeg, { raw: true })).status, 400);
  assert.equal((await call("PUT", "/api/admin/products/f24/assets/photo-0", jpeg, { raw: true })).body.product.photos, 1);
  assert.equal((await call("PUT", "/api/admin/products/f24/assets/model", Buffer.from("bukan glb!!!!!!!!!!!!!!!!"), { raw: true })).status, 415);
  const g = await call("PUT", "/api/admin/products/f24/assets/model", glb(), { raw: true });
  assert.equal(g.body.product.hasModel, true); assert.equal(g.body.product.vto, true); assert.equal(g.body.product.rig.complete, true);
  const img = await call("GET", "/media/f24/main.jpg", undefined, { headers: {} });
  assert.equal(img.status, 200); assert.equal(img.headers.get("content-type"), "image/jpeg");
  assert.equal((await call("GET", "/media/f24/model.glb", undefined, { headers: {} })).headers.get("content-type"), "model/gltf-binary");
  assert.equal((await call("GET", "/media/f25/main.jpg", undefined, { headers: {} })).status, 404);
  const c = (await call("GET", "/api/catalog", undefined, { headers: {} })).body;
  assert.equal(c.products.find((p) => p.id === "f24").assets.base, "/media/f24");
});
test("sembunyikan produk → masuk hidden; hapus produk menghapus berkas; toko berproduk tak bisa dihapus", async () => {
  await call("PATCH", "/api/admin/products/f25", { published: false });
  let c = (await call("GET", "/api/catalog", undefined, { headers: {} })).body;
  assert.ok(c.hidden.includes("f25")); assert.ok(!c.products.some((p) => p.id === "f25"));
  assert.equal((await call("DELETE", "/api/admin/merchants/m1")).status, 409);
  assert.equal((await call("DELETE", "/api/admin/products/f24")).status, 200);
  assert.equal((await call("GET", "/media/f24/main.jpg", undefined, { headers: {} })).status, 404);
});
test("toko: validasi WhatsApp/tautan, buat, ubah; ekspor memuat semua; halaman /admin disajikan", async () => {
  assert.equal((await call("POST", "/api/admin/merchants", { id: "m9", name: "Optik Baru", whatsapp: "123" })).status, 400);
  const m = await call("POST", "/api/admin/merchants", { id: "m9", name: "Optik Baru", city: "Solo", whatsapp: "081234567890", links: { instagram: "https://instagram.com/baru" } });
  assert.equal(m.status, 201); assert.equal(m.body.merchant.whatsapp, "6281234567890"); assert.equal(m.body.merchant.initials, "OB");
  assert.equal((await call("PATCH", "/api/admin/merchants/m9", { color: "merah" })).status, 400);
  const ex = await call("GET", "/api/admin/export");
  assert.equal(ex.body.merchants.length, 7); assert.equal(ex.body.products.length, 25);
  const page = await call("GET", "/admin", undefined, { headers: {} });
  assert.match(page.body.toString(), /Admin Katalog TryLens/);
});

test("katalog-update.json (f0–f19) diterima validasi server dan mengubah katalog; tombol ada di /admin", async () => {
  const upd = JSON.parse(fs.readFileSync(path.join(here, "../../frontend/public/katalog-update.json"), "utf8"));
  assert.equal(upd.products.length, 20);
  const pre = (await call("GET", "/api/catalog", undefined, { headers: {} })).body.products;
  assert.match(pre.find((p) => p.id === "f12").name, /Kate Spade/, "katalog-update.json diterapkan otomatis saat DB dibuat (tanpa klik)");
  assert.equal(pre.find((p) => p.id === "f3").price, 130000);
  assert.equal(pre.length, 24); for (const x of pre) assert.ok(x.description && x.description.length >= 60 && x.description.length <= 800, `${x.id}: deskripsi terisi`);
  assert.match(pre.find((x) => x.id === "f14").description, /140 mm/);
  assert.equal((await call("PATCH", "/api/admin/products/f12", { name: "Nama Edit Admin" })).status, 200);
  assert.equal((await call("GET", "/api/catalog", undefined, { headers: {} })).body.products.find((p) => p.id === "f12").name, "Nama Edit Admin", "edit admin tidak ditimpa lagi oleh pembaruan otomatis");
  for (const { id, ...body } of upd.products) {
    const r = await call("PATCH", `/api/admin/products/${id}`, body);
    assert.equal(r.status, 200, `${id}: ${JSON.stringify(r.body)}`);
  }
  const c = (await call("GET", "/api/catalog", undefined, { headers: {} })).body;
  const g = (id) => c.products.find((p) => p.id === id);
  assert.equal(g("f10").price, 1620000); assert.equal(g("f15").cat ?? g("f15").category, "Anak");
  assert.match(g("f12").name, /Kate Spade/); assert.equal(g("f14").size.templeMm, 140);
  assert.ok(g("f12").buy.website && !g("f12").buy.shopee && g("f2").buy.shopee);
  assert.match((await call("GET", "/admin", undefined, { headers: {} })).body.toString(), /Terapkan pembaruan katalog/);
});

test("Iklan: bawaan, validasi tautan, tambah/ubah/hapus, tayang di /api/catalog, ada di ekspor, tab Iklan di /admin", async () => {
  const pub0 = (await call("GET", "/api/catalog", undefined, { headers: {} })).body.banners;
  assert.equal(pub0.hero.length, 4); assert.equal(pub0.topbar.length, 1);
  assert.equal((await call("GET", "/api/admin/banners", undefined, { headers: {} })).status, 401);
  const post = (b) => call("POST", "/api/admin/banners", b);
  assert.equal((await post({ kind: "hero", headline: "Tes", action: "link", link: "javascript:alert(1)" })).status, 400);
  assert.equal((await post({ kind: "hero", headline: "Tes", action: "link", link: "//evil.com" })).status, 400);
  assert.equal((await post({ kind: "hero", headline: "Tes", action: "link" })).status, 400);
  assert.equal((await post({ kind: "hero", headline: "Tes", theme: "pink" })).status, 400);
  assert.equal((await post({ kind: "hero", headline: "Hi" })).status, 400);
  const ok = await post({ kind: "hero", headline: "Diskon Akhir Tahun", sub: "Hemat sampai 30%", cta: "Lihat", action: "link", link: "/merchant", theme: "gold" });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const id = ok.body.banner.id;
  assert.equal((await call("GET", "/api/catalog", undefined, { headers: {} })).body.banners.hero.at(-1).headline, "Diskon Akhir Tahun");
  assert.equal((await call("PATCH", `/api/admin/banners/${id}`, { published: false })).status, 200);
  assert.equal((await call("GET", "/api/catalog", undefined, { headers: {} })).body.banners.hero.length, 4);
  assert.equal((await call("PATCH", `/api/admin/banners/${id}`, { link: "https://try-lens.id/promo", headline: "Diskon Baru" })).body.banner.headline, "Diskon Baru");
  assert.equal((await call("DELETE", `/api/admin/banners/${id}`)).status, 200);
  assert.equal((await call("DELETE", `/api/admin/banners/${id}`)).status, 404);
  assert.equal((await call("GET", "/api/admin/export")).body.banners.length, 5);
  assert.match((await call("GET", "/admin", undefined, { headers: {} })).body.toString(), /Iklan/);
});

let fail = 0;
for (const [n, f] of tests) { try { await f(); console.log("✓", n); } catch (e) { fail++; console.log("✗", n, "\n  ", e.message); } }
srv.kill(); fs.rmSync(data, { recursive: true, force: true });
console.log(fail ? `\n${fail} gagal` : `\nSemua ${tests.length} uji PHP lolos`);
process.exit(fail ? 1 : 0);
