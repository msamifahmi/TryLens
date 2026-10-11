import { SIZE_FIELDS, sizeCode } from "../data/frameSize.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useOutletContext } from "react-router-dom";
import { Heart, MapPin, Minus, Plus, ScanFace, Sparkles, Store } from "lucide-react";
import { PRODUCTS, MERCHANTS, formatRp } from "../data/mockData.js";
import { useRecommendations } from "../rec/useRecommendations.js";
import RecommendedStrip from "../components/RecommendedStrip.jsx";
import { useWishlist } from "../store/useWishlist.js";
import ProductGallery from "../components/product/ProductGallery.jsx";
import ProductSection from "../components/product/ProductSection.jsx";
import ConnectMerchantModal from "../components/ConnectMerchantModal.jsx";
import { useConsult } from "../store/useConsult.js";
import { highlightedMerchantIds } from "../lib/catalog.js";

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

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const RANDOM_STEP = 8;

export default function ProductDetailPage() {
  const { id } = useParams();
  const { onTryOn, showToast } = useOutletContext();
  const product = PRODUCTS.find((p) => p.id === id);
  const navigate = useNavigate();
  const recs = useRecommendations({ currentId: id, limit: 6 });
  const merchant = MERCHANTS.find((m) => m.id === product?.merchantId);

  const [qty, setQty] = useState(1);
  const [connectOpen, setConnectOpen] = useState(false);
  const [randomCount, setRandomCount] = useState(RANDOM_STEP);

  // Catat frame yang dilihat (tanpa login) agar ikut disebut di pesan WhatsApp saat berkonsultasi.
  const markViewed = useConsult((s) => s.markViewed);
  useEffect(() => {
    if (product) markViewed(product.id);
  }, [product, markViewed]);
  useEffect(() => { setQty(1); setRandomCount(RANDOM_STEP); }, [id]);

  const isWished = useWishlist((s) => (product ? s.isWished(product.id) : false));
  const toggle = useWishlist((s) => s.toggle);

  // Urutan katalog di bawah: (1) paling cocok di wajah [recs] → (2) Highlighted Brand → (3) acak.
  const recIds = useMemo(() => new Set(recs.items.map((r) => r.product.id)), [recs]);
  const highlightIds = useMemo(() => highlightedMerchantIds(), []);
  const highlighted = useMemo(
    () => PRODUCTS.filter((p) => p.id !== id && !recIds.has(p.id) && highlightIds.has(p.merchantId)).slice(0, 8),
    [id, recIds, highlightIds]
  );
  const highlightedBrands = useMemo(() => MERCHANTS.filter((m) => highlightIds.has(m.id) && highlighted.some((p) => p.merchantId === m.id)), [highlightIds, highlighted]);
  const shownIds = useMemo(() => new Set([id, ...recIds, ...highlighted.map((p) => p.id)]), [id, recIds, highlighted]);
  const randomPool = useMemo(
    () => shuffle(PRODUCTS.filter((p) => !shownIds.has(p.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );
  const randomItems = randomPool.filter((p) => !shownIds.has(p.id)).slice(0, randomCount);

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

  const disc = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-5 py-6 md:py-8">
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-muted mb-5 flex flex-wrap items-center gap-x-1.5">
        <Link to="/" className="py-1.5 hover:text-blue">TryLens</Link><span aria-hidden="true">/</span>
        <span>{product.cat} Frame</span><span aria-hidden="true">/</span>
        <span className="text-ink-text font-semibold">#{product.id.toUpperCase()}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-8 lg:gap-14 items-start">
        {/* ===== GALERI ===== */}
        <ProductGallery product={product} />

        {/* ===== INFO ===== */}
        <div className="flex flex-col min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {product.badge && (
              <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${product.badge.startsWith("-") ? "bg-error text-white" : "bg-accent-yellow text-ink"}`}>{product.badge}</span>
            )}
            {product.vto !== false && <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full bg-surface-blue text-blue-deep">Bisa coba virtual</span>}
          </div>

          <h1 className="text-[28px] md:text-[38px] font-extrabold text-ink leading-[1.1] tracking-tight mb-3 uppercase">{product.name}</h1>

          <div className="flex items-baseline gap-3 flex-wrap mb-1.5">
            <span className="text-[30px] md:text-[34px] font-extrabold text-blue-deep leading-none">{formatRp(product.price)}</span>
            {product.oldPrice && <span className="text-base text-ink-muted line-through">{formatRp(product.oldPrice)}</span>}
            {disc > 0 && <span className="text-sm font-bold text-error">Hemat {disc}%</span>}
          </div>
          <p className="text-[13px] text-ink-muted mb-6 flex items-center gap-1.5">
            <MapPin size={14} aria-hidden="true" /> {product.merchant} · {product.city}
          </p>

          {product.description ? (
            <p className="text-[14.5px] text-ink-muted leading-relaxed mb-6 max-w-[520px] whitespace-pre-line">{product.description}</p>
          ) : (
            <p className="text-[14.5px] text-ink-muted leading-relaxed mb-6 max-w-[520px]">
              {product.name} adalah frame dengan {describeStyle(product.style)}. Tersedia langsung dari{" "}
              <span className="font-semibold text-ink-text">{product.merchant}</span> di {product.city}, dan bisa kamu
              coba secara virtual sebelum memutuskan untuk membeli — tinggal tap &ldquo;Coba Sekarang&rdquo; untuk
              melihat bagaimana frame ini terlihat langsung di wajahmu.
            </p>
          )}

          {product.size && (
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/70 border border-border/70 rounded-2xl overflow-hidden mb-6 max-w-[520px] text-[13px]" aria-label="Ukuran frame">
              {sizeCode(product.size) && (
                <div className="col-span-full bg-white px-4 py-3">
                  <dt className="text-ink-muted text-[11.5px]">Ukuran (lensa–jembatan–gagang)</dt>
                  <dd className="m-0 font-extrabold text-ink text-[15px]">{sizeCode(product.size)} mm</dd>
                </div>
              )}
              {Object.entries(SIZE_FIELDS).filter(([k]) => product.size[k]).map(([k, r]) => (
                <div key={k} className="bg-white px-4 py-2.5">
                  <dt className="text-ink-muted text-[11.5px]">{r.label.replace(" (gram)", "")}</dt>
                  <dd className="m-0 font-semibold text-ink-text">{product.size[k]} {k === "weightG" ? "g" : "mm"}</dd>
                </div>
              ))}
              {product.size.material && (
                <div className="bg-white px-4 py-2.5"><dt className="text-ink-muted text-[11.5px]">Bahan</dt><dd className="m-0 font-semibold text-ink-text">{product.size.material}</dd></div>
              )}
            </dl>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center border border-border rounded-full h-12 bg-white" role="group" aria-label="Jumlah">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Kurangi jumlah" className="w-12 h-12 rounded-full flex items-center justify-center text-ink-text hover:bg-surface-blue"><Minus size={16} /></button>
              <span className="w-8 text-center text-sm font-bold" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} aria-label="Tambah jumlah" className="w-12 h-12 rounded-full flex items-center justify-center text-ink-text hover:bg-surface-blue"><Plus size={16} /></button>
            </div>
          </div>

          <div className="flex gap-3 mb-3">
            <button onClick={() => onTryOn(product)} className="flex-1 min-h-14 rounded-full bg-ink text-white font-bold text-[15px] hover:bg-black">
              Coba Sekarang
            </button>
            <button
              onClick={() => toggle(product, showToast)}
              aria-pressed={isWished}
              aria-label={isWished ? "Hapus dari wishlist" : "Tambah ke wishlist"}
              className={`tl-still w-14 h-14 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${isWished ? "border-error text-error bg-red-50" : "border-border text-ink-text hover:border-ink bg-white"}`}
            >
              <Heart size={20} fill={isWished ? "currentColor" : "none"} strokeWidth={1.9} />
            </button>
          </div>

          {merchant && (
            <button onClick={() => setConnectOpen(true)} className="flex items-center justify-center gap-2 min-h-14 px-4 rounded-full border-2 border-blue text-blue font-bold text-[15px] text-center hover:bg-surface-blue">
              <Store size={18} aria-hidden="true" /> Checkout — Hubungkan ke {merchant.name}
            </button>
          )}
          {merchant && (
            <Link to={`/konsultasi?frame=${product.id}&toko=${merchant.id}`} className="flex items-center justify-center gap-2 min-h-12 mt-3 rounded-full text-blue-deep font-bold text-sm text-center hover:bg-surface-blue">
              <ScanFace size={16} aria-hidden="true" /> Belum yakin? Scan wajah &amp; konsultasi dengan optik
            </Link>
          )}
        </div>
      </div>

      {/* ===== KATALOG: 1) paling cocok di wajah → 2) Highlighted Brand → 3) acak ===== */}
      <RecommendedStrip
        className="mt-14"
        large
        result={recs}
        title="Paling cocok untukmu"
        pickLabel="Lihat"
        onPick={(pid) => {
          navigate(`/produk/${pid}`);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <ProductSection
        id="highlighted-brand"
        eyebrow={<><Sparkles size={13} aria-hidden="true" /> Highlighted Brand</>}
        title="Katalog brand pilihan"
        subtitle={highlightedBrands.length ? `Frame dari ${highlightedBrands.map((m) => m.name).join(", ")}.` : undefined}
        products={highlighted}
        onTryOn={onTryOn}
        showToast={showToast}
      />

      <ProductSection
        id="jelajahi"
        eyebrow="Jelajahi"
        title="Frame lainnya untukmu"
        subtitle="Pilihan acak dari berbagai toko optik — muat ulang halaman untuk melihat yang lain."
        products={randomItems}
        onTryOn={onTryOn}
        showToast={showToast}
        action={randomPool.filter((p) => !shownIds.has(p.id)).length > randomCount && (
          <button onClick={() => setRandomCount((c) => c + RANDOM_STEP)} className="hidden sm:inline-flex min-h-11 px-5 items-center rounded-full border-2 border-blue text-blue font-bold text-sm hover:bg-surface-blue flex-shrink-0">Muat lebih banyak</button>
        )}
      />
      {randomPool.filter((p) => !shownIds.has(p.id)).length > randomCount && (
        <button onClick={() => setRandomCount((c) => c + RANDOM_STEP)} className="sm:hidden mt-5 w-full min-h-12 rounded-full border-2 border-blue text-blue font-bold text-sm hover:bg-surface-blue">Muat lebih banyak</button>
      )}

      <ConnectMerchantModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        merchant={merchant}
        product={product}
        qty={qty}
      />
    </div>
  );
}
