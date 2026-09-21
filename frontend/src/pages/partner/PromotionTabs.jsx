import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Play, Trash2 } from "lucide-react";
import FrameIcon from "../../components/icons/FrameIcon.jsx";
import { ProLock } from "../../components/partner/PlanCard.jsx";
import { Badge, Btn, Card, CardHeader, EmptyState, Field, Tile, inputCls } from "../../components/partner/ui.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";
import { AD_TYPES, MAX_WEEKS, activeHighlight, dayStr, endsOn, fmtDate, fmtNum, fmtRp, orderStatus } from "../../data/partnerMock.js";

/* Iklan & Premium dibeli PER MINGGU (bukan bagian langganan). Alur: isi pesanan → Checkout → aktif. */

const STATUS = {
  active: { label: "Aktif", tone: "green" },
  pending_review: { label: "Menunggu review", tone: "amber" },
  paused: { label: "Dijeda", tone: "gray" },
  ended: { label: "Selesai", tone: "gray" },
  rejected: { label: "Ditolak", tone: "red" }
};
const ORDER_STATUS = { active: { label: "Tayang", tone: "green" }, scheduled: { label: "Terjadwal", tone: "amber" }, ended: { label: "Selesai", tone: "gray" } };
const shortDate = { day: "numeric", month: "short", year: "numeric" };

/** Bagian bersama: minggu + tanggal mulai + ringkasan harga + tombol lanjut. */
function OrderFooter({ unit, qty = 1, weeks, setWeeks, startsOn, setStartsOn, disabled, onOrder, note }) {
  const total = unit * weeks * qty;
  return (
    <div className="rounded-xl border border-[#DDE8F4] bg-white p-4 mt-4">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Durasi">
          <select className={inputCls} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            {Array.from({ length: MAX_WEEKS }, (_, i) => i + 1).map((w) => <option key={w} value={w}>{w} minggu</option>)}
          </select>
        </Field>
        <Field label="Mulai tayang">
          <input type="date" className={inputCls} min={dayStr()} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </Field>
      </div>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[12.5px] text-ink-muted m-0">
            {fmtRp(unit)} × {weeks} minggu{qty > 1 ? ` × ${qty} frame` : ""} · berakhir {fmtDate(endsOn(startsOn || dayStr(), weeks), shortDate)}
          </p>
          <p className="text-[22px] font-extrabold text-ink m-0">{fmtRp(total)}</p>
          {note && <p className="text-[12px] text-ink-muted m-0">{note}</p>}
        </div>
        <Btn size="lg" disabled={disabled || !startsOn} onClick={() => onOrder(total)}>Lanjut ke Pembayaran</Btn>
      </div>
    </div>
  );
}

function Placements({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Penempatan">
      {options.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)}
          className={`text-left rounded-xl border px-4 py-3 transition-colors ${value === o.key ? "border-blue-deep bg-surface-blue" : "border-[#DDE8F4] bg-white hover:border-blue"}`}>
          <span className="block text-[13.5px] font-semibold text-ink">{o.label}</span>
          <span className="block text-[12.5px] text-ink-muted">{fmtRp(o.price)} / minggu</span>
        </button>
      ))}
    </div>
  );
}

function OrderHistory({ type }) {
  const acc = useAccount();
  const orders = acc.adOrders.filter((o) => o.type === type);
  if (!orders.length) return null;
  return (
    <div className="mt-6">
      <h3 className="text-[14px] font-semibold text-ink m-0 mb-2">Riwayat pesanan</h3>
      <div className="flex flex-col gap-2">
        {orders.map((o) => {
          const st = ORDER_STATUS[orderStatus(o)] || ORDER_STATUS.ended;
          return (
            <Tile key={o.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[13.5px] font-medium text-ink m-0">{o.label}</p>
                <p className="text-[12px] text-ink-muted m-0">{fmtDate(o.startsOn, shortDate)} – {fmtDate(o.endsOn, shortDate)} · {o.weeks} minggu · {fmtRp(o.total)}</p>
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
            </Tile>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Banner Ads */
export function BannersTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const startCheckout = usePartner((s) => s.startCheckout);
  const navigate = useNavigate();
  const T = AD_TYPES.banner;
  const [placement, setPlacement] = useState(T.placements[0].key);
  const [weeks, setWeeks] = useState(1);
  const [startsOn, setStartsOn] = useState(dayStr());
  const [f, setF] = useState({ title: "", subtitle: "", cta: "Lihat Koleksi" });
  const pl = T.placements.find((p) => p.key === placement);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const upd = (id, part) => patch((a) => ({ ...a, banners: a.banners.map((b) => (b.id === id ? { ...b, ...part } : b)) }));

  function order(total) {
    startCheckout({ kind: "ad", adType: "banner", placement, weeks, unit: pl.price, qty: 1, total, startsOn, label: `${T.label} — ${pl.label}`, banner: { ...f }, backTo: "/partner/promotion/banners" });
    navigate("/partner/checkout");
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 items-start">
      <Card>
        <CardHeader title="Pesan Slot Banner" subtitle="Sewa slot per minggu, mulai Rp500.000. Banner ditinjau tim TryLens sebelum tayang." />
        <Placements options={T.placements} value={placement} onChange={setPlacement} />
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Judul *" className="col-span-2 sm:col-span-1"><input className={inputCls} value={f.title} onChange={set("title")} maxLength={40} placeholder="mis. Diskon Frame Akhir Tahun" /></Field>
          <Field label="Teks tombol"><input className={inputCls} value={f.cta} onChange={set("cta")} maxLength={20} /></Field>
          <Field label="Sub-judul" className="col-span-2"><input className={inputCls} value={f.subtitle} onChange={set("subtitle")} maxLength={80} /></Field>
        </div>
        <OrderFooter unit={pl.price} weeks={weeks} setWeeks={setWeeks} startsOn={startsOn} setStartsOn={setStartsOn} disabled={!f.title.trim()} onOrder={order} />
        <OrderHistory type="banner" />
      </Card>

      <Card>
        <CardHeader title="Banner Anda" subtitle={`${acc.banners.length} banner`} />
        {acc.banners.length === 0 ? (
          <EmptyState title="Belum ada banner" text="Pesan slot di sebelah untuk membuat banner pertama." />
        ) : (
          <div className="flex flex-col gap-3">
            {acc.banners.map((b) => {
              const st = STATUS[b.status] || STATUS.paused;
              return (
                <Tile key={b.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold text-ink m-0">{b.title}</p>
                      <p className="text-[12.5px] text-ink-muted m-0">{b.subtitle}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <p className="text-[12px] text-ink-muted m-0 mb-3">
                    {AD_TYPES.banner.placements.find((p) => p.key === b.placement)?.label || "—"} · {fmtDate(b.startsAt, shortDate)} – {fmtDate(b.endsAt, shortDate)} · {fmtNum(b.impressions)} tayangan · {fmtNum(b.clicks)} klik
                  </p>
                  <div className="flex items-center gap-1.5">
                    {b.status === "active" && <Btn size="sm" variant="outline" onClick={() => upd(b.id, { status: "paused" })}><Pause size={13} /> Jeda</Btn>}
                    {b.status === "paused" && <Btn size="sm" variant="outline" onClick={() => upd(b.id, { status: "active" })}><Play size={13} /> Aktifkan</Btn>}
                    <button className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-error" aria-label={`Hapus banner ${b.title}`} onClick={() => patch((a) => ({ ...a, banners: a.banners.filter((x) => x.id !== b.id) }))}><Trash2 size={15} /></button>
                  </div>
                </Tile>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------- Highlighted Brand */
export function HighlightedTab() {
  const acc = useAccount();
  const startCheckout = usePartner((s) => s.startCheckout);
  const navigate = useNavigate();
  const T = AD_TYPES.highlighted;
  const own = activeHighlight(acc);
  const [slot, setSlot] = useState(null);
  const [weeks, setWeeks] = useState(1);
  const [startsOn, setStartsOn] = useState(dayStr());

  function order(total) {
    startCheckout({ kind: "ad", adType: "highlighted", slot, weeks, unit: T.price, qty: 1, total, startsOn, label: `${T.label} — Slot ${slot}`, backTo: "/partner/promotion/highlighted" });
    navigate("/partner/checkout");
  }

  return (
    <ProLock feature={T.feature} title="Highlighted Brand adalah fitur Pro" text="Upgrade ke Pro untuk memesan slot Highlighted Brand dan tampil sebagai brand unggulan di beranda TryLens.">
      <Card className="max-w-[820px]">
        <CardHeader title="Highlighted Brand" subtitle={`Tampil di bagian “Toko Optik Pilihan” beranda. ${fmtRp(T.price)} per slot per minggu.`} />
        {own && (
          <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 mb-4 text-[13px] text-ink-text">
            Toko Anda tampil di <strong>Slot {own.slot}</strong> sampai {fmtDate(own.endsOn)}.
          </div>
        )}
        <p className="text-[13px] font-medium text-ink-text m-0 mb-2">Pilih slot</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5" role="radiogroup" aria-label="Slot Highlighted Brand">
          {Array.from({ length: T.slots }, (_, i) => i + 1).map((n) => {
            const taken = T.takenSlots.includes(n) || (own && own.slot === n);
            return (
              <button key={n} type="button" role="radio" aria-checked={slot === n} disabled={taken} onClick={() => setSlot(n)}
                className={`rounded-xl border py-3 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${slot === n ? "border-blue-deep bg-surface-blue" : "border-[#DDE8F4] bg-white hover:border-blue"}`}>
                <span className="block text-[15px] font-bold text-ink">Slot {n}</span>
                <span className="block text-[11.5px] text-ink-muted">{taken ? "Terisi" : "Tersedia"}</span>
              </button>
            );
          })}
        </div>
        <OrderFooter unit={T.price} weeks={weeks} setWeeks={setWeeks} startsOn={startsOn} setStartsOn={setStartsOn} disabled={!slot} onOrder={order} note={!slot ? "Pilih slot terlebih dahulu." : null} />
        <OrderHistory type="highlighted" />
      </Card>
    </ProLock>
  );
}

/* --------------------------------------------------------- Sponsored Frame */
export function SponsoredTab() {
  const acc = useAccount();
  const startCheckout = usePartner((s) => s.startCheckout);
  const navigate = useNavigate();
  const T = AD_TYPES.sponsored;
  const [placement, setPlacement] = useState(T.placements[1].key);
  const [frameIds, setFrameIds] = useState([]);
  const [weeks, setWeeks] = useState(1);
  const [startsOn, setStartsOn] = useState(dayStr());
  const pl = T.placements.find((p) => p.key === placement);
  const toggle = (id) => setFrameIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= T.maxFrames ? cur : [...cur, id]));

  function order(total) {
    startCheckout({ kind: "ad", adType: "sponsored", placement, frameIds, weeks, unit: pl.price, qty: frameIds.length, total, startsOn, label: `${T.label} — ${pl.label}`, backTo: "/partner/promotion/sponsored" });
    navigate("/partner/checkout");
  }

  return (
    <ProLock feature={T.feature} title="Sponsored Frame adalah fitur Pro" text="Upgrade ke Pro untuk memesan Sponsored Frame dan menampilkan frame pilihan di posisi teratas.">
      <Card>
        <CardHeader title="Sponsored Frame" subtitle={`Tampilkan hingga ${T.maxFrames} frame di posisi teratas. Rp200.000–800.000 per frame per minggu, tergantung penempatan.`} />
        <Placements options={T.placements} value={placement} onChange={setPlacement} />
        <p className="text-[13px] font-medium text-ink-text mt-5 mb-2">Pilih frame ({frameIds.length}/{T.maxFrames})</p>
        {acc.frames.length === 0 ? (
          <EmptyState title="Belum ada frame" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {acc.frames.map((f) => {
              const on = frameIds.includes(f.id);
              const full = !on && frameIds.length >= T.maxFrames;
              return (
                <button key={f.id} type="button" disabled={full} onClick={() => toggle(f.id)} aria-pressed={on}
                  className={`text-left rounded-xl border bg-white p-3 transition-colors disabled:opacity-40 ${on ? "border-blue-deep ring-1 ring-blue-deep" : "border-[#DDE8F4] hover:border-blue"}`}>
                  <div className="bg-surface-blue/60 rounded-lg p-3 mb-2.5"><FrameIcon style={f.style} colorKey={f.colorKey} className="w-full" /></div>
                  <p className="text-[13px] font-medium text-ink m-0 truncate">{f.name}</p>
                  <p className="text-[12px] text-ink-muted m-0 mb-1.5">{fmtRp(f.price)}</p>
                  {on ? <Badge tone="dark">Dipilih</Badge> : <span className="text-[11.5px] text-ink-muted">Klik untuk memilih</span>}
                </button>
              );
            })}
          </div>
        )}
        <OrderFooter unit={pl.price} qty={Math.max(1, frameIds.length)} weeks={weeks} setWeeks={setWeeks} startsOn={startsOn} setStartsOn={setStartsOn} disabled={frameIds.length === 0} onOrder={order} note={frameIds.length === 0 ? "Pilih minimal 1 frame." : null} />
        <OrderHistory type="sponsored" />
      </Card>
    </ProLock>
  );
}
