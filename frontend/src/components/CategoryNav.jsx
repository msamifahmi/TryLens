import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useFilter } from "../store/useFilter.js";

const ITEMS = [
  { label: "Semua Frame", cat: "Semua" },
  { label: "Frame Pria", cat: "Pria" },
  { label: "Frame Wanita", cat: "Wanita" },
  { label: "Frame Anak", cat: "Anak" },
  { label: "Frame Baru", cat: "Semua" },
  { label: "Promo", cat: "Promo" },
  { label: "Toko Optik", cat: "__merchant__" }
];

export default function CategoryNav({ onJumpToFeed, onJumpToMerchant }) {
  const [active, setActive] = useState(0);
  const setCategory = useFilter((s) => s.setCategory);
  const { pathname } = useLocation();
  // Tab "Toko Optik" menyala di halaman Mitra & halaman toko; tab lain padam di sana.
  const inMerchantArea = pathname.startsWith("/mitra") || pathname.startsWith("/toko");

  function handleClick(idx, item) {
    setActive(idx);
    if (item.cat === "__merchant__") {
      onJumpToMerchant?.();
      return;
    }
    setCategory(item.cat);
    onJumpToFeed?.();
  }

  return (
    <nav className="bg-white border-b border-border" aria-label="Kategori frame">
      <div className="max-w-[1280px] mx-auto px-5">
        <div className="flex gap-7 overflow-x-auto scrollbar-none py-3">
          {ITEMS.map((item, idx) => (
            <button
              key={item.label}
              onClick={() => handleClick(idx, item)}
              className={`text-sm font-semibold whitespace-nowrap pb-2.5 border-b-2 flex-shrink-0 ${
                (item.cat === "__merchant__" ? inMerchantArea : !inMerchantArea && active === idx)
                  ? "text-blue border-blue"
                  : "text-ink-muted border-transparent hover:text-ink-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
