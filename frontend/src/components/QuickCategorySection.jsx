import { QUICK_CATEGORIES } from "../data/mockData.js";
import FrameIcon from "./icons/FrameIcon.jsx";

export default function QuickCategorySection() {
  return (
    <section className="max-w-[1280px] mx-auto px-5 py-7">
      <div className="mb-4">
        <h2 className="text-[21px] font-bold text-ink tracking-tight mb-1">Jelajahi Berdasarkan Gaya</h2>
        <p className="text-[13.5px] text-ink-muted m-0">Temukan frame yang sesuai dengan kebutuhanmu.</p>
      </div>
      <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-1">
        {QUICK_CATEGORIES.map((c) => (
          <div
            key={c.name}
            className="flex-shrink-0 w-[148px] bg-white border border-border rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="aspect-square bg-[#F8FAFC] flex items-center justify-center p-[18px]">
              <FrameIcon style={c.style} colorKey={c.color} className="w-full h-full" />
            </div>
            <div className="px-3 pt-2.5 pb-3">
              <p className="text-[13.5px] font-bold text-ink-text mb-0.5">{c.name}</p>
              <p className="text-xs text-ink-muted m-0">{c.count}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
