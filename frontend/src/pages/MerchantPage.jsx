import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useOutletContext } from "react-router-dom";
import { MERCHANTS, PRODUCTS } from "../data/mockData.js";
import { useFilter } from "../store/useFilter.js";
import ProductCard from "../components/ProductCard.jsx";
import PromoAdBanners from "../components/PromoAdBanners.jsx";
import FlashSaleSection from "../components/FlashSaleSection.jsx";
import FilterSortBar from "../components/FilterSortBar.jsx";
import SocialCommerceSection from "../components/SocialCommerceSection.jsx";

const SORT_OPTIONS = [
  { value: "relevan", label: "Paling relevan" },
  { value: "terbaru", label: "Terbaru" },
  { value: "harga-asc", label: "Harga terendah" },
  { value: "harga-desc", label: "Harga tertinggi" },
  { value: "diskon", label: "Diskon terbesar" },
  { value: "nama", label: "Nama A–Z" }
];
const CAT_LABEL = { Pria: "Frame Pria", Wanita: "Frame Wanita", Anak: "Frame Anak" };
const DEFAULTS = { cat: "Semua", promoOnly: false, newOnly: false, sort: "relevan" };

const discountOf = (p) => (p.oldPrice ? 1 - p.price / p.oldPrice : 0);

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
  const { onTryOn, showToast, jumpToFeed } = useOutletContext();
  const setFeedCategory = useFilter((s) => s.setCategory);
  const merchant = MERCHANTS.find((m) => m.id === id);
  const products = useMemo(() => PRODUCTS.filter((p) => p.merchantId === id), [id]);

  const [cat, setCat] = useState(DEFAULTS.cat);
  const [promoOnly, setPromoOnly] = useState(DEFAULTS.promoOnly);
  const [newOnly, setNewOnly] = useState(DEFAULTS.newOnly);
  const [sort, setSort] = useState(DEFAULTS.sort);

  const catChips = useMemo(() => {
    const present = [...new Set(products.map((p) => p.cat))];
    return [{ label: "Semua", value: "Semua" }, ...present.map((c) => ({ label: CAT_LABEL[c] || c, value: c }))];
  }, [products]);

  const visible = useMemo(() => {
    const list = products.filter(
      (p) => (cat === "Semua" || p.cat === cat) && (!promoOnly || !!p.oldPrice) && (!newOnly || p.isNew)
    );
    const byName = (a, b) => a.name.localeCompare(b.name, "id");
    switch (sort) {
      case "terbaru": return list.sort((a, b) => b.order - a.order);
      case "harga-asc": return list.sort((a, b) => a.price - b.price);
      case "harga-desc": return list.sort((a, b) => b.price - a.price);
      case "diskon": return list.sort((a, b) => discountOf(b) - discountOf(a) || byName(a, b));
      case "nama": return list.sort(byName);
      default: return list;
    }
  }, [products, cat, promoOnly, newOnly, sort]);

  const canReset = cat !== DEFAULTS.cat || promoOnly || newOnly || sort !== DEFAULTS.sort;

  function reset() {
    setCat(DEFAULTS.cat);
    setPromoOnly(DEFAULTS.promoOnly);
    setNewOnly(DEFAULTS.newOnly);
    setSort(DEFAULTS.sort);
  }

  // Pindah antar toko (mis. lewat kolom pencarian) tidak me-remount halaman,
  // jadi filter dari toko sebelumnya harus dibersihkan.
  useEffect(() => {
    reset();
  }, [id]);

  function handleToggle(key) {
    if (key === "promoOnly") setPromoOnly((v) => !v);
    if (key === "newOnly") setNewOnly((v) => !v);
  }

  function showCatalog(view) {
    setCat(DEFAULTS.cat);
    setPromoOnly(!!view.promoOnly);
    setNewOnly(!!view.newOnly);
    setSort(view.sort || DEFAULTS.sort);
    setTimeout(() => document.getElementById("katalog")?.scrollIntoView({ behavior: "smooth" }), 30);
  }

  const hasLinks = Object.values(merchant?.links || {}).some(Boolean);

  const flashItems = products.filter((p) => p.flash);
  const promoItems = products.filter((p) => !!p.oldPrice);
  const newItems = products.filter((p) => p.isNew);
  const maxDiscount = promoItems.reduce((max, p) => Math.max(max, Math.round(discountOf(p) * 100)), 0);

  const ads = [
    promoItems.length > 0
      ? {
          id: "promo", theme: "promo", tag: "Iklan · Promo", headline: "Promo Frame Terbaru",
          sub: `${promoItems.length} frame diskon hingga ${maxDiscount}% di ${merchant?.name}.`,
          cta: "Lihat Promo", onClick: () => showCatalog({ promoOnly: true, sort: "diskon" })
        }
      : {
          id: "promo", theme: "promo", tag: "Iklan · Promo", headline: "Promo Frame Terbaru",
          sub: "Belum ada promo di toko ini. Lihat promo dari mitra TryLens lainnya.",
          cta: "Promo Mitra Lain", onClick: () => { setFeedCategory("Promo"); jumpToFeed(); }
        },
    {
      id: "catalog", theme: "catalog", tag: "Iklan · Katalog", headline: "Katalog Terbaru",
      sub: newItems.length > 0
        ? `${newItems.length} frame baru masuk dari ${merchant?.name}. Coba langsung dengan virtual try-on.`
        : `Lihat ${products.length} frame terbaru dari ${merchant?.name}, urut dari yang paling baru.`,
      cta: newItems.length > 0 ? "Lihat yang Baru" : "Lihat Katalog",
      onClick: () => showCatalog({ newOnly: newItems.length > 0, sort: "terbaru" })
    }
  ];

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
        <Link to="/" className="hover:text-blue">TryLens</Link> /{" "}
        <Link to="/mitra" className="hover:text-blue">Mitra Toko Optik</Link> / {merchant.name}
      </p>

      {/* ===== MERCHANT HEADER (profil kiri | garis tipis | akun sosmed & e-commerce kanan) ===== */}
      <div className="bg-white border border-border rounded-2xl p-5 md:p-6 mb-6 flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div
            className="w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-extrabold text-2xl"
            style={{ background: merchant.color }}
          >
            {merchant.initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1.5">{merchant.name}</h1>
            <p className="text-sm text-ink-muted flex items-center gap-1.5 mb-2">
              <PinIcon /> {merchant.city}
            </p>
            <div className="flex items-center gap-x-4 gap-y-1 text-sm flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-ink-text">
                <span className="text-accent-yellow"><StarIcon /></span> {merchant.rating}
              </span>
              <span className="text-ink-muted">{merchant.count}</span>
              <span className="text-ink-muted">{products.length} produk di TryLens</span>
            </div>
          </div>
        </div>

        {hasLinks && (
          <div className="pt-5 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-border md:w-[330px] flex-shrink-0">
            <SocialCommerceSection variant="inline" title="Temukan di online" links={merchant.links} />
          </div>
        )}
      </div>

      {/* ===== IKLAN: PROMO & KATALOG TERBARU ===== */}
      <div className="mb-5">
        <PromoAdBanners ads={ads} />
      </div>

      {/* ===== FLASH SALE ===== */}
      {flashItems.length > 0 && (
        <div className="mb-8">
          <FlashSaleSection products={flashItems} />
        </div>
      )}

      {/* ===== CATALOG ===== */}
      <h2 id="katalog" className="text-xl font-bold text-ink tracking-tight mb-3 scroll-mt-32">Katalog {merchant.name}</h2>

      {products.length === 0 ? (
        <p className="text-sm text-ink-muted py-10 text-center">Belum ada frame yang terdaftar dari toko ini.</p>
      ) : (
        <>
          <FilterSortBar
            ariaLabel="Filter dan urutkan katalog"
            chips={catChips}
            activeChip={cat}
            onChipChange={setCat}
            toggles={[
              { key: "promoOnly", label: "Sedang promo", active: promoOnly },
              { key: "newOnly", label: "Baru", active: newOnly }
            ]}
            onToggle={handleToggle}
            sortOptions={SORT_OPTIONS}
            sortValue={sort}
            onSortChange={setSort}
            resultCount={visible.length}
            unit="frame"
            canReset={canReset}
            onReset={reset}
          />

          {visible.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl py-14 text-center">
              <p className="text-base font-semibold text-ink mb-1">Tidak ada frame yang cocok</p>
              <p className="text-sm text-ink-muted mb-4">Coba ubah atau hapus filter yang aktif.</p>
              <button onClick={reset} className="h-10 px-5 rounded-[10px] bg-blue text-white text-sm font-bold hover:bg-blue-deep">
                Reset filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} onTryOn={onTryOn} showToast={showToast} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
