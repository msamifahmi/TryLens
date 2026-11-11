// Uji Update 43: kartu Flash Sale dari daftar server + penggabungan katalog + de-duplikasi statistik.
import assert from "node:assert/strict";
const { serverFlashItems } = await import("../src/lib/flashSale.js");
const { mergeCatalog, catalogInfo } = await import("../src/lib/catalog.js");
const { onceKey } = await import("../src/lib/track.js");
const { PRODUCTS } = await import("../src/data/mockData.js");

let n = 0;
const t = (name, f) => { f(); n++; console.log("ok  ", name); };

t("serverFlashItems: harga kilat, harga coret = harga normal, % terjual, sisa, urut terlaris", () => {
  const prods = [{ id: "a", name: "A", price: 300000 }, { id: "b", name: "B", price: 200000 }];
  const out = serverFlashItems([{ id: "a", price: 240000, regular: 300000, quota: 10, sold: 2 }, { id: "b", price: 150000, regular: 200000, quota: 4, sold: 3 }, { id: "x", price: 1, regular: 2, quota: 1, sold: 0 }], prods);
  assert.deepEqual(out.map((p) => p.id), ["b", "a"]);
  assert.equal(out[1].price, 240000); assert.equal(out[1].oldPrice, 300000); assert.equal(out[1].badge, "-20%");
  assert.equal(out[0].flashSold, 75); assert.equal(out[0].flashLeft, 1);
});
t("serverFlashItems: data rusak (kuota 0 / tidak lebih murah) dilewati", () => {
  assert.equal(serverFlashItems([{ id: "a", price: 5, regular: 5, quota: 3, sold: 0 }, { id: "a", price: 1, regular: 5, quota: 0, sold: 0 }], [{ id: "a" }]).length, 0);
});
t("mergeCatalog: flashItems dari server menggantikan tanda flash bawaan; highlighted ikut", () => {
  const before = PRODUCTS.filter((p) => p.flash).length;
  assert.ok(before > 0, "data bawaan punya tanda flash");
  const id = PRODUCTS[0].id;
  mergeCatalog({ products: [], merchants: [], hidden: [], highlighted: ["m2"], flashItems: [{ id, price: 1000, regular: 2000, quota: 5, sold: 0 }] });
  assert.deepEqual(PRODUCTS.filter((p) => p.flash).map((p) => p.id), [id]);
  assert.deepEqual(catalogInfo.highlighted, ["m2"]); assert.equal(catalogInfo.flashItems.length, 1);
});
t("track: kunjungan/lihat/coba sekali per sesi per produk; klik beli & hubungi selalu dihitung", () => {
  assert.equal(onceKey("view", "f1"), "tl_ev:view:f1"); assert.equal(onceKey("visit"), "tl_ev:visit:");
  assert.equal(onceKey("buy", "f1"), null); assert.equal(onceKey("contact", "f1"), null);
});
console.log(`Semua ${n} uji lolos`);
