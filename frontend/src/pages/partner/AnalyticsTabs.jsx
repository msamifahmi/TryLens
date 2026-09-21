import { useMemo } from "react";
import FrameIcon from "../../components/icons/FrameIcon.jsx";
import LineChart from "../../components/partner/LineChart.jsx";
import { ProLock } from "../../components/partner/PlanCard.jsx";
import { Card, CardHeader, Tile } from "../../components/partner/ui.jsx";
import { useAccount } from "../../store/usePartner.js";
import { STYLE_LABELS } from "../../data/mockData.js";
import { buildAnalytics, fmtNum, kpiFor } from "../../data/partnerMock.js";

function useData() {
  const acc = useAccount();
  const plan = acc.subscription.plan;
  return useMemo(() => buildAnalytics(acc.email, acc.frames, plan), [acc.email, acc.frames, plan]);
}

function Bars({ rows, suffix = "%" }) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-[12.5px] mb-1">
            <span className="text-ink-text">{r.label}</span>
            <span className="font-medium text-ink">{r.value}{suffix}</span>
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

/* --------------------------------------------------------------- Overview */
export function AnalyticsOverviewTab() {
  const data = useData();
  const tiles = [
    ["Kunjungan toko", "storeViews"],
    ["Pengunjung unik", "visitors"],
    ["Klik frame", "productViews"],
    ["Sesi try-on", "vto"]
  ];
  return (
    <Card>
      <CardHeader title="Overview" subtitle="Ringkasan 30 hari terakhir dibanding 30 hari sebelumnya" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {tiles.map(([label, field]) => {
          const k = kpiFor(data.daily, 30, field);
          return (
            <Tile key={field} className="p-4">
              <p className="text-[12.5px] text-ink-muted m-0 mb-1.5">{label}</p>
              <p className="text-[24px] font-semibold text-ink tracking-tight m-0 mb-1">{fmtNum(k.value)}</p>
              <p className={`text-[12px] m-0 ${k.delta >= 0 ? "text-success" : "text-red-500"}`}>
                {k.delta >= 0 ? "+" : ""}{k.delta.toFixed(1).replace(".", ",")}%
              </p>
            </Tile>
          );
        })}
      </div>
      <LineChart data={data.months} />
    </Card>
  );
}

/* --------------------------------------------------------- Store Visitors */
export function AnalyticsVisitorsTab() {
  const data = useData();
  const maxH = Math.max(...data.hours);
  return (
    <ProLock feature="advancedAnalytics" title="Store Visitors adalah fitur Pro" text={LOCK_TEXT}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card><CardHeader title="Sumber Pengunjung" subtitle="Dari mana pelanggan menemukan toko Anda" /><Bars rows={data.sources} /></Card>
        <Card><CardHeader title="Perangkat" subtitle="Perangkat yang dipakai pengunjung" /><Bars rows={data.devices} /></Card>
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
export function AnalyticsProductsTab() {
  const data = useData();
  return (
    <ProLock feature="advancedAnalytics" title="Product Performance adalah fitur Pro" text={LOCK_TEXT}>
      <Card>
        <CardHeader title="Performa Produk" subtitle="Frame dengan interaksi tertinggi (30 hari)" />
        <div className="overflow-x-auto rounded-xl border border-[#DDE8F4] bg-white">
          <table className="w-full text-[13px] border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left text-ink-muted text-[12px]">
                {["Frame", "Dilihat", "Try-On", "Wishlist", "Hubungi", "Konversi"].map((h) => <th key={h} className="font-medium px-4 py-3 border-b border-[#E8F0F8]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.topFrames.map((f) => (
                <tr key={f.id} className="border-b border-[#E8F0F8] last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3"><span className="w-12 h-6"><FrameIcon style={f.style} colorKey={f.colorKey} className="w-full" /></span>{f.name}</div>
                  </td>
                  <td className="px-4 py-2.5">{fmtNum(f.views)}</td>
                  <td className="px-4 py-2.5">{fmtNum(f.vto)}</td>
                  <td className="px-4 py-2.5">{fmtNum(f.wishlist)}</td>
                  <td className="px-4 py-2.5">{fmtNum(f.contacts)}</td>
                  <td className="px-4 py-2.5 font-medium">{((f.contacts / f.views) * 100).toFixed(1).replace(".", ",")}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ProLock>
  );
}

/* ---------------------------------------------------- Try-On Performance */
export function AnalyticsTryOnTab() {
  const data = useData();
  const start = kpiFor(data.daily, 30, "vto").value;
  const capture = Math.round(start * 0.61);
  const contact = kpiFor(data.daily, 30, "contacts").value;
  const byStyle = Object.entries(
    data.topFrames.reduce((acc, f) => ({ ...acc, [f.style]: (acc[f.style] || 0) + f.vto }), {})
  ).map(([k, v]) => ({ label: STYLE_LABELS[k] || k, value: v })).sort((a, b) => b.value - a.value);

  return (
    <ProLock feature="advancedAnalytics" title="Try-On Performance adalah fitur Pro" text={LOCK_TEXT}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Funnel Try-On" subtitle="Dari membuka try-on sampai menghubungi toko" />
          <Bars suffix="" rows={[{ label: "Memulai try-on", value: start }, { label: "Mengambil tangkapan layar", value: capture }, { label: "Menghubungi toko", value: contact }]} />
        </Card>
        <Card>
          <CardHeader title="Try-On per Gaya" subtitle="Gaya frame yang paling sering dicoba" />
          <Bars suffix=" sesi" rows={byStyle} />
        </Card>
      </div>
    </ProLock>
  );
}
