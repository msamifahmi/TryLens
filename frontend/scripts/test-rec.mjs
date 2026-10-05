// Uji mesin rekomendasi: `npm run test:rec`
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/data/mockData.js";
import { recommend, scoreAll, frameWidthMm, FIT } from "../src/rec/recommend.js";
import { FACE_SHAPES } from "../src/data/faceShape.js";

const face = (shape, width = "medium", mm = null) => ({ shape, width, mm, styles: FACE_SHAPES[shape].styles });
const tests = [];
const test = (n, f) => tests.push([n, f]);
const R = (o) => recommend({ products: PRODUCTS, ...o });

test("Tanpa data pribadi: confidence 0 (hanya populer), tidak mengaku 'cocok'", () => {
  const r = R({});
  assert.equal(r.confidence, 0);
  assert.equal(r.items.length, 6);
});

test("Wajah bulat: gaya yang disarankan (square/rect/browline) mendominasi 3 teratas", () => {
  const r = R({ face: face("round"), limit: 6, category: "Semua" });
  const good = new Set(FACE_SHAPES.round.styles);
  const top3 = r.items.slice(0, 3).filter((x) => good.has(x.product.style)).length;
  assert.ok(top3 >= 2, `hanya ${top3}/3 gaya cocok di teratas`);
  assert.ok(r.items[0].reasons.length > 0);
});

test("Lebar: frame yang jauh lebih lebar dari wajah diberi peringatan & skor width rendah", () => {
  const small = { shape: "oval", width: "small", mm: 128, styles: FACE_SHAPES.oval.styles };
  const all = scoreAll({ products: PRODUCTS, face: small });
  const wide = PRODUCTS.filter((p) => frameWidthMm(p) / 128 > FIT.tooWide);
  assert.ok(wide.length > 0);
  for (const p of wide) assert.ok(all.map.get(p.id).caution, `${p.id} harusnya ada peringatan`);
});

test("Wajah lebar mm besar vs kecil memberi urutan berbeda (lebar benar-benar berpengaruh)", () => {
  const a = R({ face: { ...face("oval"), mm: 130 }, limit: 5, diversify: false }).items.map((x) => x.product.id).join();
  const b = R({ face: { ...face("oval"), mm: 165 }, limit: 5, diversify: false }).items.map((x) => x.product.id).join();
  assert.notEqual(a, b);
});

test("Riwayat: frame dicoba menaikkan frame serupa; yang sedang dilihat tidak ikut direkomendasikan", () => {
  const cur = PRODUCTS.find((p) => p.style === "cateye");
  const r = R({ viewed: [cur.id], currentId: cur.id, limit: 4, diversify: false });
  assert.ok(!r.items.some((x) => x.product.id === cur.id));
  assert.equal(r.items[0].product.style, "cateye");
});

test("Keragaman (MMR): 3 teratas berbeda gaya & 6 teratas ≥3 gaya (tanpa MMR, 2 teratas sama-sama square)", () => {
  const plain = R({ face: face("oval"), limit: 6, diversify: false }).items.map((x) => x.product.style);
  assert.equal(plain[0], plain[1]);
  const r = R({ face: face("oval"), limit: 6 }).items.map((x) => x.product.style);
  assert.equal(new Set(r.slice(0, 3)).size, 3);
  assert.ok(new Set(r).size >= 3);
});

test("Kategori: Anak hanya menghasilkan produk Anak; default dewasa tidak menampilkan Anak di teratas untuk wajah dewasa", () => {
  assert.ok(R({ category: "Anak", limit: 10 }).items.every((x) => x.product.cat === "Anak"));
  const r = R({ face: { ...face("oval"), mm: 150 }, limit: 5, diversify: false });
  assert.ok(r.items.every((x) => x.product.cat !== "Anak"), "frame anak tidak boleh di 5 besar untuk wajah 150 mm");
});

test("f0 memakai lebar model.glb (146 mm) & deterministik", () => {
  assert.equal(frameWidthMm({ id: "f0", style: "aviator" }), 146);
  assert.equal(frameWidthMm(PRODUCTS[5]), frameWidthMm(PRODUCTS[5]));
});

test("Skor 0–100 dan reasons maksimal 2", () => {
  const r = R({ face: face("heart"), viewed: ["f2", "f3"], limit: 8 });
  for (const x of r.items) { assert.ok(x.percent >= 0 && x.percent <= 100); assert.ok(x.reasons.length <= 2); }
});

test("Toko serupa: merchantIds membatasi hasil hanya ke toko itu", () => {
  const ids = ["m2", "m3"];
  const r = R({ face: face("oval"), merchantIds: ids, limit: 6 });
  assert.ok(r.items.length > 0 && r.items.every((x) => ids.includes(x.product.merchantId)));
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log("✓", n); } catch (e) { fail++; console.log("✗", n, "\n   ", e.message); } }
console.log(fail ? `\n${fail} gagal` : `\nSemua ${tests.length} uji lolos`);
process.exit(fail ? 1 : 0);
