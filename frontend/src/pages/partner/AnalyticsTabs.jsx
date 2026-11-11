import { useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { ProLock } from "../../components/partner/PlanCard.jsx";
import { Btn, Card, CardHeader, Tile } from "../../components/partner/ui.jsx";
import { BarList, Change, FunnelViz, HourBars, InsightCards, KpiTile, Ring, TrendChart, useWeekday } from "../../components/partner/StatCharts.jsx";
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
      dari pengunjung TryLens, diperbarui otomatis tiap 20 detik{model?.trackingSince ? ` · pencatatan mulai ${new Date(model.trackingSince + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "UTC" })}` : ""}.
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

/* --------------------------------------------------------------- Ikhtisar */
export function AnalyticsOverviewTab() {
  const { days, setDays, model: m, status, refresh } = useStats();
  const [metric, setMetric] = useState("view");
  const tiles = ["store", "view", "try", "buy", "contact", "wish"];
  const insights = useMemo(() => storeInsights(m), [m]);
  const top = m ? [...m.products].sort((a, b) => b.view + b.try * 2 - (a.view + a.try * 2)).slice(0, 5) : [];
  return (
    <>
      <Card className="mb-5">
        <CardHeader title="Ikhtisar" subtitle={`Apa yang terjadi di toko Anda ${rangeOf(days).long}, dibanding ${unitOf(days)}`}
          right={<div className="flex items-center gap-2 flex-wrap"><RangePicker days={days} setDays={setDays} />
            {m && <Btn variant="outline" size="sm" onClick={() => downloadCsv(`trylens-analitik-${days}hari.csv`, csvOf(m))}><Download size={14} /> Ekspor CSV</Btn>}</div>} />
        <div className="mb-4"><SourceNote status={status} model={m} refresh={refresh} /></div>
        {!m ? <Loading /> : (
          <>
            <p className="text-[12.5px] text-ink-muted m-0 mb-2">Ketuk salah satu kartu untuk melihat grafiknya.</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {tiles.map((k) => (
                <KpiTile key={k} label={METRICS[k].label} value={m.totals[k]} prev={m.prev[k]} unit={unitOf(days)} active={metric === k} onClick={() => setMetric(k)}
                  spark={m.series.map((s) => s[k])} />
              ))}
            </div>
            <div className="rounded-2xl border border-[#DDE8F4] bg-white p-4">
              <p className="text-[14px] font-semibold text-ink m-0">{METRICS[metric].label} {days === 1 ? "per jam (WIB)" : "per hari"}</p>
              <p className="text-[12px] text-ink-muted m-0 mb-2">Menunjukkan {METRICS[metric].desc}.</p>
              <TrendChart series={m.series} metric={metric} label={METRICS[metric].label} />
            </div>
          </>
        )}
      </Card>
      {m && (
        <>
          <Card className="mb-5">
            <CardHeader title="Insight untuk Anda" subtitle="Dibaca otomatis dari angka di atas, dalam bahasa sehari-hari" />
            <InsightCards items={insights} />
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader title="Perjalanan Pengunjung" subtitle="Dari melihat frame sampai membeli atau menghubungi toko" />
              <FunnelViz steps={[
                { label: "Melihat frame", value: m.totals.view, noun: "kali frame dilihat" },
                { label: "Mencoba virtual", value: m.totals.try, verb: "dicoba di wajah" },
                { label: "Klik beli / hubungi", value: m.totals.buy + m.totals.contact, verb: "berlanjut ke tombol beli atau WhatsApp" }
              ]} />
            </Card>
            <Card>
              <CardHeader title="Frame Paling Diminati" subtitle={`Dilihat + dicoba, ${rangeOf(days).long}`} />
              <BarList rows={top.map((f) => ({ id: f.id, label: f.name, frame: f.frame, value: f.view + f.try, sub: `${fmtNum(f.try)} dicoba` }))} unit="" empty="Belum ada frame yang dilihat pada periode ini." />
            </Card>
          </div>
        </>
      )}
    </>
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
