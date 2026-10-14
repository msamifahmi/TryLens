#!/usr/bin/env node
// CLI katalog TryLens untuk agen (Hermes) — tanpa dependensi, Node ≥ 20. Bicara ke API admin; TIDAK memakai git.
//   export TRYLENS_API=https://api.try-lens.id   TRYLENS_ADMIN_TOKEN=...
//   node tl.mjs list [--merchant m1]
//   node tl.mjs add --name "Aurora Round" --price 249000 --style round --color gold --merchant m1 --cat Wanita \
//        [--old-price 329000] [--stock 12] [--desc "..."] [--tokopedia URL] [--shopee URL] [--lens 52 --bridge 18 --temple 140] \
//        [--photo main.jpg --photo side.jpg ...] [--model model.glb] [--hidden]
//   node tl.mjs set f24 --price 259000 --stock 5 [--name ...] [--publish | --hide]
//   node tl.mjs photo f24 0 ./main.jpg      (slot 0–3)      node tl.mjs model f24 ./model.glb
//   node tl.mjs rm f24     node tl.mjs merchants     node tl.mjs export > cadangan.json
import fs from "node:fs";

const API = (process.env.TRYLENS_API || "").replace(/\/$/, "");
const TOKEN = process.env.TRYLENS_ADMIN_TOKEN || "";
const die = (m) => { console.error("✗ " + m); process.exit(1); };
if (!API || !TOKEN) die("Set TRYLENS_API (mis. https://api.try-lens.id) dan TRYLENS_ADMIN_TOKEN.");

async function call(method, p, body, raw) {
  const headers = { "X-TryLens": "1", Authorization: `Bearer ${TOKEN}` };
  if (!raw && body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(API + "/api/admin" + p, { method, headers, body: raw ? body : body === undefined ? undefined : JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) die(`${method} ${p} → ${res.status}: ${j.error || "gagal"}`);
  return j;
}

const argv = process.argv.slice(2);
const cmd = argv.shift();
const pos = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith("--")) { pos.push(argv[i]); continue; }
  const k = argv[i].slice(2), nx = argv[i + 1];
  const v = nx === undefined || nx.startsWith("--") ? true : (i++, nx);
  if (k === "photo") (opt.photo ||= []).push(v); else opt[k] = v;
}

const body = (o) => {
  const b = {};
  const map = { name: "name", merchant: "merchantId", style: "style", color: "colorKey", cat: "category", desc: "description" };
  for (const [k, t] of Object.entries(map)) if (o[k] !== undefined) b[t] = o[k];
  for (const [k, t] of [["price", "price"], ["old-price", "oldPrice"], ["stock", "stock"]]) if (o[k] !== undefined) b[t] = o[k] === "none" ? null : Number(o[k]);
  const buy = {};
  for (const k of ["tokopedia", "shopee", "lazada", "tiktokshop", "website"]) if (o[k] !== undefined) buy[k] = o[k] === "none" ? "" : o[k];
  if (Object.keys(buy).length) b.buy = buy;
  const size = {};
  for (const [k, t] of [["lens", "lensWidthMm"], ["bridge", "bridgeMm"], ["temple", "templeMm"], ["material", "material"]]) if (o[k] !== undefined) size[t] = o[k];
  if (Object.keys(size).length) b.size = size;
  if (o.publish) b.published = true;
  if (o.hide || o.hidden) b.published = false;
  return b;
};
const up = async (id, slot, file) => {
  if (!fs.existsSync(file)) die(`Berkas tidak ada: ${file}`);
  const r = await call("PUT", `/products/${id}/assets/${slot}`, fs.readFileSync(file), true);
  console.log(`  ✓ ${slot} ← ${file}` + (r.warnings?.length ? `  (! ${r.warnings[0]})` : ""));
};
const line = (p) => `${p.id.padEnd(5)} ${p.published ? " " : "×"} ${p.name.padEnd(30)} Rp${p.price}${p.oldPrice ? ` (coret ${p.oldPrice})` : ""} · stok ${p.stock} · ${p.photos} foto${p.hasModel ? " + 3D" : ""} · ${p.merchantId}`;

if (cmd === "list") { for (const p of (await call("GET", "/products" + (opt.merchant ? `?merchantId=${opt.merchant}` : ""))).products) console.log(line(p)); }
else if (cmd === "merchants") { for (const m of (await call("GET", "/merchants")).merchants) console.log(`${m.id.padEnd(6)} ${m.published ? " " : "×"} ${m.name} — ${m.city}`); }
else if (cmd === "add") {
  const b = body(opt);
  if (opt.hidden) b.published = false;
  const r = await call("POST", "/products", b);
  console.log("✓ dibuat: " + line(r.product));
  if ((opt.photo || []).length > 4) die("Maksimal 4 foto.");
  let i = 0;
  for (const f of opt.photo || []) await up(r.product.id, `photo-${i++}`, f);
  if (opt.model) await up(r.product.id, "model", opt.model);
  console.log("  selesai — tampil di situs dalam ±30 detik (cache katalog).");
}
else if (cmd === "set") { if (!pos[0]) die("Beri id produk."); console.log("✓ " + line((await call("PATCH", `/products/${pos[0]}`, body(opt))).product)); }
else if (cmd === "photo") { if (pos.length < 3) die("Pemakaian: photo <id> <slot 0-3> <file.jpg>"); await up(pos[0], `photo-${pos[1]}`, pos[2]); }
else if (cmd === "model") { if (pos.length < 2) die("Pemakaian: model <id> <file.glb>"); await up(pos[0], "model", pos[1]); }
else if (cmd === "rm") { if (!pos[0]) die("Beri id produk."); await call("DELETE", `/products/${pos[0]}`); console.log("✓ dihapus " + pos[0]); }
else if (cmd === "export") console.log(JSON.stringify(await call("GET", "/export"), null, 2));
else die("Perintah: list | merchants | add | set | photo | model | rm | export  (lihat komentar di atas berkas)");
