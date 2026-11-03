// Ensemble "uji-balik" (flip test-time augmentation) untuk keluaran Face Landmarker — fungsi murni, bisa diuji di Node.
//
// Gagasan: jaringan yang sama dijalankan DUA kali — pada bingkai asli dan bingkai yang dicerminkan. Kesalahan jaringan pada
// wajah asli dan wajah cermin tidak persis sama (bias kecil yang bergantung arah), jadi rata-rata kedua hasil (setelah titik
// cermin dipetakan kembali) menurunkan galat acak. Selisih keduanya adalah pengukur ketidakpastian yang nyata, diukur dari
// jaringan itu sendiri — dipakai untuk menaksir ketepatan hasil scan (±mm) dan menolak frame yang jaringannya "ragu".
//
// Catatan jujur: ini memperbaiki derau/bias acak jaringan; TIDAK memperbaiki kesalahan sistematis yang sama pada kedua versi
// (mis. mesh yang memang berhenti di bawah garis rambut).
const dist = (a, b, W, H) => Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);
const medianOf = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const IRIS_R = { c: 468, ring: [469, 470, 471, 472] };
export const IRIS_L = { c: 473, ring: [474, 475, 476, 477] };
export const KEY_PTS = [234, 454, 10, 152, 33, 263, 1, 61, 291, 168]; // titik yang dilaporkan sebagai ketidakpastian

/**
 * Peta cermin indeks landmark. Mesh kanonik simetris sempurna terhadap x → 0, jadi tiap titik punya pasangan cermin
 * (dicari sebagai titik terdekat dari posisi yang dicerminkan). Pusat iris dipasangkan 468 ↔ 473; titik cincin iris tidak dipetakan (−1).
 */
export function buildMirrorMap(canon, n = 468) {
  const M = new Int32Array(478).fill(-1);
  for (let i = 0; i < n; i++) {
    let best = -1, bd = Infinity;
    const x = -canon[3 * i], y = canon[3 * i + 1], z = canon[3 * i + 2];
    for (let j = 0; j < n; j++) {
      const d = (canon[3 * j] - x) ** 2 + (canon[3 * j + 1] - y) ** 2 + (canon[3 * j + 2] - z) ** 2;
      if (d < bd) { bd = d; best = j; }
    }
    M[i] = Math.sqrt(bd) < 0.15 ? best : -1; // pasangan harus benar-benar bercermin (<1,5 mm)
  }
  M[IRIS_R.c] = IRIS_L.c;
  M[IRIS_L.c] = IRIS_R.c;
  return M;
}

const irisDiameter = (lm, iris, W, H) => (dist(lm[iris.ring[0]], lm[iris.ring[2]], W, H) + dist(lm[iris.ring[1]], lm[iris.ring[3]], W, H)) / 2;

/**
 * lm  : landmark bingkai asli (478, ternormalisasi) · lmF : landmark dari bingkai TERCERMIN (juga ternormalisasi terhadap bingkai itu).
 * Hasil: { ok, lm (gabungan), unc } — ok=false bila kedua deteksi tak sepakat (mis. wajah berbeda) → pakai lm asli.
 * unc  : { keyPx, meshPx (median selisih), rel (meshPx / lebar wajah), irisRel, n }.
 */
export function fuseFlip(lm, lmF, W, H, M) {
  if (!lm || !lmF || lm.length < 478 || lmF.length < 478) return { ok: false, lm, unc: null };
  const faceW = dist(lm[234], lm[454], W, H) || 1;
  const est = new Array(478);
  const dis = new Float64Array(478).fill(NaN);
  for (let i = 0; i < 478; i++) {
    const j = M[i];
    if (j < 0) continue;
    est[i] = { x: 1 - lmF[j].x, y: lmF[j].y, z: lmF[j].z };
    dis[i] = dist(lm[i], est[i], W, H);
  }
  const mesh = [];
  for (let i = 0; i < 468; i++) if (!Number.isNaN(dis[i])) mesh.push(dis[i]);
  if (mesh.length < 400) return { ok: false, lm, unc: null };
  const meshPx = medianOf(mesh);
  if (meshPx / faceW > 0.04) return { ok: false, lm, unc: { meshPx, rel: meshPx / faceW, keyPx: null, irisRel: null, n: 0 } }; // deteksi kedua tidak cocok

  const out = lm.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  const cap = faceW * 0.06; // selisih lokal besar = jaringan kedua gagal di titik itu → percaya bingkai asli
  for (let i = 0; i < 478; i++) {
    if (Number.isNaN(dis[i]) || dis[i] > cap) continue;
    out[i] = { x: (lm[i].x + est[i].x) / 2, y: (lm[i].y + est[i].y) / 2, z: (lm[i].z + est[i].z) / 2 };
  }
  // Iris: pusat sudah digabung di atas; cincin ikut bergeser, diameter = rata-rata iris asli & iris pasangannya di bingkai cermin.
  let irisRel = 0;
  for (const [a, b] of [[IRIS_R, IRIS_L], [IRIS_L, IRIS_R]]) {
    const dA = irisDiameter(lm, a, W, H), dB = irisDiameter(lmF, b, W, H);
    if (!(dA > 0 && dB > 0) || Math.abs(dA - dB) / ((dA + dB) / 2) > 0.3) continue;
    irisRel = Math.max(irisRel, Math.abs(dA - dB) / ((dA + dB) / 2));
    const f = (dA + dB) / 2 / dA;
    const c0 = lm[a.c], c1 = out[a.c];
    for (const k of a.ring) {
      out[k] = { x: c1.x + (lm[k].x - c0.x) * f, y: c1.y + (lm[k].y - c0.y) * f, z: lm[k].z + (c1.z - c0.z) };
    }
  }
  const key = KEY_PTS.map((i) => dis[i]).filter((v) => !Number.isNaN(v));
  return { ok: true, lm: out, unc: { meshPx, rel: meshPx / faceW, keyPx: key.length ? key.reduce((s, v) => s + v, 0) / key.length : meshPx, irisRel, n: mesh.length } };
}
