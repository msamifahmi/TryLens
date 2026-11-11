import { useMemo, useState } from "react";
import { Download, Eye, Pencil, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { ProLock } from "../../components/partner/PlanCard.jsx";
import { Btn, Card, CardHeader, Tile } from "../../components/partner/ui.jsx";
import { BarList, CapsuleBars, Change, CountUp, FunnelViz, HalfGauge, HeroCard, HourBars, InsightCards, KpiTile, MiniArea, Ring, STATUS_OPTIONS, StatusBadge, TrendChart, bucketize, frameStatus, useWeekday } from "../../components/partner/StatCharts.jsx";
import { FrameThumb } from "../../components/partner/FrameAssets.jsx";
import { useAccount } from "../../store/usePartner.js";
import { STYLE_LABELS } from "../../data/mockData.js";
import { fmtNum, fmtPct } from "../../data/partnerMock.js";
import { METRICS, RANGES, rangeOf, storeInsights, useStoreStats } from "../../lib/storeStats.js";

const LOCK_TEXT = "Buka Analitik Lanjutan dengan Pro untuk melihat kunjungan, performa produk, dan try-on secara rinci.";
const pct = (a, b) => (b ? (a / b) * 100 : 0);
const COLOR_LABELS = { brown: "Cokelat", black: "Hitam", gold: "Emas", tort: "Tortoise (belang)", clear: "Bening", blue: "Biru", navy: "Biru tua", red: "Merah" };

/* ---------------------------------------------------------------- bagian bersama */
export function RangePicker({ days, setDays }) {
  return (
    <div role="group" aria-label="Rentang waktu" className="inline-flex rounded-xl border border-[#DDE8F4] overflow-hidden bg-white">
      {RANGES.map((r) => (
        <button key={r.days} type="button" onClick={() => setDays(r.days)} aria-pressed={days === r.days}
          className={`h-9 px-3 text-[12.5px] font-medium transition-colors ${days === r.days ? "bg-blue-deep text-white" : "text-ink-text hover:bg-surface-blue"}`}>{r.label}</button>
      ))}
    </div>
  );
}

/** Label sumber data: nyata (dengan waktu pembaruan) atau simulasi. */
export function SourceNote({ status, model, refresh }) {
  if (status === "demo") return <p className="text-[11.5px] text-ink-muted m-0">Data contoh (simulasi): akun ini berjalan di mode demo tanpa server, jadi belum ada pengunjung sungguhan yang tercatat.</p>;
  if (status === "error") return <p className="text-[11.5px] text-error m-0">Statistik belum bisa dimuat dari server. <button type="button" className="underline" onClick={refresh}>Coba lagi</button></p>;
  return (
    <p className="text-[11.5px] text-ink-muted m-0 flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 font-semibold text-success"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />Data nyata</span>
      {model?.demo ? "+ data contoh untuk presentasi (bisa dimatikan admin)" : "dari pengunjung TryLens"}, diperbarui otomatis tiap 20 detik{model?.trackingSince ? ` · pencatatan mulai ${new Date(model.trackingSince + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "UTC" })}` : ""}.
      <button type="button" onClick={refresh} className="inline-flex items-center gap-1 text-ink underline"><RefreshCw size={11} aria-hidden="true" />Perbarui</button>
    </p>
  );
}

function useStats() {
  const acc = useAccount();
  const [days, setDays] = useState(7);
  const s = useStoreStats(acc, days);
  return { acc, days, setDays, ...s };
}

function Loading() {
  return <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-28 rounded-2xl bg-surface-blue/60 animate-pulse" />)}</div>;
}

function downloadCsv(name, text) {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvOf = (m) => [["Waktu", ...Object.values(METRICS).map((x) => x.label)].join(","), ...m.series.map((s) => [s.date || s.label, ...Object.keys(METRICS).map((k) => s[k])].join(","))].join("\n");

const unitOf = (days) => (days === 1 ? "kemarin" : `${rangeOf(days).label} sebelumnya`);

/* --------------------------------------------------------------- Overview */
const BAR_METRICS = ["try", "view", "store", "buy", "contact", "wish"];
const CATS = ["Pria", "Wanita", "Anak"];

function Panel({ title, sub, right, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-[#DDE8F4] bg-white p-4 sm:p-5 min-w-0 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="min-w-0"><h3 className="text-[15px] font-semibold text-ink m-0">{title}</h3>{sub && <p className="text-[12px] text-ink-muted m-0">{sub}</p>}</div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
const Select = ({ value, onChange, options, label }) => (
  <label className="inline-flex items-center"><span className="sr-only">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-xl border border-[#DDE8F4] bg-white px-3 text-[12.5px] font-medium text-ink-text">
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  </label>
);

export function AnalyticsOverviewTab() {
  const { acc, days, setDays, model: m, status, refresh } = useStats();
  const [metric, setMetric] = useState("try");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const insights = useMemo(() => storeInsights(m), [m]);
  const buckets = useMemo(() => (m ? bucketize(m.series, days, BAR_METRICS) : []), [m, days]);
  const unit = unitOf(days);
  const rows = useMemo(() => {
    if (!m) return [];
    const all = m.products.map((f) => ({ ...f, status: null }));
    for (const f of all) f.status = frameStatus(f, all);
    return all.sort((a, b) => b.try - a.try || b.view - a.view);
  }, [m]);
  const shown = rows.filter((f) => (filter === "all" || f.status === filter) && (!q || `${f.name} ${f.id}`.toLowerCase().includes(q.toLowerCase())));
  const cats = m ? CATS.map((c) => ({ label: `Frame ${c}`, value: m.products.filter((f) => (f.category || f.cat) === c).reduce((a, f) => a + f.try, 0) })) : [];
  const actions = m ? m.totals.buy + m.totals.contact : 0, prevActions = m ? m.prev.buy + m.prev.contact : 0;
  const tryRate = m && m.totals.view ? Math.round((m.totals.try / m.totals.view) * 100) : 0;
  const convRate = m && m.totals.try ? Math.round((actions / m.totals.try) * 100) : 0;
  const exportRows = () => downloadCsv(`trylens-aktivitas-frame-${days}hari.csv`, ["Kode,Frame,Dilihat,Dicoba,Klik beli,Hubungi,Wishlist,Status", ...shown.map((f) => [f.id, `"${f.name}"`, f.view, f.try, f.buy, f.contact, f.wish, STATUS_OPTIONS.find((s) => s.key === f.status)?.label].join(","))].join("\n"));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold text-ink m-0">Overview</h2>
          <p className="text-[12.5px] text-ink-muted m-0">Semua yang terjadi di toko Anda {rangeOf(days).long}, dibanding {unit}.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap"><RangePicker days={days} setDays={setDays} />
          {m && <Btn variant="outline" size="sm" onClick={() => downloadCsv(`trylens-analitik-${days}hari.csv`, csvOf(m))}><Download size={14} /> Ekspor CSV</Btn>}</div>
      </div>
      <SourceNote status={status} model={m} refresh={refresh} />
      {!m ? <Loading /> : (
        <>
          {/* baris 1: kartu utama · area · kapsul */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2.1fr)] gap-4">
            <div className="flex flex-col gap-4">
              <HeroCard title="Sesi Try-On" sub="Kamera menyala dengan frame Anda" value={m.totals.try} prev={m.prev.try} unit={unit} />
              <HeroCard tone="plain" title="Kunjungan Toko" sub="Halaman toko Anda dibuka" value={m.totals.store} prev={m.prev.store} unit={unit} />
            </div>
            <Panel title="Klik Beli & Hubungi" sub="Pengunjung yang lanjut ke e-commerce atau WhatsApp">
              <p className="text-[32px] leading-tight font-bold text-ink tracking-tight m-0"><CountUp value={actions} /></p>
              <p className="text-[12px] text-ink-muted m-0 mb-1">{fmtNum(m.totals.buy)} klik beli · {fmtNum(m.totals.contact)} hubungi toko</p>
              <MiniArea values={buckets.map((b) => b.buy + b.contact)} />
              <div className="mt-2"><Change cur={actions} prev={prevActions} unit={unit} /></div>
            </Panel>
            <Panel className="md:col-span-2 xl:col-span-1" title="Ringkasan Aktivitas" sub="Arahkan kursor/ketuk batang untuk melihat angkanya"
              right={<Select label="Pilih angka" value={metric} onChange={setMetric} options={BAR_METRICS.map((k) => ({ key: k, label: METRICS[k].label }))} />}>
              <CapsuleBars buckets={buckets} metric={metric} label={METRICS[metric].short} />
            </Panel>
          </div>

          {/* baris 2: angka kecil */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile label="Frame dilihat" value={m.totals.view} prev={m.prev.view} unit={unit} spark={m.series.map((s) => s.view)} />
            <KpiTile label="Masuk wishlist" value={m.totals.wish} prev={m.prev.wish} unit={unit} spark={m.series.map((s) => s.wish)} />
            <div className="rounded-2xl border border-[#DDE8F4] bg-white p-4 flex items-center"><Ring pct={tryRate} label="Lihat → coba" sub="yang melihat frame lalu mencobanya" /></div>
            <div className="rounded-2xl border border-[#DDE8F4] bg-white p-4 flex items-center"><Ring pct={convRate} label="Coba → beli/hubungi" sub="yang mencoba lalu lanjut membeli" /></div>
          </div>

          {/* baris 3: gauge kategori · tabel aktivitas frame */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,2.2fr)] gap-4">
            <Panel title="Try-On per Kategori" sub="Frame pria, wanita, atau anak yang paling sering dicoba">
              <HalfGauge parts={cats} unit="sesi" />
            </Panel>
            <Panel title="Aktivitas Frame" sub="Angka tiap frame dan statusnya, diperbarui otomatis"
              right={<div className="flex items-center gap-2 flex-wrap">
                <label className="relative"><span className="sr-only">Cari frame</span><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari frame" className="h-9 w-[150px] rounded-xl border border-[#DDE8F4] pl-8 pr-2 text-[12.5px]" /></label>
                <Select label="Filter status" value={filter} onChange={setFilter} options={[{ key: "all", label: "Semua status" }, ...STATUS_OPTIONS]} />
                <Btn variant="outline" size="sm" onClick={exportRows}><Download size={14} /> Ekspor</Btn>
              </div>}>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-[12.5px] border-collapse min-w-[560px]">
                  <thead><tr className="text-left text-ink-muted text-[11.5px] bg-surface-blue/50">
                    {["Frame", "Dilihat", "Dicoba", "Beli", "Hubungi", "Status", "Aksi"].map((h, i) => <th key={h} className={`font-medium px-2.5 py-2.5 ${i === 0 ? "rounded-l-lg" : ""} ${i === 6 ? "rounded-r-lg text-right" : ""} ${i > 0 && i < 5 ? "text-right" : ""}`}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {shown.length === 0 ? <tr><td colSpan={7} className="px-3 py-6 text-center text-ink-muted">Tidak ada frame yang cocok.</td></tr> : shown.map((f) => (
                      <tr key={f.id} className="border-b border-[#EEF3F9] last:border-0">
                        <td className="px-2.5 py-2.5"><div className="flex items-center gap-2.5 min-w-0"><span className="w-10 h-7 flex-shrink-0"><FrameThumb frame={f.frame} className="w-full h-full" /></span><span className="min-w-0"><span className="block truncate max-w-[190px] text-ink" title={f.name}>{f.name}</span><span className="block font-mono text-[10.5px] text-ink-muted">#{f.id}</span></span></div></td>
                        <td className="px-2.5 py-2.5 text-right">{fmtNum(f.view)}</td>
                        <td className="px-2.5 py-2.5 text-right font-semibold text-ink">{fmtNum(f.try)}</td>
                        <td className="px-2.5 py-2.5 text-right">{fmtNum(f.buy)}</td>
                        <td className="px-2.5 py-2.5 text-right">{fmtNum(f.contact)}</td>
                        <td className="px-2.5 py-2.5"><StatusBadge code={f.status} /></td>
                        <td className="px-2.5 py-2.5"><div className="flex justify-end gap-1">
                          <Link to="/partner/store/products" className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-blue hover:text-ink" aria-label={`Ubah ${f.name}`} title="Ubah frame"><Pencil size={14} /></Link>
                          <a href={`/produk/${encodeURIComponent(f.id)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface-blue hover:text-ink" aria-label={`Lihat ${f.name} di situs`} title="Lihat di situs"><Eye size={14} /></a>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* baris 4: insight · perjalanan pengunjung · jam ramai */}
          <Panel title="Insight untuk Anda" sub="Dibaca otomatis dari angka di atas, dalam bahasa sehari-hari"><InsightCards items={insights} /></Panel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Perjalanan Pengunjung" sub="Dari melihat frame sampai membeli atau menghubungi toko">
              <FunnelViz steps={[
                { label: "Melihat frame", value: m.totals.view, noun: "kali frame dilihat" },
                { label: "Mencoba virtual", value: m.totals.try, verb: "dicoba di wajah" },
                { label: "Klik beli / hubungi", value: actions, verb: "berlanjut ke tombol beli atau WhatsApp" }
              ]} />
            </Panel>
            <Panel title="Jam Ramai" sub={`Per jam WIB, ${rangeOf(days).long}. Batang kuning = paling ramai.`}><HourBars hours={m.hours} /></Panel>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Pengunjung Toko */
export function AnalyticsVisitorsTab() {
  const { days, setDays, model: m, status, refresh } = useStats();
  const wd = useWeekday(m?.series || [], (s) => s.store + s.view);
  return (
    <ProLock feature="advancedAnalytics" title="Pengunjung Toko adalah fitur Pro" text={LOCK_TEXT}>
      <Card className="mb-5">
        <CardHeader title="Pengunjung Toko" subtitle="Kapan toko Anda paling sering dibuka" right={<RangePicker days={days} setDays={setDays} />} />
        <div className="mb-4"><SourceNote status={status} model={m} refresh={refresh} /></div>
        {!m ? <Loading /> : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <KpiTile label="Kunjungan halaman toko" value={m.totals.store} prev={m.prev.store} unit={unitOf(days)} />
            <KpiTile label="Frame dilihat" value={m.totals.view} prev={m.prev.view} unit={unitOf(days)} />
            <KpiTile label="Masuk wishlist" value={m.totals.wish} prev={m.prev.wish} unit={unitOf(days)} />
          </div>
        )}
        {m && <div className="rounded-2xl border border-[#DDE8F4] bg-white p-4"><p className="text-[14px] font-semibold text-ink m-0 mb-2">Kunjungan toko {days === 1 ? "per jam" : "per hari"}</p><TrendChart series={m.series} metric="store" label="Kunjungan toko" /></div>}
      </Card>
      {m && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="Jam Ramai" subtitle={`Toko dibuka + frame dilihat + dicoba, per jam WIB (${rangeOf(days).long}). Batang kuning = paling ramai.`} />
            <HourBars hours={m.hours} />
          </Card>
          <Card>
            <CardHeader title="Hari Ramai" subtitle="Rata-rata kunjungan + frame dilihat per hari dalam seminggu" />
            {days < 7 ? <p className="text-[13px] text-ink-muted m-0">Pilih rentang <b>1 minggu</b> atau <b>1 bulan</b> untuk melihat hari paling ramai.</p> : <BarList rows={wd} />}
          </Card>
          <Card className="lg:col-span-2">
            <p className="text-[12.5px] text-ink-muted m-0">TryLens tidak mencatat usia, jenis kelamin, kota, atau perangkat pengunjung — hanya jumlah kunjungan dan klik, tanpa data pribadi.</p>
          </Card>
        </div>
      )}
    </ProLock>
  );
}

/* ------------------------------------------------------ Performa Produk */
const COLS = [["name", "Frame"], ["view", "Dilihat"], ["try", "Dicoba"], ["wish", "Wishlist"], ["buy", "Klik beli"], ["contact", "Hubungi"], ["conv", "Konversi"]];
export function AnalyticsProductsTab() {
  const { days, setDays, model: m, status, refresh } = useStats();
  const [sort, setSort] = useState({ key: "view", dir: -1 });
  const rows = useMemo(() => {
    if (!m) return [];
    const r = m.products.map((f) => ({ ...f, conv: pct(f.buy + f.contact, f.try) }));
    return r.sort((a, b) => (sort.key === "name" ? a.name.localeCompare(b.name) : a[sort.key] - b[sort.key]) * sort.dir);
  }, [m, sort]);
  const withTry = rows.filter((f) => f.try >= 3);
  const best = [...withTry].sort((a, b) => b.conv - a.conv)[0], worst = [...withTry].sort((a, b) => a.conv - b.conv)[0];
  return (
    <ProLock feature="advancedAnalytics" title="Performa Produk adalah fitur Pro" text={LOCK_TEXT}>
      {best && worst && best.id !== worst.id && (
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <Tile className="p-4 border-emerald-200 bg-emerald-50"><p className="text-[12px] font-semibold text-emerald-700 m-0 mb-1">Paling meyakinkan pembeli</p><p className="text-[15px] font-semibold text-ink m-0">{best.name}</p><p className="text-[12.5px] text-ink-text m-0">{Math.round(best.conv)} dari 100 orang yang mencoba lanjut membeli/menghubungi</p></Tile>
          <Tile className="p-4 border-amber-200 bg-amber-50"><p className="text-[12px] font-semibold text-amber-700 m-0 mb-1">Perlu perhatian</p><p className="text-[15px] font-semibold text-ink m-0">{worst.name}</p><p className="text-[12.5px] text-ink-text m-0">Hanya {Math.round(worst.conv)} dari 100 · periksa foto, harga, dan tautan beli</p></Tile>
        </div>
      )}
      <Card className="mb-5">
        <CardHeader title="Performa Produk" subtitle={`Klik judul kolom untuk mengurutkan · ${rangeOf(days).long}`}
          right={<div className="flex items-center gap-2 flex-wrap"><RangePicker days={days} setDays={setDays} />
            <Btn variant="outline" size="sm" disabled={!m} onClick={() => downloadCsv("trylens-produk.csv", ["Frame,Dilihat,Dicoba,Wishlist,Klik beli,Hubungi,Konversi %", ...rows.map((f) => [`"${f.name}"`, f.view, f.try, f.wish, f.buy, f.contact, f.conv.toFixed(1)].join(","))].join("\n"))}><Download size={14} /> Ekspor CSV</Btn></div>} />
        <div className="mb-3"><SourceNote status={status} model={m} refresh={refresh} /></div>
        {!m ? <Loading /> : (
          <div className="overflow-x-auto rounded-xl border border-[#DDE8F4] bg-white">
            <table className="w-full text-[13px] border-collapse min-w-[760px]">
              <thead>
                <tr className="text-left text-ink-muted text-[12px]">
                  {COLS.map(([k, h]) => (
                    <th key={k} className="font-medium px-4 py-3 border-b border-[#E8F0F8]" aria-sort={sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
                      <button type="button" className="font-medium hover:text-ink" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : -1 }))}>{h}{sort.key === k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}</button>
                    </th>
                  ))}
                  <th className="font-medium px-4 py-3 border-b border-[#E8F0F8]">Tren dilihat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="border-b border-[#E8F0F8] last:border-0">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-3"><span className="w-14 h-9 flex-shrink-0"><FrameThumb frame={f.frame} className="w-full h-full" /></span>{f.name}</div></td>
                    <td className="px-4 py-2.5">{fmtNum(f.view)}</td>
                    <td className="px-4 py-2.5">{fmtNum(f.try)}</td>
                    <td className="px-4 py-2.5">{fmtNum(f.wish)}</td>
                    <td className="px-4 py-2.5">{fmtNum(f.buy)}</td>
                    <td className="px-4 py-2.5">{fmtNum(f.contact)}</td>
                    <td className="px-4 py-2.5 font-medium">{f.try ? fmtPct(f.conv) : "–"}</td>
                    <td className="px-4 py-2.5"><Change cur={f.view} prev={f.prevView} unit="sebelumnya" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11.5px] text-ink-muted mt-3 mb-0">Konversi = (klik beli + hubungi toko) ÷ berapa kali dicoba virtual.</p>
      </Card>
      {m && (
        <Card>
          <CardHeader title="Frame Paling Sering Dilihat" subtitle={rangeOf(days).long} />
          <BarList rows={[...m.products].sort((a, b) => b.view - a.view).slice(0, 8).map((f) => ({ id: f.id, label: f.name, frame: f.frame, value: f.view, sub: `${fmtNum(f.buy + f.contact)} beli/hubungi` }))} />
        </Card>
      )}
    </ProLock>
  );
}

/* ---------------------------------------------------- Performa Try-On */
export function AnalyticsTryOnTab() {
  const { days, setDays, model: m, status, refresh } = useStats();
  const group = (key, labels) => {
    if (!m) return [];
    const o = {};
    for (const f of m.products) { const k = f[key] || "lainnya"; o[k] = (o[k] || 0) + f.try; }
    return Object.entries(o).map(([k, v]) => ({ label: labels[k] || k, value: v })).sort((a, b) => b.value - a.value);
  };
  return (
    <ProLock feature="advancedAnalytics" title="Performa Try-On adalah fitur Pro" text={LOCK_TEXT}>
      <Card className="mb-5">
        <CardHeader title="Performa Try-On" subtitle="Seberapa sering frame Anda dicoba di wajah, dan apa yang terjadi setelahnya" right={<RangePicker days={days} setDays={setDays} />} />
        <div className="mb-4"><SourceNote status={status} model={m} refresh={refresh} /></div>
        {!m ? <Loading /> : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <KpiTile label="Sesi try-on" value={m.totals.try} prev={m.prev.try} unit={unitOf(days)} spark={m.series.map((s) => s.try)} />
              <KpiTile label="Klik beli" value={m.totals.buy} prev={m.prev.buy} unit={unitOf(days)} />
              <KpiTile label="Hubungi toko" value={m.totals.contact} prev={m.prev.contact} unit={unitOf(days)} />
              <div className="rounded-2xl border border-[#DDE8F4] bg-white p-4 flex items-center">
                <Ring pct={pct(m.totals.buy + m.totals.contact, m.totals.try)} label="Coba → beli/hubungi" sub="dari yang mencoba" />
              </div>
            </div>
            <div className="rounded-2xl border border-[#DDE8F4] bg-white p-4"><p className="text-[14px] font-semibold text-ink m-0 mb-2">Sesi try-on {days === 1 ? "per jam (WIB)" : "per hari"}</p><TrendChart series={m.series} metric="try" label="Sesi try-on" /></div>
          </>
        )}
      </Card>
      {m && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="Setelah Mencoba" subtitle="Dari sesi try-on sampai beli atau menghubungi toko" />
            <FunnelViz steps={[{ label: "Mencoba virtual", value: m.totals.try, noun: "sesi try-on" }, { label: "Klik beli e-commerce", value: m.totals.buy, verb: "menekan tombol beli" }, { label: "Menghubungi toko", value: m.totals.contact, verb: "menghubungi via WhatsApp/telepon" }]} />
          </Card>
          <Card><CardHeader title="Frame Paling Sering Dicoba" subtitle={`5 teratas · ${rangeOf(days).long}`} />
            <BarList unit=" sesi" rows={[...m.products].sort((a, b) => b.try - a.try).slice(0, 5).map((f) => ({ id: f.id, label: f.name, frame: f.frame, value: f.try }))} empty="Belum ada frame yang dicoba pada periode ini." /></Card>
          <Card><CardHeader title="Try-On per Gaya" subtitle="Bentuk frame yang paling sering dicoba" /><BarList unit=" sesi" rows={group("style", STYLE_LABELS)} /></Card>
          <Card><CardHeader title="Try-On per Warna" subtitle="Warna frame yang paling diminati" /><BarList unit=" sesi" rows={group("colorKey", COLOR_LABELS)} /></Card>
        </div>
      )}
    </ProLock>
  );
}
