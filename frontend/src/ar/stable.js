// Pelacak "stable": menempelkan kacamata ke wajah TANPA bergantung pada beberapa node saja.
//
// Mengapa dibuat (diagnosis pelacak sebelumnya, diukur dengan jaringan landmark MediaPipe asli — lihat ml/realnet):
//   • Pose kepala dari matriks MediaPipe memakai ±24 landmark dan memakai z (kedalaman) yang paling berisik.
//   • Jalur cepat "node" memilih posisi kepala dari 7 landmark (pupil, hidung, pelipis). Ketika satu mata dipejamkan,
//     alis tertutup rambut, atau satu node dibuang, kumpulan "pemilih" berubah → hasilnya LONCAT (hingga 15 px).
//   • Pupil ikut gerak bola mata (lirikan), padahal kacamata menempel di kepala.
//
// Cara kerja di sini:
//   1. PNP ROBUST: pose rigid 6-DoF diselesaikan dari ±250 landmark KAKU (dahi, hidung, pipi, pelipis; tanpa kelopak mata,
//      alis, bibir, rahang bawah, iris) dengan Gauss-Newton pada galat reproyeksi 2D (x,y — keluaran jaringan paling
//      presisi; z yang berisik tidak dipakai). Pembobotan Tukey membuang pencilan (rambut, tangan), bobot tampak-muka
//      mengecilkan landmark di tepi wajah. Dimulai dari pose frame sebelumnya (kontinu).
//   2. PIVOT: parameter pose diambil di titik kacamata (bukan di titik asal kepala di dalam kepala). Derau rotasi tidak
//      lagi dikalikan lengan tuas ±6 cm menjadi getaran posisi di mata.
//   3. KALMAN ADAPTIF: kecepatan ikut diestimasi (kacamata menempel saat kepala bergerak, tanpa buntut), derau pengukuran
//      diambil dari galat nyata penyelesaian (kamera gelap/berisik → otomatis lebih halus), inovasi besar (kepala digerakkan
//      cepat) langsung menaikkan derau proses → "tersedot" ke wajah. Saat pengukuran jelek (inlier sedikit) filter
//      bertumpu pada prediksi, bukan melompat.
import { quatToMat } from "./rigid.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (x, a, b) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

/* -------------------------------------------------------------- himpunan landmark kaku */
const LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 185, 40, 39, 37, 0, 267, 269, 270, 409, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 191, 80, 81, 82, 13, 312, 311, 310, 415];
const EYE_R = [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173];
const EYE_L = [263, 249, 390, 373, 374, 380, 381, 382, 362, 466, 388, 387, 386, 385, 384, 398];
const BROW_R = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];
const BROW_L = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];
const EXTRA_SOFT = [168, 6, 197, 195, 5, 4, 1, 2]; // batang & ujung hidung: kaku, bobot penuh

/**
 * Himpunan landmark kaku + bobot dasar + normal verteks (mesh kanonik, cm).
 * canon : Float64Array 468*3 · faces : larik indeks segitiga (canonicalFace.json → f)
 */
export function buildRigidSet(canon, faces) {
  const skip = new Set([...LIPS, ...EYE_R, ...EYE_L, ...BROW_R, ...BROW_L]);
  let lipY = 0;
  for (const i of [13, 14]) lipY += canon[3 * i + 1] / 2;
  const idx = [], w = [];
  for (let i = 0; i < 468; i++) {
    if (skip.has(i)) continue;
    const y = canon[3 * i + 1];
    if (y < lipY - 0.8) continue; // dagu & rahang bawah ikut bergerak saat mulut terbuka
    idx.push(i);
    // dahi atas sering tertutup poni/rambut → bobot turun linear di atas garis alis (y>5,4 cm kanonik)
    w.push(y <= 5.4 ? 1 : Math.max(0.2, 1 - (0.8 * (y - 5.4)) / 2.8));
  }
  // Normal verteks (rata-rata normal segitiga), untuk bobot tampak-muka.
  const nrm = new Float64Array(468 * 3);
  for (let t = 0; t + 2 < faces.length; t += 3) {
    const [a, b, c] = [faces[t], faces[t + 1], faces[t + 2]];
    const u = [0, 1, 2].map((k) => canon[3 * b + k] - canon[3 * a + k]);
    const v = [0, 1, 2].map((k) => canon[3 * c + k] - canon[3 * a + k]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const p of [a, b, c]) for (let k = 0; k < 3; k++) nrm[3 * p + k] += n[k];
  }
  for (let i = 0; i < 468; i++) {
    const l = Math.hypot(nrm[3 * i], nrm[3 * i + 1], nrm[3 * i + 2]) || 1;
    for (let k = 0; k < 3; k++) nrm[3 * i + k] /= l;
    if (nrm[3 * i + 2] < 0) for (let k = 0; k < 3; k++) nrm[3 * i + k] *= -1; // mesh kanonik menghadap +z; pastikan keluar
  }
  return { idx: Int32Array.from(idx), w: Float64Array.from(w), normals: nrm, n: idx.length, soft: new Set(EXTRA_SOFT) };
}

/* -------------------------------------------------------------- aljabar kecil */
const mulMat = (A, B) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c]));
const mulVec = (A, v) => [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2], A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2], A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]];
export const expMap = (w) => {
  const th = Math.hypot(w[0], w[1], w[2]);
  if (th < 1e-12) return [[1, -w[2], w[1]], [w[2], 1, -w[0]], [-w[1], w[0], 1]];
  const k = [w[0] / th, w[1] / th, w[2] / th], s = Math.sin(th), c = Math.cos(th), v = 1 - c;
  return [
    [c + k[0] * k[0] * v, k[0] * k[1] * v - k[2] * s, k[0] * k[2] * v + k[1] * s],
    [k[1] * k[0] * v + k[2] * s, c + k[1] * k[1] * v, k[1] * k[2] * v - k[0] * s],
    [k[2] * k[0] * v - k[1] * s, k[2] * k[1] * v + k[0] * s, c + k[2] * k[2] * v]
  ];
};
export function matToQuat(R) {
  const tr = R[0][0] + R[1][1] + R[2][2];
  let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(R[2][1] - R[1][2]) / s, (R[0][2] - R[2][0]) / s, (R[1][0] - R[0][1]) / s, s / 4]; }
  else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) { const s = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2; q = [s / 4, (R[0][1] + R[1][0]) / s, (R[0][2] + R[2][0]) / s, (R[2][1] - R[1][2]) / s]; }
  else if (R[1][1] > R[2][2]) { const s = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2; q = [(R[0][1] + R[1][0]) / s, s / 4, (R[1][2] + R[2][1]) / s, (R[0][2] - R[2][0]) / s]; }
  else { const s = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2; q = [(R[0][2] + R[2][0]) / s, (R[1][2] + R[2][1]) / s, s / 4, (R[1][0] - R[0][1]) / s]; }
  const n = Math.hypot(...q);
  return q.map((v) => v / n);
}
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
  const s = q[3] < 0 ? -1 : 1;
  const x = q[0] * s, y = q[1] * s, z = q[2] * s, w = q[3] * s;
  const n = Math.hypot(x, y, z);
  if (n < 1e-9) return [2 * x, 2 * y, 2 * z];
  const k = (2 * Math.atan2(n, w)) / n;
  return [x * k, y * k, z * k];
};
const qnorm = (q) => { const n = Math.hypot(...q) || 1; return q.map((v) => v / n); };

/** Selesaikan (H + diag) x = g untuk 6x6 simetris positif; kembalikan { x, inv } (inv = H⁻¹) atau null. */
function solve6(H, g, lambda) {
  const n = 6;
  const M = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => H[i][j] + (i === j ? lambda * H[i][i] + 1e-12 : 0)));
  // Gauss-Jordan untuk [M | g | I]
  const aug = M.map((r, i) => [...r, g[i], ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(aug[r][c]) > Math.abs(aug[p][c])) p = r;
    if (Math.abs(aug[p][c]) < 1e-18) return null;
    [aug[c], aug[p]] = [aug[p], aug[c]];
    const d = aug[c][c];
    for (let j = c; j < aug[c].length; j++) aug[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = aug[r][c];
      if (f === 0) continue;
      for (let j = c; j < aug[r].length; j++) aug[r][j] -= f * aug[c][j];
    }
  }
  return { x: aug.map((r) => r[n]), inv: aug.map((r) => r.slice(n + 1)) };
}

/* -------------------------------------------------------------- penyelesaian PnP robust berpivot */
const NOISE_PX = 0.35;
/**
 * Selesaikan pose kepala dari galat reproyeksi 2D.
 *  set    : buildRigidSet · canon : Float64Array 468*3 (cm kanonik) · lm : larik {x,y} ternormalisasi
 *  W,H,f  : ukuran bingkai & fokus (px) · k : ukuran wajah vs kanonik · a : pivot di ruang kepala (satuan kanonik)
 *  prior  : { R (3x3), A (3, posisi dunia pivot, cm) } — tebakan awal (pose frame sebelumnya)
 * Mengembalikan { R, A, covA (3x3 cm²), covW (3x3 rad²), sigmaPx, inlier, used, ok } .
 */
export function solvePivot({ set, canon, lm, W, H, f, k, a, prior, iters = 4 }) {
  let R = prior.R.map((r) => r.slice());
  let A = prior.A.slice();
  const n = set.n;
  const cx = W / 2, cy = H / 2;
  const ox = new Float64Array(n), oy = new Float64Array(n);
  const X = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const id = set.idx[i];
    ox[i] = lm[id].x * W; oy[i] = lm[id].y * H;
    for (let c = 0; c < 3; c++) X[3 * i + c] = (canon[3 * id + c] - a[c]) * k;
  }
  const rx = new Float64Array(n), ry = new Float64Array(n), wt = new Float64Array(n);
  let sigma = 1, last = null, inl = 0, sw = 0, swr = 0;
  for (let it = 0; it < iters; it++) {
    const H6 = Array.from({ length: 6 }, () => new Array(6).fill(0));
    const g6 = new Array(6).fill(0);
    // pass 1: residu dan bobot visibilitas
    const resid = [];
    for (let i = 0; i < n; i++) {
      const x = X[3 * i], y = X[3 * i + 1], z = X[3 * i + 2];
      const rxv = R[0][0] * x + R[0][1] * y + R[0][2] * z, ryv = R[1][0] * x + R[1][1] * y + R[1][2] * z, rzv = R[2][0] * x + R[2][1] * y + R[2][2] * z;
      const qx = rxv + A[0], qy = ryv + A[1], qz = rzv + A[2];
      const d = -qz;
      if (d < 5) { wt[i] = 0; continue; }
      rx[i] = ox[i] - (cx + (f * qx) / d);
      ry[i] = oy[i] - (cy - (f * qy) / d);
      // bobot tampak-muka: normal (diputar) · arah ke kamera
      const id = set.idx[i];
      const nx = set.normals[3 * id], ny = set.normals[3 * id + 1], nz = set.normals[3 * id + 2];
      const wn = [R[0][0] * nx + R[0][1] * ny + R[0][2] * nz, R[1][0] * nx + R[1][1] * ny + R[1][2] * nz, R[2][0] * nx + R[2][1] * ny + R[2][2] * nz];
      const ql = Math.hypot(qx, qy, qz) || 1;
      const cosv = -(wn[0] * qx + wn[1] * qy + wn[2] * qz) / ql;
      wt[i] = set.w[i] * (set.soft.has(id) ? 1 : 0.35 + 0.65 * smooth(cosv, 0.1, 0.55));
      resid.push(Math.hypot(rx[i], ry[i]));
    }
    // skala robust (MAD) → bobot Tukey
    resid.sort((p, q) => p - q);
    const med = resid.length ? resid[resid.length >> 1] : 1;
    sigma = Math.max(0.3, 1.4826 * med);
    const c = 4.685 * sigma;
    sw = 0; swr = 0; inl = 0;
    for (let i = 0; i < n; i++) {
      if (wt[i] <= 0) continue;
      const r = Math.hypot(rx[i], ry[i]);
      const tk = r < c ? (1 - (r / c) ** 2) ** 2 : 0;
      wt[i] *= tk;
      if (wt[i] <= 1e-6) { wt[i] = 0; continue; }
      inl++; sw += wt[i]; swr += wt[i] * r * r;
    }
    if (inl < 12) return { ok: false, inlier: inl / n, used: inl, R, A };
    // pass 2: persamaan normal
    for (let i = 0; i < n; i++) {
      if (!(wt[i] > 0)) continue;
      const x = X[3 * i], y = X[3 * i + 1], z = X[3 * i + 2];
      const rxv = R[0][0] * x + R[0][1] * y + R[0][2] * z, ryv = R[1][0] * x + R[1][1] * y + R[1][2] * z, rzv = R[2][0] * x + R[2][1] * y + R[2][2] * z;
      const qx = rxv + A[0], qy = ryv + A[1], qz = rzv + A[2], d = -qz;
      const fd = f / d, fd2 = f / (d * d);
      // Jacobi proyeksi terhadap q
      const Jq = [[fd, 0, fd2 * qx], [0, -fd, -fd2 * qy]];
      // dq/dω = −[R x]× ; dq/dA = I
      const rv = [rxv, ryv, rzv];
      const cr = [[0, -rv[2], rv[1]], [rv[2], 0, -rv[0]], [-rv[1], rv[0], 0]]; // [rv]×
      const Jw = [[0, 0, 0], [0, 0, 0]];
      for (let r = 0; r < 2; r++) for (let cc = 0; cc < 3; cc++) Jw[r][cc] = -(Jq[r][0] * cr[0][cc] + Jq[r][1] * cr[1][cc] + Jq[r][2] * cr[2][cc]);
      const J = [[...Jw[0], Jq[0][0], Jq[0][1], Jq[0][2]], [...Jw[1], Jq[1][0], Jq[1][1], Jq[1][2]]];
      const w = wt[i], e = [rx[i], ry[i]];
      for (let p = 0; p < 6; p++) {
        g6[p] += w * (J[0][p] * e[0] + J[1][p] * e[1]);
        for (let q = p; q < 6; q++) H6[p][q] += w * (J[0][p] * J[0][q] + J[1][p] * J[1][q]);
      }
    }
    for (let p = 0; p < 6; p++) for (let q = 0; q < p; q++) H6[p][q] = H6[q][p];
    const sol = solve6(H6, g6, 1e-4);
    if (!sol) return { ok: false, inlier: inl / n, used: inl, R, A };
    const dx = sol.x;
    R = mulMat(expMap([dx[0], dx[1], dx[2]]), R);
    A = [A[0] + dx[3], A[1] + dx[4], A[2] + dx[5]];
    last = sol.inv;
    if (Math.hypot(dx[0], dx[1], dx[2]) < 2e-5 && Math.hypot(dx[3], dx[4], dx[5]) < 2e-4) break;
  }
  // σ² kalibrasi dari residu berbobot (px²), lalu kovarians = σ² (JᵀWJ)⁻¹
  const s2 = NOISE_PX * NOISE_PX; // derau pengukuran sebenarnya (temporal); galat sistematik templat tidak dihitung sebagai derau
  const resPx = Math.sqrt(Math.max(0.09, swr / Math.max(1, sw)));
  const inv = last;
  const covW = [0, 1, 2].map((r) => [0, 1, 2].map((c) => s2 * inv[r][c]));
  const covA = [0, 1, 2].map((r) => [0, 1, 2].map((c) => s2 * inv[3 + r][3 + c]));
  return { ok: true, R, A, covA, covW, sigmaPx: resPx, inlier: inl / n, used: inl };
}

/* -------------------------------------------------------------- Kalman kecepatan-konstan 1-D */
export class CV1D {
  constructor() { this.reset(); }
  reset() { this.x = null; this.v = 0; this.P = [[1, 0], [0, 1]]; this.qmult = 1; this.nis = 0; }
  /**
   * z : pengukuran · r : varians pengukuran · dt : detik · sa : simpangan percepatan (satuan/s²)
   * Mengembalikan true bila pengukuran diterima. Inovasi besar → derau proses dinaikkan hingga konsisten ("tersedot").
   */
  update(z, r, dt, sa, { gate = 12, maxBoost = 4096 } = {}) {
    if (this.x === null) { this.x = z; this.v = 0; this.P = [[r, 0], [0, (sa * sa) * 1]]; return true; }
    const dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt2 * dt2;
    const xp = this.x + this.v * dt, vp = this.v;
    const nu = z - xp;
    const F = (P) => [
      [P[0][0] + dt * (P[0][1] + P[1][0]) + dt2 * P[1][1], P[0][1] + dt * P[1][1]],
      [P[1][0] + dt * P[1][1], P[1][1]]
    ];
    const Fp = F(this.P);
    let m = Math.max(1, this.qmult * 0.5); // keberlanjutan boost beberapa frame
    let Pp, S;
    for (let tries = 0; ; tries++) {
      const q = sa * sa * m;
      Pp = [[Fp[0][0] + q * dt4 / 4, Fp[0][1] + q * dt3 / 2], [Fp[1][0] + q * dt3 / 2, Fp[1][1] + q * dt2]];
      S = Pp[0][0] + r;
      if (nu * nu / S <= gate || m >= maxBoost || tries > 12) break;
      m *= 4;
    }
    this.qmult = m;
    const K0 = Pp[0][0] / S, K1 = Math.min(Pp[1][0] / S, 1.2 / dt); // β·dt ≤ 1,2 → jauh dari batas kestabilan (2)
    this.x = xp + K0 * nu;
    this.v = vp + K1 * nu;
    this.P = [[(1 - K0) * Pp[0][0], (1 - K0) * Pp[0][1]], [Pp[1][0] - K1 * Pp[0][0], Pp[1][1] - K1 * Pp[0][1]]];
    this.nis = nu * nu / S;
    return true;
  }
  /** Lewati pengukuran (kualitas buruk): hanya prediksi, kecepatan meluruh. */
  coast(dt, decay = 0.9) {
    if (this.x === null) return;
    this.x += this.v * dt; this.v *= decay;
    this.P[0][0] += 0.02; this.P[1][1] += 0.5;
  }
}

/* -------------------------------------------------------------- pelacak lengkap */
export const STABLE_DEFAULTS = {
  saPos: 45,        // simpangan percepatan pivot (cm/s²) — ≈0,45 m/s²; gerak lebih kencang ditangkap lewat boost inovasi
  saRot: 3,         // simpangan percepatan sudut (rad/s²)
  floorRot: 0.0035, // rad (≈0,2°) — lantai derau rotasi
  floorPx: 0.25,    // lantai derau pengukuran (px) — derau jaringan berkorelasi waktu, bukan putih
  lead: 0.025,      // detik ekstrapolasi latensi tampil
  leadMax: 0.4, rotLeadMax: 0.12,
  vDead: 4,         // cm/s — di bawah ini kecepatan tidak diekstrapolasi (itu getaran)
  wDead: 0.1,       // rad/s
  minInlier: 0.28,
  dead: 0.35,       // px — zona-mati keluaran saat diam
  deadRot: 0.004, // rad (≈0,23°) — zona-mati rotasi saat diam
  freeze: 0
};
const ramp = (v, d) => { const u = clamp((Math.abs(v) - d * 0.5) / d, 0, 1); return u * u * (3 - 2 * u); };

export class StableTracker {
  constructor(canon, faces, opts = {}) {
    this.canon = canon;
    this.set = buildRigidSet(canon, faces);
    this.o = { ...STABLE_DEFAULTS, ...opts };
    this.reset();
  }
  reset() {
    this.hold = null; this.qh = null;
    this.R = null;       // rotasi terukur terakhir (untuk tebakan awal)
    this.A = null;       // pivot dunia terukur terakhir
    this.px = [new CV1D(), new CV1D(), new CV1D()];
    this.rx = [new CV1D(), new CV1D(), new CV1D()];
    this.q = null;       // quaternion terfilter
    this.w = [0, 0, 0];  // kecepatan sudut terfilter (ruang dunia)
    this.t = 0;
    this.k = 1;
    this.a = [0, 3.6, 6.0];
    this.sigma = null;
    this.lastOk = false;
    this.sigBase = null; this.dirty = 0; this.clean = false; this.rsc = 1;
    this.rejects = 0;
    this.inlier = 0;
  }
  get ready() { return this.q !== null && this.px[0].x !== null; }

  /** Pivot baru di ruang kepala (satuan kanonik): pertahankan titik fisik yang sama agar tidak ada lompatan. */
  setPivot(a, k = this.k) {
    if (!this.ready) { this.a = a.slice(); return; }
    const d = [a[0] - this.a[0], a[1] - this.a[1], a[2] - this.a[2]];
    if (Math.hypot(...d) < 1e-9) return;
    const R = quatToMat(this.q);
    const off = [0, 1, 2].map((r) => k * (R[r][0] * d[0] + R[r][1] * d[1] + R[r][2] * d[2]));
    for (let i = 0; i < 3; i++) { this.px[i].x += off[i]; if (this.A) this.A[i] += 0; }
    if (this.A) this.A = this.A.map((v, i) => v + off[i]);
    this.a = a.slice();
  }

  /** Ukuran wajah berubah (kalibrasi/relock): pivot dunia bergeser sesuai skala. Posisi titik asal kepala dipertahankan. */
  setScale(k) {
    if (!this.ready || Math.abs(k - this.k) < 1e-9) { this.k = k; return; }
    const R = quatToMat(this.q);
    const dk = k - this.k;
    const off = [0, 1, 2].map((r) => dk * (R[r][0] * this.a[0] + R[r][1] * this.a[1] + R[r][2] * this.a[2]));
    for (let i = 0; i < 3; i++) this.px[i].x += off[i];
    if (this.A) this.A = this.A.map((v, i) => v + off[i]);
    this.k = k;
  }

  /**
   * Masukkan pengukuran. prior (opsional) = tebakan awal bila belum ada pelacakan: { R, T } (T = translasi matriks, cm, ukuran kanonik).
   * Mengembalikan { ok, T, R, q, sigmaPx, inlier } — T ala matriks (titik asal kepala, untuk ukuran wajah k), sebelum difilter.
   */
  measure(lm, W, H, f, prior = null) {
    let init = null;
    if (this.R && this.A) init = { R: this.R, A: this.A };
    else if (prior) {
      const kk = this.k;
      init = { R: prior.R, A: [0, 1, 2].map((r) => kk * (prior.R[r][0] * this.a[0] + prior.R[r][1] * this.a[1] + prior.R[r][2] * this.a[2]) + prior.T[r] * kk) };
    }
    if (!init) return { ok: false };
    const r = solvePivot({ set: this.set, canon: this.canon, lm, W, H, f, k: this.k, a: this.a, prior: init });
    if (!r.ok || r.inlier < this.o.minInlier) return { ok: false, inlier: r.inlier };
    this.R = r.R; this.A = r.A;
    // Kesehatan pengukuran: galat reproyeksi naik / kedalaman melompat = wajah tertutup (poni, tangan) → jangan dipakai kalibrasi.
    const dOk = !this.ready || Math.abs(Math.log(-r.A[2] / Math.max(1, -this.px[2].x))) < 0.035;
    if (this.sigBase === null) this.sigBase = r.sigmaPx;
    this.clean = r.sigmaPx <= this.sigBase * 1.12 + 0.2 && r.inlier > 0.6 && dOk;
    if (this.clean) { this.sigBase = 0.98 * this.sigBase + 0.02 * r.sigmaPx; this.dirty = 0; }
    else if (++this.dirty > 60) { this.sigBase = r.sigmaPx; this.dirty = 0; } // perubahan permanen (cahaya baru), bukan gangguan
    return { ok: true, R: r.R, A: r.A, covA: r.covA, covW: r.covW, sigmaPx: r.sigmaPx, inlier: r.inlier };
  }

  /** Perbarui filter dengan pengukuran m (hasil measure) pada waktu t (detik). */
  filter(m, t, depthCm) {
    const o = this.o;
    const dt = this.t ? clamp(t - this.t, 1e-3, 0.2) : 1 / 30;
    this.t = t;
    if (!m.ok) { this.coast(dt); return false; }
    // Pengukuran tidak sehat (poni/tangan menutup → skala wajah "berubah"): pertahankan POSISI LAYAR pivot dari pengukuran,
    // tetapi kedalaman diambil dari filter. Ukuran kacamata tidak meloncat dan kacamata tetap di wajah.
    if (this.o.freeze && !this.clean && this.px[2].x !== null) {
      const sc = this.px[2].x / m.A[2];
      m = { ...m, A: [m.A[0] * sc, m.A[1] * sc, this.px[2].x] };
    }
    // derau pengukuran: dari penyelesaian (σ_px → cm pada kedalaman pivot), dengan lantai
    const pxToCm = depthCm / (this.fpx || 500);
    const sFloor = o.floorPx * pxToCm;
    const sd = [0, 1, 2].map((i) => Math.max(sFloor * (i === 2 ? 3 : 1), Math.sqrt(Math.max(0, m.covA[i][i]))));
    for (let i = 0; i < 3; i++) this.px[i].update(m.A[i], sd[i] * sd[i] * this.rsc, dt, o.saPos);
    if (this.px.every((c) => c.qmult <= 1.01)) {
      const nis = (this.px[0].nis + this.px[1].nis) / 2;
      this.rsc = clamp(this.rsc * (1 + 0.08 * (clamp(nis, 0, 50) - 1)), 1, 40);
    }
    // rotasi: galat = log(z · q⁻¹) per sumbu dunia
    const zq = matToQuat(m.R);
    if (!this.q) { this.q = zq; this.w = [0, 0, 0]; for (let i = 0; i < 3; i++) this.rx[i].update(0, 1, dt, o.saRot); }
    else {
      const pred = qnorm(qmul(qexp(this.w.map((v) => v * dt)), this.q));
      const e = qlog(qmul(zq, qconj(pred)));
      const sr = [0, 1, 2].map((i) => Math.max(o.floorRot, Math.sqrt(Math.max(0, m.covW[i][i]))));
      const upd = [0, 1, 2].map((i) => {
        const c = this.rx[i];
        c.x = -this.w[i] * dt; // prediksi sudah memutar q sebesar w·dt → prediksi galat = 0 (error-state)
        c.v = this.w[i];
        c.update(e[i], sr[i] * sr[i], dt, o.saRot);
        return [c.x, c.v];
      });
      this.q = qnorm(qmul(qexp([upd[0][0], upd[1][0], upd[2][0]]), pred));
      this.w = [upd[0][1], upd[1][1], upd[2][1]];
    }
    this.sigma = m.sigmaPx;
    this.inlier = m.inlier;
    return true;
  }

  coast(dt) {
    if (!this.ready) return;
    this.px.forEach((c) => c.coast(dt));
    if (this.q) this.q = qnorm(qmul(qexp(this.w.map((v) => v * dt)), this.q));
    this.w = this.w.map((v) => v * 0.9);
  }

  /** Pose terfilter pada `extra` detik ke depan: { A (pivot dunia), q }. */
  at(extra) {
    const o = this.o;
    let P = this.px.map((c) => c.x + clamp(c.v * ramp(c.v, o.vDead) * extra, -o.leadMax, o.leadMax));
    // Zona-mati keluaran (histeresis): selama gerak < ambang, posisi ditahan; saat bergerak, keluaran menguntit tepi zona → tanpa lag berarti.
    if (o.dead > 0) {
      const cm = (Math.abs(this.px[2].x) || 50) / (this.fpx || 500);
      if (!this.hold) this.hold = P.slice();
      P = P.map((v, i) => {
        const d = o.dead * cm * (i === 2 ? 2 : 1) * (1 - ramp(this.speed, o.vDead * 2)), h = this.hold[i], e = v - h;
        this.hold[i] = Math.abs(e) > d ? v - Math.sign(e) * d : h;
        return this.hold[i];
      });
    }
    const sp = Math.hypot(...this.w);
    const lead = this.w.map((v) => v * extra * ramp(sp, o.wDead));
    const ln = Math.hypot(...lead);
    const sc = ln > o.rotLeadMax ? o.rotLeadMax / ln : 1;
    const q = qnorm(qmul(qexp(lead.map((v) => v * sc)), this.q));
    if (o.deadRot > 0) {
      const dr = o.deadRot * (1 - ramp(sp, o.wDead * 3));
      if (!this.qh) this.qh = q;
      const e = qlog(qmul(q, qconj(this.qh))), en = Math.hypot(...e);
      if (en > dr) this.qh = qnorm(qmul(qexp(e.map((v) => v * (1 - dr / en))), this.qh));
      return { A: P, q: this.qh };
    }
    return { A: P, q };
  }
  get speed() { return Math.hypot(this.px[0].v, this.px[1].v, this.px[2].v); }
  get rotSpeed() { return Math.hypot(...this.w); }
}
