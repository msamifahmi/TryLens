// Analitik toko untuk dasbor Mitra (Update 45).
// Mode server: angka NYATA dari /api/stats/merchant/<id> (dicatat lib/track.js), diperbarui tiap 20 detik & saat tab aktif lagi.
// Mode demo (tanpa server / toko belum ada di server): angka contoh dari buildAnalytics, ditandai jelas sebagai simulasi.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, backend } from "../api/http.js";
import { catalogInfo } from "./catalog.js";
import { MERCHANTS, PRODUCTS } from "../data/mockData.js";
import { buildAnalytics } from "../data/partnerMock.js";

export const RANGES = [
  { days: 1, label: "1 hari", long: "hari ini" },
  { days: 7, label: "1 minggu", long: "7 hari terakhir" },
  { days: 30, label: "1 bulan", long: "30 hari terakhir" },
  { days: 60, label: "60 hari", long: "60 hari terakhir" }
];
export const rangeOf = (days) => RANGES.find((r) => r.days === days) || RANGES[2];
export const METRICS = {
  store: { label: "Kunjungan toko", short: "Kunjungan", desc: "berapa kali halaman toko Anda dibuka" },
  view: { label: "Frame dilihat", short: "Dilihat", desc: "berapa kali detail frame Anda dibuka" },
  try: { label: "Coba virtual", short: "Dicoba", desc: "berapa kali kamera try-on menyala dengan frame Anda" },
  buy: { label: "Klik beli", short: "Klik beli", desc: "berapa kali tombol Shopee/Tokopedia/dll. ditekan" },
  contact: { label: "Hubungi toko", short: "Hubungi", desc: "berapa kali tombol WhatsApp/telepon ditekan" },
  wish: { label: "Masuk wishlist", short: "Wishlist", desc: "berapa kali frame Anda disimpan ke wishlist" }
};
export const KINDS = Object.keys(METRICS);
const zero = () => Object.fromEntries(KINDS.map((k) => [k, 0]));
const pad = (n) => String(n).padStart(2, "0");

/** Bisa memakai data nyata? Situs memakai server dan tokonya ada di katalog server. */
export const canUseLive = (acc) => catalogInfo.source === "server" && backend.up && !!acc?.store?.merchantId && MERCHANTS.some((m) => m.id === acc.store.merchantId);

/** Bentuk satu model dari jawaban server (dipakai semua grafik). Diekspor untuk diuji. */
export function fromServer(s, frames = []) {
  const byId = new Map((s.products || []).map((p) => [p.id, p]));
  const list = frames.length ? frames : (s.products || []).map((p) => PRODUCTS.find((x) => x.id === p.id) || { id: p.id, name: p.id });
  const products = list.map((f) => {
    const p = byId.get(f.id) || {};
    return { ...f, frame: f, ...zero(), ...pick(p), prevView: p.prev_view || 0, prevTry: p.prev_try || 0 };
  });
  const series = s.days === 1
    ? (s.hours || []).map((h) => ({ key: `h${h.hour}`, label: `${pad(h.hour)}.00`, ...zero(), ...pick(h) }))
    : (s.series || []).map((d) => ({ key: d.day, date: d.day, label: dayLabel(d.day), ...zero(), ...pick(d) }));
  return {
    live: true, demo: !!s.demo, days: s.days, from: s.from, to: s.to, totals: { ...zero(), ...pick(s.totals) }, prev: { ...zero(), ...pick(s.prev) },
    series, hours: (s.hours || []).map((h) => ({ hour: h.hour, ...zero(), ...pick(h) })), products, trackingSince: s.trackingSince, generatedAt: s.generatedAt
  };
}
const pick = (o = {}) => Object.fromEntries(KINDS.filter((k) => typeof o[k] === "number").map((k) => [k, o[k]]));
export const dayLabel = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

/** Model simulasi (mode demo) dengan bentuk yang sama. */
export function fromDemo(acc, days) {
  const d = buildAnalytics(acc.email, acc.frames, acc.subscription?.plan);
  const map = (x) => ({ store: x.storeViews, view: x.productViews, try: x.vto, buy: x.buyClicks, contact: x.contacts, wish: x.wishlist });
  const sum = (arr) => arr.reduce((a, x) => { for (const k of KINDS) a[k] += map(x)[k]; return a; }, zero());
  const cur = d.daily.slice(-days), prev = d.daily.slice(-2 * days, -days);
  const hourTotal = d.hours.reduce((a, b) => a + b, 0) || 1;
  const t = sum(cur);
  const hours = d.hours.map((v, h) => ({ hour: h, ...Object.fromEntries(KINDS.map((k) => [k, Math.round((t[k] * v) / hourTotal)])) }));
  const series = days === 1 ? hours.map((h) => ({ key: `h${h.hour}`, label: `${pad(h.hour)}.00`, ...h })) : cur.map((x) => ({ key: x.date, date: x.date, label: dayLabel(x.date), ...map(x) }));
  const f = days / 30;
  const products = acc.frames.map((fr) => {
    const p = d.topFrames.find((x) => x.id === fr.id);
    const o = p ? { view: p.views, try: p.vto, buy: p.buyClicks, contact: p.contacts, wish: p.wishlist } : {};
    const r = Object.fromEntries(KINDS.map((k) => [k, Math.round((o[k] || 0) * f)]));
    return { ...fr, frame: fr, ...r, prevView: Math.round(r.view / (1 + (p?.trend || 0) / 100)), prevTry: Math.round(r.try / (1 + (p?.trend || 0) / 100)) };
  });
  return { live: false, days, totals: t, prev: sum(prev), series, hours, products, trackingSince: null };
}

/** Hook: { model, status: "loading"|"live"|"demo"|"error", error, refresh }. */
export function useStoreStats(acc, days) {
  const live = canUseLive(acc);
  const mid = acc?.store?.merchantId;
  const [state, setState] = useState({ status: live ? "loading" : "demo", raw: null, error: null });
  const alive = useRef(true);
  const load = useCallback(async () => {
    if (!live) return;
    try {
      const raw = await api("GET", `/api/stats/merchant/${encodeURIComponent(mid)}?days=${days}`);
      if (alive.current) setState({ status: "live", raw, error: null });
    } catch (e) {
      if (alive.current) setState((s) => ({ ...s, status: s.raw ? "live" : "error", error: e.message }));
    }
  }, [live, mid, days]);
  useEffect(() => {
    alive.current = true;
    if (!live) { setState({ status: "demo", raw: null, error: null }); return () => { alive.current = false; }; }
    setState((s) => ({ ...s, status: s.raw && s.raw.days === days ? "live" : "loading" }));
    load();
    const t = setInterval(load, 20000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { alive.current = false; clearInterval(t); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [live, days, load]);
  const model = useMemo(() => {
    if (state.status === "demo" || (!live)) return fromDemo(acc, days);
    if (state.raw && state.raw.days === days) return fromServer(state.raw, acc.frames);
    return null;
  }, [state, live, acc, days]);
  return { model, status: live ? state.status : "demo", error: state.error, refresh: load };
}

/* ---------------------------------------------------------- insight dalam bahasa sehari-hari */
const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const change = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);

/** Insight otomatis dari model (nyata atau simulasi). Setiap butir: { tone: good|warn|tip, title, text, action? }. */
export function storeInsights(m, opts = {}) {
  const out = [];
  if (!m) return out;
  const t = m.totals, p = m.prev, r = rangeOf(m.days);
  const actions = t.buy + t.contact;
  if (m.live && t.store + t.view + t.try === 0) {
    out.push({ tone: "tip", title: "Belum ada pengunjung tercatat", text: `Pada ${r.long} belum ada yang membuka toko atau frame Anda. Angka mulai terisi begitu ada pengunjung.`, action: "Bagikan tautan halaman toko TryLens Anda di Instagram/WhatsApp." });
    return out;
  }
  const ch = change(t.view + t.store, p.view + p.store);
  if (ch !== null && Math.abs(ch) >= 10) out.push(ch > 0
    ? { tone: "good", title: `Kunjungan naik ${ch}%`, text: `Toko dan frame Anda lebih sering dibuka dibanding periode sebelumnya.` }
    : { tone: "warn", title: `Kunjungan turun ${Math.abs(ch)}%`, text: `Toko dan frame Anda lebih jarang dibuka dibanding periode sebelumnya.`, action: "Coba ikutkan frame ke Flash Sale atau perbarui foto utama." });
  if (t.view >= 5) {
    const tr = pctOf(t.try, t.view);
    out.push(tr >= 30
      ? { tone: "good", title: `${tr} dari 100 orang langsung mencoba`, text: "Banyak pengunjung yang melihat frame Anda juga mencobanya di wajah — tanda frame Anda menarik." }
      : { tone: "tip", title: `Hanya ${tr} dari 100 orang mencoba`, text: "Banyak yang melihat frame, tetapi sedikit yang menyalakan coba virtual.", action: "Pastikan frame terlaris punya model 3D dan Virtual Try-On aktif." });
  }
  if (t.try >= 5) {
    const ar = pctOf(actions, t.try);
    out.push(ar >= 15
      ? { tone: "good", title: `${ar}% yang mencoba lanjut membeli/menghubungi`, text: "Setelah mencoba, banyak pengunjung menekan tombol beli atau WhatsApp." }
      : { tone: "warn", title: `Baru ${ar}% yang mencoba lanjut membeli/menghubungi`, text: "Pengunjung mencoba, tetapi jarang menekan tombol beli atau WhatsApp.", action: "Periksa harga, tautan Shopee/Tokopedia, dan nomor WhatsApp di setiap frame." });
  }
  const tried = [...m.products].filter((f) => f.try > 0).sort((a, b) => b.try - a.try);
  if (tried[0]) out.push({ tone: "good", title: `Frame favorit: ${tried[0].name}`, text: `Dicoba ${tried[0].try}× dan dilihat ${tried[0].view}× pada ${r.long}.`, action: "Jadikan frame ini foto utama promosi atau ikutkan Flash Sale." });
  const noTry = m.products.filter((f) => f.view >= 3 && f.try === 0).sort((a, b) => b.view - a.view)[0];
  if (noTry) out.push({ tone: "tip", title: `${noTry.name} dilihat tapi belum dicoba`, text: `Dilihat ${noTry.view}× tanpa sekali pun dicoba virtual.`, action: noTry.vto === false ? "Aktifkan Virtual Try-On untuk frame ini (Pustaka Frame)." : "Periksa apakah model 3D-nya sudah terpasang dengan benar." });
  const leak = m.products.filter((f) => f.try >= 3 && f.buy + f.contact === 0).sort((a, b) => b.try - a.try)[0];
  if (leak) out.push({ tone: "warn", title: `${leak.name}: dicoba, belum ada yang beli`, text: `Dicoba ${leak.try}× tetapi belum ada klik beli atau hubungi toko.`, action: "Cek apakah tautan beli sudah diisi dan harganya bersaing." });
  if (m.hours?.length) {
    const tot = m.hours.map((h) => h.store + h.view + h.try);
    const max = Math.max(...tot);
    if (max > 0) { const h = tot.indexOf(max); out.push({ tone: "tip", title: `Jam paling ramai: ${pad(h)}.00–${pad((h + 1) % 24)}.00`, text: "Pada jam ini toko Anda paling sering dikunjungi.", action: "Pastikan admin siap membalas WhatsApp di jam tersebut." }); }
  }
  if (opts.limit) return out.slice(0, opts.limit);
  return out;
}
