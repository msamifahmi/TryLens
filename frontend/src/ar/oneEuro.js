// One Euro Filter (Casiez et al., CHI 2012): penghalus adaptif.
// Diam  -> frekuensi potong rendah  -> getaran landmark hilang.
// Gerak -> frekuensi potong naik    -> tidak ada "buntut"/lag saat kepala bergerak cepat.
const alphaOf = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff) / dt);

export class OneEuro {
  constructor({ minCutoff = 1, beta = 0, dCutoff = 1 } = {}) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.reset();
  }
  reset() {
    this.x = null;
    this.dx = 0;
    this.t = 0;
  }
  filter(x, t) {
    if (this.x === null) {
      this.x = x;
      this.t = t;
      return x;
    }
    const dt = Math.max(1e-3, t - this.t);
    this.t = t;
    this.dx += alphaOf(this.dCutoff, dt) * ((x - this.x) / dt - this.dx);
    this.x += alphaOf(this.minCutoff + this.beta * Math.abs(this.dx), dt) * (x - this.x);
    return this.x;
  }
}

export class OneEuroVec {
  constructor(n, opts) {
    this.f = Array.from({ length: n }, () => new OneEuro(opts));
  }
  reset() {
    this.f.forEach((f) => f.reset());
  }
  filter(v, t) {
    return v.map((x, i) => this.f[i].filter(x, t));
  }
  get speed() {
    return Math.hypot(...this.f.map((f) => f.dx));
  }
}

/** Versi untuk rotasi (quaternion [x,y,z,w]); kecepatan = laju sudut (rad/s). */
export class OneEuroQuat {
  constructor({ minCutoff = 1, beta = 0, dCutoff = 1 } = {}) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.reset();
  }
  reset() {
    this.q = null;
    this.speed = 0;
    this.t = 0;
  }
  filter(q, t) {
    if (!this.q) {
      this.q = [...q];
      this.t = t;
      return this.q;
    }
    const dt = Math.max(1e-3, t - this.t);
    this.t = t;
    const p = this.q;
    let d = p[0] * q[0] + p[1] * q[1] + p[2] * q[2] + p[3] * q[3];
    const b = d < 0 ? q.map((v) => -v) : q;
    d = Math.min(1, Math.abs(d));
    this.speed += alphaOf(this.dCutoff, dt) * ((2 * Math.acos(d)) / dt - this.speed);
    const a = alphaOf(this.minCutoff + this.beta * this.speed, dt);
    let out;
    if (d > 0.9995) out = p.map((v, i) => v + a * (b[i] - v));
    else {
      const th = Math.acos(d);
      const s = Math.sin(th);
      const w1 = Math.sin((1 - a) * th) / s;
      const w2 = Math.sin(a * th) / s;
      out = p.map((v, i) => w1 * v + w2 * b[i]);
    }
    const n = Math.hypot(...out) || 1;
    this.q = out.map((v) => v / n);
    return this.q;
  }
}
