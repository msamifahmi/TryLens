import { create } from "zustand";
import { persist } from "zustand/middleware";

// Konteks konsultasi milik konsumen, disimpan di perangkatnya sendiri (localStorage).
// Konsultasi berlangsung LANGSUNG lewat WhatsApp optik — TryLens tidak menerima, menyimpan, atau meneruskan
// permintaan. Karena itu tidak ada kotak masuk / aksi kirim di sini; hanya dua hal yang membantu menyusun pesan WhatsApp:
//   viewed — id frame yang terakhir dilihat/dicoba (terbaru di depan)
//   face   — hasil scan/pilihan bentuk wajah terakhir (label + rasio; tidak pernah foto/video)

const MAX_VIEWED = 5;

export const useConsult = create(
  persist(
    (set) => ({
      viewed: [],
      face: null,

      markViewed: (frameId) =>
        set((s) => (s.viewed[0] === frameId ? s : { viewed: [frameId, ...s.viewed.filter((x) => x !== frameId)].slice(0, MAX_VIEWED) })),
      removeViewed: (frameId) => set((s) => ({ viewed: s.viewed.filter((x) => x !== frameId) })),
      setFace: (face) => set({ face }),
      clearFace: () => set({ face: null })
    }),
    {
      name: "trylens-consult",
      version: 2, // v1 juga menyimpan kotak masuk konsultasi (`items`); dibuang saat migrasi
      migrate: (persisted) => ({ viewed: persisted?.viewed ?? [], face: persisted?.face ?? null }),
      partialize: (s) => ({ viewed: s.viewed, face: s.face })
    }
  )
);
