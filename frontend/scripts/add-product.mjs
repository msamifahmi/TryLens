#!/usr/bin/env node
// Menambah produk dari berkas LOKAL ke katalog TryLens, lalu (opsional) commit + push cabang fitur + buka PR ke main.
// Dipakai manusia maupun agen (Hermes). TIDAK PERNAH push ke `deploy` atau `main` — deploy dikerjakan GitHub Actions setelah PR di-merge.
//
//   node scripts/add-product.mjs --from ~/frame-baru/kacamata-x --name "Aurora Round" --price 249000 \
//        --style round --color gold --merchant m1 --cat Wanita [--old-price 329000] [--desc "..."] [--stock 12] [--id f24] [--push]
//
// Folder --from berisi: main.jpg (wajib), side.jpg/detail.jpg/close.jpg (opsional), model.glb (opsional).
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(root, "..");
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith("--")) continue;
  const k = a.slice(2), nx = process.argv[i + 1];
  if (nx === undefined || nx.startsWith("--")) args[k] = true; else { args[k] = nx; i++; }
}
const die = (m) => { console.error("✗ " + m); process.exit(1); };
const STYLES = ["aviator", "round", "square", "cateye", "rect", "browline"];
const COLORS = ["brown", "black", "gold", "tort", "clear", "blue", "navy", "red"];
const CATS = ["Pria", "Wanita", "Anak"];
const IMG = ["main.jpg", "side.jpg", "detail.jpg", "close.jpg"];

const from = args.from && path.resolve(String(args.from).replace(/^~/, process.env.HOME || "~"));
if (!from || !fs.existsSync(from)) die("--from <folder berkas lokal> wajib dan harus ada");
if (!fs.existsSync(path.join(from, "main.jpg"))) die(`${from}/main.jpg tidak ada (foto utama wajib)`);
const name = String(args.name || ""); if (name.length < 3) die("--name wajib (min 3 huruf)");
const price = Number(args.price); if (!(price >= 10000 && price <= 50000000)) die("--price wajib, dalam rupiah (mis. 249000)");
const style = args.style || "round"; if (!STYLES.includes(style)) die(`--style salah. Pilih: ${STYLES.join(", ")}`);
const colorKey = args.color || "black"; if (!COLORS.includes(colorKey)) die(`--color salah. Pilih: ${COLORS.join(", ")}`);
const cat = args.cat || "Pria"; if (!CATS.includes(cat)) die(`--cat salah. Pilih: ${CATS.join(", ")}`);
const oldPrice = args["old-price"] ? Number(args["old-price"]) : null;
if (oldPrice !== null && !(oldPrice > price)) die("--old-price harus lebih besar dari --price");

const catPath = path.join(root, "public/catalog.json");
const cat0 = JSON.parse(fs.readFileSync(catPath, "utf8"));
const src = fs.readFileSync(path.join(root, "src/data/mockData.js"), "utf8");
const merchants = [...src.matchAll(/id: "(m\d+)", name: "([^"]+)", city: "([^"]+)"/g)].map((m) => ({ id: m[1], name: m[2], city: m[3] }));
for (const m of cat0.merchants || []) merchants.push({ id: m.id, name: m.name, city: m.city });
const merchant = merchants.find((m) => m.id === (args.merchant || "m1")); if (!merchant) die(`--merchant tidak dikenal. Pilih: ${merchants.map((m) => m.id).join(", ")}`);

const usedNums = [...src.matchAll(/"f"\s*\+\s*i/g)].length ? Array.from({ length: 24 }, (_, i) => i) : [];
for (const p of cat0.products || []) usedNums.push(Number(String(p.id).slice(1)));
const next = Math.max(23, ...usedNums.filter(Number.isFinite)) + 1;
const id = args.id ? String(args.id) : "f" + next;
if (!/^f\d+$/.test(id)) die("--id harus berbentuk f<angka>");
const replacing = (cat0.products || []).some((p) => p.id === id);
if (!replacing && Number(id.slice(1)) <= 23) die(`${id} sudah dipakai produk bawaan (f0–f23)`);

const dest = path.join(root, "public/products", id);
fs.mkdirSync(dest, { recursive: true });
for (const f of IMG) if (fs.existsSync(path.join(from, f))) fs.copyFileSync(path.join(from, f), path.join(dest, f));
const hasModel = fs.existsSync(path.join(from, "model.glb"));
if (hasModel) fs.copyFileSync(path.join(from, "model.glb"), path.join(dest, "model.glb"));

const prod = {
  id, name, style, colorKey, price, oldPrice, merchant: merchant.name, merchantId: merchant.id, city: merchant.city.split(",")[0], cat,
  isNew: true, order: 1000 + Number(id.slice(1)), flash: false, flashSold: 0, badge: oldPrice ? `-${Math.round((1 - price / oldPrice) * 100)}%` : "BARU",
  description: args.desc ? String(args.desc) : `${name} — frame ${style} untuk coba virtual di TryLens.`, stock: args.stock ? Number(args.stock) : 10, vto: hasModel
};
cat0.products = [...(cat0.products || []).filter((p) => p.id !== id), prod];
fs.writeFileSync(catPath, JSON.stringify(cat0, null, 2) + "\n");
console.log(`✓ ${id} "${name}" → public/products/${id}/ (${fs.readdirSync(dest).join(", ")}) + public/catalog.json`);

if (!args.push) { console.log("Belum di-commit. Tambahkan --push untuk commit + push cabang + buka PR."); process.exit(0); }
const sh = (c) => execSync(c, { cwd: repo, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
const branch = sh("git rev-parse --abbrev-ref HEAD");
if (branch === "deploy") die("Sedang di cabang `deploy` — JANGAN push ke sini (ditimpa otomatis tiap build). Pindah: git checkout main");
sh("git fetch origin main");
const nb = `produk/${id}-${Date.now().toString(36)}`;
sh(`git checkout -b ${nb} origin/main`);
sh(`git add frontend/public/products/${id} frontend/public/catalog.json`);
sh(`git commit -m "Produk baru ${id}: ${name.replace(/"/g, "'")}"`);
sh(`git push -u origin ${nb}`);
let pr = "";
try {
  pr = sh(`gh api repos/msamifahmi/TryLens/pulls -f title="Produk baru ${id}: ${name.replace(/"/g, "'")}" -f head=${nb} -f base=main -f body="Ditambahkan lewat scripts/add-product.mjs. Merge ke main → GitHub Actions membangun ulang cabang deploy → Deploy di hPanel." --jq .html_url`);
} catch { /* gh tidak ada: buka PR manual */ }
console.log(`✓ Dipush ke cabang ${nb}` + (pr ? `\n✓ PR: ${pr}` : "\n! Buka PR manual: " + nb + " → main"));
