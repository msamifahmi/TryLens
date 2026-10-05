// Geometri wajah metrik dari keluaran MediaPipe Face Landmarker. Fungsi murni (tanpa DOM/three) agar bisa diuji di Node.
//
// Ide utama:
//  1. Landmark 2D+z direkonstruksi jadi titik 3D dengan koreksi perspektif (wajah dekat kamera: telinga
//     tampak lebih kecil dari mata; tanpa koreksi, lebar wajah bias 8–12%).
//  2. Diameter iris manusia hampir konstan (11,7 mm ± 0,5; Google MediaPipe Iris) -> dipakai sebagai
//     "penggaris" untuk ukuran sebenarnya (mm) tanpa mengandalkan asumsi PD 63 mm.
//  3. Titik di-"luruskan" (un-rotate) dengan pose kepala, jadi rasio wajah tidak berubah saat menoleh.
export const IRIS_MM = 11.7;
export const FOV_DEG = 63; // sudut pandang vertikal yang diasumsikan MediaPipe untuk matriks pose
export const SCALE_PAIRS = [[234, 454], [127, 356], [33, 263]]; // pipi, pelipis, sudut luar mata
export const BRIDGE_IDX = 6; // batang hidung

export const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Urai matriks 4x4 kolom-mayor MediaPipe -> translasi, rotasi (3x3 baris-mayor), quaternion [x,y,z,w]. */
export function decomposeMatrix(d) {
  const sx = Math.hypot(d[0], d[1], d[2]) || 1;
  const sy = Math.hypot(d[4], d[5], d[6]) || 1;
  const sz = Math.hypot(d[8], d[9], d[10]) || 1;
  const R = [
    [d[0] / sx, d[4] / sy, d[8] / sz],
    [d[1] / sx, d[5] / sy, d[9] / sz],
    [d[2] / sx, d[6] / sy, d[10] / sz]
  ];
  const tr = R[0][0] + R[1][1] + R[2][2];
  let q;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [(R[2][1] - R[1][2]) / s, (R[0][2] - R[2][0]) / s, (R[1][0] - R[0][1]) / s, s / 4];
  } else if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
    const s = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2;
    q = [s / 4, (R[0][1] + R[1][0]) / s, (R[0][2] + R[2][0]) / s, (R[2][1] - R[1][2]) / s];
  } else if (R[1][1] > R[2][2]) {
    const s = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2;
    q = [(R[0][1] + R[1][0]) / s, s / 4, (R[1][2] + R[2][1]) / s, (R[0][2] - R[2][0]) / s];
  } else {
    const s = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2;
    q = [(R[0][2] + R[2][0]) / s, (R[1][2] + R[2][1]) / s, s / 4, (R[1][0] - R[0][1]) / s];
  }
  const n = Math.hypot(...q);
  return { t: [d[12], d[13], d[14]], R, q: q.map((v) => v / n), s: [sx, sy, sz] };
}

/** Sudut kepala dalam derajat (urutan Euler YXZ): yaw = menoleh, pitch = mengangguk, roll = miring. */
export function poseAngles(R) {
  const c = (v) => Math.max(-1, Math.min(1, v));
  const pitch = Math.asin(-c(R[1][2]));
  const yaw = Math.abs(R[1][2]) < 0.9999999 ? Math.atan2(R[0][2], R[2][2]) : 0;
  const roll = Math.abs(R[1][2]) < 0.9999999 ? Math.atan2(R[1][0], R[1][1]) : 0;
  const deg = 180 / Math.PI;
  return { yaw: yaw * deg, pitch: pitch * deg, roll: roll * deg };
}

/**
 * Rekonstruksi 3D (satuan cm pada skala sementara D0), lalu di-un-rotate ke pose menghadap kamera.
 * Semua panjang hasilnya sebanding dengan D0, jadi skala sebenarnya = m = 1,17 cm / diameter iris terukur.
 * Hasil: Float64Array xyz berpusat di titik tengah landmark wajah (468 titik pertama), sumbu seperti model kanonik.
 */
export function reconstructFrontal(lm, W, H, R, D0) {
  const f = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
  const n = lm.length;
  const P = new Float64Array(n * 3);
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    const d = D0 + lm[i].z * W * (D0 / f); // z negatif = lebih dekat ke kamera
    const x = ((lm[i].x - 0.5) * W * d) / f;
    const y = (-(lm[i].y - 0.5) * H * d) / f;
    P[3 * i] = x; P[3 * i + 1] = y; P[3 * i + 2] = -d;
    if (i < 468) { cx += x; cy += y; cz += -d; }
  }
  cx /= 468; cy /= 468; cz /= 468;
  const F = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = [P[3 * i] - cx, P[3 * i + 1] - cy, P[3 * i + 2] - cz];
    for (let a = 0; a < 3; a++) F[3 * i + a] = R[0][a] * v[0] + R[1][a] * v[1] + R[2][a] * v[2]; // Rᵀ·v
  }
  return F;
}

const d2 = (F, a, b) => Math.hypot(F[3 * a] - F[3 * b], F[3 * a + 1] - F[3 * b + 1]);
export const canonDist = (canon, a, b) =>
  Math.hypot(canon[3 * a] - canon[3 * b], canon[3 * a + 1] - canon[3 * b + 1]);
export function canonCentroid(canon) {
  const c = [0, 0, 0];
  for (let i = 0; i < 468; i++) for (let a = 0; a < 3; a++) c[a] += canon[3 * i + a] / 468;
  return c;
}

export function irisDiameter(F) {
  if (F.length < 478 * 3) return null;
  const r = (d2(F, 469, 471) + d2(F, 470, 472)) / 2;
  const l = (d2(F, 474, 476) + d2(F, 475, 477)) / 2;
  if (!(r > 0 && l > 0)) return null;
  return { r, l, mean: (r + l) / 2, asym: Math.abs(r - l) / ((r + l) / 2) };
}

/** m = cm sebenarnya per satuan rekonstruksi; k = ukuran wajah pengguna dibanding model kanonik. */
export function estimateScale(F, canon) {
  const iris = irisDiameter(F);
  if (!iris) return null;
  const m = IRIS_MM / 10 / iris.mean;
  const ks = SCALE_PAIRS.map(([a, b]) => (d2(F, a, b) * m) / canonDist(canon, a, b));
  // m juga penaksir k: jarak wajah dari iris vs jarak dari matriks pose (yang memakai ukuran kanonik).
  return { m, k: median([...ks, m]), iris, pairs: ks };
}

/** Ukuran wajah (mm) dan rasio bentuk dari titik yang sudah menghadap lurus. */
export function measureFrontal(F, m) {
  const cheek = d2(F, 234, 454);
  if (!cheek) return null;
  return {
    lenR: d2(F, 10, 152) / cheek,
    jawR: d2(F, 172, 397) / cheek,
    foreR: d2(F, 54, 284) / cheek,
    mm: cheek * m * 10,
    pd: F.length >= 478 * 3 ? d2(F, 468, 473) * m * 10 : null
  };
}

/** Selisih posisi batang hidung pengguna terhadap model kanonik (cm, satuan kanonik) — untuk menaruh frame pas di hidung. */
export function bridgeDelta(F, canon, m, k, idx = BRIDGE_IDX) {
  const c0 = canonCentroid(canon);
  return [0, 1, 2].map((a) => c0[a] + (F[3 * idx + a] * m) / k - canon[3 * idx + a]);
}
