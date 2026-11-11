import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FrameThumb } from "../../components/partner/FrameAssets.jsx";
import { Badge, Btn, Card, CardHeader, EmptyState, Field, Tile, Toggle, inputCls } from "../../components/partner/ui.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";
import { Meter, UpgradeLink } from "../../components/partner/ui.jsx";
import { STYLE_LABELS } from "../../data/mockData.js";
import { PLANS, fmtNum, vtoLimitOf } from "../../data/partnerMock.js";
import { useStoreStats, rangeOf } from "../../lib/storeStats.js";
import { BarList, KpiTile, Ring, TrendChart } from "../../components/partner/StatCharts.jsx";
import { RangePicker, SourceNote } from "./AnalyticsTabs.jsx";
import VtoSlotShop from "../../components/partner/VtoSlotShop.jsx";

/* ------------------------------------------------------------ Pustaka Frame */
export function VtoLibraryTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const active = acc.frames.filter((f) => f.vto).length;
  const limit = vtoLimitOf(acc);
  const full = active >= limit;
  const setVto = (id, v) => patch((a) => (v && a.frames.filter((f) => f.vto).length >= limit ? a : { ...a, frames: a.frames.map((f) => (f.id === id ? { ...f, vto: v } : f)) }));
  // "Aktifkan semua" mengisi kuota yang tersisa secara berurutan dari frame tertua (daftar: terbaru di atas).
  const setAll = (v) => patch((a) => {
    if (!v) return { ...a, frames: a.frames.map((f) => ({ ...f, vto: false })) };
    let room = limit - a.frames.filter((f) => f.vto).length;
    const on = new Set();
    for (const f of [...a.frames].reverse()) if (!f.vto && room > 0) { on.add(f.id); room--; }
    return { ...a, frames: a.frames.map((f) => (on.has(f.id) ? { ...f, vto: true } : f)) };
  });

  return (
    <Card>
      <CardHeader
        title="Pustaka Frame"
        subtitle={`${active} dari ${acc.frames.length} frame bisa dicoba secara virtual`}
        right={
          <div className="flex gap-2">
            <Btn size="sm" variant="outline" onClick={() => setAll(true)}>Aktifkan semua</Btn>
            <Btn size="sm" variant="outline" onClick={() => setAll(false)}>Nonaktifkan semua</Btn>
          </div>
        }
      />
      <div className="max-w-[360px] mb-4"><Meter label={`Kuota Virtual Try-On paket ${PLANS[acc.subscription.plan].name}${acc.vtoExtraSlots ? ` + ${acc.vtoExtraSlots} slot` : ""}`} value={active} max={limit} /></div>
      {full && (
        <div className="rounded-xl border border-accent-yellow bg-surface-cream px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-ink-text m-0">Kuota {limit} frame try-on terpakai. Nonaktifkan salah satu, tambah slot di bawah{acc.subscription.plan === "basic" ? ", atau upgrade ke Pro (15 frame)" : ""}.</p>
          {acc.subscription.plan === "basic" && <UpgradeLink size="sm" />}
        </div>
      )}
      <div className="mb-4"><VtoSlotShop acc={acc} /></div>
      {acc.vtoNotice && (
        <div className="rounded-xl border border-[#C5D6EA] bg-surface-blue/60 px-4 py-3 mb-4 text-[13px] text-ink-text">
          Setelah turun paket, {acc.vtoNotice.disabled} frame dinonaktifkan try-on-nya agar sesuai kuota. Frame tetap tampil di katalog.
        </div>
      )}
      {acc.frames.length === 0 ? (
        <EmptyState title="Belum ada frame" text="Tambahkan frame di menu Toko terlebih dahulu." action={<Btn as={Link} to="/partner/store/products" size="sm">Ke Produk / Frame</Btn>} />
      ) : (
        <div data-stagger className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {acc.frames.map((f) => (
            <Tile key={f.id} className="p-3">
              <div className="bg-surface-blue/60 rounded-lg p-3 mb-2.5"><FrameThumb frame={f} /></div>
              <p className="text-[13px] font-medium text-ink m-0 truncate">{f.name}</p>
              <p className="text-[11.5px] text-ink-muted m-0 mb-2.5">{STYLE_LABELS[f.style]}</p>
              <div className="flex items-center justify-between">
                <Badge tone={f.vto ? "green" : "gray"}>{f.vto ? "Try-On aktif" : "Nonaktif"}</Badge>
                <Toggle checked={f.vto} disabled={!f.vto && full} onChange={(v) => setVto(f.id, v)} label={`Try-On ${f.name}`} />
              </div>
            </Tile>
          ))}
        </div>
      )}
    </Card>
  );
}

/* --------------------------------------------------------- Try-On Analytics */
export function VtoAnalyticsTab() {
  const acc = useAccount();
  const plan = acc.subscription.plan;
  const [days, setDays] = useState(7);
  const { model: m, status, refresh } = useStoreStats(acc, days);
  const unit = days === 1 ? "kemarin" : `${rangeOf(days).label} sebelumnya`;
  const tried = m ? m.products.filter((f) => f.try > 0).length : 0;
  const top = m ? [...m.products].sort((a, b) => b.try - a.try).slice(0, 5) : [];
  return (
    <Card>
      <CardHeader title="Analitik Try-On" subtitle={`Penggunaan Virtual Try-On di toko Anda, ${rangeOf(days).long}`} right={<RangePicker days={days} setDays={setDays} />} />
      <div className="mb-4"><SourceNote status={status} model={m} refresh={refresh} /></div>
      {!m ? <div className="h-28 rounded-2xl bg-surface-blue/60 animate-pulse" aria-busy="true" /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <KpiTile label="Sesi try-on" value={m.totals.try} prev={m.prev.try} unit={unit} spark={m.series.map((s) => s.try)} />
            <KpiTile label="Frame yang dicoba" value={tried} desc={`dari ${acc.frames.filter((f) => f.vto).length} frame ber-VTO`} />
            <div className="rounded-2xl border border-[#DDE8F4] bg-white p-4 flex items-center">
              <Ring pct={m.totals.try ? ((m.totals.buy + m.totals.contact) / m.totals.try) * 100 : 0} label="Try-on → beli/hubungi" sub={`${fmtNum(m.totals.buy + m.totals.contact)} dari ${fmtNum(m.totals.try)} sesi`} />
            </div>
          </div>
          <Tile className="p-4 mb-4">
            <p className="text-[14px] font-semibold text-ink m-0 mb-2">Sesi try-on {days === 1 ? "per jam (WIB)" : "per hari"}</p>
            <TrendChart series={m.series} metric="try" label="Sesi try-on" />
          </Tile>
          <Tile className="p-4">
            <p className="text-[14px] font-semibold text-ink m-0 mb-3">Frame paling sering dicoba</p>
            <BarList unit=" sesi" rows={top.map((f) => ({ id: f.id, label: f.name, frame: f.frame, value: f.try }))} empty="Belum ada frame yang dicoba pada periode ini." />
          </Tile>
        </>
      )}
      {plan === "basic" && (
        <p className="text-[12.5px] text-ink-muted m-0 mt-3">
          Rincian per gaya dan perjalanan setelah try-on tersedia di <Link to="/partner/analytics/tryon" className="text-ink underline">Analitik → Performa Try-On</Link> (Pro).
        </p>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ VTO Settings */
const TINTS = [
  { key: "clear", label: "Bening" },
  { key: "brown", label: "Coklat" },
  { key: "gray", label: "Abu-abu" },
  { key: "blue", label: "Biru" }
];

export function VtoSettingsTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const v = acc.vto;
  const set = (part) => patch((a) => ({ ...a, vto: { ...a.vto, ...part } }));

  return (
    <Card className="max-w-[720px]">
      <CardHeader title="VTO Settings" subtitle="Atur perilaku Virtual Try-On di halaman toko Anda. Perubahan tersimpan otomatis." />
      <div className="flex flex-col divide-y divide-[#E8F0F8] rounded-xl border border-[#DDE8F4] bg-white">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-[14px] font-medium text-ink m-0">Aktifkan Virtual Try-On</p>
            <p className="text-[12.5px] text-ink-muted m-0">Tombol “Coba” tampil di setiap frame yang diaktifkan.</p>
          </div>
          <Toggle checked={v.enabled} onChange={(x) => set({ enabled: x })} label="Aktifkan Virtual Try-On" />
        </div>
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-[14px] font-medium text-ink m-0">Izinkan berbagi tangkapan layar</p>
            <p className="text-[12.5px] text-ink-muted m-0">Pelanggan bisa membagikan hasil try-on ke teman atau media sosial.</p>
          </div>
          <Toggle checked={v.share} onChange={(x) => set({ share: x })} label="Izinkan berbagi tangkapan layar" disabled={!v.enabled} />
        </div>
        <div className="p-4">
          <Field label="Warna lensa bawaan">
            <select className={`${inputCls} max-w-[240px]`} value={v.tint} onChange={(e) => set({ tint: e.target.value })} disabled={!v.enabled}>
              {TINTS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </Card>
  );
}
