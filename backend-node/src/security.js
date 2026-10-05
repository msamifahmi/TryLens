import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
// scrypt (bawaan Node, memory-hard). N=2^15 ≈ 32 MB & ±80 ms per hash di server biasa.
const P = { N: 32768, r: 8, p: 1, keylen: 64, maxmem: 128 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, P.keylen, { N: P.N, r: P.r, p: P.p, maxmem: P.maxmem });
  return `scrypt$${P.N}$${P.r}$${P.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, salt, hash] = parts;
  const want = Buffer.from(hash, "base64");
  const got = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), want.length, { N: +N, r: +r, p: +p, maxmem: P.maxmem });
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/** Hash tiruan untuk menyamakan waktu respons saat email tidak ditemukan (anti user-enumeration lewat timing). */
export const DUMMY_HASH = `scrypt$${P.N}$${P.r}$${P.p}$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;

export const newToken = () => crypto.randomBytes(32).toString("base64url");
// Token sesi disimpan sebagai hash: kebocoran database tidak langsung membocorkan sesi aktif.
export const tokenHash = (t) => crypto.createHash("sha256").update(t).digest("hex");

export function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name, value, { maxAgeSec, secure }) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
}

/** Pembatas percobaan login: maks `max` gagal per kunci dalam `windowMs`. */
export class Limiter {
  constructor(max = 5, windowMs = 15 * 60 * 1000) {
    Object.assign(this, { max, windowMs });
    this.hits = new Map();
  }
  blocked(key, now = Date.now()) {
    const h = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    this.hits.set(key, h);
    return h.length >= this.max;
  }
  fail(key, now = Date.now()) {
    this.hits.set(key, [...(this.hits.get(key) || []), now]);
  }
  clear(key) {
    this.hits.delete(key);
  }
}

export const hmacHex = (secret, body) => crypto.createHmac("sha256", secret).update(body).digest("hex");
export const safeEqualHex = (a, b) => {
  const x = Buffer.from(String(a), "hex"), y = Buffer.from(String(b), "hex");
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};
