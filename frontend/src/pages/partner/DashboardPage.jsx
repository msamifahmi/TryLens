import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Glasses, MessageCircle, MousePointerClick, Store } from "lucide-react";
import { Btn, Card, CardHeader, EmptyState, IconBox, Segmented, Tile } from "../../components/partner/ui.jsx";
import LineChart from "../../components/partner/LineChart.jsx";
import PlanCard from "../../components/partner/PlanCard.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";
import { PERIODS, buildAnalytics, fmtDate, fmtNum, kpiFor } from "../../data/partnerMock.js";

const KPIS = [
  { label: "Kunjungan Toko", field: "storeViews", icon: Store },
  { label: "Sesi Try-On", field: "vto", icon: Glasses },
  { label: "Klik Frame", field: "productViews", icon: MousePointerClick },
  { label: "Hubungi Toko", field: "contacts", icon: MessageCircle }
];

function KpiCard({ label, value, delta, icon }) {
  const up = delta >= 0;
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-zinc-100/60 overflow-hidden">
      <div className="rounded-2xl border-b border-zinc-200/80 bg-[#FCFCFC] p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-zinc-600 m-0 mb-2">{label}</p>
          <p className="text-[26px] leading-none font-semibold text-zinc-900 tracking-tight m-0">{fmtNum(value)}</p>
        </div>
        <IconBox icon={icon} />
      </div>
      <p className="px-4 py-2.5 m-0 text-[12px] text-zinc-500">
        <span className={`font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? "+" : ""}
          {delta.toFixed(1).replace(".", ",")}%
        </span>{" "}
        dari periode sebelumnya
      </p>
    </div>
  );
}

/** Dashboard Mitra — tata letak mengikuti referensi (KPI, grafik, permintaan, promosi aktif). */
export default function DashboardPage() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const plan = acc.subscription.plan;
  const [period, setPeriod] = useState("month");

  const data = useMemo(() => buildAnalytics(acc.email, acc.frames, plan), [acc.email, acc.frames, plan]);
  const days = PERIODS.find((p) => p.key === period).days;
  const range = `${data.months[0].label} – ${data.months[data.months.length - 1].label} ${new Date().getFullYear()}`;

  const newLeads = acc.leads.filter((l) => l.status === "new");
  const setLead = (id, status) => patch((a) => ({ ...a, leads: a.leads.map((l) => (l.id === id ? { ...l, status } : l)) }));

  const promos = [
    ...acc.banners.filter((b) => b.status === "active").map((b) => ({ id: b.id, name: b.title, since: b.startsAt, badge: `${fmtNum(b.impressions)} tayangan` })),
    ...acc.sponsored.map((id) => {
      const f = acc.frames.find((x) => x.id === id);
      return f && { id: `s-${id}`, name: `Sponsored: ${f.name}`, since: acc.subscription.startedAt, badge: "Sponsored" };
    }),
    ...(acc.highlighted.active ? [{ id: "hl", name: "Featured Store", since: acc.subscription.startedAt, badge: "Unggulan" }] : [])
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Dashboard Mitra"
          subtitle="Pantau performa toko dan virtual try-on Anda sekilas"
          right={<Segmented options={PERIODS} value={period} onChange={setPeriod} ariaLabel="Periode" />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {KPIS.map((k) => (
            <KpiCard key={k.field} label={k.label} icon={k.icon} {...kpiFor(data.daily, days, k.field)} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <Card>
            <CardHeader
              title="Ikhtisar Kunjungan"
              subtitle="Kunjungan toko dari waktu ke waktu"
              right={
                <span className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-zinc-200 bg-white text-[12.5px] font-medium text-zinc-800">
                  <CalendarDays size={15} strokeWidth={1.8} /> {range}
                </span>
              }
            />
            <LineChart data={data.months} title="Kunjungan" currentLabel="Bulan ini" previousLabel="Bulan lalu" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
              {data.topFrames.slice(0, 4).map((f) => (
                <Tile key={f.id} className="p-3.5">
                  <p className="text-[20px] font-semibold text-zinc-900 tracking-tight m-0 mb-2">{fmtNum(f.vto)}</p>
                  <div className="flex items-center justify-between gap-2 text-[11.5px] text-zinc-500">
                    <span className="truncate" title={f.name}>{f.name}</span>
                    <span className="font-medium text-zinc-900 flex-shrink-0">{f.contacts}</span>
                  </div>
                </Tile>
              ))}
            </div>
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
                      <p className="text-[14px] font-semibold text-zinc-900 m-0 truncate">{p.name}</p>
                      <p className="text-[12px] text-zinc-500 m-0">Aktif sejak {fmtDate(p.since, { day: "numeric", month: "numeric", year: "numeric" })}</p>
                    </div>
                    <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[11.5px] text-zinc-600 whitespace-nowrap">{p.badge}</span>
                  </Tile>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5 min-w-0">
          <Card>
            <CardHeader title="Permintaan Terbaru" subtitle={`${newLeads.length} calon pelanggan menunggu respons`} />
            {newLeads.length === 0 ? (
              <EmptyState title="Semua permintaan sudah ditangani" />
            ) : (
              <div className="flex flex-col gap-3">
                {newLeads.slice(0, 3).map((l, i) => (
                  <Tile key={l.id} className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-[14px] font-semibold text-zinc-900 m-0">{l.name}</p>
                      <span className="text-[12px] text-zinc-500 whitespace-nowrap">{fmtDate(l.date, { day: "numeric", month: "numeric", year: "numeric" })}</span>
                    </div>
                    <p className="text-[12px] text-zinc-500 m-0 mb-1">{l.topic}</p>
                    <p className="text-[12px] text-zinc-500 m-0 mb-3 leading-snug line-clamp-2">{l.message}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Btn size="sm" variant={i === 0 ? "primary" : "outline"} onClick={() => setLead(l.id, "responded")}>Tanggapi</Btn>
                      <Btn size="sm" variant="outline" onClick={() => setLead(l.id, "ignored")}>Abaikan</Btn>
                    </div>
                  </Tile>
                ))}
              </div>
            )}
          </Card>

          <PlanCard />
        </div>
      </div>
    </div>
  );
}
