// Penghalus tahap-render untuk pelacak "stable". Dipasang SETELAH filter Kalman, dijalankan tiap frame render (±60 Hz).
//
// Mengapa perlu: Kalman adaptif di stable.js menaikkan derau proses ("boost") ketika inovasi besar. Pada webcam beresolusi rendah
// derau landmark ±1–2 px terbaca sebagai "gerakan", sehingga filter justru ikut mengejar derau (diukur: getaran naik ±15× saat derau
// naik 3×). Penghalus ini memisahkan keduanya dengan satu-satunya cara yang tahan derau: frekuensi potong ikut KECEPATAN
// (One Euro). Diam → potong rendah (getaran hilang). Gerak → potong naik (tanpa buntut). Frekuensi potong dasar juga diturunkan
// otomatis bila galat reproyeksi (σ px) dari penyelesaian pose menunjukkan kamera berisik / gelap.
//
// Yang difilter adalah PIVOT kacamata (titik di kacamata, bukan titik asal kepala) + quaternion, supaya galat rotasi tidak
// dikalikan lengan tuas ±6 cm menjadi pergeseran di lensa.
import { OneEuroVec, OneEuroQuat } from "./oneEuro.js";

export const OUTPUT_DEFAULTS = { posMin: 2.0, posBeta: 0.12, rotMin: 1.6, rotBeta: 1.5, noisyMin: 0.45, sigmaRef: 0.6, dCut: 0.45 };

export class OutputFilter {
  constructor(opts = {}) {
    this.o = { ...OUTPUT_DEFAULTS, ...opts };
    this.pos = new OneEuroVec(3, { minCutoff: this.o.posMin, beta: this.o.posBeta, dCutoff: this.o.dCut });
    this.rot = new OneEuroQuat({ minCutoff: this.o.rotMin, beta: this.o.rotBeta, dCutoff: this.o.dCut });
    this.noise = 1; // 1 = bersih … 0 = sangat berisik (dihaluskan antar-frame)
  }
  reset() { this.pos.reset(); this.rot.reset(); }
  /** Pivot bergeser (kalibrasi/skala) → geser keadaan filter yang sama agar tidak melompat. */
  shift(d) { this.pos.f.forEach((f, i) => { if (f.x !== null) f.x += d[i]; }); }
  /** sigmaPx: galat reproyeksi pose terakhir (px). null = tidak diketahui (anggap bersih). */
  setNoise(sigmaPx) {
    if (!(sigmaPx > 0)) return;
    const u = 1 / (1 + (sigmaPx / this.o.sigmaRef) ** 2); // 1 bila σ << ref, → 0 bila σ >> ref
    this.noise += 0.05 * (u - this.noise);
  }
  filter(A, q, tSec) {
    const o = this.o, n = this.noise;
    const lerp = (lo, hi) => lo + (hi - lo) * n;
    this.pos.f.forEach((f) => { f.minCutoff = lerp(o.noisyMin, o.posMin); });
    this.rot.minCutoff = lerp(o.noisyMin, o.rotMin);
    return { A: this.pos.filter(A, tSec), q: this.rot.filter(q, tSec) };
  }
}
