import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import ProductImage from "./ProductImage.jsx";
import { formatRp } from "../data/mockData.js";
import { FLASH_THEMES, flashConfig, flashEndMs } from "../lib/flashSale.js";

const pad = (n) => String(n).padStart(2, "0");

/** Hitung mundur ke waktu berakhir acara (atur admin; kosong = akhir hari). Angka "berdetak" tiap berganti. */
function Countdown() {
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((flashEndMs() - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((flashEndMs() - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, []);
  const d = Math.floor(left / 86400);
  const parts = [Math.floor((left % 86400) / 3600), Math.floor((left % 3600) / 60), left % 60];
  return (
    <div className="flex items-center gap-1" role="timer" aria-label={`Berakhir dalam ${d ? `${d} hari ` : ""}${parts[0]} jam ${parts[1]} menit`}>
      {d > 0 && <span className="text-[12px] font-bold text-white mr-1">{d} hari</span>}
      {parts.map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="relative min-w-[30px] h-[30px] px-1 rounded-lg bg-black/30 ring-1 ring-white/25 text-white text-[15px] font-extrabold flex items-center justify-center tabular-nums overflow-hidden">
            <span key={v} className="tl-tick">{pad(v)}</span>
          </span>
          {i < 2 && <span className="text-white/80 font-bold tl-blink">:</span>}
        </span>
      ))}
    </div>
  );
}

function FlashCard({ product: p, theme, showMerchant }) {
  const discount = Math.round((1 - p.price / p.oldPrice) * 100);
  const almost = p.flashSold >= 80;
  return (
    <Link to={`/produk/${p.id}`} className="tl-lift group flex flex-col w-full bg-white rounded-xl overflow-hidden shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      <div className="relative aspect-[4/3] bg-surface-blue p-3 overflow-hidden">
        <span className="absolute top-0 left-0 z-10 text-[11px] font-extrabold pl-2 pr-2.5 py-1 rounded-br-xl" style={{ background: theme.ribbon || theme.accent, color: theme.ribbonText || "#fff" }}>-{discount}%</span>
        {almost && <span className="absolute top-1.5 right-1.5 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-error text-white tl-blink">Hampir habis</span>}
        <ProductImage productId={p.id} variant="main" style={p.style} colorKey={p.colorKey} className="w-full h-full tl-zoom" alt={p.name} />
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <p className="text-[12.5px] font-semibold text-ink-text line-clamp-2 m-0 leading-snug min-h-[34px]">{p.name}</p>
        {showMerchant && <p className="text-[11px] text-ink-muted m-0 mt-0.5 truncate">{p.merchant}</p>}
        <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[16px] font-extrabold" style={{ color: theme.accent }}>{formatRp(p.price)}</span>
          <span className="text-[11px] text-ink-muted line-through">{formatRp(p.oldPrice)}</span>
        </div>
        <div className="mt-auto pt-2">
          <div className="relative h-4 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={p.flashSold} aria-valuemin={0} aria-valuemax={100} aria-label="Stok terjual">
            <div className="tl-stripes h-full rounded-full" style={{ width: `${Math.max(8, p.flashSold)}%`, backgroundColor: theme.accent, transition: "width .8s cubic-bezier(.22,1,.36,1)" }} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-normal" style={{ textShadow: "0 1px 2px rgb(0 0 0 / .6)" }}>
              {p.flashLeft != null ? `Sisa ${p.flashLeft}` : `Terjual ${p.flashSold}%`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ArrowButton({ dir, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir < 0 ? "Geser ke kiri" : "Geser ke kanan"}
      className="hidden md:flex w-9 h-9 rounded-full bg-white/90 text-ink-text items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition disabled:opacity-35 disabled:pointer-events-none">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={dir < 0 ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

/**
 * Flash Sale bertema: judul, subjudul, tema & waktu berakhir diatur admin; frame didaftarkan Mitra.
 * layout "slider" (satu baris, geser) atau "grid". Kartu padat: 2 di HP, 3 di tablet, 5 di desktop.
 */
export default function FlashSaleSection({ products, limit = 4, showMerchant = false, layout = "grid", id, onSeeAll }) {
  const cfg = flashConfig();
  const theme = FLASH_THEMES[cfg.theme];
  const items = (products || []).slice(0, limit);
  const scrollRef = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  function updateEdge() {
    const el = scrollRef.current;
    if (el) setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }
  useEffect(() => {
    if (layout !== "slider") return undefined;
    updateEdge();
    window.addEventListener("resize", updateEdge);
    return () => window.removeEventListener("resize", updateEdge);
  }, [layout, items.length]);

  if (!cfg.enabled || items.length === 0) return null;
  const slide = (dir) => scrollRef.current?.scrollBy({ left: dir * (scrollRef.current.clientWidth * 0.8), behavior: "smooth" });
  const isSlider = layout === "slider";

  return (
    <section id={id} aria-label={cfg.title} className="relative overflow-hidden rounded-2xl p-3.5 md:p-4 scroll-mt-24 tl-scroll-reveal"
      style={{ background: `linear-gradient(120deg, ${theme.from}, ${theme.to})` }}>
      <span aria-hidden="true" className="tl-drift pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full blur-3xl opacity-40" style={{ background: theme.glow }} />
      <span aria-hidden="true" className="tl-drift pointer-events-none absolute -bottom-20 right-4 w-64 h-64 rounded-full blur-3xl opacity-30" style={{ background: theme.glow, animationDelay: "-4s" }} />

      <div className="relative flex items-center justify-between gap-x-4 gap-y-2 flex-wrap mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="tl-bolt w-10 h-10 rounded-xl bg-white/20 ring-1 ring-white/40 text-white flex items-center justify-center flex-shrink-0"><Zap size={22} fill="currentColor" /></span>
          <div className="min-w-0">
            <h2 className="text-[22px] md:text-[26px] font-black italic tracking-tight text-white m-0 leading-none uppercase">{cfg.title}</h2>
            {cfg.subtitle && <p className="text-[12.5px] text-white/90 m-0 mt-1 truncate">{cfg.subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Countdown />
          {onSeeAll && <button onClick={onSeeAll} className="text-[13px] font-bold text-white underline-offset-4 hover:underline whitespace-nowrap min-h-[44px] px-1">Lihat semua ›</button>}
          {isSlider && <div className="flex gap-1.5"><ArrowButton dir={-1} disabled={edge.start} onClick={() => slide(-1)} /><ArrowButton dir={1} disabled={edge.end} onClick={() => slide(1)} /></div>}
        </div>
      </div>

      {isSlider ? (
        <div ref={scrollRef} onScroll={updateEdge} data-stagger
          className="relative grid grid-flow-col auto-cols-[44%] sm:auto-cols-[30%] lg:auto-cols-[calc((100%_-_3rem)/5)] gap-2.5 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1">
          {items.map((p) => <div key={p.id} className="snap-start min-w-0 flex"><FlashCard product={p} theme={theme} showMerchant={showMerchant} /></div>)}
        </div>
      ) : (
        <div data-stagger className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {items.map((p) => <FlashCard key={p.id} product={p} theme={theme} showMerchant={showMerchant} />)}
        </div>
      )}
    </section>
  );
}
