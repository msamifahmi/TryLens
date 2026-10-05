import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = process.env;

export const config = {
  port: Number(env.PORT) || 4000,
  production: env.NODE_ENV === "production",
  dbPath: env.DB_PATH || path.join(root, "data", "trylens.db"),
  uploadsDir: env.UPLOADS_DIR || path.join(root, "uploads"),
  // Asal front-end yang boleh memanggil API lintas-origin (dengan cookie). Kosong = hanya same-origin / lewat proxy Vite.
  corsOrigins: (env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  sessionDays: Number(env.SESSION_DAYS) || 30,
  // "sandbox" = pembayaran uji (tombol bayar di aplikasi). "webhook" = hanya konfirmasi dari payment gateway lewat /api/billing/webhook.
  paymentProvider: env.PAYMENT_PROVIDER || "sandbox",
  webhookSecret: env.PAYMENT_WEBHOOK_SECRET || "",
  maxPhotoBytes: 5 * 1024 * 1024,
  maxGlbBytes: 12 * 1024 * 1024,
  maxPhotos: 4
};
