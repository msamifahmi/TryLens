import { useEffect, useState } from "react";
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
      className="flex gap-3 bg-white border border-border rounded-xl p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all"
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

/**
 * Section Flash Sale: judul + hitung mundur + kartu horizontal ringkas.
 * products : produk ber-flag `flash` (maks. `limit`, default 4)
 * showMerchant : tampilkan nama toko di kartu (untuk halaman Mitra)
 */
export default function FlashSaleSection({ products, limit = 4, showMerchant = false }) {
  const items = (products || []).slice(0, limit);
  if (items.length === 0) return null;

  return (
    <section className="bg-white border border-border rounded-2xl p-4" aria-label="Flash Sale">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-error text-white flex items-center justify-center">
            <BoltIcon />
          </span>
          <h2 className="text-[17px] font-bold text-ink tracking-tight m-0">Flash Sale</h2>
        </div>
        <Countdown />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((p) => (
          <FlashCard key={p.id} product={p} showMerchant={showMerchant} />
        ))}
      </div>
    </section>
  );
}
