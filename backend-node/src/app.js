import express from "express";
import fs from "node:fs";
import path from "node:path";
import { config as defaultConfig } from "./config.js";
import { openDb } from "./db.js";
import { Service } from "./service.js";
import { authRouter } from "./routes/auth.js";
import { partnerRouter } from "./routes/partner.js";
import { billingRouter } from "./routes/billing.js";
import { catalogRouter } from "./routes/catalog.js";
import legacyRouter from "../routes/api.js";

const MEDIA_FILES = new Set(["main.jpg", "side.jpg", "detail.jpg", "close.jpg", "model.glb"]);

export function createApp(overrides = {}) {
  const config = { ...defaultConfig, ...overrides };
  const db = openDb(config.dbPath);
  const svc = Service(db);
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  const ctx = { config, db, svc };

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.locals.ctx = ctx;

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-TryLens, X-Signature");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    // Perlindungan CSRF: permintaan yang mengubah data harus membawa header kustom (form lintas-situs tidak bisa mengirimnya).
    const unsafe = !["GET", "HEAD"].includes(req.method);
    if (unsafe && req.path.startsWith("/api/") && req.path !== "/api/billing/webhook" && req.headers["x-trylens"] !== "1") {
      return res.status(403).json({ error: "Header X-TryLens wajib ada" });
    }
    next();
  });

  const json = express.json({ limit: "256kb" });
  app.use((req, res, next) => (req.path === "/api/billing/webhook" || /\/assets\//.test(req.path) ? next() : json(req, res, next)));

  app.get("/", (req, res) => res.json({ name: "TryLens API (Node.js)", status: "ok", provider: config.paymentProvider }));
  app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use("/api/auth", authRouter(ctx));
  app.use("/api/partner", partnerRouter(ctx));
  app.use("/api/billing", billingRouter(ctx));
  app.use("/api/catalog", catalogRouter(ctx));
  app.use("/api", legacyRouter);

  // Foto profil toko: /media/store/<idAkun>.jpg
  app.get("/media/store/:file", (req, res) => {
    const m = /^([A-Za-z0-9_-]{1,64})\.jpg$/.exec(req.params.file);
    if (!m) return res.sendStatus(404);
    const p = path.join(config.uploadsDir, "_store", `${m[1]}.jpg`);
    if (!fs.existsSync(p)) return res.sendStatus(404);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(p);
  });

  // Berkas unggahan Mitra: /media/<idFrame>/{main,side,detail,close}.jpg | model.glb
  app.get("/media/:frameId/:file", (req, res) => {
    const { frameId, file } = req.params;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(frameId) || !MEDIA_FILES.has(file)) return res.sendStatus(404);
    const p = path.join(config.uploadsDir, frameId, file);
    if (!fs.existsSync(p)) return res.sendStatus(404);
    res.setHeader("Content-Type", file.endsWith(".glb") ? "model/gltf-binary" : "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.sendFile(p);
  });

  app.use("/api", (req, res) => res.status(404).json({ error: "Endpoint tidak ditemukan" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Berkas terlalu besar" });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "JSON tidak valid" });
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan di server" });
  });
  app.close = () => db.close();
  return app;
}
