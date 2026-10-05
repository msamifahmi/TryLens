import { Router } from "express";
import { DUMMY_HASH, Limiter, cookie, hashPassword, newToken, parseCookies, tokenHash, verifyPassword } from "../security.js";
import { defaultDoc } from "../defaults.js";
import { bad, str, wrap } from "./util.js";

export const COOKIE = "tl_session";
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Middleware: isi req.account (id) bila sesi valid. */
export function sessionMiddleware({ db }) {
  const find = db.prepare("SELECT account_id FROM sessions WHERE token_hash=? AND expires_at > ?");
  return (req, res, next) => {
    const t = parseCookies(req.headers.cookie)[COOKIE];
    if (t) {
      const row = find.get(tokenHash(t), new Date().toISOString());
      if (row) req.accountId = row.account_id;
    }
    next();
  };
}
export const requireAuth = (req, res, next) => (req.accountId ? next() : res.status(401).json({ error: "Belum masuk" }));

export function authRouter(ctx) {
  const { db, svc, config } = ctx;
  const r = Router();
  const limiter = new Limiter(5, 15 * 60 * 1000);
  const mw = sessionMiddleware(ctx);
  ctx.limiter = limiter;

  function startSession(res, accountId) {
    const token = newToken();
    const now = Date.now();
    db.prepare("INSERT INTO sessions(token_hash,account_id,created_at,expires_at) VALUES(?,?,?,?)").run(
      tokenHash(token), accountId, new Date(now).toISOString(), new Date(now + config.sessionDays * 86400e3).toISOString()
    );
    res.setHeader("Set-Cookie", cookie(COOKIE, token, { maxAgeSec: config.sessionDays * 86400, secure: config.production }));
  }

  r.post("/register", wrap(async (req, res) => {
    const name = str(req.body?.name, 80), email = str(req.body?.email, 320).toLowerCase(), password = String(req.body?.password ?? "");
    if (name.length < 2) return bad(res, "Nama minimal 2 karakter.");
    if (!EMAIL.test(email)) return bad(res, "Format email tidak valid.");
    if (password.length < 8 || password.length > 200) return bad(res, "Password minimal 8 karakter.");
    if (svc.q.accByEmail.get(email)) return bad(res, "Email sudah terdaftar. Silakan masuk.", 409);
    const id = "u" + Date.now().toString(36) + newToken().slice(0, 4);
    const hash = await hashPassword(password);
    try {
      db.prepare("INSERT INTO accounts(id,email,name,phone,password_hash,doc,created_at) VALUES(?,?,?,?,?,?,?)").run(
        id, email, name, "", hash, JSON.stringify(defaultDoc()), new Date().toISOString()
      );
    } catch {
      return bad(res, "Email sudah terdaftar. Silakan masuk.", 409);
    }
    startSession(res, id);
    res.status(201).json({ account: svc.account(id) });
  }));

  r.post("/login", wrap(async (req, res) => {
    const email = str(req.body?.email, 320).toLowerCase(), password = String(req.body?.password ?? "");
    const key = `${req.ip}|${email}`;
    if (limiter.blocked(key)) return bad(res, "Terlalu banyak percobaan. Coba lagi dalam 15 menit.", 429);
    const row = svc.q.accByEmail.get(email);
    const ok = await verifyPassword(password, row ? row.password_hash : DUMMY_HASH);
    if (!row || !ok) {
      limiter.fail(key);
      return bad(res, "Email atau password salah.", 401);
    }
    limiter.clear(key);
    startSession(res, row.id);
    res.json({ account: svc.account(row.id) });
  }));

  r.post("/logout", mw, (req, res) => {
    const t = parseCookies(req.headers.cookie)[COOKIE];
    if (t) db.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash(t));
    res.setHeader("Set-Cookie", cookie(COOKIE, "", { maxAgeSec: 0, secure: config.production }));
    res.json({ ok: true });
  });

  r.get("/me", mw, (req, res) => res.json({ account: req.accountId ? svc.account(req.accountId) : null }));

  r.post("/password", mw, requireAuth, wrap(async (req, res) => {
    const cur = String(req.body?.current ?? ""), next = String(req.body?.next ?? "");
    if (next.length < 8 || next.length > 200) return bad(res, "Password baru minimal 8 karakter.");
    const row = svc.q.accById.get(req.accountId);
    if (!(await verifyPassword(cur, row.password_hash))) return bad(res, "Password saat ini salah.", 403);
    db.prepare("UPDATE accounts SET password_hash=? WHERE id=?").run(await hashPassword(next), row.id);
    // Sesi lain dicabut; sesi ini tetap hidup.
    const t = parseCookies(req.headers.cookie)[COOKIE];
    db.prepare("DELETE FROM sessions WHERE account_id=? AND token_hash<>?").run(row.id, tokenHash(t));
    res.json({ ok: true });
  }));

  return r;
}
