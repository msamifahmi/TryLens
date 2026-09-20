import { create } from "zustand";

export const useFilter = create((set) => ({
  activeCategory: "Semua",
  activeStyle: null, // key gaya frame (mis. "aviator"); diisi dari menu Jelajahi
  visibleCount: 12,
  // Ganti kategori = mulai tampilan baru, jadi filter gaya ikut dibersihkan.
  setCategory: (cat) => set({ activeCategory: cat, activeStyle: null, visibleCount: 12 }),
  setView: (cat, style = null) => set({ activeCategory: cat, activeStyle: style, visibleCount: 12 }),
  clearStyle: () => set({ activeStyle: null, visibleCount: 12 }),
  loadMore: () => set((s) => ({ visibleCount: s.visibleCount + 8 }))
}));
