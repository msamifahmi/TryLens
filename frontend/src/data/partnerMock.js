// Data mock untuk area Mitra (Partner). Dipakai selama backend belum aktif.
// Struktur sengaja mengikuti tabel di backend-php/database/schema.sql,
// jadi nanti tinggal diganti dengan pemanggilan API.

import { PRODUCTS, MERCHANTS } from "./mockData.js";

/* ---------------------------------------------------------------- paket */

// Harga Pro (Rp599.000) adalah angka sementara — sesuaikan dengan keputusan bisnis.
export const PLANS = {
  basic: {
    code: "basic",
    name: "Basic",
    price: 299000,
    tagline: "Untuk toko yang baru mulai tampil di TryLens",
    limits: { frames: 50, banners: 1 },
    features: { advancedAnalytics: false, featuredStore: false, sponsoredFrame: false },
    perks: [
      "Profil toko & etalase hingga 50 frame",
      "Virtual Try-On untuk semua frame",
      "Analitik dasar (ikhtisar)",
      "1 banner iklan aktif",
      "Notifikasi permintaan pelanggan"
    ]
  },
  pro: {
    code: "pro",
    name: "Pro",
    price: 599000,
    tagline: "Untuk toko yang ingin tumbuh lebih cepat",
    limits: { frames: 9999, banners: 5 },
    features: { advancedAnalytics: true, featuredStore: true, sponsoredFrame: true },
    perks: [
      "Semua fitur Basic",
      "Frame tanpa batas",
      "Analitik Lanjutan (pengunjung, produk, try-on)",
      "Featured Store — toko tampil sebagai brand unggulan",
      "Sponsored Frame — frame tampil di posisi teratas",
      "Hingga 5 banner iklan aktif"
    ]
  }
};

export const LOCKED_FEATURES = [
  { key: "advancedAnalytics", label: "Analitik Lanjutan" },
  { key: "featuredStore", label: "Featured Store" },
  { key: "sponsoredFrame", label: "Sponsored Frame" }
];

export const can = (planCode, feature) => !!PLANS[planCode]?.features[feature];

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
    sponsored: [],
    highlighted: { active: false, until: null },
    leads: [],
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
      { id: "b1", title: "Promo Frame Terbaru", subtitle: "Diskon hingga 33% untuk frame pilihan", cta: "Lihat Promo", status: "active", startsAt: "2026-09-01", endsAt: "2026-09-30", impressions: 12840, clicks: 412 }
    ],
    sponsored: plan === "pro" ? ids.slice(0, 1) : [],
    highlighted: plan === "pro" ? { active: true, until: "2026-10-20T00:00:00.000Z" } : { active: false, until: null },
    leads: [
      { id: "l1", name: "Rina Wulandari", date: "2026-09-19", topic: "Frame Wanita · Cat Eye", message: "Tertarik dengan frame cat eye, apakah bisa dipasangi lensa minus 2,5 dan silinder?", status: "new" },
      { id: "l2", name: "Budi Hartono", date: "2026-09-18", topic: "Frame Pria · Aviator", message: "Frame aviator warna gold masih ada stok? Saya ingin ambil hari Sabtu.", status: "new" },
      { id: "l3", name: "Citra Maharani", date: "2026-09-16", topic: "Frame Anak · Round", message: "Untuk anak usia 7 tahun, ukuran frame yang cocok yang mana ya?", status: "new" },
      { id: "l4", name: "Andi Pratama", date: "2026-09-14", topic: "Promo · Flash Sale", message: "Flash sale frame Browline berlaku sampai kapan? Bisa COD?", status: "new" }
    ],
    invoices: [
      { id: `INV-20260920-${String(id.slice(1)).padStart(4, "0")}`, date: "2026-09-20", plan, amount: PLANS[plan].price, status: "paid", method: "QRIS" }
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
