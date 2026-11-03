// Garis rambut (batas dahi) dari PIKSEL video — fungsi murni, tidak memakai DOM supaya bisa diuji di Node.
//
// Masalah: Face Landmarker menggambar mesh sampai "oval wajah" (landmark 10), bukan sampai garis rambut. Pada dahi tinggi,
// atau saat poni/rambut menutup, titik 10 meleset dari dahi yang sebenarnya → label "Dahi" tampak salah tempat dan rasio
// panjang wajah terlalu kecil. Model jaringan tidak mengeluarkan garis rambut, jadi diukur dari warna:
//   1. warna kulit acuan = median beberapa petak kulit (pipi, batang hidung, dahi bawah) di ruang YCbCr;
//   2. dari landmark 10 berjalan ke atas (searah dagu→dahi) dan mencari tempat jarak warna dari kulit melonjak
//      (rambut lebih gelap / kroma lain) dan bertahan ≥3 langkah;
//   3. hasilnya dibatasi (maks 55% panjang wajah dari 10 ke dagu) dan diberi tingkat kepercayaan. Gagal → null,
//      pemanggil memakai perkiraan statistik.
//
// Keterbatasan (jujur): kepala botak / dahi sama terang dengan latar → tidak terdeteksi; poni yang menutup dahi sampai di bawah
// landmark 10 → `covered`. Ini heuristik warna, BUKAN model pembelajaran mesin.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** RGB → [Y, Cb, Cr] (BT.601, 0–255). */
export function ycc(r, g, b) {
  return [0.299 * r + 0.587 * g + 0.114 * b, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b];
}

/** Sampel bilinear gambar {data,w,h} pada piksel (x,y) → [r,g,b]; di luar bingkai = null. */
export function pixelAt(img, x, y) {
  const { data, w, h } = img;
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return null;
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  const o = (xx, yy) => (yy * w + xx) * 4;
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const a = data[o(x0, y0) + c] * (1 - fx) + data[o(x1, y0) + c] * fx;
    const b = data[o(x0, y1) + c] * (1 - fx) + data[o(x1, y1) + c] * fx;
    out[c] = a * (1 - fy) + b * fy;
  }
  return out;
}

const medianOf = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Rata-rata petak (2r+1)² di sekitar (x,y) → YCbCr, atau null bila keluar bingkai. */
function patch(img, x, y, r) {
  let sy = 0, sb = 0, sr = 0, n = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const p = pixelAt(img, x + dx, y + dy);
    if (!p) continue;
    const [Y, Cb, Cr] = ycc(p[0], p[1], p[2]);
    sy += Y; sb += Cb; sr += Cr; n++;
  }
  return n ? [sy / n, sb / n, sr / n] : null;
}

/** Jarak warna terhadap acuan kulit (satuan kira-kira "tingkat keabuan"): kecerahan dibobot 0,6, kroma 1,0. */
const colorDist = (c, ref) => 0.6 * Math.abs(c[0] - ref[0]) + Math.abs(c[1] - ref[1]) + Math.abs(c[2] - ref[2]);

/**
 * img     : { data: Uint8ClampedArray RGBA, w, h } — bingkai video apa adanya (TIDAK dicerminkan).
 * lm      : landmark ternormalisasi (indeks 0..467 dipakai) — koordinat bingkai video.
 * Hasil   : { ok, topPx:[x,y], extraPx (jarak dari landmark 10, px), extraR (extraPx / panjang 10→152), conf 0–1, covered, why }
 */
export function detectHairline(img, lm) {
  const W = img.w, H = img.h;
  const P = (i) => [lm[i].x * W, lm[i].y * H];
  const top = P(10), chin = P(152);
  const L = Math.hypot(top[0] - chin[0], top[1] - chin[1]);
  if (!(L > 40)) return { ok: false, why: "wajah terlalu kecil" };
  const up = [(top[0] - chin[0]) / L, (top[1] - chin[1]) / L]; // arah dagu → dahi di gambar (ikut miring kepala)
  const side = [-up[1], up[0]];
  const wFace = Math.hypot(P(454)[0] - P(234)[0], P(454)[1] - P(234)[1]);
  const pr = Math.max(1, Math.round(L * 0.018)); // radius petak

  // 1) Warna kulit acuan: pipi, batang hidung, dahi bawah (di dalam mesh), tanpa area mata/bibir.
  const refIdx = [50, 280, 205, 425, 6, 197, 9, 151, 108, 337];
  const cheeks = refIdx.slice(0, 6), foreheadPts = refIdx.slice(6);
  const samples = [];
  for (const i of cheeks) { const p = P(i), c = patch(img, p[0], p[1], pr); if (c) samples.push(c); }
  if (samples.length < 4) return { ok: false, why: "acuan kulit kurang" };
  const ref = [0, 1, 2].map((k) => medianOf(samples.map((s) => s[k])));
  const refSpread = medianOf(samples.map((s) => colorDist(s, ref)));

  // Dahi bawah sudah berbeda jauh dari kulit pipi → poni/rambut menutup dahi: garis rambut ada DI BAWAH landmark 10.
  const fh = foreheadPts.map((i) => { const p = P(i), c = patch(img, p[0], p[1], pr); return c ? colorDist(c, ref) : null; }).filter((v) => v != null);
  const fhMed = fh.length ? medianOf(fh) : 0;
  const noise = Math.max(5, refSpread * 1.8);
  const thr = Math.max(20, noise * 3);
  if (fhMed > thr * 1.15) return { ok: true, covered: true, conf: 0.2, extraPx: 0, extraR: 0, topPx: top, why: "dahi tertutup rambut/poni" };

  // 2) Berjalan ke atas dari titik 10 − 0,10·L (di dalam wajah) sampai +0,55·L; profil = rata-rata 5 sampel melintang (lebar ±9% wajah).
  const step = Math.max(1, L * 0.012);
  const start = -0.1 * L, end = 0.55 * L;
  const prof = [];
  for (let t = start; t <= end; t += step) {
    let acc = 0, n = 0;
    for (let s = -2; s <= 2; s++) {
      const off = (s / 2) * 0.09 * wFace;
      const p = pixelAt(img, top[0] + up[0] * t + side[0] * off, top[1] + up[1] * t + side[1] * off);
      if (!p) continue;
      acc += colorDist(ycc(p[0], p[1], p[2]), ref); n++;
    }
    prof.push({ t, d: n ? acc / n : null });
  }
  // 3) Titik pertama yang melewati ambang dan bertahan ≥3 langkah (≈3,6% panjang wajah).
  let hit = -1;
  for (let i = 0; i < prof.length - 3; i++) {
    if (prof[i].t < 0) continue; // dahi di bawah landmark 10 tidak dicari di sini
    if ([0, 1, 2].every((k) => prof[i + k].d != null && prof[i + k].d > thr)) { hit = i; break; }
  }
  if (hit < 0) {
    // Tidak ada perubahan warna dalam 55% panjang wajah: dahi sangat tinggi / botak / latar cerah → tak bisa disimpulkan.
    const reached = prof.length && prof[prof.length - 1].d != null;
    return { ok: false, why: reached ? "tidak ada batas warna" : "keluar bingkai" };
  }
  // Halus: mundur ke langkah terakhir yang masih dekat kulit (tepi transisi, bukan tengah rambut).
  let edge = hit;
  while (edge > 0 && prof[edge - 1].t >= 0 && prof[edge - 1].d > thr * 0.55) edge--;
  const t = clamp(prof[edge].t, 0, 0.55 * L);
  const contrast = clamp((prof[hit].d - thr) / (thr * 1.5), 0, 1);
  const conf = clamp(0.45 + 0.4 * contrast + (refSpread < thr * 0.35 ? 0.15 : 0), 0, 1);
  return { ok: true, covered: false, conf, extraPx: t, extraR: t / L, topPx: [top[0] + up[0] * t, top[1] + up[1] * t], L };
}

/**
 * Perkiraan bila deteksi warna gagal: rata-rata antropometri — garis rambut ±0,09 panjang (10→152) di atas landmark 10 (kisaran 0–0,2).
 * Diberi label "perkiraan" di UI.
 */
export const DEFAULT_EXTRA_R = 0.09;
