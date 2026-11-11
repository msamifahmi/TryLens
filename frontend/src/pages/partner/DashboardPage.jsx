import { useState } from "react";
import { Link } from "react-router-dom";
import { Glasses, MessageCircle, MousePointerClick, Store } from "lucide-react";
import { Btn, Card, CardHeader, EmptyState, IconBox, Segmented, Tile } from "../../components/partner/ui.jsx";
import PlanCard from "../../components/partner/PlanCard.jsx";
import { useAccount } from "../../store/usePartner.js";
import { activeHighlight, activeOrders, fmtDate, fmtNum } from "../../data/partnerMock.js";
import { RANGES, rangeOf, useStoreStats } from "../../lib/storeStats.js";
import { BarList, CountUp, Change, TrendChart } from "../../components/partner/StatCharts.jsx";
import { SourceNote } from "./AnalyticsTabs.jsx";

const KPIS = [
  { label: "Kunjungan Toko", field: "store", icon: Store },
  { label: "Sesi Try-On", field: "try", icon: Glasses },
  { label: "Frame Dilihat", field: "view", icon: MousePointerClick },
  { label: "Hubungi Toko", field: "contact", icon: MessageCircle }
];
const PERIODS = RANGES.map((r) => ({ key: String(r.days), label: r.label }));

function KpiCard({ label, value, prev, icon, unit }) {
  return (
    <div className="rounded-2xl border border-[#DDE8F4] bg-surface-blue/70 overflow-hidden">
      <div className="rounded-2xl border-b border-[#DDE8F4] bg-white p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-ink-text m-0 mb-2">{label}</p>
          <p className="text-[26px] leading-none font-semibold text-ink tracking-tight m-0"><CountUp value={value} /></p>
        </div>
        <IconBox icon={icon} />
      </div>
      <p className="px-4 py-2.5 m-0"><Change cur={value} prev={prev} unit={unit} /></p>
    </div>
  );
}

/** Dashboard Mitra — tata letak mengikuti referensi (KPI, grafik, permintaan, promosi aktif). */
export default function DashboardPage() {
  const acc = useAccount();
  const [period, setPeriod] = useState("7");
  const days = Number(period);
  const { model: m, status, refresh } = useStoreStats(acc, days);
  const unit = days === 1 ? "kemarin" : `${rangeOf(days).label} sebelumnya`;

  const hl = activeHighlight(acc);
  const promos = [
    ...acc.banners.filter((b) => b.status === "active").map((b) => ({ id: b.id, name: b.title, since: b.startsAt, badge: `${fmtNum(b.impressions)} tayangan` })),
    ...activeOrders(acc, "sponsored").map((o) => ({ id: o.id, name: `Sponsored: ${o.frameIds.map((id) => acc.frames.find((f) => f.id === id)?.name).filter(Boolean).join(", ") || "frame pilihan"}`, since: o.startsOn, badge: "Sponsored" })),
    ...(hl ? [{ id: hl.id, name: `Highlighted Brand — Slot ${hl.slot}`, since: hl.startsOn, badge: "Unggulan" }] : [])
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Dashboard Mitra"
          subtitle="Pantau performa toko dan virtual try-on Anda sekilas"
          right={<Segmented options={PERIODS} value={period} onChange={setPeriod} ariaLabel="Periode" />}
        />
        <div className="mb-3"><SourceNote status={status} model={m} refresh={refresh} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {KPIS.map((k) => (
            <KpiCard key={k.field} label={k.label} icon={k.icon} value={m?.totals[k.field] || 0} prev={m?.prev[k.field] || 0} unit={unit} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <Card>
            <CardHeader title="Overview Kunjungan" subtitle={`Halaman toko dibuka ${days === 1 ? "per jam" : "per hari"}, ${rangeOf(days).long}`}
              right={<Btn as={Link} to="/partner/analytics/overview" size="sm" variant="outline">Analitik lengkap</Btn>} />
            {m ? <TrendChart series={m.series} metric="store" label="Kunjungan toko" /> : <div className="h-48 rounded-xl bg-surface-blue/60 animate-pulse" />}
            {m && (
              <div className="mt-4">
                <p className="text-[13px] font-semibold text-ink m-0 mb-2">Frame paling sering dicoba</p>
                <BarList unit=" sesi" rows={[...m.products].sort((a, b) => b.try - a.try).slice(0, 4).map((f) => ({ id: f.id, label: f.name, frame: f.frame, value: f.try, sub: `${fmtNum(f.contact)} hubungi` }))} empty="Belum ada frame yang dicoba pada periode ini." />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Promosi Aktif" subtitle="Iklan dan penempatan yang sedang berjalan" />
            {promos.length === 0 ? (
              <EmptyState
                title="Belum ada promosi aktif"
                text="Buat banner iklan untuk tampil di beranda TryLens."
                action={<Btn as={Link} to="/partner/promotion/banners" size="sm">Buat banner</Btn>}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {promos.map((p) => (
                  <Tile key={p.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink m-0 truncate">{p.name}</p>
                      <p className="text-[12px] text-ink-muted m-0">Aktif sejak {fmtDate(p.since, { day: "numeric", month: "numeric", year: "numeric" })}</p>
                    </div>
                    <span className="rounded-lg bg-surface-blue px-2.5 py-1 text-[11.5px] text-ink-text whitespace-nowrap">{p.badge}</span>
                  </Tile>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5 min-w-0">
          <PlanCard />
        </div>
      </div>
    </div>
  );
}
