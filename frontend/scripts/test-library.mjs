// Uji pustaka model 3D Mitra & banner Mitra: npm run test:library
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { LIBRARY_IDS, formFromLibrary, libraryModels, libraryProduct } from "../src/data/modelLibrary.js";
import { buildNotifications } from "../src/lib/partnerNotifications.js";

const tests = [];
const test = (n, f) => tests.push([n, f]);

test("Pustaka berisi 20 model dan setiap model punya berkas model.glb", () => {
  assert.equal(LIBRARY_IDS.length, 20);
  assert.equal(libraryModels().length, 20);
  for (const id of LIBRARY_IDS) assert.ok(existsSync(new URL(`../public/products/${id}/model.glb`, import.meta.url)), `${id}/model.glb hilang`);
});
test("formFromLibrary mengisi bentuk tetapi mengosongkan harga (milik toko Mitra)", () => {
  const p = libraryProduct("f3");
  const f = formFromLibrary(p, { id: "f-x", isNew: true, stock: "10", price: "999" });
  assert.equal(f.libraryModel, "f3"); assert.equal(f.style, p.style); assert.equal(f.price, ""); assert.equal(f.id, "f-x"); assert.equal(f.stock, "10");
});
test("libraryProduct: id tidak dikenal / kosong → null", () => {
  assert.equal(libraryProduct("zzz"), null); assert.equal(libraryProduct(null), null);
});
test("Frame pustaka tanpa .glb unggahan tidak memicu notifikasi 'tambahkan model 3D'", () => {
  const acc = (extra) => ({ subscription: { status: "active", currentPeriodEnd: "2027-01-01", cancelAtPeriodEnd: false }, adOrders: [], frames: [{ id: "a", name: "A", stock: 20, published: true, vto: true, media: { photos: 1, glb: null }, ...extra }] });
  assert.ok(buildNotifications(acc({}), "2026-10-04").some((n) => n.id === "model:a"));
  assert.equal(buildNotifications(acc({ libraryModel: "f3" }), "2026-10-04").some((n) => n.id === "model:a"), false);
});

let fail = 0;
for (const [n, f] of tests) { try { await f(); console.log("✓", n); } catch (e) { fail++; console.log("✗", n, "\n ", e.message); } }
if (fail) process.exit(1);
console.log(`\nSelesai: ${tests.length} uji lolos`);
