import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS, STYLE_LABELS } from "../data/mockData.js";
import { useFilter } from "../store/useFilter.js";
import ProductCard from "./ProductCard.jsx";
import { useMatchScores } from "../rec/useRecommendations.js";

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
  const activeStyle = useFilter((s) => s.activeStyle);
  const clearStyle = useFilter((s) => s.clearStyle);
  const visibleCount = useFilter((s) => s.visibleCount);
  const loadMore = useFilter((s) => s.loadMore);

  const scores = useMatchScores();
  const personal = scores.confidence > 0;
  const [sortMatch, setSortMatch] = useState(false);

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (activeCategory === "Promo") list = list.filter((p) => !!p.oldPrice);
    else if (activeCategory !== "Semua") list = list.filter((p) => p.cat === activeCategory);
    if (activeStyle) list = list.filter((p) => p.style === activeStyle);
    if (sortMatch && personal) list = [...list].sort((a, b) => (scores.map.get(b.id)?.score ?? 0) - (scores.map.get(a.id)?.score ?? 0));
    return list;
  }, [activeCategory, activeStyle, sortMatch, personal, scores]);

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
        <div className="flex items-center gap-3 flex-shrink-0">
          {activeStyle && (
            <button
              onClick={clearStyle}
              className="h-7 pl-3 pr-2 rounded-full bg-surface-blue text-blue text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-blue hover:text-white transition-colors"
              aria-label={`Hapus filter gaya ${STYLE_LABELS[activeStyle]}`}
            >
              Gaya: {STYLE_LABELS[activeStyle]}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
            </button>
          )}
          {personal ? (
            <button
              onClick={() => setSortMatch((v) => !v)}
              aria-pressed={sortMatch}
              className={`h-7 px-3 rounded-full text-[12.5px] font-semibold border transition-colors ${sortMatch ? "bg-blue text-white border-blue" : "bg-white text-blue border-[#C5D6EA] hover:border-blue"}`}
            >
              Paling cocok
            </button>
          ) : (
            <Link to="/konsultasi" className="text-[12.5px] font-semibold text-blue hover:text-blue-deep">Scan wajah untuk urutan paling cocok</Link>
          )}
          <span className="text-[13px] text-ink-muted" aria-live="polite">{filtered.length} frame</span>
        </div>
      </div>

      <div data-stagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {shown.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onTryOn={onTryOn}
            showToast={showToast}
            onOpenDetail={onOpenDetail}
            match={personal ? scores.map.get(p.id) : null}
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
