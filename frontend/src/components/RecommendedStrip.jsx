import { Link } from "react-router-dom";
import { ScanFace, Sparkles } from "lucide-react";
import ProductImage from "./ProductImage.jsx";
import { formatRp } from "../data/mockData.js";

/**
 * Strip rekomendasi (hasil rec/recommend.js). `result` = keluaran useRecommendations.
 * Persen = skor heuristik dari bentuk wajah, lebar frame, dan riwayat; bukan jaminan pas.
 */
export default function RecommendedStrip({ result, onPick, pickLabel = "Pilih", title = "Rekomendasi untuk wajahmu", subtitle = null, className = "", vertical = false, large = false }) {
  const { items, confidence, basis } = result;
  if (!items.length) return null;
  const personal = confidence > 0;
  const used = [basis.face && "bentuk wajah", basis.width && "lebar wajah", basis.history && "riwayat coba"].filter(Boolean);

  return (
    <section className={className} aria-label={personal ? title : "Frame populer"}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          {large && <p className="text-[11.5px] font-bold tracking-[.14em] uppercase text-blue m-0 mb-1.5 flex items-center gap-2"><Sparkles size={13} aria-hidden="true" /> Cocok untukmu</p>}
          <h3 className={large ? "text-[22px] md:text-[26px] font-extrabold text-ink tracking-tight leading-tight m-0" : "flex items-center gap-1.5 text-sm font-bold text-ink-text m-0"}>
            {!large && <Sparkles size={15} className="text-blue" aria-hidden="true" />}
            {personal ? title : "Populer minggu ini"}
          </h3>
          <p className={large ? "text-[13.5px] text-ink-muted m-0 mt-1" : "text-[11.5px] text-ink-muted m-0 mt-0.5"}>
            {subtitle || (personal ? `Disusun dari ${used.join(", ")}.` : "Scan wajah agar rekomendasi sesuai bentuk dan lebar wajahmu.")}
          </p>
        </div>
        {(!basis.face || !basis.width) && (
          <Link to="/konsultasi" className="flex-shrink-0 h-8 px-3 rounded-full bg-surface-blue text-blue-deep text-[12px] font-semibold flex items-center gap-1.5 hover:bg-blue hover:text-white transition-colors">
            <ScanFace size={14} aria-hidden="true" /> Scan wajah
          </Link>
        )}
      </div>

      {vertical ? (
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {items.map(({ product: p, percent, reasons, caution }) => (
            <li key={p.id}>
              <button
                onClick={() => onPick(p.id)}
                aria-label={`${pickLabel} ${p.name}${personal ? `, skor kecocokan ${percent} persen` : ""}`}
                className="w-full flex items-center gap-3 text-left bg-white border border-border rounded-xl p-2 hover:border-blue hover:shadow-sm transition-[transform,box-shadow,border-color] duration-200"
              >
                <span className="w-16 h-16 flex-shrink-0 rounded-lg bg-[#F8FAFC] p-1.5">
                  <ProductImage productId={p.id} variant="main" style={p.style} colorKey={p.colorKey} className="w-full h-full" alt="" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-ink-text line-clamp-1">{p.name}</span>
                  <span className="block text-[12px] text-ink-muted line-clamp-1">{p.merchant} · {p.city}</span>
                  <span className="block text-[12.5px] font-bold text-blue-deep">
                    {formatRp(p.price)}
                    {personal && <span className="ml-2 text-[11px] font-bold text-blue">{percent}% cocok</span>}
                  </span>
                  {(caution || reasons[0]) && (
                    <span className={`block text-[11px] line-clamp-1 ${caution ? "text-[#B45309]" : "text-ink-muted"}`}>{caution || reasons[0]}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 snap-x snap-proximity">
        {items.map(({ product: p, percent, reasons, caution }) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            aria-label={`${pickLabel} ${p.name}${personal ? `, skor kecocokan ${percent} persen` : ""}`}
            className="snap-start flex-shrink-0 w-[148px] sm:w-[168px] text-left bg-white border border-border rounded-xl overflow-hidden hover:border-blue hover:shadow-md transition-[box-shadow,border-color] duration-200"
          >
            <div className="relative aspect-square bg-[#F8FAFC] p-4">
              {personal && (
                <span title="Skor heuristik dari bentuk wajah, lebar frame, dan riwayatmu — bukan jaminan pas." className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue text-white">
                  {percent}% cocok
                </span>
              )}
              <ProductImage productId={p.id} variant="main" style={p.style} colorKey={p.colorKey} className="w-full h-full" alt="" />
            </div>
            <div className="p-2.5">
              <p className="text-[12.5px] font-semibold text-ink-text m-0 line-clamp-1">{p.name}</p>
              <p className="text-[12px] font-bold text-blue-deep m-0 mt-0.5">{formatRp(p.price)}</p>
              {reasons[0] && <p className="text-[11px] text-ink-muted m-0 mt-1 line-clamp-2 min-h-[30px]">{reasons[0]}</p>}
              {caution && <p className="text-[10.5px] text-[#B45309] m-0 mt-0.5 line-clamp-2">{caution}</p>}
            </div>
          </button>
        ))}
      </div>
      )}
    </section>
  );
}
