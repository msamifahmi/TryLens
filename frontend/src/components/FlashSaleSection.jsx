import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductImage from "./ProductImage.jsx";
import { formatRp } from "../data/mockData.js";

// Hitung mundur sampai 23:59:59 hari ini (waktu lokal perangkat). Data mock:
// nanti ganti dengan waktu berakhir dari backend (mis. field `endsAt`).
function secondsLeftToday() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.floor((end - now) / 1000));
}

const pad = (n) => String(n).padStart(2, "0");

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function Countdown() {
  const [left, setLeft] = useState(secondsLeftToday);

  useEffect(() => {
    const t = setInterval(() => setLeft(secondsLeftToday()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label={`Berakhir dalam ${h} jam ${m} menit`}>
      <span className="text-[12px] text-ink-muted mr-0.5 hidden sm:inline">Berakhir dalam</span>
      {[h, m, s].map((v, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="min-w-[28px] h-7 px-1 rounded-md bg-blue-deep text-white text-[13px] font-bold flex items-center justify-center tabular-nums">
            {pad(v)}
          </span>
          {i < 2 && <span className="text-blue-deep font-bold">:</span>}
        </span>
      ))}
    </div>
  );
}

function FlashCard({ product: p, showMerchant }) {
  const discount = Math.round((1 - p.price / p.oldPrice) * 100);
  return (
    <Link
      to={`/produk/${p.id}`}
      className="flex w-full gap-3 bg-white border border-border rounded-xl p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="relative w-[88px] h-[88px] flex-shrink-0 rounded-lg bg-[#F8FAFC] overflow-hidden p-2.5">
        <span className="absolute top-1 left-1 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded bg-error text-white">-{discount}%</span>
        <ProductImage
          productId={p.id}
          variant="main"
          style={p.style}
          colorKey={p.colorKey}
          className="w-full h-full"
          alt={p.name}
        />
      </div>
      <div className="min-w-0 flex-1 flex flex-col">
        <p className="text-[13px] font-semibold text-ink-text line-clamp-2 m-0 leading-snug">{p.name}</p>
        {showMerchant && <p className="text-[11px] text-ink-muted m-0 mt-0.5 truncate">{p.merchant}</p>}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
            <span className="text-[15px] font-extrabold text-error">{formatRp(p.price)}</span>
            <span className="text-[11.5px] text-ink-muted line-through">{formatRp(p.oldPrice)}</span>
          </div>
          <div
            className="h-1.5 rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={p.flashSold}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Stok terjual"
          >
            <div className="h-full rounded-full bg-error" style={{ width: `${p.flashSold}%` }} />
          </div>
          <p className="text-[11px] text-ink-muted m-0 mt-1">Terjual {p.flashSold}%</p>
        </div>
      </div>
    </Link>
  );
}

function ArrowButton({ dir, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? "Geser ke kiri" : "Geser ke kanan"}
      className="hidden md:flex w-8 h-8 rounded-full border border-border bg-white items-center justify-center text-ink-text hover:border-blue hover:text-blue disabled:opacity-35 disabled:pointer-events-none"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d={dir < 0 ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/**
 * Section Flash Sale: judul + hitung mundur + kartu horizontal ringkas.
 * products : produk ber-flag `flash` (maks. `limit`, default 4)
 * showMerchant : tampilkan nama toko di kartu (untuk halaman Mitra dan beranda)
 * layout : "grid" (default, menumpuk ke bawah) atau "slider" (baris tetap, geser ke samping)
 * rows : jumlah baris pada layout "slider" (default 1). Lebar kolom: 3 kartu per layar di desktop, 2 di tablet, 1 + sedikit kartu berikutnya di HP.
 * columns : 2 (default) atau 3 kolom di layar lebar, khusus layout "grid"
 * id : dipakai sebagai anchor scroll (mis. dari menu Jelajahi)
 * onSeeAll : bila diisi, tampil tombol "Lihat semua"
 */
export default function FlashSaleSection({
  products,
  limit = 4,
  showMerchant = false,
  layout = "grid",
  rows = 1,
  columns = 2,
  id,
  onSeeAll
}) {
  const items = (products || []).slice(0, limit);
  const scrollRef = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  function updateEdge() {
    const el = scrollRef.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }

  useEffect(() => {
    if (layout !== "slider") return undefined;
    updateEdge();
    window.addEventListener("resize", updateEdge);
    return () => window.removeEventListener("resize", updateEdge);
  }, [layout, items.length]);

  function slide(dir) {
    const el = scrollRef.current;
    // geser satu "halaman" (3 kartu di desktop); snap merapikan posisinya ke awal kartu
    if (el) el.scrollBy({ left: dir * (el.clientWidth + 12), behavior: "smooth" });
  }

  if (items.length === 0) return null;
  const isSlider = layout === "slider";

  return (
    <section id={id} className="bg-white border border-border rounded-2xl p-4 scroll-mt-24" aria-label="Flash Sale">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-error text-white flex items-center justify-center">
            <BoltIcon />
          </span>
          <h2 className="text-[17px] font-bold text-ink tracking-tight m-0">Flash Sale</h2>
        </div>
        <div className="flex items-center gap-3">
          <Countdown />
          {onSeeAll && (
            <button onClick={onSeeAll} className="text-[13px] font-semibold text-blue hover:underline whitespace-nowrap">
              Lihat semua
            </button>
          )}
          {isSlider && (
            <div className="flex items-center gap-1.5">
              <ArrowButton dir={-1} disabled={edge.start} onClick={() => slide(-1)} />
              <ArrowButton dir={1} disabled={edge.end} onClick={() => slide(1)} />
            </div>
          )}
        </div>
      </div>

      {isSlider ? (
        <div
          ref={scrollRef}
          onScroll={updateEdge}
          className="grid grid-flow-col auto-cols-[85%] md:auto-cols-[calc((100%_-_0.75rem)/2)] lg:auto-cols-[calc((100%_-_1.5rem)/3)] gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1"
          style={{ gridTemplateRows: `repeat(${Math.min(rows, items.length)}, auto)` }}
        >
          {items.map((p) => (
            <div key={p.id} className="snap-start min-w-0 flex">
              <FlashCard product={p} showMerchant={showMerchant} />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""} gap-3`}>
          {items.map((p) => (
            <FlashCard key={p.id} product={p} showMerchant={showMerchant} />
          ))}
        </div>
      )}
    </section>
  );
}
