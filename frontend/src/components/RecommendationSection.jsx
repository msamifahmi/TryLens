import { useMemo, useRef } from "react";
import { PRODUCTS } from "../data/mockData.js";
import { useFilter } from "../store/useFilter.js";
import ProductCard from "./ProductCard.jsx";

const TABS = [
  { label: "Semua", value: "Semua" },
  { label: "Frame Pria", value: "Pria" },
  { label: "Frame Wanita", value: "Wanita" },
  { label: "Frame Anak", value: "Anak" },
  { label: "Promo", value: "Promo" }
];

export default function RecommendationSection({ id, onTryOn, showToast, cardRefs, onOpenDetail }) {
  const activeCategory = useFilter((s) => s.activeCategory);
  const setCategory = useFilter((s) => s.setCategory);
  const visibleCount = useFilter((s) => s.visibleCount);
  const loadMore = useFilter((s) => s.loadMore);

  const filtered = useMemo(() => {
    if (activeCategory === "Semua") return PRODUCTS;
    if (activeCategory === "Promo") return PRODUCTS.filter((p) => !!p.oldPrice);
    return PRODUCTS.filter((p) => p.cat === activeCategory);
  }, [activeCategory]);

  const shown = filtered.slice(0, visibleCount);

  return (
    <section id={id} className="max-w-[1280px] mx-auto px-5 py-7">
      <div className="mb-4">
        <h2 className="text-[21px] font-bold text-ink tracking-tight mb-1">Koleksi Frame Terbaru</h2>
        <p className="text-[13.5px] text-ink-muted m-0">Pilihan untukmu, disesuaikan dengan tren minggu ini.</p>
      </div>

      <div className="sticky top-[60px] md:top-[68px] bg-[#F5F7FA] z-20 py-2.5 flex items-center justify-between gap-4 flex-wrap mb-4">
        <div className="flex gap-5 overflow-x-auto scrollbar-none" role="tablist" aria-label="Filter kategori produk">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeCategory === tab.value}
              onClick={() => setCategory(tab.value)}
              className={`text-sm font-semibold whitespace-nowrap pb-2 border-b-2 flex-shrink-0 ${
                activeCategory === tab.value ? "text-blue border-blue" : "text-ink-muted border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-[13px] text-ink-muted flex-shrink-0" aria-live="polite">{filtered.length} frame</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {shown.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onTryOn={onTryOn}
            showToast={showToast}
            onOpenDetail={onOpenDetail}
            cardRef={(el) => {
              if (cardRefs) cardRefs.current[p.id] = el;
            }}
          />
        ))}
      </div>

      {visibleCount < filtered.length && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            className="h-11 px-6 rounded-[10px] border-[1.5px] border-border bg-white text-ink-text font-bold text-sm hover:border-blue hover:text-blue"
          >
            Muat lebih banyak
          </button>
        </div>
      )}
    </section>
  );
}
