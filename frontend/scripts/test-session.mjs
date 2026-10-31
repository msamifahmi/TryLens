// Uji masa berlaku sesi Mitra: npm run test:session
import assert from "node:assert/strict";
import { gcdCheck } from "../src/ar/eyeFit.js";
import { safeHttpsUrl, safeLinks } from "../src/lib/ecommerce.js";
import { SESSION_LIMITS as L, expiresAt, isExpired, msLeft, newSession, touched } from "../src/lib/partnerSession.js";

const T = 1_700_000_000_000, MIN = 60_000, H = 60 * MIN;
const tests = [];
const test = (n, f) => tests.push([n, f]);

test("sesi baru valid; habis setelah 20 menit tanpa aktivitas", () => {
  const s = newSession("a@b.id", false, T);
  assert.equal(isExpired(s, T + 19 * MIN), false);
  assert.equal(isExpired(s, T + 20 * MIN), true);
});
test("aktivitas memperpanjang batas diam", () => {
  let s = newSession("a@b.id", false, T);
  s = touched(s, T + 15 * MIN);
  assert.equal(isExpired(s, T + 30 * MIN), false);
  assert.equal(isExpired(s, T + 35 * MIN), true);
});
test("batas umur mutlak 8 jam walau terus aktif", () => {
  let s = newSession("a@b.id", false, T);
  for (let t = 10; t < 8 * 60; t += 10) s = touched(s, T + t * MIN);
  assert.equal(isExpired(s, T + 8 * H - MIN), false);
  assert.equal(isExpired(s, T + 8 * H), true);
});
test("'Ingat saya': diam 2 jam, maks 24 jam — tetap terbatas", () => {
  const s = newSession("a@b.id", true, T);
  assert.equal(isExpired(s, T + 119 * MIN), false);
  assert.equal(isExpired(s, T + 2 * H), true);
  let r = s; for (let h = 1; h < 24; h++) r = touched(r, T + h * H);
  assert.equal(isExpired(r, T + 24 * H), true);
  assert.ok(L.remember.absoluteMs <= 24 * H);
});
test("sesi tanpa stempel waktu (format lama) / null dianggap kedaluwarsa", () => {
  assert.equal(isExpired({ email: "a@b.id" }, T), true);
  assert.equal(isExpired(null, T), true);
  assert.equal(expiresAt({ email: "x", startedAt: "abc", lastActive: 1 }), 0);
});
test("touched tidak menghidupkan sesi yang sudah habis", () => {
  const s = newSession("a@b.id", false, T);
  assert.equal(touched(s, T + 21 * MIN), s);
});
test("msLeft tidak negatif", () => {
  const s = newSession("a@b.id", false, T);
  assert.equal(msLeft(s, T + 99 * H), 0);
  assert.equal(msLeft(s, T), 20 * MIN);
});

test("safeHttpsUrl menolak javascript:/data:/http:/tanpa host; menerima https", () => {
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>1</script>", "http://x.com", "https://localhost", "", null, "//evil", "https://" + "a".repeat(300) + ".com"]) assert.equal(safeHttpsUrl(bad), null, String(bad));
  assert.equal(safeHttpsUrl("instagram.com/trylens.id"), "https://instagram.com/trylens.id");
  assert.equal(safeHttpsUrl("https://www.instagram.com/trylens.id"), "https://www.instagram.com/trylens.id");
});
test("safeLinks membuang tautan berbahaya, menyimpan yang aman", () => {
  const o = safeLinks({ instagram: "javascript:alert(1)", x: "https://x.com/a", tokopedia: "http://t.co" });
  assert.deepEqual(Object.keys(o), ["x"]);
});

test("GCD (A+DBL) vs PD: 0–6 mm lebih besar = ok; 52+18 vs PD 64 = +6 ok", () => {
  assert.equal(gcdCheck({ lensWidthMm: 52, bridgeMm: 18, pdMm: 64 }).status, "ok");
  assert.equal(gcdCheck({ lensWidthMm: 52, bridgeMm: 18, pdMm: 70 }).status, "ok"); // 0
  assert.equal(gcdCheck({ lensWidthMm: 52, bridgeMm: 18, pdMm: 62 }).perEye, 4);
});
test("GCD: terlalu rapat/renggang diberi peringatan; data tidak masuk akal → null", () => {
  assert.equal(gcdCheck({ lensWidthMm: 48, bridgeMm: 16, pdMm: 66 }).status, "warn"); // −2
  assert.equal(gcdCheck({ lensWidthMm: 46, bridgeMm: 14, pdMm: 68 }).status, "bad");
  assert.equal(gcdCheck({ lensWidthMm: 58, bridgeMm: 22, pdMm: 60 }).status, "bad");
  assert.equal(gcdCheck({ lensWidthMm: 52, bridgeMm: 18, pdMm: 20 }), null);
  assert.equal(gcdCheck({ lensWidthMm: 0, bridgeMm: 18, pdMm: 64 }), null);
});

let fail = 0;
for (const [n, f] of tests) { try { await f(); console.log("ok  ", n); } catch (e) { fail++; console.log("FAIL", n, "\n    ", e.message); } }
console.log(fail ? `\n${fail} gagal` : `\nsemua ${tests.length} lulus`);
process.exit(fail ? 1 : 0);
