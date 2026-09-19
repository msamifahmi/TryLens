import { useState } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import { PRODUCTS, FRAME_COLORS, formatRp } from "../data/mockData.js";
import { useWishlist } from "../store/useWishlist.js";
import ProductImage from "../components/ProductImage.jsx";

const SWATCH_ORDER = ["brown", "black", "navy", "blue", "tort", "gold", "red", "clear"];

function HeartIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}>
      <path d="M12 21s-7.5-4.6-10-9.3C.5 8.2 2.3 5 5.6 5c1.9 0 3.4 1 4.4 2.5C11 6 12.5 5 14.4 5c3.3 0 5.1 3.2 3.6 6.7C19.5 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function describeStyle(style) {
  const map = {
    aviator: "siluet aviator klasik dengan lensa besar berbentuk tetesan air",
    round: "bentuk bulat retro yang timeless dan mudah dipadukan",
    square: "garis tegas kotak yang memberi kesan tegas dan modern",
    cateye: "sudut atas melengkung ala cat eye, elegan dan feminin",
    rect: "bentuk persegi panjang minimalis untuk tampilan formal",
    browline: "aksen tebal di bagian atas ala kacamata retro tahun 60-an"
  };
  return map[style] || "desain frame yang nyaman dipakai sehari-hari";
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { onTryOn, showToast } = useOutletContext();
  const product = PRODUCTS.find((p) => p.id === id);

  const [activeColor, setActiveColor] = useState(product?.colorKey);
  const [activeVariant, setActiveVariant] = useState("main");
  const [qty, setQty] = useState(1);

  const isWished = useWishlist((s) => (product ? s.isWished(product.id) : false));
  const toggle = useWishlist((s) => s.toggle);

  if (!product) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 py-24 text-center">
        <p className="text-lg font-semibold text-ink mb-2">Produk tidak ditemukan</p>
        <p className="text-sm text-ink-muted mb-6">Frame yang kamu cari mungkin sudah tidak tersedia.</p>
        <Link to="/" className="inline-flex h-11 px-6 items-center rounded-[10px] bg-blue text-white font-bold text-sm hover:bg-blue-deep">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const thumbs = ["main", "side", "detail", "close"];

  return (
    <div className="max-w-[1280px] mx-auto px-5 py-8">
      {/* Breadcrumb */}
      <p className="text-[13px] text-ink-muted mb-5">
        <Link to="/" className="hover:text-blue">TryLens</Link> / {product.cat} Frame / #{product.id.toUpperCase()}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        {/* ===== LEFT: INFO ===== */}
        <div className="order-2 lg:order-1 flex flex-col">
          <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink leading-[1.15] tracking-tight mb-5 uppercase">
            {product.name}
          </h1>

          <div className="mb-6">
            <p className="text-sm font-semibold text-ink-text mb-2.5">Warna</p>
            <div className="flex gap-2.5">
              {SWATCH_ORDER.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveColor(key)}
                  aria-label={`Pilih warna ${key}`}
                  aria-pressed={activeColor === key}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    activeColor === key ? "border-ink scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ background: FRAME_COLORS[key].frame }}
                />
              ))}
            </div>
          </div>

          <p className="text-[14.5px] text-ink-muted leading-relaxed mb-7 max-w-md">
            {product.name} adalah frame dengan {describeStyle(product.style)}. Tersedia langsung dari{" "}
            <span className="font-semibold text-ink-text">{product.merchant}</span> di {product.city}, dan bisa kamu
            coba secara virtual sebelum memutuskan untuk membeli — tinggal tap &ldquo;Coba Sekarang&rdquo; untuk
            melihat bagaimana frame ini terlihat langsung di wajahmu.
          </p>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-[30px] font-extrabold text-ink">{formatRp(product.price)}</span>
            {product.oldPrice && (
              <span className="text-base text-ink-muted line-through">{formatRp(product.oldPrice)}</span>
            )}
          </div>
          <p className="text-[12.5px] text-ink-muted mb-7 flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" /></svg>
            {product.merchant} · {product.city}
          </p>

          <div className="flex items-center gap-4 mb-7">
            <div className="flex items-center gap-4 border border-border rounded-full px-4 h-12">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Kurangi jumlah"
                className="text-lg font-bold text-ink-text w-4 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-sm font-semibold w-4 text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                aria-label="Tambah jumlah"
                className="text-lg font-bold text-ink-text w-4 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onTryOn(product)}
              className="flex-1 h-14 rounded-full bg-ink text-white font-bold text-[15px] hover:bg-black transition-colors"
            >
              Coba Sekarang
            </button>
            <button
              onClick={() => toggle(product, showToast)}
              aria-pressed={isWished}
              aria-label="Tambah ke wishlist"
              className={`w-14 h-14 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                isWished ? "border-error text-error bg-red-50" : "border-border text-ink-text hover:border-ink"
              }`}
            >
              <HeartIcon active={isWished} />
            </button>
          </div>
        </div>

        {/* ===== RIGHT: GALLERY ===== */}
        <div className="order-1 lg:order-2">
          <div className="aspect-[4/3] rounded-2xl bg-surface-blue flex items-center justify-center p-10 mb-4 overflow-hidden">
            <ProductImage
              productId={product.id}
              variant={activeVariant}
              style={product.style}
              colorKey={activeColor}
              className="w-full h-full"
              alt={product.name}
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {thumbs.map((variant) => (
              <button
                key={variant}
                onClick={() => setActiveVariant(variant)}
                className={`aspect-square rounded-xl border-2 bg-[#F8FAFC] flex items-center justify-center p-3 transition-colors ${
                  activeVariant === variant ? "border-blue" : "border-transparent hover:border-border"
                }`}
                aria-label={`Lihat foto ${variant}`}
              >
                <ProductImage
                  productId={product.id}
                  variant={variant}
                  style={product.style}
                  colorKey={activeColor}
                  className="w-full h-full"
                  alt={`${product.name} - ${variant}`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
