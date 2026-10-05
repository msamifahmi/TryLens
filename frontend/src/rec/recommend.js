// Mesin rekomendasi frame TryLens — content-based, transparan, dan berjalan penuh di perangkat.
// Tidak ada data pengguna yang dikirim; sinyalnya hanya hasil scan wajah, frame yang dicoba, dan wishlist.
//
// Skor akhir = rata-rata berbobot dari sinyal yang TERSEDIA (sinyal yang belum ada tidak menghukum produk):
//   style    kecocokan gaya dengan bentuk wajah (urutan saran di FACE_SHAPES)               bobot 0.34
//   width    lebar frame vs lebar wajah (rasio ideal FIT.ideal)                             bobot 0.22
//   affinity kemiripan gaya/warna/toko dengan frame yang dicoba (menurun waktu) & wishlist  bobot 0.22
//   price    kedekatan harga dengan median harga yang pernah dilihat                        bobot 0.06
//   deal     kedalaman diskon                                                               bobot 0.06
//   fresh    produk baru                                                                    bobot 0.04
// Lalu daftar disusun ulang dengan MMR agar tidak berisi gaya/warna yang sama semua.
import { FACE_SHAPES, FACE_WIDTHS } from "../data/faceShape.js";

export const WEIGHTS = { style: 0.34, width: 0.22, affinity: 0.22, price: 0.06, deal: 0.06, fresh: 0.04 };
const PERSONAL = ["style", "width", "affinity", "price"];

// SATU-SATUNYA angka kalibrasi lebar: rasio lebar frame / lebar wajah (landmark pipi) yang dianggap pas.
// Nilai awal dari proporsi model wajah kanonik MediaPipe (frame 146 mm / wajah 153 mm ≈ 0,95).
// Setelah ada data ukur nyata (penggaris vs hasil scan), cukup ubah ini.
export const FIT = { ideal: 0.94, sigma: 0.06, tooSmall: 0.85, tooWide: 1.03 };
const FACE_MM_BY_CLASS = { small: 136, medium: 148, large: 160 }; // untuk pilihan manual / tanpa ukuran
const STYLE_RANK_SCORE = [1, 0.85, 0.7, 0.55];
const MMR_LAMBDA = 0.8;

const FRAME_MM = { round: [128, 138], square: [136, 146], rect: [134, 142], cateye: [138, 146], aviator: [138, 146], browline: [136, 144] };
const MODEL_FRAME_MM = { f0: 146 }; // sama dengan lebar model.glb produk tsb.

const hash01 = (s) => {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

/** Lebar total frame (mm). Pakai product.frameMm bila ada (data asli); sisanya perkiraan deterministik dari gaya. */
export function frameWidthMm(p) {
  if (p.frameMm) return p.frameMm;
  if (MODEL_FRAME_MM[p.id]) return MODEL_FRAME_MM[p.id];
  const [a, b] = FRAME_MM[p.style] || [134, 144];
  return Math.round(a + hash01(p.id) * (b - a) - (p.cat === "Anak" ? 16 : 0));
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function faceMmOf(face, liveMm) {
  if (face?.mm) return face.mm;
  if (liveMm) return liveMm;
  if (face?.width) return FACE_MM_BY_CLASS[face.width];
  return null;
}

function buildTaste(signals) {
  if (!signals.length) return null;
  const tot = signals.reduce((s, x) => s + x.w, 0);
  const frac = (key) => {
    const m = {};
    signals.forEach((x) => (m[x.p[key]] = (m[x.p[key]] || 0) + x.w / tot));
    return m;
  };
  return { style: frac("style"), color: frac("colorKey"), merchant: frac("merchantId"), price: median(signals.map((x) => x.p.price)), n: signals.length };
}

const sim = (a, b) => 0.6 * (a.style === b.style) + 0.3 * (a.colorKey === b.colorKey) + 0.1 * (a.merchantId === b.merchantId);

/**
 * @param products        daftar produk kandidat
 * @param face            hasil scan/pilihan ({shape,width,mm,styles}) atau null
 * @param liveFaceMm      lebar wajah (mm) dari kalibrasi kamera saat try-on (opsional)
 * @param viewed          id frame yang dicoba (terbaru di depan)
 * @param wished          produk di wishlist
 * @param currentId       frame yang sedang dilihat -> dikeluarkan, dipakai juga sebagai sinyal selera
 * @param category        "Pria" | "Wanita" | "Anak" | "Semua"
 */
export function recommend({ products, face = null, liveFaceMm = null, viewed = [], wished = [], currentId = null, category = "Semua", limit = 6, diversify = true, merchantIds = null }) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const signals = [];
  viewed.forEach((id, i) => byId.has(id) && signals.push({ p: byId.get(id), w: 0.8 ** i }));
  wished.forEach((p) => byId.has(p.id) && signals.push({ p: byId.get(p.id), w: 1.2 }));
  if (currentId && byId.has(currentId) && !signals.some((x) => x.p.id === currentId)) signals.unshift({ p: byId.get(currentId), w: 1 });
  const taste = buildTaste(signals);

  const shape = face?.shape && FACE_SHAPES[face.shape] ? FACE_SHAPES[face.shape] : null;
  const styleList = face?.styles?.length ? face.styles : shape?.styles || null;
  const faceMm = faceMmOf(face, liveFaceMm);
  const have = { style: !!styleList, width: !!faceMm, affinity: !!taste, price: !!taste && taste.n >= 2, deal: true, fresh: true };

  const maxOrder = Math.max(...products.map((p) => p.order ?? 0), 1);
  const scored = [];
  for (const p of products) {
    if (p.id === currentId) continue;
    if (merchantIds && !merchantIds.includes(p.merchantId)) continue; // mis. hanya "toko serupa"
    if (category && category !== "Semua" && p.cat !== category) continue;
    const s = {};
    const why = [];
    let caution = null;

    if (have.style) {
      const r = styleList.indexOf(p.style);
      s.style = r < 0 ? 0.15 : STYLE_RANK_SCORE[r] ?? 0.55;
      if (r === 0) why.push([0.34 * s.style, `Gaya ${labelOf(p.style)} paling cocok untuk wajah ${shape.label}`]);
      else if (r > 0) why.push([0.34 * s.style * 0.8, `Gaya ${labelOf(p.style)} cocok untuk wajah ${shape.label}`]);
    }
    const mm = frameWidthMm(p);
    if (have.width) {
      const ratio = mm / faceMm;
      s.width = Math.exp(-0.5 * ((ratio - FIT.ideal) / FIT.sigma) ** 2);
      if (ratio < FIT.tooSmall) caution = "Cenderung terasa kecil di wajahmu";
      else if (ratio > FIT.tooWide) caution = "Cenderung terlalu lebar untuk wajahmu";
      else if (s.width > 0.7) why.push([0.22 * s.width, `Lebar frame ±${mm} mm pas dengan lebar wajahmu`]);
    }
    if (have.affinity) {
      const f = 0.55 * (taste.style[p.style] || 0) + 0.3 * (taste.color[p.colorKey] || 0) + 0.15 * (taste.merchant[p.merchantId] || 0);
      s.affinity = Math.min(1, f);
      if (f >= 0.45) why.push([0.22 * s.affinity, "Mirip frame yang kamu coba atau simpan"]);
    }
    if (have.price) {
      s.price = Math.exp(-0.5 * (Math.log(p.price / taste.price) / 0.25) ** 2);
      if (s.price > 0.8) why.push([0.06 * s.price, "Harganya sesuai yang biasa kamu lihat"]);
    }
    const pct = p.oldPrice ? 1 - p.price / p.oldPrice : 0;
    s.deal = Math.min(1, pct / 0.4);
    if (pct >= 0.2) why.push([0.06 * s.deal, `Diskon ${Math.round(pct * 100)}%`]);
    s.fresh = p.isNew ? 1 : (p.order ?? 0) / maxOrder;
    if (p.isNew) why.push([0.04, "Koleksi baru"]);

    let num = 0, den = 0;
    for (const k of Object.keys(WEIGHTS)) if (have[k]) { num += WEIGHTS[k] * s[k]; den += WEIGHTS[k]; }
    let score = num / den;
    if (viewed.includes(p.id)) score -= 0.04; // sudah pernah dicoba -> dorong yang baru
    why.sort((a, b) => b[0] - a[0]);
    scored.push({ product: p, score: Math.max(0, score), reasons: why.slice(0, 2).map((w) => w[1]), caution, parts: s });
  }

  const personalW = PERSONAL.reduce((t, k) => t + (have[k] ? WEIGHTS[k] : 0), 0) / PERSONAL.reduce((t, k) => t + WEIGHTS[k], 0);
  scored.sort((a, b) => b.score - a.score || a.product.order - b.product.order);

  let out = scored;
  if (diversify) {
    out = [];
    const pool = [...scored];
    while (out.length < limit && pool.length) {
      let bi = 0, bv = -Infinity;
      pool.forEach((c, i) => {
        const pen = out.length ? Math.max(...out.map((o) => sim(c.product, o.product))) : 0;
        const v = MMR_LAMBDA * c.score - (1 - MMR_LAMBDA) * pen;
        if (v > bv) { bv = v; bi = i; }
      });
      out.push(pool.splice(bi, 1)[0]);
    }
  }
  return {
    items: out.slice(0, limit).map((x) => ({ ...x, percent: Math.round(x.score * 100) })),
    confidence: personalW, // 0 = tanpa data pribadi (hanya populer), 1 = semua sinyal tersedia
    basis: { face: !!(styleList), width: !!faceMm, history: !!taste }
  };
}

function labelOf(style) {
  return { aviator: "Aviator", round: "Round", square: "Square", cateye: "Cat Eye", rect: "Minimalist", browline: "Browline" }[style] || style;
}

/** Urutan penuh (tanpa MMR) untuk fitur "Urutkan: Paling cocok". Mengembalikan Map id -> {percent, reasons, caution}. */
export function scoreAll(args) {
  const r = recommend({ ...args, limit: 1e9, diversify: false });
  return { map: new Map(r.items.map((x) => [x.product.id, x])), confidence: r.confidence, basis: r.basis };
}
export { FACE_WIDTHS };
