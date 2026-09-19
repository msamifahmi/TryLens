import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

function readJSON(filename) {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

function wishlistPath(userId) {
  const safeId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(DATA_DIR, `wishlist_${safeId || "guest"}.json`);
}

const router = Router();

/** GET /api/products?category=Pria&merchantId=m1 */
router.get("/products", (req, res) => {
  const products = readJSON("products.json");
  const { category, merchantId } = req.query;
  let result = products;
  if (category && category !== "Semua") {
    result = category === "Promo" ? result.filter((p) => !!p.oldPrice) : result.filter((p) => p.cat === category);
  }
  if (merchantId) {
    result = result.filter((p) => p.merchantId === merchantId);
  }
  res.json(result);
});

/** GET /api/merchants/:id */
router.get("/merchants/:id", (req, res) => {
  const merchants = readJSON("merchants.json");
  const merchant = merchants.find((m) => m.id === req.params.id);
  if (!merchant) return res.status(404).json({ error: "Toko tidak ditemukan" });
  res.json(merchant);
});

/** GET /api/products/:id */
router.get("/products/:id", (req, res) => {
  const products = readJSON("products.json");
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Produk tidak ditemukan" });
  res.json(product);
});

/** GET /api/merchants */
router.get("/merchants", (req, res) => {
  res.json(readJSON("merchants.json"));
});

/** GET /api/categories */
router.get("/categories", (req, res) => {
  res.json(readJSON("categories.json"));
});

/** GET /api/wishlist/:userId */
router.get("/wishlist/:userId", (req, res) => {
  const filePath = wishlistPath(req.params.userId);
  if (!fs.existsSync(filePath)) return res.json({ items: {} });
  res.json(JSON.parse(fs.readFileSync(filePath, "utf-8")));
});

/** POST /api/wishlist/:userId  body: { items: { [productId]: true } } */
router.post("/wishlist/:userId", (req, res) => {
  const filePath = wishlistPath(req.params.userId);
  const items = req.body?.items && typeof req.body.items === "object" ? req.body.items : {};
  fs.writeFileSync(filePath, JSON.stringify({ items }, null, 2));
  res.json({ ok: true, items });
});

export default router;
