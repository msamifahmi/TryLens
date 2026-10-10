import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../ProductCard.jsx";
import MerchantCard from "../MerchantCard.jsx";
import { MERCHANTS, PRODUCTS, STYLE_LABELS } from "../../data/mockData.js";

const STEP = 8;

/**
 * Katalog di bawah kamera Coba Virtual — supaya pengguna terus menjelajah dan mencoba frame lain tanpa meninggalkan sesi.
 * Rak: Serupa · Promo · Terbaru · Pria/Wanita/Anak · Semua. "Coba Sekarang" langsung memakai frame itu di kamera.
 */
export default function TryOnCatalog({ product, merchant, onPick, showToast }) {
  const shelves = useMemo(() => {
    const others = PRODUCTS.filter((p) => p.id !== product.id);
    const sameStyle = others.filter((p) => p.style === product.style);
    const sameCat = others.filter((p) => p.cat === product.cat && p.style !== product.style);
    return [
      { key: "serupa", label: "Serupa dengan ini", items: [...sameStyle, ...sameCat], hint: `Gaya ${STYLE_LABELS[product.style] || product.style} dan kategori ${product.cat}` },
      { key: "promo", label: "Promo", items: others.filter((p) => p.oldPrice), hint: "Frame yang sedang diskon" },
      { key: "baru", label: "Terbaru", items: [...others].sort((a, b) => b.order - a.order), hint: "Baru masuk katalog" },
      { key: "Pria", label: "Pria", items: others.filter((p) => p.cat === "Pria") },
      { key: "Wanita", label: "Wanita", items: others.filter((p) => p.cat === "Wanita") },
      { key: "Anak", label: "Anak", items: others.filter((p) => p.cat === "Anak") },
      { key: "semua", label: "Semua frame", items: others }
    ].filter((s) => s.items.length);
  }, [product.id, product.style, product.cat]);

  const [tab, setTab] = useState("serupa");
  const [sort, setSort] = useState("relevan");
  const [shown, setShown] = useState(STEP);
  const shelf = shelves.find((s) => s.key === tab) || shelves[0];
  const items = useMemo(() => {
    const a = [...shelf.items];
    if (sort === "murah") a.sort((x, y) => x.price - y.price);
    if (sort === "mahal") a.sort((x, y) => y.price - x.price);
    return a;
  }, [shelf, sort]);

  const otherShops = MERCHANTS.filter((m) => m.id !== merchant?.id).slice(0, 4);

  return (
    <section className="mt-12" aria-label="Katalog frame">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight m-0">Jelajahi & coba frame lainnya</h2>
          <p className="text-[13px] text-ink-muted m-0 mt-1">
            {shelf.hint || `${items.length} frame`} · tekan “Coba Sekarang” untuk langsung memakainya di kamera.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-muted">
          Urutkan
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-lg border border-border bg-white px-2 text-[13px] text-ink-text">
            <option value="relevan">Paling relevan</option>
            <option value="murah">Harga terendah</option>
            <option value="mahal">Harga tertinggi</option>
          </select>
        </label>
      </div>

      <div role="tablist" aria-label="Rak katalog" className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-4">
        {shelves.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={tab === s.key}
            onClick={() => { setTab(s.key); setShown(STEP); }}
            className={`flex-shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold border transition-colors ${tab === s.key ? "bg-blue text-white border-blue" : "bg-white text-ink-text border-border hover:border-blue"}`}
          >
            {s.label} <span className={tab === s.key ? "text-white/80" : "text-ink-muted"}>({s.items.length})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5" data-testid="tryon-catalog">
        {items.slice(0, shown).map((p) => (
          <ProductCard key={p.id} product={p} onTryOn={(x) => onPick(x.id)} showToast={showToast} />
        ))}
      </div>

      {shown < items.length && (
        <div className="text-center mt-5">
          <button onClick={() => setShown((n) => n + STEP)} className="h-11 px-7 rounded-full border-[1.5px] border-blue text-blue-deep font-bold text-sm hover:bg-surface-blue">
            Tampilkan lebih banyak ({items.length - shown} lagi)
          </button>
        </div>
      )}

      {otherShops.length > 0 && (
        <div className="mt-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl font-extrabold text-ink tracking-tight m-0">Toko optik lainnya</h2>
            <Link to="/mitra" className="inline-flex items-center min-h-10 text-[13px] font-semibold text-blue hover:text-blue-deep">Lihat semua toko</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {otherShops.map((m) => (
              <MerchantCard
                key={m.id}
                merchant={m}
                productCount={PRODUCTS.filter((p) => p.merchantId === m.id).length}
                promoCount={PRODUCTS.filter((p) => p.merchantId === m.id && p.oldPrice).length}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
