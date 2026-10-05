// Uji notifikasi Mitra: npm run test:notif
import assert from "node:assert/strict";
import { buildNotifications, unreadOf } from "../src/lib/partnerNotifications.js";

const tests = [];
const test = (n, f) => tests.push([n, f]);
const frame = (o) => ({ id: "f1", name: "Retro", stock: 20, published: true, vto: false, media: { photos: 1, glb: null }, ...o });
const acc = (o = {}) => ({ subscription: { status: "active", currentPeriodEnd: "2026-12-01", cancelAtPeriodEnd: false }, frames: [], adOrders: [], ...o });
const T = "2026-10-04";

test("Belum masuk → tidak ada notifikasi", () => assert.deepEqual(buildNotifications(null, T), []));
test("Akun rapi → kosong", () => assert.equal(buildNotifications(acc({ frames: [frame()] }), T).length, 0));
test("Stok ≤5 → peringatan dengan tindakan ke Produk/Frame", () => {
  const [n] = buildNotifications(acc({ frames: [frame({ stock: 3 })] }), T);
  assert.equal(n.tone, "warn"); assert.match(n.title, /tinggal 3/); assert.equal(n.action.to, "/partner/store/products");
});
test("Frame tayang tanpa foto / try-on tanpa model 3D / rig tidak sesuai", () => {
  const ids = buildNotifications(acc({ frames: [frame({ id: "a", media: { photos: 0 } }), frame({ id: "b", vto: true }), frame({ id: "c", media: { photos: 1, glb: { rig: "none" } } })] }), T).map((n) => n.id);
  assert.ok(ids.includes("photo:a") && ids.includes("model:b") && ids.includes("rig:c"), ids.join());
});
test("Tagihan: ≤14 hari → info; batal di akhir periode → peringatan; >14 hari → tidak ada", () => {
  const soon = buildNotifications(acc({ subscription: { status: "active", currentPeriodEnd: "2026-10-10", cancelAtPeriodEnd: false } }), T);
  assert.equal(soon[0].tone, "info"); assert.match(soon[0].title, /6 hari/);
  const ending = buildNotifications(acc({ subscription: { status: "active", currentPeriodEnd: "2026-10-10", cancelAtPeriodEnd: true } }), T);
  assert.equal(ending[0].tone, "warn");
  assert.equal(buildNotifications(acc(), T).length, 0);
});
test("Iklan berakhir ≤3 hari muncul; yang masih lama / sudah lewat tidak", () => {
  const mk = (endsOn) => acc({ adOrders: [{ id: "AO1", status: "paid", label: "Banner", endsOn }] });
  assert.equal(buildNotifications(mk("2026-10-06"), T).length, 1);
  assert.equal(buildNotifications(mk("2026-10-30"), T).length, 0);
  assert.equal(buildNotifications(mk("2026-10-01"), T).length, 0);
});
test("Urutan: peringatan dulu; maks. 8; unreadOf menghormati status dibaca", () => {
  const frames = Array.from({ length: 12 }, (_, i) => frame({ id: `x${i}`, stock: i % 2 ? 2 : 20, media: { photos: 0 } }));
  const list = buildNotifications(acc({ frames }), T);
  assert.equal(list.length, 8); assert.equal(list[0].tone, "warn");
  const firstWarn = list.findIndex((n) => n.tone !== "warn");
  assert.ok(list.slice(firstWarn).every((n) => n.tone !== "warn"));
  assert.equal(unreadOf(list, [list[0].id]).length, 7);
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log("✓", n); } catch (e) { fail++; console.log("✗", n, "\n   ", e.message); } }
console.log(fail ? `\n${fail} gagal` : `\nSemua ${tests.length} uji lolos`);
process.exit(fail ? 1 : 0);
