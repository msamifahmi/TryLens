import { create } from "zustand";

export const useFilter = create((set) => ({
  activeCategory: "Semua",
  visibleCount: 12,
  setCategory: (cat) => set({ activeCategory: cat, visibleCount: 12 }),
  loadMore: () => set((s) => ({ visibleCount: s.visibleCount + 8 }))
}));
