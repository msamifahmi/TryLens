import { Link, useParams, useOutletContext } from "react-router-dom";
import { MERCHANTS, PRODUCTS } from "../data/mockData.js";
import ProductCard from "../components/ProductCard.jsx";

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1L12 2z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function MerchantPage() {
  const { id } = useParams();
  const { onTryOn, showToast } = useOutletContext();
  const merchant = MERCHANTS.find((m) => m.id === id);
  const products = PRODUCTS.filter((p) => p.merchantId === id);

  if (!merchant) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 py-24 text-center">
        <p className="text-lg font-semibold text-ink mb-2">Toko tidak ditemukan</p>
        <p className="text-sm text-ink-muted mb-6">Merchant yang kamu cari mungkin sudah tidak terdaftar di TryLens.</p>
        <Link to="/" className="inline-flex h-11 px-6 items-center rounded-[10px] bg-blue text-white font-bold text-sm hover:bg-blue-deep">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-5 py-8">
      <p className="text-[13px] text-ink-muted mb-5">
        <Link to="/" className="hover:text-blue">TryLens</Link> / Toko Optik / {merchant.name}
      </p>

      {/* ===== MERCHANT HEADER ===== */}
      <div className="bg-white border border-border rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-center gap-5">
        <div
          className="w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-extrabold text-2xl"
          style={{ background: merchant.color }}
        >
          {merchant.initials}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1.5">{merchant.name}</h1>
          <p className="text-sm text-ink-muted flex items-center gap-1.5 mb-2">
            <PinIcon /> {merchant.city}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 font-semibold text-ink-text">
              <span className="text-accent-yellow"><StarIcon /></span> {merchant.rating}
            </span>
            <span className="text-ink-muted">{merchant.count}</span>
            <span className="text-ink-muted">{products.length} produk di TryLens</span>
          </div>
        </div>
      </div>

      {/* ===== CATALOG ===== */}
      <h2 className="text-xl font-bold text-ink tracking-tight mb-4">Katalog {merchant.name}</h2>

      {products.length === 0 ? (
        <p className="text-sm text-ink-muted py-10 text-center">Belum ada frame yang terdaftar dari toko ini.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onTryOn={onTryOn} showToast={showToast} />
          ))}
        </div>
      )}
    </div>
  );
}
