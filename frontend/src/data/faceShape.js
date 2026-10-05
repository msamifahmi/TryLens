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

/** Median setelah membuang pencilan (>3 MAD). cv = sebaran relatif -> dasar tingkat kepercayaan. */
function robust(values) {
  const m = median(values);
  const mad = median(values.map((v) => Math.abs(v - m))) * 1.4826;
  const kept = values.filter((v) => Math.abs(v - m) <= 3 * mad + 1e-9);
  return { value: median(kept), n: kept.length, cv: m ? mad / Math.abs(m) : 0 };
}

/** Gabungkan banyak sampel (median robust) → hasil akhir yang disimpan. Sampel dari ar/PoseEngine (frame.lenR, jawR, foreR, mm, pd). */
export function summarizeSamples(samples) {
  const L = robust(samples.map((s) => s.lenR));
  const J = robust(samples.map((s) => s.jawR));
  const F = robust(samples.map((s) => s.foreR));
  const ratios = { lenR: L.value, jawR: J.value, foreR: F.value };
  const mmv = samples.map((s) => s.mm).filter((v) => v != null);
  const pdv = samples.map((s) => s.pd).filter((v) => v != null);
  const mm = mmv.length ? robust(mmv).value : null;
  const pd = pdv.length ? robust(pdv).value : null;
  const spread = Math.max(L.cv, J.cv, F.cv);
  const confidence = samples.length >= 20 && spread < 0.02 ? "high" : samples.length >= 12 && spread < 0.05 ? "medium" : "low";
  const shape = classifyRatios(ratios);
  return {
    shape,
    width: widthClass(mm),
    mm: mm ? Math.round(mm) : null,
    pd: pd ? Math.round(pd) : null,
    confidence,
    ratios: { lenR: +ratios.lenR.toFixed(2), jawR: +ratios.jawR.toFixed(2), foreR: +ratios.foreR.toFixed(2) },
    styles: FACE_SHAPES[shape].styles,
    source: "ar",
    at: new Date().toISOString()
  };
}

/** Hasil pilihan manual (tanpa kamera). Ditandai source:"manual" agar tidak disebut hasil AR. */
export function manualResult(shape, width = "medium") {
  return { shape, width, mm: null, ratios: null, styles: FACE_SHAPES[shape].styles, source: "manual", at: new Date().toISOString() };
}
