import { create } from "zustand";

const STORAGE_KEY = "trylens_wishlist";

function loadInitial() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export const useWishlist = create((set, get) => ({
  items: loadInitial(),

  isWished: (id) => !!get().items[id],

  count: () => Object.keys(get().items).length,

  toggle: (product, onToast) => {
    const items = { ...get().items };
    const wasWished = !!items[product.id];
    if (wasWished) {
      delete items[product.id];
    } else {
      items[product.id] = true;
    }
    set({ items });
    persist(items);
    if (onToast) {
      onToast(
        wasWished ? "Frame dihapus dari wishlist" : "Frame ditambahkan ke wishlist",
        !wasWished
      );
    }
  },

  remove: (id, onToast) => {
    const items = { ...get().items };
    delete items[id];
    set({ items });
    persist(items);
    if (onToast) onToast("Frame dihapus dari wishlist", false);
  }
}));
