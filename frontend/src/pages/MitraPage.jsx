import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { MERCHANTS, PRODUCTS, OFFICIAL_LINKS } from "../data/mockData.js";
import { useFilter } from "../store/useFilter.js";
import PromoAdBanners from "../components/PromoAdBanners.jsx";
import FlashSaleSection from "../components/FlashSaleSection.jsx";
import FilterSortBar from "../components/FilterSortBar.jsx";
import MerchantCard from "../components/MerchantCard.jsx";
import SocialCommerceSection from "../components/SocialCommerceSection.jsx";

const SORT_OPTIONS = [
  { value: "rating", label: "Rating tertinggi" },
  { value: "frame", label: "Frame terbanyak" },
  { value: "nama", label: "Nama A–Z" }
];

const PROVINCES = [...new Set(MERCHANTS.map((m) => m.province))];
const REGION_CHIPS = [{ label: "Semua wilayah", value: "Semua" }, ...PROVINCES.map((p) => ({ label: p, value: p }))];

const DEFAULTS = { region: "Semua", topRated: false, hasPromo: false, sort: "rating" };

// Statistik per merchant dihitung sekali (data mock statis).
const STATS = Object.fromEntries(
  MERCHANTS.map((m) => {
    const items = PRODUCTS.filter((p) => p.merchantId === m.id);
    return [m.id, { productCount: items.length, promoCount: items.filter((p) => !!p.oldPrice).length }];
  })
);

const PROMO_PRODUCTS = PRODUCTS.filter((p) => !!p.oldPrice);
const MAX_DISCOUNT = PROMO_PRODUCTS.reduce((max, p) => Math.max(max, Math.round((1 - p.price / p.oldPrice) * 100)), 0);
const NEW_COUNT = PRODUCTS.filter((p) => p.isNew).length;
// Flash sale lintas mitra: yang paling banyak terjual dulu.
const FLASH_ITEMS = PRODUCTS.filter((p) => p.flash).sort((a, b) => b.flashSold - a.flashSold);

export default function MitraPage() {
  const { jumpToFeed } = useOutletContext();
  const setCategory = useFilter((s) => s.setCategory);

  const [region, setRegion] = useState(DEFAULTS.region);
  const [topRated, setTopRated] = useState(DEFAULTS.topRated);
  const [hasPromo, setHasPromo] = useState(DEFAULTS.hasPromo);
  const [sort, setSort] = useState(DEFAULTS.sort);

  const merchants = useMemo(() => {
    let list = MERCHANTS.filter((m) => {
      if (region !== "Semua" && m.province !== region) return false;
      if (topRated && parseFloat(m.rating) < 4.8) return false;
      if (hasPromo && STATS[m.id].promoCount === 0) return false;
      return true;
    });

    const byName = (a, b) => a.name.localeCompare(b.name, "id");
    list = [...list].sort((a, b) => {
      if (sort === "nama") return byName(a, b);
      if (sort === "frame") return parseInt(b.count, 10) - parseInt(a.count, 10) || byName(a, b);
      return parseFloat(b.rating) - parseFloat(a.rating) || byName(a, b);
    });
    return list;
  }, [region, topRated, hasPromo, sort]);

  const canReset =
    region !== DEFAULTS.region || topRated !== DEFAULTS.topRated || hasPromo !== DEFAULTS.hasPromo || sort !== DEFAULTS.sort;

  function reset() {
    setRegion(DEFAULTS.region);
    setTopRated(DEFAULTS.topRated);
    setHasPromo(DEFAULTS.hasPromo);
    setSort(DEFAULTS.sort);
  }

  function handleToggle(key) {
    if (key === "topRated") setTopRated((v) => !v);
    if (key === "hasPromo") setHasPromo((v) => !v);
  }

  const ads = [
    {
      id: "promo",
      theme: "promo",
      tag: "Iklan · Promo",
      headline: "Promo Frame Terbaru",
      sub: `${PROMO_PRODUCTS.length} frame diskon hingga ${MAX_DISCOUNT}% dari mitra TryLens.`,
      cta: "Lihat Promo",
      onClick: () => {
        setCategory("Promo");
        jumpToFeed();
      }
    },
    {
      id: "catalog",
      theme: "catalog",
      tag: "Iklan · Katalog",
      headline: "Katalog Terbaru",
      sub: `${NEW_COUNT} frame baru masuk minggu ini. Coba langsung dengan virtual try-on.`,
      cta: "Jelajahi Katalog",
      onClick: () => {
        setCategory("Semua");
        jumpToFeed();
      }
    }
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-5 py-8">
      <p className="text-[13px] text-ink-muted mb-5">
        <Link to="/" className="hover:text-blue">TryLens</Link> / Mitra Toko Optik
      </p>

      <div className="mb-5">
        <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1.5">Mitra Toko Optik</h1>
        <p className="text-sm text-ink-muted m-0">
          {MERCHANTS.length} toko optik lokal yang menyediakan frame di TryLens. Bandingkan, filter, lalu buka katalognya.
        </p>
      </div>

      <div className="mb-5">
        <PromoAdBanners ads={ads} />
      </div>

      <div className="mb-7">
        <FlashSaleSection products={FLASH_ITEMS} showMerchant />
      </div>

      <FilterSortBar
        ariaLabel="Filter dan urutkan mitra"
        chips={REGION_CHIPS}
        activeChip={region}
        onChipChange={setRegion}
        toggles={[
          { key: "topRated", label: "Rating 4.8+", active: topRated },
          { key: "hasPromo", label: "Sedang promo", active: hasPromo }
        ]}
        onToggle={handleToggle}
        sortOptions={SORT_OPTIONS}
        sortValue={sort}
        onSortChange={setSort}
        resultCount={merchants.length}
        unit="toko"
        canReset={canReset}
        onReset={reset}
      />

      {merchants.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl py-14 text-center mb-8">
          <p className="text-base font-semibold text-ink mb-1">Tidak ada mitra yang cocok</p>
          <p className="text-sm text-ink-muted mb-4">Coba ubah atau hapus filter yang aktif.</p>
          <button onClick={reset} className="h-10 px-5 rounded-[10px] bg-blue text-white text-sm font-bold hover:bg-blue-deep">
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-8">
          {merchants.map((m) => (
            <MerchantCard key={m.id} merchant={m} {...STATS[m.id]} />
          ))}
        </div>
      )}

      <SocialCommerceSection
        title="Ikuti TryLens & Belanja Online"
        subtitle="Dapatkan info promo dan koleksi terbaru dari media sosial serta toko resmi kami di e-commerce."
        links={OFFICIAL_LINKS}
      />
    </div>
  );
}
