/**
 * Masa berlaku sesi Mitra (mode demo, disimpan di localStorage).
 *
 * Dua batas, keduanya harus lolos:
 *  - idle     : berapa lama boleh tanpa aktivitas sebelum otomatis keluar
 *  - absolute : umur maksimum sesi sejak login, seaktif apa pun
 * "Ingat saya" memperpanjang keduanya, tetapi tetap ada batasnya (tidak ada login selamanya).
 */
export const SESSION_LIMITS = {
  normal: { idleMs: 20 * 60 * 1000, absoluteMs: 8 * 60 * 60 * 1000 }, // 20 menit diam / maks 8 jam
  remember: { idleMs: 2 * 60 * 60 * 1000, absoluteMs: 24 * 60 * 60 * 1000 } // 2 jam diam / maks 24 jam
};
export const WARN_BEFORE_MS = 60 * 1000; // peringatan 1 menit sebelum habis

export const newSession = (email, remember = false, now = Date.now()) => ({ email, startedAt: now, lastActive: now, remember: !!remember });

const limitsOf = (s) => (s?.remember ? SESSION_LIMITS.remember : SESSION_LIMITS.normal);

/** Waktu (ms epoch) sesi habis: yang lebih dulu antara batas diam dan batas umur. */
export function expiresAt(s) {
  if (!s || !Number.isFinite(s.startedAt) || !Number.isFinite(s.lastActive)) return 0;
  const l = limitsOf(s);
  return Math.min(s.lastActive + l.idleMs, s.startedAt + l.absoluteMs);
}

/** Sesi tanpa stempel waktu (format lama / dirusak) dianggap tidak sah. */
export const isExpired = (s, now = Date.now()) => !s || now >= expiresAt(s);
export const msLeft = (s, now = Date.now()) => Math.max(0, expiresAt(s) - now);

/** Catat aktivitas: memperpanjang batas diam, tidak pernah melewati batas umur. */
export const touched = (s, now = Date.now()) => (s && !isExpired(s, now) ? { ...s, lastActive: now } : s);
