// Data mock untuk area Mitra (Partner). Dipakai selama backend belum aktif.
// Struktur sengaja mengikuti tabel di backend-php/database/schema.sql,
// jadi nanti tinggal diganti dengan pemanggilan API.

import { PRODUCTS, MERCHANTS } from "./mockData.js";

/* ---------------------------------------------------------------- paket */

// Harga paket dari keputusan bisnis: Basic Rp299.000/bln atau Rp2.990.000/thn (hemat 2 bulan),
// Pro Rp799.000/bln atau Rp7.990.000/thn (hemat 2 bulan).
export const PLANS = {
  basic: {
    code: "basic",
    name: "Basic",
    priceMonth: 299000,
    priceYear: 2990000,
    tagline: "Untuk toko yang baru mulai tampil di TryLens",
    limits: { frames: 50 },
    features: { advancedAnalytics: false, featuredStore: false, sponsoredFrame: false },
    perks: [
      "Profil toko & etalase hingga 50 frame",
      "Virtual Try-On untuk semua frame",
      "Permintaan konsultasi + hasil scan wajah pelanggan",
      "Analitik dasar (ikhtisar)",
      "Bisa memesan slot iklan banner (per minggu)"
    ]
  },
  pro: {
    code: "pro",
    name: "Pro",
    priceMonth: 799000,
    priceYear: 7990000,
    tagline: "Untuk toko yang ingin tumbuh lebih cepat",
    limits: { frames: 9999 },
    features: { advancedAnalytics: true, featuredStore: true, sponsoredFrame: true },
    perks: [
      "Semua fitur Basic",
      "Frame tanpa batas",
      "Analitik Lanjutan (pengunjung, produk, try-on)",
      "Bisa memesan Highlighted Brand (per minggu)",
      "Bisa memesan Sponsored Frame (per minggu)"
    ]
  }
};

export const INTERVALS = {
  month: { key: "month", label: "Bulanan", per: "bulan", months: 1 },
  year: { key: "year", label: "Tahunan", per: "tahun", months: 12 }
};

export const planPrice = (code, interval = "month") => (interval === "year" ? PLANS[code].priceYear : PLANS[code].priceMonth);
/** Penghematan paket tahunan dibanding 12× bulanan. */
export const yearlySaving = (code) => PLANS[code].priceMonth * 12 - PLANS[code].priceYear;
export const planLabel = (code, interval) => `Paket ${PLANS[code].name} (${INTERVALS[interval].label})`;

export const LOCKED_FEATURES = [
  { key: "advancedAnalytics", label: "Analitik Lanjutan" },
  { key: "featuredStore", label: "Highlighted Brand" },
  { key: "sponsoredFrame", label: "Sponsored Frame" }
];

export const can = (planCode, feature) => !!PLANS[planCode]?.features[feature];

/* ------------------------------------------------- Iklan & Premium (per minggu) */
// Angka awal dari keputusan bisnis: banner mulai Rp500.000/mgg, Highlighted Brand Rp350.000/mgg per slot,
// Sponsored Frame Rp200.000–800.000/mgg. Harga penempatan di antaranya adalah placeholder — sesuaikan.
export const AD_TYPES = {
  banner: {
    key: "banner",
    label: "Slot Iklan Banner",
    tab: "banners",
    placements: [
      { key: "mitra", label: "Halaman Mitra", price: 500000 },
      { key: "beranda", label: "Beranda TryLens", price: 900000 }
    ]
  },
  highlighted: {
    key: "highlighted",
    label: "Highlighted Brand",
    tab: "highlighted",
    feature: "featuredStore",
    price: 350000,
    slots: 6,
    takenSlots: [2, 5] // slot yang sudah dipesan toko lain (mock)
  },
  sponsored: {
    key: "sponsored",
    label: "Sponsored Frame",
    tab: "sponsored",
    feature: "sponsoredFrame",
    maxFrames: 3,
    placements: [
      { key: "kategori", label: "Halaman Kategori", price: 200000 },
      { key: "pencarian", label: "Hasil Pencarian", price: 450000 },
      { key: "beranda", label: "Rekomendasi Beranda", price: 800000 }
    ]
  }
};
export const MAX_WEEKS = 8;

export const dayStr = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const addDays = (yyyyMmDd, n) => {
  const d = new Date(yyyyMmDd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Tanggal berakhir = mulai + (minggu × 7 − 1) hari. */
export const endsOn = (startsOn, weeks) => addDays(startsOn, weeks * 7 - 1);

export function orderStatus(order, today = dayStr()) {
  if (order.status !== "paid") return order.status;
  if (order.endsOn < today) return "ended";
  if (order.startsOn > today) return "scheduled";
  return "active";
}
/** Pesanan iklan yang sedang tayang untuk satu jenis. */
export const activeOrders = (acc, type) => (acc.adOrders || []).filter((o) => o.type === type && orderStatus(o) === "active");
export const activeHighlight = (acc) => activeOrders(acc, "highlighted")[0] || null;
export const sponsoredIds = (acc) => [...new Set(activeOrders(acc, "sponsored").flatMap((o) => o.frameIds))].filter((id) => acc.frames.some((f) => f.id === id));

/* ---------------------------------------------------------------- util */

export const fmtNum = (n) => Math.round(n).toLocaleString("id-ID");
export const fmtRp = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");
export const fmtDate = (iso, opts = { day: "numeric", month: "long", year: "numeric" }) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", opts) : "-";

export function addMonths(iso, n) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

/* ------------------------------------------------------------ akun seed */

export const DEMO_PASSWORD = "Partner123!";

function defaultData() {
  return {
    subscription: null,
    store: null,
    frames: [],
    collections: [],
    banners: [],
    adOrders: [],
    invoices: [],
    vto: { enabled: true, share: true, tint: "clear" },
    storeSettings: {
      visible: true,
      showContact: true,
      autoReply: "Terima kasih sudah menghubungi kami! Tim kami akan membalas dalam 1 jam pada jam operasional.",
      hours: "Senin–Sabtu, 09.00–20.00"
    },
    notif: {
      newLead: { email: true, whatsapp: true, app: true },
      billing: { email: true, whatsapp: false, app: true },
      weekly: { email: true, whatsapp: false, app: false },
      promo: { email: false, whatsapp: false, app: true }
    }
  };
}

function partnerAccount({ id, name, email, merchantId, plan }) {
  const m = MERCHANTS.find((x) => x.id === merchantId);
  const frames = PRODUCTS.filter((p) => p.merchantId === merchantId).map((p, i) => ({
    id: p.id,
    name: p.name,
    style: p.style,
    colorKey: p.colorKey,
    category: p.cat,
    price: p.price,
    oldPrice: p.oldPrice || null,
    stock: 4 + ((i * 7) % 19),
    published: true,
    vto: true
  }));
  const ids = frames.map((f) => f.id);
  const base = defaultData();

  return {
    ...base,
    id,
    name,
    email,
    password: DEMO_PASSWORD,
    phone: m.phone,
    createdAt: "2026-08-20T09:00:00.000Z",
    subscription: {
      plan,
      status: "active",
      startedAt: "2026-09-20T00:00:00.000Z",
      interval: "month",
      currentPeriodEnd: "2026-10-20T00:00:00.000Z",
      nextBillingAt: "2026-10-20T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      pendingPlan: null
    },
    store: {
      merchantId,
      name: m.name,
      description: `${m.name} — toko optik lokal di ${m.city} dengan koleksi frame pilihan dan layanan pemeriksaan mata.`,
      city: m.city,
      province: m.province,
      address: "",
      whatsapp: m.whatsapp,
      phone: m.phone,
      initials: m.initials,
      color: m.color,
      links: { ...m.links },
      setupCompletedAt: "2026-08-21T09:00:00.000Z"
    },
    frames,
    collections: [
      { id: "c1", name: "Koleksi Terbaru", published: true, frameIds: ids.slice(0, 2) },
      { id: "c2", name: "Promo Bulan Ini", published: true, frameIds: ids.slice(1, 4) }
    ],
    banners: [
      { id: "b1", title: "Promo Frame Terbaru", subtitle: "Diskon hingga 33% untuk frame pilihan", cta: "Lihat Promo", placement: "mitra", orderId: `AO-20260901-${String(id.slice(1)).padStart(4, "0")}`, status: "active", startsAt: "2026-09-01", endsAt: "2026-09-28", impressions: 12840, clicks: 412 }
    ],
    adOrders: [
      { id: `AO-20260901-${String(id.slice(1)).padStart(4, "0")}`, type: "banner", placement: "mitra", label: "Slot Iklan Banner — Halaman Mitra", weeks: 4, unit: 500000, total: 2000000, startsOn: "2026-09-01", endsOn: "2026-09-28", status: "paid", frameIds: [], slot: null },
      ...(plan === "pro"
        ? [
            { id: "AO-20260920-0002", type: "highlighted", placement: null, label: "Highlighted Brand — Slot 1", weeks: 2, unit: 350000, total: 700000, startsOn: "2026-09-20", endsOn: "2026-10-03", status: "paid", frameIds: [], slot: 1 },
            { id: "AO-20260920-0003", type: "sponsored", placement: "pencarian", label: "Sponsored Frame — Hasil Pencarian", weeks: 2, unit: 450000, total: 900000, startsOn: "2026-09-20", endsOn: "2026-10-03", status: "paid", frameIds: ids.slice(0, 1), slot: null }
          ]
        : [])
    ],
    invoices: [
      { id: `INV-20260920-${String(id.slice(1)).padStart(4, "0")}`, date: "2026-09-20", kind: "subscription", label: planLabel(plan, "month"), plan, amount: planPrice(plan, "month"), status: "paid", method: "QRIS" },
      { id: `INV-20260901-${String(Number(id.slice(1)) + 10).padStart(4, "0")}`, date: "2026-09-01", kind: "ad", label: "Slot Iklan Banner — Halaman Mitra (4 minggu)", amount: 2000000, status: "paid", method: "VA BCA", tab: "banners" },
      ...(plan === "pro"
        ? [
            { id: "INV-20260920-0013", date: "2026-09-20", kind: "ad", label: "Highlighted Brand — Slot 1 (2 minggu)", amount: 700000, status: "paid", method: "QRIS", tab: "highlighted" },
            { id: "INV-20260920-0014", date: "2026-09-20", kind: "ad", label: "Sponsored Frame — Hasil Pencarian (2 minggu)", amount: 900000, status: "paid", method: "QRIS", tab: "sponsored" }
          ]
        : [])
    ]
  };
}

export function seedAccounts() {
  return {
    "basic@optikkusuma.id": partnerAccount({ id: "u1", name: "Ratna Kusuma", email: "basic@optikkusuma.id", merchantId: "m1", plan: "basic" }),
    "pro@lensakita.id": partnerAccount({ id: "u2", name: "Andra Lensa", email: "pro@lensakita.id", merchantId: "m6", plan: "pro" }),
    // Akun tanpa langganan: untuk mencoba alur onboarding lengkap.
    "baru@optikbaru.id": {
      ...defaultData(),
      id: "u3",
      name: "Budi Santoso",
      email: "baru@optikbaru.id",
      password: DEMO_PASSWORD,
      phone: "",
      createdAt: "2026-09-20T07:00:00.000Z"
    }
  };
}

export const DEMO_ACCOUNTS = [
  { email: "basic@optikkusuma.id", label: "Paket Basic (Optik Kusuma)" },
  { email: "pro@lensakita.id", label: "Paket Pro (Lensa Kita)" },
  { email: "baru@optikbaru.id", label: "Belum berlangganan (alur onboarding)" }
];

/* ------------------------------------------------------------ analitik */

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PERIODS = [
  { key: "today", label: "Hari ini", days: 1 },
  { key: "week", label: "Minggu ini", days: 7 },
  { key: "month", label: "Bulan ini", days: 30 }
];

/** Data analitik deterministik per toko (mock). 60 hari harian + 6 bulan untuk grafik. */
export function buildAnalytics(key, frames = [], plan = "basic") {
  const r = rng(hash(key));
  const scale = plan === "pro" ? 1.45 : 1;

  const daily = Array.from({ length: 60 }, (_, i) => {
    const wave = 1 + 0.18 * Math.sin(i / 3.2);
    const trend = 1 + i / 220;
    const views = (330 + r() * 140) * wave * trend * scale;
    return {
      storeViews: Math.round(views),
      visitors: Math.round(views * 0.72),
      productViews: Math.round(views * (0.82 + r() * 0.1)),
      vto: Math.round(views * (0.26 + r() * 0.06)),
      contacts: Math.round(views * (0.045 + r() * 0.015))
    };
  });

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const shape = [0.62, 0.71, 0.66, 0.84, 0.9, 1][i];
    const current = Math.round((14800 + r() * 1800) * shape * scale);
    const previous = Math.round(current * (0.78 + r() * 0.22));
    return { label: d.toLocaleDateString("id-ID", { month: "short" }), current, previous };
  });

  const topFrames = (frames.length ? frames : []).slice(0, 6).map((f, i) => {
    const views = Math.round((900 - i * 95 + r() * 120) * scale);
    const vto = Math.round(views * (0.34 + r() * 0.1));
    const wishlist = Math.round(views * (0.06 + r() * 0.03));
    const contacts = Math.round(vto * (0.12 + r() * 0.05));
    return { id: f.id, name: f.name, style: f.style, colorKey: f.colorKey, views, vto, wishlist, contacts };
  });

  const sources = [
    { label: "Pencarian TryLens", value: 34 },
    { label: "Beranda & Promo", value: 27 },
    { label: "Instagram", value: 18 },
    { label: "Tokopedia / Shopee", value: 12 },
    { label: "Langsung", value: 9 }
  ];
  const devices = [
    { label: "Mobile", value: 71 },
    { label: "Desktop", value: 24 },
    { label: "Tablet", value: 5 }
  ];
  const hours = Array.from({ length: 24 }, (_, h) => {
    const peak = Math.exp(-Math.pow((h - 20) / 3.2, 2)) + 0.6 * Math.exp(-Math.pow((h - 12) / 2.4, 2));
    return Math.round((40 + peak * 220 + r() * 25) * scale);
  });

  return { daily, months, topFrames, sources, devices, hours };
}

export function sumWindow(daily, days, offset, field) {
  const end = daily.length - offset;
  return daily.slice(Math.max(0, end - days), end).reduce((a, d) => a + d[field], 0);
}

export function kpiFor(daily, days, field) {
  const cur = sumWindow(daily, days, 0, field);
  const prev = sumWindow(daily, days, days, field);
  return { value: cur, delta: prev ? ((cur - prev) / prev) * 100 : 0 };
}
