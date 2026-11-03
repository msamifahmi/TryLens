// Analisis bentuk wajah dari titik landmark MediaPipe Face Landmarker (478 titik).
// Semua hitungan dilakukan di perangkat pengguna; yang disimpan/dikirim hanya angka & label, bukan foto/video.
//
// CATATAN AKURASI: ambang batas di classifyRatios() adalah aturan heuristik dari proporsi wajah umum,
// belum dikalibrasi dengan dataset wajah nyata. Perlakukan hasilnya sebagai ESTIMASI awal untuk membantu
// percakapan dengan optik — penilaian akhir tetap oleh optik.

export const FACE_SHAPES = {
  oval: { label: "Oval", desc: "Proporsi seimbang; hampir semua gaya frame cocok.", styles: ["square", "rect", "browline", "aviator"] },
  round: { label: "Bulat", desc: "Lebar dan tinggi hampir sama; frame bersudut memberi kesan lebih tegas.", styles: ["square", "rect", "browline"] },
  square: { label: "Persegi", desc: "Rahang tegas; frame melengkung melunakkan garis wajah.", styles: ["round", "aviator", "cateye"] },
  heart: { label: "Hati", desc: "Dahi lebih lebar dari dagu; frame ringan dengan bagian bawah lebar seimbang.", styles: ["aviator", "round", "rect"] },
  oblong: { label: "Lonjong", desc: "Wajah lebih panjang; frame lebar dan tinggi menyeimbangkan proporsi.", styles: ["browline", "square", "round"] }
};

export const FACE_WIDTHS = { small: "Kecil", medium: "Sedang", large: "Lebar" };

// Indeks landmark MediaPipe Face Mesh
export const LM = { top: 10, chin: 152, cheekL: 234, cheekR: 454, jawL: 172, jawR: 397, foreL: 54, foreR: 284, nose: 1, irisR: 468, irisL: 473 };

const dist = (a, b, w, h) => Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);

/** [LAMA, tidak dipakai lagi] Ukur 2D dengan asumsi PD 63 mm. Gantinya: ar/PoseEngine (3D, un-rotate, skala iris). */
export function measureFace(lm, w, h) {
  const cheek = dist(lm[LM.cheekL], lm[LM.cheekR], w, h);
  if (!cheek) return null;
  const m = {
    lenR: dist(lm[LM.top], lm[LM.chin], w, h) / cheek,
    jawR: dist(lm[LM.jawL], lm[LM.jawR], w, h) / cheek,
    foreR: dist(lm[LM.foreL], lm[LM.foreR], w, h) / cheek,
    // Kemiringan kepala: jarak hidung ke pipi kiri vs kanan (1 = menghadap lurus)
    frontal: (() => {
      const l = dist(lm[LM.nose], lm[LM.cheekL], w, h);
      const r = dist(lm[LM.nose], lm[LM.cheekR], w, h);
      return Math.min(l, r) / Math.max(l, r);
    })(),
    mm: null
  };
  if (lm.length >= 478) {
    const ipd = dist(lm[LM.irisR], lm[LM.irisL], w, h);
    // Jarak pupil rata-rata dewasa ±63 mm dipakai sebagai skala; hasilnya perkiraan kasar (±10%).
    if (ipd) m.mm = (cheek / ipd) * 63;
  }
  return m;
}

export function classifyRatios({ lenR, jawR, foreR }) {
  if (lenR >= 1.5) return "oblong";
  if (lenR < 1.25) return jawR >= 0.88 ? "square" : "round";
  if (foreR - jawR >= 0.15) return "heart";
  if (jawR >= 0.9) return "square";
  return "oval";
}

// Ambang selaras dengan pengukuran berbasis iris (lebar landmark pipi 234–454; model kanonik ≈ 153 mm).
// Titik tengah kelas: kecil 136 / sedang 148 / lebar 160 mm (lihat FACE_MM_BY_CLASS di rec/recommend.js).
// BELUM dikalibrasi dengan ukuran manusia nyata — ukur ±20 orang dengan penggaris untuk menyetel angka ini.
export function widthClass(mm) {
  if (mm == null) return "medium";
  if (mm < 142) return "small";
  if (mm <= 154) return "medium";
  return "large";
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Median setelah membuang pencilan (>2,5 MAD), lalu rata-rata terpangkas berbobot. `w` = bobot keandalan tiap sampel (0–1, opsional):
 * frame yang taksiran skalanya tidak sepakat / iris tidak simetris berbobot kecil. cv = sebaran relatif -> dasar tingkat kepercayaan.
 */
function robust(values, w = null) {
  const m = median(values);
  const mad = median(values.map((v) => Math.abs(v - m))) * 1.4826;
  const idx = values.map((_, i) => i).filter((i) => Math.abs(values[i] - m) <= 2.5 * mad + 1e-9);
  const kept = idx.map((i) => values[i]);
  // Rata-rata terpangkas (15% tiap ujung) dari sampel yang lolos: lebih mulus daripada median murni, tetap kebal pencilan.
  const order = idx.sort((a, b) => values[a] - values[b]);
  const cut = Math.floor(order.length * 0.15);
  const core = order.slice(cut, order.length - cut || undefined);
  let mean;
  if (core.length) {
    let sw = 0, sv = 0;
    for (const i of core) { const wi = w ? Math.max(0.05, w[i] ?? 1) : 1; sw += wi; sv += wi * values[i]; }
    mean = sv / sw;
  } else mean = median(kept);
  const sd = Math.sqrt(kept.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, kept.length));
  return { value: mean, n: kept.length, cv: m ? mad / Math.abs(m) : 0, sd };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * Gabungkan banyak sampel (rata-rata terpangkas berbobot) → hasil akhir yang disimpan. Sampel dari ar/PoseEngine
 * (frame.lenR, jawR, foreR, mm, pd, rel) + opsional ttaMm (selisih dua deteksi jaringan, mm).
 * opts: { level (tingkat toleransi scan 0–2), hair ({extraR, conf} dari ar/hairline.js) }.
 */
export function summarizeSamples(samples, opts = {}) {
  const w = samples.map((s) => s.rel ?? 1);
  const L = robust(samples.map((s) => s.lenR), w);
  const J = robust(samples.map((s) => s.jawR), w);
  const F = robust(samples.map((s) => s.foreR), w);
  const ratios = { lenR: L.value, jawR: J.value, foreR: F.value };
  const mmIdx = samples.map((s, i) => (s.mm != null ? i : -1)).filter((i) => i >= 0);
  const pdIdx = samples.map((s, i) => (s.pd != null ? i : -1)).filter((i) => i >= 0);
  const mmR = mmIdx.length ? robust(mmIdx.map((i) => samples[i].mm), mmIdx.map((i) => w[i])) : null;
  const pdR = pdIdx.length ? robust(pdIdx.map((i) => samples[i].pd), pdIdx.map((i) => w[i])) : null;
  const mm = mmR ? mmR.value : null;
  const pd = pdR ? pdR.value : null;
  const spread = Math.max(L.cv, J.cv, F.cv);
  const level = opts.level ?? 0;
  let confidence = samples.length >= 36 && spread < 0.02 ? "high" : samples.length >= 20 && spread < 0.05 ? "medium" : "low";
  if (level >= 2 && confidence === "high") confidence = "medium"; // toleransi paling longgar → jangan klaim "tinggi"

  // Ketidakpastian teknik: selisih dua deteksi jaringan (ensemble cermin) pada titik kunci, dalam mm.
  const tta = samples.map((s) => s.ttaMm).filter((v) => Number.isFinite(v));
  const ttaMm = tta.length ? median(tta) : null;
  // Galat perkiraan (±mm, ±95%): sebaran antar-sampel, ketidakpastian ukuran iris manusia (±4,5%) sebagai penggaris,
  // dan (bila ada) selisih dua deteksi jaringan.
  const errOf = (v, r) => (v ? Math.max(2, Math.ceil(Math.hypot(0.045 * v, (1.96 * (r?.sd || 0)) / Math.sqrt(Math.max(1, r?.n || 1)), ttaMm ? ttaMm * 1.5 : 0))) : null);

  // Skor keandalan 0–100 (BUKAN peluang kebenaran): jumlah sampel, kekompakan, kesepakatan dua deteksi, kualitas pose per frame.
  const relMean = w.reduce((a, b) => a + b, 0) / Math.max(1, w.length);
  const sCount = clamp01(samples.length / 45), sSpread = 1 - clamp01(spread / 0.06);
  const sTta = tta.length ? 1 - clamp01((median(samples.map((s) => s.meshRel).filter(Number.isFinite)) || 0) / 0.01) : 0.65;
  const score = Math.round(100 * (0.2 * sCount + 0.3 * sSpread + 0.25 * sTta + 0.25 * clamp01(relMean)) * (level >= 2 ? 0.9 : 1));

  // Tinggi wajah sampai garis rambut (bukan sampai oval mesh): hanya dilaporkan, klasifikasi bentuk tetap memakai rasio mesh.
  const hair = opts.hair && opts.hair.conf >= 0.5 ? opts.hair : null;
  const shape = classifyRatios(ratios);
  return {
    shape,
    width: widthClass(mm),
    mm: mm ? Math.round(mm) : null,
    pd: pd ? Math.round(pd) : null,
    mmErr: errOf(mm, mmR),
    pdErr: errOf(pd, pdR),
    confidence,
    accuracy: { score, n: samples.length, ensemble: tta.length > 0, ttaMm: ttaMm != null ? +ttaMm.toFixed(2) : null, spreadPct: +(spread * 100).toFixed(1), level, hairline: !!hair },
    ratios: {
      lenR: +ratios.lenR.toFixed(2), jawR: +ratios.jawR.toFixed(2), foreR: +ratios.foreR.toFixed(2),
      ...(hair ? { lenFullR: +(ratios.lenR * (1 + hair.extraR)).toFixed(2) } : {})
    },
    styles: FACE_SHAPES[shape].styles,
    source: "ar",
    at: new Date().toISOString()
  };
}

/** Hasil pilihan manual (tanpa kamera). Ditandai source:"manual" agar tidak disebut hasil AR. */
export function manualResult(shape, width = "medium") {
  return { shape, width, mm: null, ratios: null, styles: FACE_SHAPES[shape].styles, source: "manual", at: new Date().toISOString() };
}
