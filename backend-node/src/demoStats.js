// Data contoh presentasi (Update 46) — rumus IDENTIK dengan demo_* di frontend/public/api/index.php (diuji paritas).
// Tidak disimpan di database: dihitung deterministik dari (tanggal, id) lalu dijumlahkan ke angka nyata.
export const demoOn = (db) => {
  const v = db.prepare("SELECT v FROM settings WHERE k='demo_stats'").pluck().get();
  return v === undefined ? true : v === "1";
};
export function h32(s) {
  const b = Buffer.from(String(s), "utf8");
  let h = 0x811c9dc5;
  for (const c of b) { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
const rnd = (s) => h32(s) / 4294967296;
export const dayNum = (d) => Math.floor(Date.parse(d + "T00:00:00Z") / 86400e3);
const wibNow = (now) => now + 7 * 3600e3;
export const todayWibStr = (now = Date.now()) => new Date(wibNow(now)).toISOString().slice(0, 10);
export const todayPart = (now = Date.now()) => Math.max(0.04, Math.floor((wibNow(now) % 86400e3) / 60e3) / 1440);

export function dayFactor(day, key, now = Date.now()) {
  const n = dayNum(day), dow = (((n + 4) % 7) + 7) % 7;
  const wk = dow === 0 || dow === 6 ? 1.18 : dow === 2 || dow === 3 ? 0.92 : 1.0;
  const wave = 1 + 0.14 * Math.sin(n / 6.5 + rnd(`ph|${key}`) * 6.283);
  const grow = 1 + 0.0035 * ((n % 400) / 4);
  const noise = 0.78 + 0.44 * rnd(`d|${day}|${key}`);
  const f = day === todayWibStr(now) ? todayPart(now) : 1.0;
  return wk * wave * grow * noise * f;
}
const r = (x) => Math.round(x);
export function demoProduct(day, pid, now = Date.now()) {
  const pop = 0.35 + 1.3 * rnd(`pop|${pid}`);
  const view = r(16 * pop * dayFactor(day, pid, now));
  const tr = r(view * (0.26 + 0.18 * rnd(`t|${day}|${pid}`)));
  return {
    view, try: tr,
    buy: r(tr * (0.07 + 0.09 * rnd(`b|${day}|${pid}`))),
    contact: r(tr * (0.09 + 0.09 * rnd(`c|${day}|${pid}`))),
    wish: r(view * (0.04 + 0.06 * rnd(`w|${day}|${pid}`)))
  };
}
export const demoStore = (day, mid, now = Date.now()) => r(34 * (0.55 + 0.9 * rnd(`s|${mid}`)) * dayFactor(day, `store|${mid}`, now));
export const demoVisit = (day, now = Date.now()) => r(260 * dayFactor(day, "visit", now));
export function hourWeights(upto = 23) {
  const w = Array.from({ length: 24 }, (_, h) => (h > upto ? 0 : 0.22 + Math.exp(-(((h - 20) / 3.2) ** 2)) + 0.6 * Math.exp(-(((h - 12) / 2.4) ** 2))));
  const s = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((x) => x / s);
}
export function spread(total, w) {
  const o = w.map((x) => Math.floor(total * x));
  let rest = total - o.reduce((a, b) => a + b, 0);
  const order = w.map((x, h) => [x, h]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, h] of order) { if (rest-- <= 0) break; o[h]++; }
  return o;
}
export function daysBetween(from, to) {
  const o = [];
  for (let n = dayNum(from); n <= dayNum(to); n++) o.push(new Date(n * 86400e3).toISOString().slice(0, 10));
  return o;
}
