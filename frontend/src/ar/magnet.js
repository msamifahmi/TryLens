// Pelacak "magnet": filter α-β (posisi + kecepatan) dengan GAIN yang bergantung pada besar selisih.
//
//  - Selisih kecil (getaran landmark)  → gain rendah  → halus, tidak bergetar.
//  - Selisih besar (kepala bergeser)   → gain → 1     → model "tersedot" ke wajah seketika, tanpa buntut.
//  - Kecepatan ikut ditaksir          → gerak konstan dilacak tanpa lag tetap (One Euro selalu tertinggal
//                                       sebesar kecepatan × konstanta waktu); lalu `lead` mengompensasi
//                                       latensi tampil (deteksi → render) dengan ekstrapolasi pendek.
//
// Sumbu Y diberi `axisBoost` > 1: selisih vertikal lebih cepat menarik gain ke 1, supaya sisi Y wajah dan
// sisi Y kacamata saling mengunci lebih dulu (getaran vertikal paling terlihat di mata).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// g0 = gain saat diam; capture = selisih (cm / rad) yang membuat gain → 1; vref = kecepatan (cm/s, rad/s) yang membuat gain → 1;
// lead = detik ekstrapolasi untuk latensi tampil; vDead = kecepatan di bawah ini tidak diekstrapolasi (itu getaran).
export const MAGNET_POS = { g0: 0.22, capture: 0.45, axisBoost: [1, 1.6, 0.8], vref: 5, lead: 0.025, leadMax: 0.5, vDead: 1.5, jump: 1.2 };
export const MAGNET_ROT = { g0: 0.22, capture: 0.06, vref: 0.4, lead: 0.025, leadMax: 0.12, vDead: 0.12 };
const ramp = (v, d) => { const u = clamp((Math.abs(v) - d * 0.5) / d, 0, 1); return u * u * (3 - 2 * u); };

export class MagnetVec {
  constructor(n = 3, opts = {}) {
    this.n = n;
    this.o = { ...MAGNET_POS, ...opts };
    this.reset();
  }
  reset() {
    this.x = null;
    this.v = new Array(this.n).fill(0);
    this.t = 0;
    this.gain = 0;
    this.held = false;
  }
  get speed() {
    return Math.hypot(...this.v);
  }
  filter(z, t) {
    const o = this.o;
    if (!this.x) {
      this.x = [...z];
      this.t = t;
      return [...z];
    }
    const dt = clamp(t - this.t, 1e-3, 0.2);
    this.t = t;
    // Gerbang lompatan: sampel yang melompat jauh dari prediksi SATU frame saja (landmark glitch/tertutup) ditahan;
    // bila frame berikutnya juga di sana, itu gerak sungguhan dan diterima.
    const jump = z.some((zi, i) => Math.abs(zi - (this.x[i] + this.v[i] * dt)) * (this.o.axisBoost?.[i] ?? 1) > this.o.jump);
    if (jump && !this.held) {
      this.held = true;
      return this.at(this.o.lead);
    }
    this.held = false;
    let gmax = 0;
    const out = z.map((zi, i) => {
      const pred = this.x[i] + this.v[i] * dt;
      const e = zi - pred;
      const r = (Math.abs(e) * (o.axisBoost?.[i] ?? 1)) / o.capture;
      const vr = Math.abs(this.v[i]) / o.vref;
      const g = o.g0 + (1 - o.g0) * Math.min(1, r * r + vr * vr);
      gmax = Math.max(gmax, g);
      this.x[i] = pred + g * e;
      this.v[i] += ((g * g) / (2 - g)) * (e / dt);
      return 0;
    });
    this.gain = gmax;
    return this.at(o.lead);
  }
  /** Posisi diekstrapolasi `extra` detik ke depan (latensi tampil + waktu sejak deteksi terakhir). */
  at(extra) {
    const o = this.o;
    return this.x.map((x, i) => x + clamp(this.v[i] * ramp(this.v[i], o.vDead) * extra, -o.leadMax, o.leadMax));
  }
}

// ---- quaternion [x,y,z,w] ----
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
const qconj = (a) => [-a[0], -a[1], -a[2], a[3]];
const qexp = (r) => {
  const th = Math.hypot(...r);
  if (th < 1e-9) return [r[0] / 2, r[1] / 2, r[2] / 2, 1];
  const s = Math.sin(th / 2) / th;
  return [r[0] * s, r[1] * s, r[2] * s, Math.cos(th / 2)];
};
const qlog = (q) => {
  const s = q[3] < 0 ? -1 : 1; // jalur terpendek
  const x = q[0] * s, y = q[1] * s, z = q[2] * s, w = q[3] * s;
  const n = Math.hypot(x, y, z);
  if (n < 1e-9) return [2 * x, 2 * y, 2 * z];
  const k = (2 * Math.atan2(n, w)) / n;
  return [x * k, y * k, z * k];
};
const qnorm = (q) => {
  const n = Math.hypot(...q) || 1;
  return q.map((v) => v / n);
};

export class MagnetQuat {
  constructor(opts = {}) {
    this.o = { ...MAGNET_ROT, ...opts };
    this.reset();
  }
  reset() {
    this.q = null;
    this.w = [0, 0, 0]; // kecepatan sudut (rad/s), ruang dunia
    this.t = 0;
    this.speed = 0;
    this.gain = 0;
  }
  filter(z, t) {
    const o = this.o;
    if (!this.q) {
      this.q = [...z];
      this.t = t;
      return [...z];
    }
    const dt = clamp(t - this.t, 1e-3, 0.2);
    this.t = t;
    const pred = qnorm(qmul(qexp(this.w.map((v) => v * dt)), this.q));
    const e = qlog(qmul(z, qconj(pred))); // rotasi dunia: pred → z
    const g = o.g0 + (1 - o.g0) * Math.min(1, (Math.hypot(...e) / o.capture) ** 2 + (Math.hypot(...this.w) / o.vref) ** 2);
    this.gain = g;
    this.q = qnorm(qmul(qexp(e.map((v) => v * g)), pred));
    const b = (g * g) / (2 - g);
    this.w = this.w.map((v, i) => v + (b * e[i]) / dt);
    this.speed = Math.hypot(...this.w);
    return this.at(o.lead);
  }
  at(extra) {
    const o = this.o;
    const lead = this.w.map((v) => v * extra * ramp(this.speed, o.vDead));
    const ln = Math.hypot(...lead);
    const sc = ln > o.leadMax ? o.leadMax / ln : 1;
    return qnorm(qmul(qexp(lead.map((v) => v * sc)), this.q));
  }
}
