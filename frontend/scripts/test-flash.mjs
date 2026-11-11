// Uji Update 43: kartu Flash Sale dari daftar server + penggabungan katalog + de-duplikasi statistik.
import assert from "node:assert/strict";
const { serverFlashItems } = await import("../src/lib/flashSale.js");
const { mergeCatalog, catalogInfo } = await import("../src/lib/catalog.js");
const { onceKey, deduped } = await import("../src/lib/track.js");
const { PRODUCTS } = await import("../src/data/mockData.js");
const { mergeOwnFlash } = await import("../src/lib/flashSale.js");
const PM = await import("../src/data/partnerMock.js");

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
t("track: kunjungan sekali per sesi; lihat/buka toko sekali per 30 menit; coba/beli/hubungi/wishlist SETIAP kali", () => {
  assert.equal(onceKey("view", "f1"), "tl_ev:view:f1"); assert.equal(onceKey("visit"), "tl_ev:visit:");
  for (const k of ["try", "buy", "contact", "wish"]) assert.equal(onceKey(k, "f1"), null, k);
  const mem = new Map(), st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(deduped("try", "f1", 0, st), false); assert.equal(deduped("try", "f1", 1, st), false, "coba berulang tetap dihitung");
  assert.equal(deduped("view", "f1", 0 + 1, st), false); assert.equal(deduped("view", "f1", 10 * 60e3, st), true, "10 menit kemudian: tidak dihitung lagi");
  assert.equal(deduped("view", "f1", 31 * 60e3, st), false, "lewat 30 menit: dihitung lagi");
  assert.equal(deduped("visit", "", 1, st), false); assert.equal(deduped("visit", "", 99 * 3600e3, st), true);
});
t("mergeOwnFlash: frame Flash Sale Mitra yang sedang masuk ikut tampil (tanpa duplikat, batas per toko, aturan diskon)", () => {
  const [a, b, c] = PRODUCTS.filter((p) => p.merchantId === PRODUCTS[0].merchantId);
  const mid = a.merchantId;
  const frames = [
    { id: a.id, price: 200000, published: true, flash: { on: true, price: 150000, quota: 10, sold: 2 } },
    { id: b.id, price: 200000, published: true, flash: { on: true, price: 195000, quota: 10, sold: 0 } }, // diskon 3% < minimum
    { id: c.id, price: 200000, published: true, flash: { on: false, price: 100000, quota: 10, sold: 0 } }
  ];
  const state = { session: { email: "x@y" }, accounts: { "x@y": { store: { merchantId: mid }, frames } } };
  const cfg = { enabled: true, minDiscount: 10, maxPerMerchant: 4 };
  const out = mergeOwnFlash([], cfg, state);
  assert.deepEqual(out.map((p) => p.id), [a.id]); assert.equal(out[0].price, 150000); assert.equal(out[0].oldPrice, 200000); assert.equal(out[0].flashLeft, 8);
  assert.equal(mergeOwnFlash([{ id: a.id, merchantId: mid, flashSold: 1 }], cfg, state).length, 1, "tidak dobel dengan daftar server");
  assert.equal(mergeOwnFlash([{ id: "z", merchantId: mid, flashSold: 1 }], { ...cfg, maxPerMerchant: 1 }, state).length, 1, "batas per toko");
  assert.equal(mergeOwnFlash([], cfg, { session: null, accounts: {} }).length, 0, "tanpa Mitra masuk");
});
t("Paket & slot VTO: Basic 5, Pro 15, katalog tanpa batas; Rp30rb/slot, 5 slot Rp145rb; kuota = paket + slot", () => {
  assert.equal(PM.PLANS.basic.limits.vto, 5); assert.equal(PM.PLANS.pro.limits.vto, 15);
  assert.equal(PM.PLANS.basic.limits.frames, Infinity); assert.equal(PM.PLANS.pro.limits.frames, Infinity);
  assert.equal(PM.vtoSlotPrice(1), 30000); assert.equal(PM.vtoSlotPrice(5), 145000); assert.equal(PM.vtoSlotPrice(6), 175000); assert.equal(PM.vtoSlotPrice(10), 290000);
  assert.equal(PM.vtoLimitOf({ subscription: { plan: "basic" }, vtoExtraSlots: 3 }), 8);
  assert.equal(PM.vtoLimitOf({ subscription: { plan: "pro" } }), 15);
  assert.equal(PM.vtoLimitOf({ subscription: { plan: "pro" }, vtoExtraSlots: 2 }, "basic"), 7, "turun paket memakai kuota Basic + slot");
});
console.log(`Semua ${n} uji lolos`);
