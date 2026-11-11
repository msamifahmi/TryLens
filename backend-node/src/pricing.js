// Harga & aturan produk — SUMBER KEBENARAN di server (harga dari klien tidak pernah dipercaya).
// Harus sama dengan frontend/src/data/partnerMock.js; test/pricing-sync.test.mjs memeriksanya.
export const PLANS = {
  basic: { name: "Basic", priceMonth: 299000, priceYear: 2990000, frameLimit: Infinity, vtoLimit: 5, features: { advancedAnalytics: false, featuredStore: false, sponsoredFrame: false } },
  pro: { name: "Pro", priceMonth: 799000, priceYear: 7990000, frameLimit: Infinity, vtoLimit: 15, features: { advancedAnalytics: true, featuredStore: true, sponsoredFrame: true } }
};
export const INTERVALS = { month: { label: "Bulanan", months: 1 }, year: { label: "Tahunan", months: 12 } };
export const AD_TYPES = {
  banner: { label: "Slot Iklan Banner", tab: "banners", placements: { mitra: { label: "Halaman Mitra", price: 500000 }, beranda: { label: "Beranda TryLens", price: 900000 } } },
  highlighted: { label: "Highlighted Brand", tab: "highlighted", feature: "featuredStore", price: 350000, slots: 6 },
  sponsored: { label: "Sponsored Frame", tab: "sponsored", feature: "sponsoredFrame", maxFrames: 3, placements: { kategori: { label: "Halaman Kategori", price: 200000 }, pencarian: { label: "Hasil Pencarian", price: 450000 }, beranda: { label: "Rekomendasi Beranda", price: 800000 } } }
};
export const MAX_WEEKS = 8;
// Slot Virtual Try-On tambahan: sekali bayar, permanen (selama langganan aktif). Rp30.000/slot; promo 5 slot Rp145.000.
export const VTO_SLOT = { unit: 30000, packQty: 5, packPrice: 145000, maxPerOrder: 50 };
/** Harga termurah untuk qty slot: paket 5 dipakai sebanyak mungkin, sisanya satuan. */
export const vtoSlotPrice = (qty) => Math.floor(qty / VTO_SLOT.packQty) * VTO_SLOT.packPrice + (qty % VTO_SLOT.packQty) * VTO_SLOT.unit;
/** Kuota VTO efektif = kuota paket + slot tambahan yang sudah dibeli. */
export const vtoLimitOf = (plan, extraSlots = 0) => (PLANS[plan] ? PLANS[plan].vtoLimit + Math.max(0, Math.trunc(extraSlots || 0)) : 0);

export const planPrice = (code, interval) => (interval === "year" ? PLANS[code].priceYear : PLANS[code].priceMonth);
export const planLabel = (code, interval) => `Paket ${PLANS[code].name} (${INTERVALS[interval].label})`;

export const addDays = (ymd, n) => {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const endsOn = (startsOn, weeks) => addDays(startsOn, weeks * 7 - 1);
export const addMonths = (iso, n) => {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString();
};
export const todayStr = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // WIB
