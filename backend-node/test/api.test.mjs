// Uji integrasi API: `npm test` (di backend-node). Memakai database SQLite sementara + server sungguhan di port acak.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";
import { hmacHex } from "../src/security.js";
import * as P from "../src/pricing.js";
import * as FP from "../../frontend/src/data/partnerMock.js";
import * as FE from "../../frontend/src/lib/ecommerce.js";
import * as BE from "../src/ecommerce.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tl-"));
const app = createApp({ dbPath: ":memory:", uploadsDir: path.join(dir, "up"), webhookSecret: "s3cret", paymentProvider: "sandbox" });
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

class Client {
  constructor() { this.cookie = ""; }
  async req(method, url, body, { raw, headers = {} } = {}) {
    const h = { "X-TryLens": "1", ...headers };
    if (this.cookie) h.Cookie = this.cookie;
    let payload;
    if (raw) payload = body;
    else if (body !== undefined) { h["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(base + url, { method, headers: h, body: payload });
    const sc = res.headers.get("set-cookie");
    if (sc) this.cookie = sc.split(";")[0].endsWith("=") ? "" : sc.split(";")[0];
    const ct = res.headers.get("content-type") || "";
    return { status: res.status, headers: res.headers, body: ct.includes("json") ? await res.json() : Buffer.from(await res.arrayBuffer()), setCookie: sc };
  }
}

// ---- berkas uji
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
function glb({ rig = true } = {}) {
  const nodes = rig
    ? ["GlassesRoot", "Bridge", "LeftLensCenter", "RightLensCenter", "LeftTemple", "RightTemple"].map((name) => ({ name, ...(name === "GlassesRoot" ? { extras: { trylens: { frameWidthMm: 146, lensWidthMm: 55, lensHeightMm: 50, bridgeWidthMm: 19, templeLengthMm: 140, realWorldScale: 10 } } } : {}) }))
    : [{ name: "Node" }];
  let j = Buffer.from(JSON.stringify({ asset: { version: "2.0" }, nodes, meshes: [{}] }));
  while (j.length % 4) j = Buffer.concat([j, Buffer.from(" ")]);
  const b = Buffer.alloc(20 + j.length);
  b.writeUInt32LE(0x46546c67, 0); b.writeUInt32LE(2, 4); b.writeUInt32LE(b.length, 8); b.writeUInt32LE(j.length, 12); b.writeUInt32LE(0x4e4f534a, 16); j.copy(b, 20);
  return b;
}

const tests = [];
// (parity kuota ditambahkan di bawah)
const test = (n, f) => tests.push([n, f]);

test("Harga & aturan server identik dengan front-end (anti-drift)", () => {
  for (const c of ["basic", "pro"]) {
    assert.equal(P.PLANS[c].priceMonth, FP.PLANS[c].priceMonth);
    assert.equal(P.PLANS[c].priceYear, FP.PLANS[c].priceYear);
    assert.equal(P.PLANS[c].frameLimit, FP.PLANS[c].limits.frames);
    assert.equal(P.PLANS[c].vtoLimit, FP.PLANS[c].limits.vto);
    for (const f of Object.keys(P.PLANS[c].features)) assert.equal(P.PLANS[c].features[f], FP.PLANS[c].features[f]);
  }
  assert.equal(P.AD_TYPES.highlighted.price, FP.AD_TYPES.highlighted.price);
  assert.equal(P.AD_TYPES.highlighted.slots, FP.AD_TYPES.highlighted.slots);
  for (const t of ["banner", "sponsored"]) for (const pl of FP.AD_TYPES[t].placements) assert.equal(P.AD_TYPES[t].placements[pl.key].price, pl.price, `${t}/${pl.key}`);
  assert.equal(P.MAX_WEEKS, FP.MAX_WEEKS);
  assert.equal(P.endsOn("2026-10-01", 2), FP.endsOn("2026-10-01", 2));
});

test("Daftar: password di-hash (scrypt), tidak pernah dikembalikan; cookie HttpOnly + SameSite", async () => {
  const c = new Client();
  const r = await c.req("POST", "/api/auth/register", { name: "Sari Optik", email: "Sari@Optik.id", password: "kata-sandi-1" });
  assert.equal(r.status, 201);
  assert.equal(r.body.account.email, "sari@optik.id");
  assert.ok(!JSON.stringify(r.body).includes("password"));
  assert.match(r.setCookie, /HttpOnly/);
  assert.match(r.setCookie, /SameSite=Lax/);
  const row = app.locals.ctx.db.prepare("SELECT password_hash FROM accounts WHERE email='sari@optik.id'").get();
  assert.match(row.password_hash, /^scrypt\$32768\$8\$1\$/);
  assert.ok(!row.password_hash.includes("kata-sandi-1"));
  const sess = app.locals.ctx.db.prepare("SELECT token_hash FROM sessions").get();
  assert.ok(!c.cookie.includes(sess.token_hash), "token sesi tidak disimpan polos");
});

test("Daftar: email ganda 409, password pendek 400, email salah 400", async () => {
  const c = new Client();
  assert.equal((await c.req("POST", "/api/auth/register", { name: "X Y", email: "sari@optik.id", password: "abcdefgh1" })).status, 409);
  assert.equal((await c.req("POST", "/api/auth/register", { name: "X Y", email: "baru@optik.id", password: "pendek" })).status, 400);
  assert.equal((await c.req("POST", "/api/auth/register", { name: "X Y", email: "bukan-email", password: "abcdefgh1" })).status, 400);
});

test("Login: salah → 401; benar → sesi; /me butuh cookie; logout mencabut sesi", async () => {
  const c = new Client();
  assert.equal((await c.req("POST", "/api/auth/login", { email: "sari@optik.id", password: "salah-salah" })).status, 401);
  assert.equal((await c.req("GET", "/api/auth/me")).body.account, null);
  assert.equal((await c.req("POST", "/api/auth/login", { email: "sari@optik.id", password: "kata-sandi-1" })).status, 200);
  assert.equal((await c.req("GET", "/api/auth/me")).body.account.email, "sari@optik.id");
  const old = c.cookie;
  await c.req("POST", "/api/auth/logout");
  const c2 = new Client(); c2.cookie = old;
  assert.equal((await c2.req("GET", "/api/auth/me")).body.account, null, "token lama mati setelah logout");
});

test("Login: 5 gagal berturut-turut → 429 (brute-force dibatasi), benar pun ditolak sementara", async () => {
  const c = new Client();
  for (let i = 0; i < 5; i++) assert.equal((await c.req("POST", "/api/auth/login", { email: "korban@optik.id", password: "x".repeat(9) })).status, 401);
  assert.equal((await c.req("POST", "/api/auth/login", { email: "korban@optik.id", password: "x".repeat(9) })).status, 429);
});

test("CSRF: POST tanpa header X-TryLens ditolak 403", async () => {
  const res = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(res.status, 403);
});

test("Rute Mitra tanpa sesi → 401", async () => {
  const c = new Client();
  assert.equal((await c.req("GET", "/api/partner/me")).status, 401);
  assert.equal((await c.req("PUT", "/api/partner/frames/abc", {})).status, 401);
  assert.equal((await c.req("POST", "/api/billing/checkout", {})).status, 401);
});

let sari;
test("Frame: tanpa langganan aktif ditolak 402", async () => {
  sari = new Client();
  await sari.req("POST", "/api/auth/login", { email: "sari@optik.id", password: "kata-sandi-1" });
  const r = await sari.req("PUT", "/api/partner/frames/p-001", { name: "Frame A", style: "round", colorKey: "black", category: "Pria", price: 250000 });
  assert.equal(r.status, 402);
});

test("Checkout: harga dari klien diabaikan; bayar sandbox → langganan aktif + invoice; idempoten", async () => {
  const r = await sari.req("POST", "/api/billing/checkout", { kind: "subscription", plan: "basic", interval: "month", total: 1, amount: 1 });
  assert.equal(r.status, 201);
  assert.equal(r.body.amount, 299000);
  const pay = await sari.req("POST", `/api/billing/orders/${r.body.orderId}/pay`, { method: "GoPay" });
  assert.equal(pay.status, 200);
  assert.equal(pay.body.account.subscription.status, "active");
  assert.equal(pay.body.account.invoices[0].amount, 299000);
  assert.match(pay.body.invoiceId, /^INV-\d{8}-0001$/);
  const again = await sari.req("POST", `/api/billing/orders/${r.body.orderId}/pay`, { method: "GoPay" });
  assert.equal(again.body.account.invoices.length, 1, "bayar dua kali tidak menggandakan invoice");
});

test("Subscription tidak bisa diubah lewat PATCH /me (naik paket/ubah status diabaikan)", async () => {
  const r = await sari.req("PATCH", "/api/partner/me", { subscription: { plan: "pro", status: "active", pendingPlan: "pro" } });
  assert.equal(r.status, 400);
  const me = await sari.req("GET", "/api/partner/me");
  assert.equal(me.body.account.subscription.plan, "basic");
  const ok = await sari.req("PATCH", "/api/partner/me", { subscription: { cancelAtPeriodEnd: true }, invoices: [], adOrders: [{ id: "x" }] });
  assert.equal(ok.body.account.subscription.cancelAtPeriodEnd, true);
  assert.equal(ok.body.account.invoices.length, 1);
  assert.equal(ok.body.account.adOrders.length, 0);
});

test("Profil toko: tersimpan, merchantId & setupCompletedAt ditetapkan server", async () => {
  const r = await sari.req("PATCH", "/api/partner/me", { store: { name: "Optik Sari", description: "Toko optik", city: "Surakarta", province: "Jawa Tengah", whatsapp: "+62 812-0000-111", phone: "0812", color: "#427AB5", links: { instagram: "https://instagram.com/sari", x: "javascript:alert(1)" }, merchantId: "m1", setupCompletedAt: "2000-01-01" } });
  const s = r.body.account.store;
  assert.equal(s.name, "Optik Sari");
  assert.equal(s.merchantId, `s_${r.body.account.id}`, "klien tidak bisa membajak merchantId milik toko lain");
  assert.notEqual(s.setupCompletedAt, "2000-01-01");
  assert.equal(s.whatsapp, "628120000111");
  assert.deepEqual(Object.keys(s.links), ["instagram"], "tautan non-http dibuang");
});

test("Frame: buat, validasi, ubah, ID milik orang lain 409", async () => {
  const bad = await sari.req("PUT", "/api/partner/frames/p-001", { name: "A", style: "x", colorKey: "black", category: "Pria", price: 250000 });
  assert.equal(bad.status, 400);
  const ok = await sari.req("PUT", "/api/partner/frames/p-001", { name: "Frame Sari Hitam", style: "round", colorKey: "black", category: "Pria", price: 250000, oldPrice: 300000, stock: 7 });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.frame.published, true);
  assert.equal((await sari.req("PUT", "/api/partner/frames/p-001", { price: 260000 })).body.frame.price, 260000);
  assert.equal((await sari.req("PUT", "/api/partner/frames/f3", { name: "Curang", style: "round", colorKey: "black", category: "Pria", price: 250000 })).status, 409);
  const lain = new Client();
  await lain.req("POST", "/api/auth/register", { name: "Lain Orang", email: "lain@optik.id", password: "abcdefgh1" });
  assert.equal((await lain.req("PUT", "/api/partner/frames/p-001", { name: "Rebut", style: "round", colorKey: "black", category: "Pria", price: 1000000 })).status, 409);
  assert.equal((await lain.req("DELETE", "/api/partner/frames/p-001")).status, 404);
});

test("Upload: foto non-JPEG 415, GLB palsu 415, GLB ber-rig diterima + rig lengkap, GLB tanpa rig diterima dengan peringatan", async () => {
  assert.equal((await sari.req("PUT", "/api/partner/frames/p-001/assets/photo-0", Buffer.from("GIF89a....."), { raw: true })).status, 415);
  assert.equal((await sari.req("PUT", "/api/partner/frames/p-001/assets/photo-1", jpeg, { raw: true })).status, 400, "foto harus berurutan");
  const p0 = await sari.req("PUT", "/api/partner/frames/p-001/assets/photo-0", jpeg, { raw: true });
  assert.equal(p0.status, 200);
  assert.equal(p0.body.frame.media.photos, 1);
  assert.equal((await sari.req("PUT", "/api/partner/frames/p-001/assets/model", Buffer.from("bukan glb sama sekali, hanya teks"), { raw: true })).status, 415);
  const bad = glb(); bad.writeUInt32LE(bad.length + 8, 8);
  assert.equal((await sari.req("PUT", "/api/partner/frames/p-001/assets/model", bad, { raw: true })).status, 415, "panjang header tidak cocok");
  const m = await sari.req("PUT", "/api/partner/frames/p-001/assets/model", glb(), { raw: true });
  assert.equal(m.status, 200);
  assert.equal(m.body.frame.media.model, true);
  assert.equal(m.body.frame.media.glb.rig, "ok");
  const m2 = await sari.req("PUT", "/api/partner/frames/p-001/assets/model", glb({ rig: false }), { raw: true });
  assert.equal(m2.body.frame.media.glb.rig, "none");
  assert.ok(m2.body.warnings.length);
  assert.equal((await sari.req("PUT", "/api/partner/frames/p-001/assets/model", glb(), { raw: true })).body.frame.media.glb.rig, "ok");
});

test("Upload: Mitra lain tidak bisa menimpa berkas; slot tak dikenal 400; path traversal ditolak", async () => {
  const lain = new Client();
  await lain.req("POST", "/api/auth/login", { email: "lain@optik.id", password: "abcdefgh1" });
  assert.equal((await lain.req("PUT", "/api/partner/frames/p-001/assets/photo-0", jpeg, { raw: true })).status, 404);
  assert.equal((await sari.req("PUT", "/api/partner/frames/p-001/assets/evil", jpeg, { raw: true })).status, 400);
  const res = await fetch(base + "/media/..%2F..%2Fetc/passwd");
  assert.equal(res.status, 404);
});

test("Media: /media/<id>/main.jpg & model.glb tersaji dengan tipe benar + nosniff", async () => {
  const j = await fetch(base + "/media/p-001/main.jpg");
  assert.equal(j.status, 200);
  assert.equal(j.headers.get("content-type"), "image/jpeg");
  assert.equal(j.headers.get("x-content-type-options"), "nosniff");
  const g = await fetch(base + "/media/p-001/model.glb");
  assert.equal(g.headers.get("content-type"), "model/gltf-binary");
  assert.equal((await fetch(base + "/media/p-001/secret.txt")).status, 404);
});

test("Katalog publik memuat frame Mitra (dengan aset), toko sebagai merchant, dan menyembunyikan yang ditarik", async () => {
  const cat = (await new Client().req("GET", "/api/catalog")).body;
  const p = cat.products.find((x) => x.id === "p-001");
  assert.ok(p, "frame Mitra muncul di katalog publik");
  assert.equal(p.name, "Frame Sari Hitam");
  assert.equal(p.assets.base, "/media/p-001");
  assert.equal(p.assets.model, true);
  assert.equal(p.assets.rigComplete, true);
  assert.equal(p.badge, "-13%".replace("13", String(Math.round((1 - 260000 / 300000) * 100))));
  assert.ok(cat.merchants.some((m) => m.name === "Optik Sari" && m.id === p.merchantId));
  await sari.req("PUT", "/api/partner/frames/p-001", { published: false });
  const cat2 = (await new Client().req("GET", "/api/catalog")).body;
  assert.ok(!cat2.products.some((x) => x.id === "p-001"));
  assert.ok(cat2.hidden.includes("p-001"));
  await sari.req("PUT", "/api/partner/frames/p-001", { published: true });
});

test("Iklan: Basic tidak boleh Highlighted (403); banner dihitung server; slot bentrok 409", async () => {
  const today = P.todayStr();
  assert.equal((await sari.req("POST", "/api/billing/checkout", { kind: "ad", adType: "highlighted", slot: 1, weeks: 1, startsOn: today })).status, 403);
  const b = await sari.req("POST", "/api/billing/checkout", { kind: "ad", adType: "banner", placement: "mitra", weeks: 2, startsOn: today, banner: { title: "Diskon!", subtitle: "s", cta: "Lihat" }, total: 5 });
  assert.equal(b.body.amount, 1_000_000);
  const paid = await sari.req("POST", `/api/billing/orders/${b.body.orderId}/pay`, { method: "QRIS" });
  assert.equal(paid.body.account.banners[0].status, "pending_review");
  assert.equal(paid.body.account.adOrders[0].endsOn, P.endsOn(today, 2));
  assert.equal((await sari.req("POST", "/api/billing/checkout", { kind: "ad", adType: "banner", placement: "mitra", weeks: 99, startsOn: today, banner: { title: "x" } })).status, 400);
  assert.equal((await sari.req("POST", "/api/billing/checkout", { kind: "ad", adType: "banner", placement: "mitra", weeks: 1, startsOn: "2020-01-01", banner: { title: "x" } })).status, 400);

  // Upgrade ke Pro lalu pesan slot; akun lain tidak bisa memesan slot yang sama pada tanggal sama.
  const up = await sari.req("POST", "/api/billing/checkout", { kind: "subscription", plan: "pro", interval: "year" });
  assert.equal(up.body.amount, 7_990_000);
  await sari.req("POST", `/api/billing/orders/${up.body.orderId}/pay`, {});
  const h = await sari.req("POST", "/api/billing/checkout", { kind: "ad", adType: "highlighted", slot: 3, weeks: 1, startsOn: today });
  assert.equal(h.status, 201);
  await sari.req("POST", `/api/billing/orders/${h.body.orderId}/pay`, {});
  const h2 = await sari.req("POST", "/api/billing/checkout", { kind: "ad", adType: "highlighted", slot: 3, weeks: 1, startsOn: today });
  assert.equal(h2.status, 409);
  const sp = await sari.req("POST", "/api/billing/checkout", { kind: "ad", adType: "sponsored", placement: "pencarian", weeks: 2, startsOn: today, frameIds: ["p-001", "bukan-milikku"] });
  assert.equal(sp.status, 400);
  const sp2 = await sari.req("POST", "/api/billing/checkout", { kind: "ad", adType: "sponsored", placement: "pencarian", weeks: 2, startsOn: today, frameIds: ["p-001"] });
  assert.equal(sp2.body.amount, 450000 * 2);
});

test("Webhook: tanda tangan salah 401; benar → lunas; jumlah salah 422; ulang tidak menggandakan", async () => {
  const c = new Client();
  await c.req("POST", "/api/auth/register", { name: "Web Hook", email: "wh@optik.id", password: "abcdefgh1" });
  const o = await c.req("POST", "/api/billing/checkout", { kind: "subscription", plan: "basic", interval: "year" });
  const send = (obj, secret = "s3cret") => {
    const body = JSON.stringify(obj);
    return fetch(base + "/api/billing/webhook", { method: "POST", headers: { "X-Signature": hmacHex(secret, body) }, body });
  };
  assert.equal((await send({ orderId: o.body.orderId, status: "paid", amount: 2990000 }, "salah")).status, 401);
  assert.equal((await send({ orderId: o.body.orderId, status: "paid", amount: 1 })).status, 422);
  assert.equal((await send({ orderId: o.body.orderId, status: "paid", amount: 2990000, method: "QRIS" })).status, 200);
  assert.equal((await send({ orderId: o.body.orderId, status: "paid", amount: 2990000 })).status, 200);
  const me = await c.req("GET", "/api/partner/me");
  assert.equal(me.body.account.subscription.interval, "year");
  assert.equal(me.body.account.invoices.length, 1);
});

test("Ganti password: salah 403; benar → login lama gagal, baru berhasil, sesi lain dicabut", async () => {
  const a = new Client(), b = new Client();
  await a.req("POST", "/api/auth/login", { email: "lain@optik.id", password: "abcdefgh1" });
  await b.req("POST", "/api/auth/login", { email: "lain@optik.id", password: "abcdefgh1" });
  assert.equal((await a.req("POST", "/api/auth/password", { current: "salahsalah", next: "passwordbaru1" })).status, 403);
  assert.equal((await a.req("POST", "/api/auth/password", { current: "abcdefgh1", next: "passwordbaru1" })).status, 200);
  assert.equal((await b.req("GET", "/api/auth/me")).body.account, null, "sesi perangkat lain dicabut");
  assert.ok((await a.req("GET", "/api/auth/me")).body.account, "sesi ini tetap hidup");
  assert.equal((await new Client().req("POST", "/api/auth/login", { email: "lain@optik.id", password: "abcdefgh1" })).status, 401);
  assert.equal((await new Client().req("POST", "/api/auth/login", { email: "lain@optik.id", password: "passwordbaru1" })).status, 200);
});

test("E-commerce: aturan host front-end dan server identik (anti-drift)", () => {
  assert.deepEqual(FE.PLATFORMS, BE.PLATFORMS);
  const samples = ["https://tokopedia.com/toko/x", "http://tokopedia.com/x", "https://evil.com/tokopedia.com", "https://tokopedia.com.evil.com/x", "https://www.shopee.co.id/p", "javascript:alert(1)", "shopee.co.id/a", "", "https://" + "a".repeat(300) + ".com"];
  for (const pl of FE.PLATFORMS) for (const u of samples) assert.equal(FE.cleanBuyUrl(pl.key, u), BE.cleanBuyUrl(pl.key, u), `${pl.key} ${u}`);
  assert.equal(BE.cleanBuyUrl("tokopedia", "https://tokopedia.com.evil.com/x"), null);
  assert.equal(BE.cleanBuyUrl("tokopedia", "http://tokopedia.com/x"), null, "http ditolak");
});

test("Frame: deskripsi & tautan beli tersimpan; host/skema salah ditolak 400; katalog memuatnya", async () => {
  const base0 = { name: "Frame EC", style: "round", colorKey: "black", category: "Pria", price: 250000, stock: 5, published: true, description: "  Ringan, bahan TR90.  " };
  for (const buy of [{ shopee: "http://shopee.co.id/x" }, { lazada: "https://evil.com/lazada.co.id" }, { tokopedia: "https://tokopedia.com.evil.com/x" }]) {
    const r = await sari.req("PUT", "/api/partner/frames/ec-1", { ...base0, buy });
    assert.equal(r.status, 400, JSON.stringify(buy));
  }
  const put = await sari.req("PUT", "/api/partner/frames/ec-1", { ...base0, buy: { tokopedia: "https://tokopedia.com/optik/frame-ec", website: "https://optik.id/ec", bogus: "https://x.id" } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  const f = put.body.frame;
  assert.equal(f.description, "Ringan, bahan TR90.");
  assert.deepEqual(Object.keys(f.buy).sort(), ["tokopedia", "website"]);
  const cat = (await new Client().req("GET", "/api/catalog")).body.products.find((x) => x.id === "ec-1");
  assert.equal(cat.description, "Ringan, bahan TR90.");
  assert.equal(cat.buy.tokopedia, "https://tokopedia.com/optik/frame-ec");
  assert.ok(!cat.buy.shopee && !cat.buy.lazada);
  assert.equal((await sari.req("DELETE", "/api/partner/frames/ec-1")).status, 200);
});

test("Foto profil toko: JPEG diterima & disajikan, non-JPEG 415, terlalu besar 413, hapus → inisial; muncul di katalog", async () => {
  const bad1 = await sari.req("PUT", "/api/partner/store/logo", Buffer.from("bukan jpeg"), { raw: true });
  assert.equal(bad1.status, 415);
  const big = Buffer.concat([jpeg, Buffer.alloc(1024 * 1024 + 10, 2)]);
  assert.equal((await sari.req("PUT", "/api/partner/store/logo", big, { raw: true })).status, 413);
  const ok = await sari.req("PUT", "/api/partner/store/logo", jpeg, { raw: true });
  assert.equal(ok.status, 200);
  const logo = ok.body.account.store.logo;
  assert.match(logo, /^\/media\/store\/.+\.jpg\?v=1$/);
  const img = await fetch(base + logo.split("?")[0]);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/jpeg");
  assert.equal((await fetch(base + "/media/store/..%2F..%2Fetc.jpg")).status, 404);
  assert.equal((await new Client().req("PUT", "/api/partner/store/logo", jpeg, { raw: true })).status, 401, "butuh sesi");
  // frame tayang agar toko masuk katalog
  await sari.req("PUT", "/api/partner/frames/lg-1", { name: "Frame Logo", style: "round", colorKey: "black", category: "Pria", price: 100000, stock: 1, published: true });
  const m = (await new Client().req("GET", "/api/catalog")).body.merchants.find((x) => x.logo);
  assert.ok(m && m.logo.startsWith("/media/store/"));
  await sari.req("DELETE", "/api/partner/frames/lg-1");
  const del = await sari.req("DELETE", "/api/partner/store/logo");
  assert.equal(del.body.account.store.logo, null);
  assert.equal((await fetch(base + logo.split("?")[0])).status, 404);
});

test("Hapus frame: berkas ikut terhapus, hilang dari koleksi & katalog", async () => {
  await sari.req("PATCH", "/api/partner/me", { collections: [{ id: "c1", name: "Baru", published: true, frameIds: ["p-001", "orang-lain"] }] });
  const me = await sari.req("GET", "/api/partner/me");
  assert.deepEqual(me.body.account.collections[0].frameIds, ["p-001"], "ID frame bukan milik sendiri dibuang");
  assert.equal((await sari.req("DELETE", "/api/partner/frames/p-001")).status, 200);
  assert.equal((await fetch(base + "/media/p-001/main.jpg")).status, 404);
  const me2 = await sari.req("GET", "/api/partner/me");
  assert.deepEqual(me2.body.account.collections[0].frameIds, []);
  assert.ok(!(await new Client().req("GET", "/api/catalog")).body.products.some((x) => x.id === "p-001"));
});

const mk = (i, vto = true) => ({ name: `Frame ${i}`, style: "round", colorKey: "black", category: "Pria", price: 100000, vto });
test("Kuota: katalog tanpa batas, VTO Basic maks. 20 (frame ke-21 ber-VTO ditolak, tanpa VTO boleh)", async () => {
  const c = new Client();
  await c.req("POST", "/api/auth/register", { name: "Kuota Uji", email: "kuota@optik.id", password: "abcdefgh1" });
  const o = await c.req("POST", "/api/billing/checkout", { kind: "subscription", plan: "basic", interval: "month" });
  await c.req("POST", `/api/billing/orders/${o.body.orderId}/pay`, {});
  for (let i = 0; i < 20; i++) assert.equal((await c.req("PUT", `/api/partner/frames/q-${i}`, mk(i))).status, 200);
  assert.equal((await c.req("PUT", "/api/partner/frames/q-20", mk(20))).status, 402, "VTO ke-21 ditolak");
  assert.equal((await c.req("PUT", "/api/partner/frames/q-20", mk(20, false))).status, 200, "frame tanpa VTO tetap boleh");
  for (let i = 21; i < 55; i++) assert.equal((await c.req("PUT", `/api/partner/frames/q-${i}`, mk(i, false))).status, 200);
  assert.equal((await c.req("PUT", "/api/partner/frames/q-0", mk(0, false))).status, 200);
  assert.equal((await c.req("PUT", "/api/partner/frames/q-20", mk(20))).status, 200, "kuota VTO kosong lagi setelah dimatikan");
});

async function proWith(email, n) {
  const c = new Client();
  await c.req("POST", "/api/auth/register", { name: "Pro Uji", email, password: "abcdefgh1" });
  const o = await c.req("POST", "/api/billing/checkout", { kind: "subscription", plan: "pro", interval: "month" });
  await c.req("POST", `/api/billing/orders/${o.body.orderId}/pay`, {});
  for (let i = 0; i < n; i++) await c.req("PUT", `/api/partner/frames/${email[0]}-${i}`, mk(i));
  return c;
}
const expire = (email) => {
  const row = app.locals.ctx.db.prepare("SELECT id, doc FROM accounts WHERE email=?").get(email);
  const doc = JSON.parse(row.doc);
  doc.subscription.currentPeriodEnd = new Date(Date.now() - 1000).toISOString();
  app.locals.ctx.db.prepare("UPDATE accounts SET doc=? WHERE id=?").run(JSON.stringify(doc), row.id);
};
const vtoOn = async (c) => (await c.req("GET", "/api/partner/me")).body.account.frames.filter((f) => f.vto).map((f) => f.id).sort();

test("Turun Pro→Basic otomatis: 20 frame tertua tetap VTO", async () => {
  const c = await proWith("auto@optik.id", 30);
  assert.equal((await vtoOn(c)).length, 30, "Pro: 30 frame ber-VTO");
  assert.equal((await c.req("PATCH", "/api/partner/me", { subscription: { pendingPlan: "basic" } })).status, 200);
  assert.equal((await vtoOn(c)).length, 30, "sebelum jatuh tempo masih Pro");
  expire("auto@optik.id");
  const on = await vtoOn(c);
  assert.equal(on.length, 20);
  assert.deepEqual(on, Array.from({ length: 20 }, (_, i) => `a-${i}`).sort(), "yang tertua dipertahankan");
  assert.equal((await c.req("GET", "/api/partner/me")).body.account.subscription.plan, "basic");
});

test("Turun Pro→Basic manual: pilihan Mitra dipakai; >20 ditolak; id asing dibuang", async () => {
  const c = await proWith("manual@optik.id", 30);
  const bad = await c.req("PATCH", "/api/partner/me", { subscription: { pendingPlan: "basic", pendingVtoFrameIds: Array.from({ length: 21 }, (_, i) => `m-${i}`) } });
  assert.equal(bad.status, 400);
  const pick = ["m-29", "m-28", "m-27", "zzz"];
  assert.equal((await c.req("PATCH", "/api/partner/me", { subscription: { pendingPlan: "basic", pendingVtoFrameIds: pick } })).status, 200);
  expire("manual@optik.id");
  const on = await vtoOn(c);
  assert.equal(on.length, 20);
  for (const id of ["m-29", "m-28", "m-27"]) assert.ok(on.includes(id), id + " dipilih Mitra");
  assert.ok(on.includes("m-0") && !on.includes("m-26"), "sisa kuota diisi berurutan dari yang tertua");
});

test("Aturan kuota VTO: salinan front-end identik dengan server", () => {
  assert.equal(fs.readFileSync(new URL("../src/quota.js", import.meta.url), "utf8"), fs.readFileSync(new URL("../../frontend/src/data/quota.js", import.meta.url), "utf8"));
});

test("Ukuran frame: disimpan, divalidasi, tidak hilang saat ubah field lain; salinan frameSize identik", async () => {
  assert.equal(fs.readFileSync(new URL("../src/frameSize.js", import.meta.url), "utf8"), fs.readFileSync(new URL("../../frontend/src/data/frameSize.js", import.meta.url), "utf8"));
  const c = new Client();
  await c.req("POST", "/api/auth/register", { name: "Ukuran Uji", email: "ukuran@optik.id", password: "abcdefgh1" });
  const o = await c.req("POST", "/api/billing/checkout", { kind: "subscription", plan: "basic", interval: "month" });
  await c.req("POST", `/api/billing/orders/${o.body.orderId}/pay`, {});
  await c.req("PATCH", "/api/partner/me", { store: { name: "Optik Ukuran", city: "Solo", province: "Jawa Tengah", whatsapp: "081234567890", address: "Jl. Uji 1" } });
  const base = { name: "Frame Ukuran", style: "round", colorKey: "black", category: "Pria", price: 100000 };
  assert.equal((await c.req("PUT", "/api/partner/frames/u-1", { ...base, size: { lensWidthMm: 99 } })).status, 400, "lensa 99 mm ditolak");
  const ok = await c.req("PUT", "/api/partner/frames/u-1", { ...base, size: { lensWidthMm: "52", bridgeMm: 18, templeMm: 140, material: "Asetat" } });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.frame.size, { lensWidthMm: 52, bridgeMm: 18, templeMm: 140, material: "Asetat" });
  const none = await c.req("PUT", "/api/partner/frames/u-2", base);
  assert.equal(none.body.frame.size ?? null, null, "tanpa ukuran → null (fit otomatis ke wajah)");
  const keep = await c.req("PUT", "/api/partner/frames/u-1", { name: "Frame Ukuran 2" });
  assert.equal(keep.body.frame.size.lensWidthMm, 52, "ubah field lain tidak menghapus ukuran");
});

let fail = 0;
for (const [n, f] of tests) {
  try { await f(); console.log("✓", n); } catch (e) { fail++; console.log("✗", n, "\n  ", e.message); }
}
server.close();
app.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(fail ? `\n${fail} gagal` : `\nSemua ${tests.length} uji lolos`);
process.exit(fail ? 1 : 0);
