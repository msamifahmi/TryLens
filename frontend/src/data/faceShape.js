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

/** Ukur satu frame landmark (koordinat ternormalisasi 0–1; w,h = ukuran video piksel). */
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

export function widthClass(mm) {
  if (mm == null) return "medium";
  if (mm < 128) return "small";
  if (mm <= 142) return "medium";
  return "large";
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Gabungkan banyak sampel (median) → hasil akhir yang disimpan. */
export function summarizeSamples(samples) {
  const pick = (k) => median(samples.map((s) => s[k]));
  const ratios = { lenR: pick("lenR"), jawR: pick("jawR"), foreR: pick("foreR") };
  const mms = samples.map((s) => s.mm).filter((v) => v != null);
  const mm = mms.length ? median(mms) : null;
  const shape = classifyRatios(ratios);
  return {
    shape,
    width: widthClass(mm),
    mm: mm ? Math.round(mm) : null,
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
