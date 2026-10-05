import { useMemo, useState } from "react";
import { Download, Lightbulb, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import FrameIcon from "../../components/icons/FrameIcon.jsx";
import LineChart from "../../components/partner/LineChart.jsx";
import { ProLock } from "../../components/partner/PlanCard.jsx";
import { Btn, Card, CardHeader, Tile } from "../../components/partner/ui.jsx";
import { useAccount } from "../../store/usePartner.js";
import { STYLE_LABELS } from "../../data/mockData.js";
import { buildAnalytics, buildInsights, dailyCsv, fmtNum, fmtPct, fmtRp, metricsFor } from "../../data/partnerMock.js";

function useData() {
  const acc = useAccount();
  const plan = acc.subscription.plan;
  return useMemo(() => buildAnalytics(acc.email, acc.frames, plan), [acc.email, acc.frames, plan]);
}

function Bars({ rows, suffix = "%", extra }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-[12.5px] mb-1">
            <span className="text-ink-text">{r.label}</span>
            <span className="font-medium text-ink">{r.value}{suffix}{extra ? <span className="text-ink-muted font-normal"> · {extra(r)}</span> : null}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-blue overflow-hidden">
            <div className="h-full rounded-full bg-blue-deep" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const LOCK_TEXT = "Buka Analitik Lanjutan dengan Pro untuk melihat data pengunjung, performa produk, dan try-on secara rinci.";
const RANGES = [{ days: 7, label: "7 hari" }, { days: 30, label: "30 hari" }, { days: 60, label: "60 hari" }];

function RangePicker({ days, setDays }) {
  return (
    <div role="group" aria-label="Rentang waktu" className="inline-flex rounded-xl border border-[#DDE8F4] overflow-hidden">
      {RANGES.map((r) => (
        <button key={r.days} type="button" onClick={() => setDays(r.days)} aria-pressed={days === r.days}
          className={`h-8 px-3 text-[12.5px] font-medium ${days === r.days ? "bg-blue-deep text-white" : "bg-white text-ink-text hover:bg-surface-blue"}`}>{r.label}</button>
      ))}
    </div>
  );
}

const Delta = ({ v, inverse }) => {
  const good = inverse ? v <= 0 : v >= 0;
  const Icon = v >= 0 ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-1 text-[12px] ${good ? "text-success" : "text-red-500"}`}><Icon size={12} />{v >= 0 ? "+" : ""}{v.toFixed(1).replace(".", ",")}%</span>;
};
const dp = (a, b) => (b ? ((a - b) / b) * 100 : 0);

function Insights({ data, frames, days, limit = 6 }) {
  const [all, setAll] = useState(false);
  const list = useMemo(() => buildInsights(data, frames, days), [data, frames, days]);
  const shown = all ? list : list.slice(0, limit);
  const style = { warn: ["bg-amber-50 border-amber-200", AlertTriangle, "text-amber-600"], good: ["bg-emerald-50 border-emerald-200", TrendingUp, "text-emerald-600"], tip: ["bg-surface-blue/60 border-[#DDE8F4]", Lightbulb, "text-blue-deep"] };
  return (
    <Card className="mb-5">
      <CardHeader title="Insight untuk Anda" subtitle="Rekomendasi otomatis dari data katalog dan perilaku pengunjung" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="insights">
        {shown.map((it, i) => {
          const [box, Icon, ic] = style[it.tone];
          return (
            <div key={i} className={`rounded-xl border p-3.5 flex gap-3 ${box}`}>
              <Icon size={18} className={`${ic} flex-shrink-0 mt-0.5`} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink m-0 mb-0.5">{it.title}</p>
                <p className="text-[12.5px] text-ink-text m-0">{it.text}</p>
                {it.action && <p className="text-[11.5px] text-ink-muted m-0 mt-1">Langkah: {it.action}</p>}
              </div>
            </div>
          );
        })}
      </div>
      {list.length > limit && <div className="mt-3"><Btn variant="ghost" size="sm" onClick={() => setAll(!all)}>{all ? "Tampilkan lebih sedikit" : `Lihat semua ${list.length} insight`}</Btn></div>}
    </Card>
  );
}

function Funnel({ steps }) {
  const top = Math.max(1, steps[0].value);
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="flex justify-between text-[12.5px] mb-1">
            <span className="text-ink-text">{s.label}</span>
            <span className="font-medium text-ink">{fmtNum(s.value)}
              <span className="text-ink-muted font-normal"> · {fmtPct((s.value / top) * 100)} dari awal{i > 0 ? ` · ${fmtPct(steps[i - 1].value ? (s.value / steps[i - 1].value) * 100 : 0)} dari langkah sebelumnya` : ""}</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-blue overflow-hidden"><div className="h-full rounded-full bg-blue-deep" style={{ width: `${(s.value / top) * 100}%`, opacity: 1 - i * 0.14 }} /></div>
        </div>
      ))}
    </div>
  );
}

function downloadCsv(name, text) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const SIM_NOTE = "Data masih simulasi (belum ada pelacakan pengunjung sungguhan); insight kualitas katalog dihitung dari frame Anda yang nyata.";

/* --------------------------------------------------------------- Overview */
export function AnalyticsOverviewTab() {
  const data = useData();
  const acc = useAccount();
  const [days, setDays] = useState(30);
  const cur = metricsFor(data.daily, days), prev = metricsFor(data.daily, days, days);
  const tiles = [
    ["Kunjungan toko", "storeViews"], ["Pengunjung unik", "visitors"], ["Klik frame", "productViews"], ["Sesi try-on", "vto"],
    ["Klik beli e-commerce", "buyClicks"], ["Hubungi toko", "contacts"]
  ];
  const series = data.daily.slice(-days);
  return (
    <>
      <Card className="mb-5">
        <CardHeader title="Overview" subtitle={`Ringkasan ${days} hari terakhir dibanding ${days} hari sebelumnya`}
          right={<div className="flex items-center gap-2 flex-wrap"><RangePicker days={days} setDays={setDays} />
            <Btn variant="outline" size="sm" onClick={() => downloadCsv(`trylens-analitik-${days}hari.csv`, dailyCsv(series))}><Download size={14} /> Ekspor CSV</Btn></div>} />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {tiles.map(([label, field]) => (
            <Tile key={field} className="p-4">
              <p className="text-[12.5px] text-ink-muted m-0 mb-1.5">{label}</p>
              <p className="text-[24px] font-semibold text-ink tracking-tight m-0 mb-1">{fmtNum(cur[field])}</p>
              <Delta v={dp(cur[field], prev[field])} />
            </Tile>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[["Konversi (beli + kontak)", fmtPct(cur.convRate, 2), cur.convRate - prev.convRate, "poin"], ["Rasio try-on", fmtPct(cur.vtoRate), cur.vtoRate - prev.vtoRate, "poin"],
            ["Pengunjung kembali", fmtPct(cur.returnRate), cur.returnRate - prev.returnRate, "poin"], ["Wishlist", fmtNum(cur.wishlist), dp(cur.wishlist, prev.wishlist), "%"]].map(([l, v, d, u]) => (
            <Tile key={l} className="p-3.5 bg-surface-blue/40">
              <p className="text-[12px] text-ink-muted m-0 mb-1">{l}</p>
              <p className="text-[18px] font-semibold text-ink m-0">{v}</p>
              <p className={`text-[11.5px] m-0 ${d >= 0 ? "text-success" : "text-red-500"}`}>{d >= 0 ? "+" : ""}{d.toFixed(1).replace(".", ",")} {u === "poin" ? "poin" : "%"}</p>
            </Tile>
          ))}
        </div>
        <LineChart data={data.months} />
        <p className="text-[11.5px] text-ink-muted mt-3 mb-0">{SIM_NOTE}</p>
      </Card>
      <Insights data={data} frames={acc.frames} days={days} />
      <Card>
        <CardHeader title="Funnel Pelanggan" subtitle={`Dari pengunjung sampai membeli/menghubungi (${days} hari)`} />
        <Funnel steps={[{ label: "Pengunjung toko", value: cur.visitors }, { label: "Melihat detail frame", value: cur.productViews }, { label: "Mencoba try-on", value: cur.vto },
          { label: "Klik beli e-commerce / hubungi toko", value: cur.actions }]} />
      </Card>
    </>
  );
}

/* --------------------------------------------------------- Store Visitors */
export function AnalyticsVisitorsTab() {
  const data = useData();
  const maxH = Math.max(...data.hours);
  const dowLabel = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const dow = Array(7).fill(0);
  data.daily.slice(-28).forEach((d) => { dow[d.dow] += d.visitors / 4; });
  const maxD = Math.max(...dow);
  const m = metricsFor(data.daily, 30);
  return (
    <ProLock feature="advancedAnalytics" title="Store Visitors adalah fitur Pro" text={LOCK_TEXT}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Baru vs Kembali" subtitle="Loyalitas pengunjung (30 hari)" />
          <Bars rows={[{ label: "Pengunjung baru", value: Math.round(100 - m.returnRate) }, { label: "Pengunjung kembali", value: Math.round(m.returnRate) }]} />
        </Card>
        <Card><CardHeader title="Sumber Pengunjung" subtitle="Dari mana pelanggan datang · dan seberapa sering berujung aksi" /><Bars rows={data.sources} extra={(r) => `konversi ${fmtPct(r.conv)}`} /></Card>
        <Card><CardHeader title="Perangkat" subtitle="Perangkat yang dipakai pengunjung" /><Bars rows={data.devices} /></Card>
        <Card><CardHeader title="Bentuk Wajah Pengunjung" subtitle="Dari hasil deteksi try-on (anonim)" /><Bars rows={data.faceShapes} /></Card>
        <Card><CardHeader title="Usia" subtitle="Perkiraan kelompok usia" /><Bars rows={data.ages} /></Card>
        <Card><CardHeader title="Jenis Kelamin" subtitle="Perkiraan" /><Bars rows={data.genders} /></Card>
        <Card><CardHeader title="Kota Asal" subtitle="Lokasi pengunjung" /><Bars rows={data.cities} /></Card>
        <Card>
          <CardHeader title="Hari Paling Ramai" subtitle="Rata-rata pengunjung per hari dalam seminggu" />
          <div className="flex items-end gap-2 h-36" role="img" aria-label="Pengunjung per hari">
            {dow.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end h-full">
                <span className="text-[10.5px] text-ink-muted">{fmtNum(v)}</span>
                <div className="w-full rounded-t bg-blue-deep" style={{ height: `${(v / maxD) * 80}%` }} />
                <span className="text-[11px] text-ink-muted">{dowLabel[i]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Jam Ramai" subtitle="Kunjungan per jam (rata-rata harian)" />
          <div className="flex items-end gap-1 h-40" role="img" aria-label="Grafik kunjungan per jam">
            {data.hours.map((v, h) => (
              <div key={h} className="flex-1 flex flex-col items-center gap-1 justify-end h-full">
                <div className="w-full rounded-t bg-blue-deep" style={{ height: `${(v / maxH) * 100}%` }} title={`${h}.00 — ${v}`} />
                <span className="text-[10px] text-ink-muted">{h % 3 === 0 ? h : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ProLock>
  );
}

/* ------------------------------------------------------ Product Performance */
const COLS = [
  ["name", "Frame"], ["views", "Dilihat"], ["vto", "Try-On"], ["wishlist", "Wishlist"], ["buyClicks", "Klik beli"], ["contacts", "Hubungi"], ["conv", "Konversi"], ["trend", "Tren"]
];
export function AnalyticsProductsTab() {
  const data = useData();
  const [sort, setSort] = useState({ key: "conv", dir: -1 });
  const rows = useMemo(() => {
    const r = data.topFrames.map((f) => ({ ...f, conv: ((f.buyClicks + f.contacts) / (f.vto || 1)) * 100 }));
    return r.sort((a, b) => (sort.key === "name" ? a.name.localeCompare(b.name) : a[sort.key] - b[sort.key]) * sort.dir);
  }, [data, sort]);
  const byConv = [...data.topFrames].map((f) => ({ ...f, conv: ((f.buyClicks + f.contacts) / (f.vto || 1)) * 100 })).sort((a, b) => b.conv - a.conv);
  const best = byConv[0], worst = byConv[byConv.length - 1];
  return (
    <ProLock feature="advancedAnalytics" title="Product Performance adalah fitur Pro" text={LOCK_TEXT}>
      {best && worst && best.id !== worst.id && (
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <Tile className="p-4 border-emerald-200 bg-emerald-50"><p className="text-[12px] text-emerald-700 m-0 mb-1">Konversi terbaik</p><p className="text-[15px] font-semibold text-ink m-0">{best.name}</p><p className="text-[12.5px] text-ink-text m-0">{fmtPct(best.conv)} dari try-on · {fmtRp(best.price)}</p></Tile>
          <Tile className="p-4 border-amber-200 bg-amber-50"><p className="text-[12px] text-amber-700 m-0 mb-1">Perlu perhatian</p><p className="text-[15px] font-semibold text-ink m-0">{worst.name}</p><p className="text-[12.5px] text-ink-text m-0">{fmtPct(worst.conv)} dari try-on · periksa foto, harga, dan tautan beli</p></Tile>
        </div>
      )}
      <Card>
        <CardHeader title="Performa Produk" subtitle="Klik judul kolom untuk mengurutkan · 30 hari" right={<Btn variant="outline" size="sm" onClick={() => downloadCsv("trylens-produk.csv", ["Frame,Dilihat,Try-On,Wishlist,Klik beli,Hubungi,Konversi %,Tren %", ...rows.map((f) => [`"${f.name}"`, f.views, f.vto, f.wishlist, f.buyClicks, f.contacts, f.conv.toFixed(1), f.trend].join(","))].join("\n"))}><Download size={14} /> Ekspor CSV</Btn>} />
        <div className="overflow-x-auto rounded-xl border border-[#DDE8F4] bg-white">
          <table className="w-full text-[13px] border-collapse min-w-[760px]">
            <thead>
              <tr className="text-left text-ink-muted text-[12px]">
                {COLS.map(([k, h]) => (
                  <th key={k} className="font-medium px-4 py-3 border-b border-[#E8F0F8]" aria-sort={sort.key === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
                    <button type="button" className="font-medium hover:text-ink" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : -1 }))}>{h}{sort.key === k ? (sort.dir > 0 ? " ▲" : " ▼") : ""}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-b border-[#E8F0F8] last:border-0">
                  <td className="px-4 py-2.5"><div className="flex items-center gap-3"><span className="w-12 h-6"><FrameIcon style={f.style} colorKey={f.colorKey} className="w-full" /></span>{f.name}</div></td>
                  <td className="px-4 py-2.5">{fmtNum(f.views)}</td>
                  <td className="px-4 py-2.5">{fmtNum(f.vto)}</td>
                  <td className="px-4 py-2.5">{fmtNum(f.wishlist)}</td>
                  <td className="px-4 py-2.5">{fmtNum(f.buyClicks)}</td>
                  <td className="px-4 py-2.5">{fmtNum(f.contacts)}</td>
                  <td className="px-4 py-2.5 font-medium">{fmtPct(f.conv)}</td>
                  <td className="px-4 py-2.5"><Delta v={f.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11.5px] text-ink-muted mt-3 mb-0">Konversi = (klik beli + hubungi toko) ÷ sesi try-on. {SIM_NOTE}</p>
      </Card>
    </ProLock>
  );
}

/* ---------------------------------------------------- Try-On Performance */
export function AnalyticsTryOnTab() {
  const data = useData();
  const m = metricsFor(data.daily, 30), p = metricsFor(data.daily, 30, 30);
  const byStyle = Object.entries(
    data.topFrames.reduce((acc, f) => ({ ...acc, [f.style]: (acc[f.style] || 0) + f.vto }), {})
  ).map(([k, v]) => ({ label: STYLE_LABELS[k] || k, value: v })).sort((a, b) => b.value - a.value);
  const byColor = Object.entries(
    data.topFrames.reduce((acc, f) => ({ ...acc, [f.colorKey]: (acc[f.colorKey] || 0) + f.vto }), {})
  ).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value);
  const topTry = [...data.topFrames].sort((a, b) => b.vto - a.vto).slice(0, 5).map((f) => ({ label: f.name, value: f.vto }));

  return (
    <ProLock feature="advancedAnalytics" title="Try-On Performance adalah fitur Pro" text={LOCK_TEXT}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[["Sesi try-on", fmtNum(m.vto), dp(m.vto, p.vto)], ["Tangkapan layar", fmtNum(m.captures), dp(m.captures, p.captures)], ["Klik beli", fmtNum(m.buyClicks), dp(m.buyClicks, p.buyClicks)], ["Hubungi toko", fmtNum(m.contacts), dp(m.contacts, p.contacts)]].map(([l, v, d]) => (
          <Tile key={l} className="p-4"><p className="text-[12.5px] text-ink-muted m-0 mb-1.5">{l}</p><p className="text-[22px] font-semibold text-ink m-0 mb-1">{v}</p><Delta v={d} /></Tile>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Funnel Try-On" subtitle="Dari membuka try-on sampai membeli/menghubungi toko" />
          <Funnel steps={[{ label: "Memulai try-on", value: m.vto }, { label: "Mengambil tangkapan layar", value: m.captures }, { label: "Klik beli e-commerce", value: m.buyClicks }, { label: "Menghubungi toko", value: m.contacts }]} />
        </Card>
        <Card><CardHeader title="Frame Paling Sering Dicoba" subtitle="5 teratas (30 hari)" /><Bars suffix=" sesi" rows={topTry} /></Card>
        <Card><CardHeader title="Try-On per Gaya" subtitle="Gaya frame yang paling sering dicoba" /><Bars suffix=" sesi" rows={byStyle} /></Card>
        <Card><CardHeader title="Try-On per Warna" subtitle="Warna frame yang paling diminati" /><Bars suffix=" sesi" rows={byColor} /></Card>
      </div>
      <p className="text-[11.5px] text-ink-muted mt-3 mb-0">{SIM_NOTE}</p>
    </ProLock>
  );
}
