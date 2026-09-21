import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedConsultations } from "../data/consultMock.js";

// Kotak masuk konsultasi bersama: konsumen (tanpa akun) mengirim, Mitra membaca.
// Sementara disimpan di localStorage; nanti diganti API + tabel `consultations` (lihat schema.sql).
// Yang disimpan dari scan wajah hanya hasil (bentuk, proporsi, gaya), tidak pernah foto/video.

const MAX_VIEWED = 5;

export const useConsult = create(
  persist(
    (set, get) => ({
      items: seedConsultations(),
      viewed: [], // id frame yang terakhir dilihat/dicoba konsumen (terbaru di depan)
      face: null, // hasil scan/pilihan bentuk wajah terakhir

      markViewed: (frameId) =>
        set((s) => (s.viewed[0] === frameId ? s : { viewed: [frameId, ...s.viewed.filter((x) => x !== frameId)].slice(0, MAX_VIEWED) })),
      removeViewed: (frameId) => set((s) => ({ viewed: s.viewed.filter((x) => x !== frameId) })),
      setFace: (face) => set({ face }),
      clearFace: () => set({ face: null }),

      /** Kirim permintaan ke optik. Mengembalikan item (berisi kode konsultasi). */
      submit: ({ merchantId, name, whatsapp, category, message, frameIds, includeFace }) => {
        const n = get().items.length + 1;
        const item = {
          id: `c${Date.now().toString(36)}${n}`,
          code: `TL-${String(Math.floor(10000 + Math.random() * 89999))}`,
          merchantId,
          name: name.trim(),
          whatsapp,
          identity: "guest",
          category,
          message: message.trim(),
          face: includeFace ? get().face : null,
          frameIds,
          status: "new",
          createdAt: new Date().toISOString()
        };
        set((s) => ({ items: [item, ...s.items] }));
        return item;
      },

      setStatus: (id, status) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, status } : i)) }))
    }),
    { name: "trylens-consult", version: 1 }
  )
);

/** Normalisasi nomor WhatsApp Indonesia → 62xxxxxxxxxx (null bila tidak valid). */
export function normalizeWa(input) {
  let d = String(input).replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^628\d{7,12}$/.test(d) ? d : null;
}
