import { FACE_SHAPES } from "./faceShape.js";

// Jenis permintaan konsumen → tampil sebagai filter di dashboard Mitra.
export const CONSULT_CATEGORIES = {
  konsultasi: { label: "Konsultasi", hint: "Frame apa yang cocok dengan wajah saya?" },
  ketersediaan: { label: "Ketersediaan", hint: "Frame ini masih tersedia?" },
  produk: { label: "Pertanyaan Produk", hint: "Ada ukuran / warna lain?" },
  minat_beli: { label: "Minat Membeli", hint: "Saya tertarik dengan frame ini." }
};

export const CONSULT_STATUS = {
  new: { label: "Baru", tone: "amber" },
  contacted: { label: "Dihubungi", tone: "green" },
  closed: { label: "Selesai", tone: "gray" },
  ignored: { label: "Diabaikan", tone: "gray" }
};

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const face = (shape, width, mm) => ({
  shape, width, mm, ratios: null, styles: FACE_SHAPES[shape].styles, source: "ar", at: ago(30)
});

/** Data awal (demo) — sebagian besar berasal dari konsumen guest tanpa akun. */
export function seedConsultations() {
  const row = (n, merchantId, name, wa, category, message, f, frameIds, status, min) => ({
    id: `c${n}`, code: `TL-${48200 + n}`, merchantId, name, whatsapp: wa, identity: "guest",
    category, message, face: f, frameIds, status, createdAt: ago(min)
  });
  return [
    row(1, "m1", "Rina", "6281200011101", "konsultasi", "Menurut TryLens wajah saya cocok frame apa ya?", face("oval", "medium", 136), ["f0", "f6", "f12"], "new", 3),
    row(2, "m1", "Budi", "6281200011102", "ketersediaan", "Frame aviator warna gold masih ada stok? Saya ingin ambil hari Sabtu.", null, ["f0"], "new", 26),
    row(3, "m1", "Citra", "6281200011103", "produk", "Untuk anak usia 7 tahun, ukuran frame yang cocok yang mana ya?", face("round", "small", 121), ["f18"], "new", 74),
    row(4, "m1", "Andi", "6281200011104", "minat_beli", "Saya tertarik dengan frame ini, bisa COD?", null, ["f12", "f6"], "contacted", 60 * 26),
    row(5, "m6", "Sari", "6281200011105", "konsultasi", "Bingung pilih frame untuk dipakai kuliah, bisa dibantu?", face("square", "large", 146), ["f5", "f11"], "new", 8),
    row(6, "m6", "Fajar", "6281200011106", "ketersediaan", "Retro Oval Blue ready stok?", null, ["f5"], "new", 41),
    row(7, "m6", "Maya", "6281200011107", "konsultasi", "Wajah saya panjang, frame yang pas yang mana?", face("oblong", "medium", 134), ["f17", "f23"], "new", 95),
    row(8, "m6", "Yoga", "6281200011108", "minat_beli", "Mau ambil Round Vintage Tortoise, bisa dikirim ke Cimahi?", null, ["f11"], "closed", 60 * 30)
  ];
}
