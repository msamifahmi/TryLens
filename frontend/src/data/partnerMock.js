// Data mock untuk area Mitra (Partner). Dipakai selama backend belum aktif.
// Struktur sengaja mengikuti tabel di backend-php/database/schema.sql,
// jadi nanti tinggal diganti dengan pemanggilan API.

import { PRODUCTS, MERCHANTS, STYLE_LABELS } from "./mockData.js";

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
    limits: { frames: Infinity, vto: 20 },
    features: { advancedAnalytics: false, featuredStore: false, sponsoredFrame: false },
    perks: [
      "Profil toko & etalase dengan frame tanpa batas",
      "Virtual Try-On untuk hingga 20 model frame",
      "Konsultasi pelanggan langsung ke WhatsApp toko (bisa disertai hasil scan wajah)",
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
    limits: { frames: Infinity, vto: Infinity },
    features: { advancedAnalytics: true, featuredStore: true, sponsoredFrame: true },
    perks: [
      "Semua fitur Basic",
      "Virtual Try-On untuk model frame tanpa batas",
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
      contacts: Math.round(views * (0.045 + r() * 0.015)),
      buyClicks: Math.round(views * (0.03 + r() * 0.014)),
      captures: Math.round(views * (0.16 + r() * 0.04)),
      wishlist: Math.round(views * (0.05 + r() * 0.02)),
      returning: Math.round(views * (0.19 + r() * 0.05))
    };
  });
  const today = new Date();
  daily.forEach((d, i) => {
    const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (daily.length - 1 - i));
    d.date = dt.toISOString().slice(0, 10);
    d.dow = dt.getDay(); // 0 = Minggu
    // akhir pekan lebih ramai di toko optik online
    const f = d.dow === 0 || d.dow === 6 ? 1.14 : d.dow === 2 || d.dow === 3 ? 0.93 : 1;
    for (const k of ["storeViews", "visitors", "productViews", "vto", "contacts", "buyClicks", "captures", "wishlist", "returning"]) d[k] = Math.round(d[k] * f);
  });

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const shape = [0.62, 0.71, 0.66, 0.84, 0.9, 1][i];
    const current = Math.round((14800 + r() * 1800) * shape * scale);
    const previous = Math.round(current * (0.78 + r() * 0.22));
    return { label: d.toLocaleDateString("id-ID", { month: "short" }), current, previous };
  });

  const topFrames = (frames.length ? frames : []).slice(0, 10).map((f, i) => {
    const views = Math.round((900 - i * 80 + r() * 120) * scale);
    const vto = Math.round(views * (0.34 + r() * 0.1));
    const wishlist = Math.round(views * (0.06 + r() * 0.03));
    const captures = Math.round(vto * (0.55 + r() * 0.12));
    const buyClicks = Math.round(vto * (0.1 + r() * 0.07));
    const contacts = Math.round(vto * (0.12 + r() * 0.05));
    const trend = Math.round((r() * 70 - 22) * 10) / 10; // % vs 30 hari sebelumnya
    return { id: f.id, name: f.name, style: f.style, colorKey: f.colorKey, price: f.price, stock: f.stock, views, vto, wishlist, captures, buyClicks, contacts, trend };
  });

  const sources = [
    { label: "Pencarian TryLens", value: 34, conv: 5.1 },
    { label: "Beranda & Promo", value: 27, conv: 3.4 },
    { label: "Instagram", value: 18, conv: 6.2 },
    { label: "Tokopedia / Shopee", value: 12, conv: 4.4 },
    { label: "Langsung", value: 9, conv: 7.0 }
  ].map((x) => ({ ...x, conv: Math.round((x.conv * (0.9 + r() * 0.25)) * 10) / 10 }));
  const devices = [
    { label: "Mobile", value: 71 },
    { label: "Desktop", value: 24 },
    { label: "Tablet", value: 5 }
  ];
  const hours = Array.from({ length: 24 }, (_, h) => {
    const peak = Math.exp(-Math.pow((h - 20) / 3.2, 2)) + 0.6 * Math.exp(-Math.pow((h - 12) / 2.4, 2));
    return Math.round((40 + peak * 220 + r() * 25) * scale);
  });

  const faceShapes = [
    { label: "Oval", value: 31 }, { label: "Bulat", value: 24 }, { label: "Kotak", value: 18 },
    { label: "Hati", value: 15 }, { label: "Lonjong", value: 12 }
  ];
  const ages = [
    { label: "< 18", value: 6 }, { label: "18–24", value: 38 }, { label: "25–34", value: 31 }, { label: "35–44", value: 16 }, { label: "45+", value: 9 }
  ];
  const genders = [{ label: "Wanita", value: 54 }, { label: "Pria", value: 43 }, { label: "Lainnya", value: 3 }];
  const cities = [
    { label: "Surakarta", value: 22 }, { label: "Yogyakarta", value: 15 }, { label: "Semarang", value: 13 },
    { label: "Jakarta", value: 12 }, { label: "Bandung", value: 8 }, { label: "Lainnya", value: 30 }
  ];
  // Gaya frame yang paling cocok per bentuk wajah (rekomendasi umum optik) — dipakai untuk celah katalog.
  const faceStyles = { Oval: ["aviator", "square", "round"], Bulat: ["square", "rect", "browline"], Kotak: ["round", "cateye", "aviator"], Hati: ["round", "rect", "aviator"], Lonjong: ["square", "browline", "round"] };

  return { daily, months, topFrames, sources, devices, hours, faceShapes, ages, genders, cities, faceStyles };
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


/** Total satu bidang untuk jendela `days` hari terakhir. */
export const totalOf = (daily, days, field, offset = 0) => sumWindow(daily, days, offset, field);

const pct = (a, b) => (b ? (a / b) * 100 : 0);
export const fmtPct = (n, d = 1) => `${n.toFixed(d).replace(".", ",")}%`;

/** Metrik turunan satu jendela waktu: funnel dan rasio. */
export function metricsFor(daily, days, offset = 0) {
  const g = (f) => sumWindow(daily, days, offset, f);
  const m = { storeViews: g("storeViews"), visitors: g("visitors"), productViews: g("productViews"), vto: g("vto"), captures: g("captures"), wishlist: g("wishlist"), buyClicks: g("buyClicks"), contacts: g("contacts"), returning: g("returning") };
  m.actions = m.buyClicks + m.contacts;
  m.convRate = pct(m.actions, m.visitors); // pengunjung → klik beli / hubungi
  m.vtoRate = pct(m.vto, m.productViews); // lihat produk → try-on
  m.returnRate = pct(m.returning, m.visitors);
  return m;
}

/**
 * Wawasan otomatis. Bagian yang memakai data frame NYATA (deskripsi, tautan beli, foto, model 3D, stok) dihitung dari
 * `frames`; bagian perilaku pengunjung memakai data analitik (saat ini simulasi — belum ada pelacakan sungguhan).
 * Mengembalikan [{ tone: "good"|"warn"|"tip", title, text, action? }] terurut berdasarkan prioritas.
 */
export function buildInsights(data, frames = [], days = 30) {
  const out = [];
  const cur = metricsFor(data.daily, days), prev = metricsFor(data.daily, days, days);
  const dPct = (a, b) => (b ? ((a - b) / b) * 100 : 0);
  const vDelta = dPct(cur.visitors, prev.visitors);

  // --- kualitas katalog (data nyata) ---
  const pub = frames.filter((f) => f.published);
  const noDesc = pub.filter((f) => !(f.description || "").trim());
  const noBuy = pub.filter((f) => !f.buy || !Object.values(f.buy).some(Boolean));
  const noModel = pub.filter((f) => f.vto && !f.media?.glb);
  const lowStock = pub.filter((f) => f.stock > 0 && f.stock <= 3);
  const out0 = pub.filter((f) => f.stock === 0);
  if (noBuy.length) out.push({ tone: "warn", title: `${noBuy.length} frame belum punya tautan e-commerce`, text: `Pelanggan yang siap membeli hanya punya WhatsApp. Tambahkan tautan Tokopedia/Shopee agar tombol “Beli lewat e-commerce” muncul. Contoh: ${noBuy.slice(0, 2).map((f) => f.name).join(", ")}.`, action: "Produk / Frame → Ubah" });
  if (noDesc.length) out.push({ tone: "warn", title: `${noDesc.length} frame belum punya deskripsi`, text: "Deskripsi membantu pelanggan memilih ukuran/bahan dan memperkaya pencarian. Isi minimal bahan, ukuran lensa, dan keunggulannya.", action: "Produk / Frame → Ubah" });
  if (noModel.length) out.push({ tone: "tip", title: `${noModel.length} frame try-on tanpa model 3D`, text: "Frame dengan model 3D sendiri memberi try-on yang lebih akurat dibanding model bawaan.", action: "Unggah .glb" });
  if (out0.length) out.push({ tone: "warn", title: `${out0.length} frame tayang tetapi stok 0`, text: `Sembunyikan atau isi stok: ${out0.slice(0, 3).map((f) => f.name).join(", ")}.`, action: "Produk / Frame" });
  else if (lowStock.length) out.push({ tone: "tip", title: `${lowStock.length} frame stok menipis (≤3)`, text: lowStock.slice(0, 3).map((f) => f.name).join(", ") + ". Siapkan restock sebelum hari ramai.", action: "Produk / Frame" });

  // --- perilaku pengunjung ---
  out.push(vDelta >= 5
    ? { tone: "good", title: `Pengunjung naik ${fmtPct(vDelta)}`, text: `${fmtNum(cur.visitors)} pengunjung dalam ${days} hari terakhir dibanding ${fmtNum(prev.visitors)} periode sebelumnya. Pertahankan dengan menayangkan frame baru tiap minggu.` }
    : vDelta <= -5
      ? { tone: "warn", title: `Pengunjung turun ${fmtPct(Math.abs(vDelta))}`, text: "Pertimbangkan Highlight/iklan banner atau perbarui foto utama frame terlaris.", action: "Promosi & Iklan" }
      : { tone: "tip", title: "Pengunjung stabil", text: `Perubahan hanya ${fmtPct(Math.abs(vDelta))} dibanding periode sebelumnya.` });

  const convDelta = cur.convRate - prev.convRate;
  out.push({ tone: convDelta >= 0 ? "good" : "warn", title: `Konversi ${fmtPct(cur.convRate, 2)} (${convDelta >= 0 ? "+" : ""}${convDelta.toFixed(2).replace(".", ",")} poin)`, text: `${fmtNum(cur.buyClicks)} klik beli e-commerce dan ${fmtNum(cur.contacts)} kontak toko dari ${fmtNum(cur.visitors)} pengunjung.` });

  if (cur.vtoRate < 28) out.push({ tone: "tip", title: `Hanya ${fmtPct(cur.vtoRate, 0)} pelihat produk yang mencoba try-on`, text: "Naikkan dengan menambahkan model 3D dan menandai lebih banyak frame “Try-On aktif”.", action: "Produk / Frame" });

  const peak = data.hours.reduce((b, v, h) => (v > data.hours[b] ? h : b), 0);
  const win = (h) => `${String(h).padStart(2, "0")}.00–${String((h + 1) % 24).padStart(2, "0")}.00`;
  out.push({ tone: "tip", title: `Jam paling ramai: ${win(peak)}`, text: "Balas chat WhatsApp dan jadwalkan promo/flash sale 1–2 jam sebelumnya." });

  const dowLabel = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dow = Array(7).fill(0);
  data.daily.slice(-28).forEach((d) => { dow[d.dow] += d.visitors; });
  const best = dow.indexOf(Math.max(...dow)), worst = dow.indexOf(Math.min(...dow));
  out.push({ tone: "tip", title: `Hari terbaik ${dowLabel[best]}, tersepi ${dowLabel[worst]}`, text: `Selisih ${fmtPct(dPct(dow[best], dow[worst]), 0)}. Jadwalkan posting media sosial menjelang ${dowLabel[best]}.` });

  const src = [...data.sources].sort((a, b) => b.conv - a.conv)[0];
  const big = [...data.sources].sort((a, b) => b.value - a.value)[0];
  if (src && big && src.label !== big.label) out.push({ tone: "tip", title: `${src.label} paling berkualitas (${fmtPct(src.conv)} konversi)`, text: `Trafik terbesar justru dari ${big.label} (${big.value}%). Alihkan sebagian usaha promosi ke ${src.label}.` });

  // --- performa frame ---
  const tf = data.topFrames;
  if (tf.length >= 3) {
    const rate = (f) => pct(f.buyClicks + f.contacts, f.vto || 1);
    const stars = [...tf].sort((a, b) => rate(b) - rate(a))[0];
    out.push({ tone: "good", title: `${stars.name} konversi terbaik (${fmtPct(rate(stars))} dari try-on)`, text: "Jadikan frame ini Highlight/banner dan letakkan di urutan teratas koleksi." });
    const leaks = tf.filter((f) => f.vto > 0 && f.views > tf.reduce((a, x) => a + x.views, 0) / tf.length && rate(f) < 12);
    if (leaks[0]) out.push({ tone: "warn", title: `${leaks[0].name} ramai dilihat tetapi jarang berujung beli`, text: `Dilihat ${fmtNum(leaks[0].views)}× dengan konversi ${fmtPct(rate(leaks[0]))}. Periksa harga (${fmtRp(leaks[0].price)}), foto, deskripsi, dan tautan belinya.`, action: "Produk / Frame → Ubah" });
    const falling = [...tf].sort((a, b) => a.trend - b.trend)[0];
    if (falling.trend < -10) out.push({ tone: "warn", title: `${falling.name} menurun ${fmtPct(Math.abs(falling.trend), 0)}`, text: "Coba diskon terbatas atau perbarui fotonya." });
  }

  // --- celah katalog vs bentuk wajah pengunjung ---
  const topShape = data.faceShapes[0];
  const want = data.faceStyles[topShape.label] || [];
  const have = new Set(pub.map((f) => f.style));
  const missing = want.filter((s) => !have.has(s));
  if (pub.length && missing.length) out.push({ tone: "tip", title: `Pengunjung terbanyak berwajah ${topShape.label} (${topShape.value}%)`, text: `Gaya yang umumnya cocok: ${want.map((s) => STYLE_LABELS[s] || s).join(", ")}. Katalog Anda belum punya ${missing.map((s) => STYLE_LABELS[s] || s).join(", ")}.`, action: "Tambah frame" });

  if (data.devices[0].value >= 60) out.push({ tone: "tip", title: `${data.devices[0].value}% pengunjung memakai ${data.devices[0].label.toLowerCase()}`, text: "Pastikan foto utama jelas pada layar kecil dan tombol WhatsApp mudah dijangkau." });

  const order = { warn: 0, good: 1, tip: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

/** CSV harian (untuk Excel / Google Sheets). */
export function dailyCsv(daily) {
  const cols = [["date", "Tanggal"], ["storeViews", "Kunjungan"], ["visitors", "Pengunjung"], ["returning", "Pengunjung kembali"], ["productViews", "Klik frame"], ["vto", "Sesi try-on"], ["captures", "Tangkapan layar"], ["wishlist", "Wishlist"], ["buyClicks", "Klik beli e-commerce"], ["contacts", "Hubungi toko"]];
  return [cols.map((c) => c[1]).join(","), ...daily.map((d) => cols.map((c) => d[c[0]]).join(","))].join("\n");
}
