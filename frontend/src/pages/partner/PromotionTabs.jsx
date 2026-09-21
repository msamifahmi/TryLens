import { useState } from "react";
import { Pause, Play, Plus, Trash2 } from "lucide-react";
import FrameIcon from "../../components/icons/FrameIcon.jsx";
import { ProLock } from "../../components/partner/PlanCard.jsx";
import { Badge, Btn, Card, CardHeader, EmptyState, Field, Meter, Tile, Toggle, UpgradeLink, inputCls } from "../../components/partner/ui.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";
import { PLANS, fmtDate, fmtNum, fmtRp } from "../../data/partnerMock.js";

const STATUS = {
  active: { label: "Aktif", tone: "green" },
  pending_review: { label: "Menunggu review", tone: "amber" },
  paused: { label: "Dijeda", tone: "gray" },
  ended: { label: "Selesai", tone: "gray" },
  rejected: { label: "Ditolak", tone: "red" }
};

/* ------------------------------------------------------------- Banner Ads */
export function BannersTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const plan = acc.subscription.plan;
  const limit = PLANS[plan].limits.banners;
  const live = acc.banners.filter((b) => ["active", "pending_review"].includes(b.status)).length;
  const atLimit = live >= limit;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(null);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function save(e) {
    e.preventDefault();
    patch((a) => ({
      ...a,
      banners: [{ id: `b-${Date.now().toString(36)}`, ...form, status: "pending_review", impressions: 0, clicks: 0 }, ...a.banners]
    }));
    setForm(null);
  }
  const upd = (id, part) => patch((a) => ({ ...a, banners: a.banners.map((b) => (b.id === id ? { ...b, ...part } : b)) }));

  return (
    <Card>
      <CardHeader
        title="Banner Ads"
        subtitle="Banner tampil di beranda dan halaman Mitra TryLens setelah disetujui."
        right={<Btn size="sm" disabled={atLimit} onClick={() => setForm({ title: "", subtitle: "", cta: "Lihat Koleksi", startsAt: today, endsAt: today })}><Plus size={15} /> Buat banner</Btn>}
      />
      <div className="max-w-[360px] mb-4"><Meter label={`Banner aktif paket ${PLANS[plan].name}`} value={live} max={limit} /></div>
      {atLimit && plan === "basic" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-amber-900 m-0">Paket Basic dibatasi 1 banner aktif. Jeda banner lama atau upgrade ke Pro (hingga 5 banner).</p>
          <UpgradeLink size="sm" />
        </div>
      )}

      {form && (
        <form onSubmit={save} className="rounded-xl border border-zinc-300 bg-white p-4 mb-4 grid grid-cols-2 gap-3">
          <p className="col-span-full text-[14px] font-semibold text-zinc-900 m-0">Banner baru</p>
          <Field label="Judul *" className="col-span-2 sm:col-span-1"><input className={inputCls} value={form.title} onChange={set("title")} maxLength={40} required /></Field>
          <Field label="Teks tombol"><input className={inputCls} value={form.cta} onChange={set("cta")} maxLength={20} /></Field>
          <Field label="Sub-judul" className="col-span-2"><input className={inputCls} value={form.subtitle} onChange={set("subtitle")} maxLength={80} /></Field>
          <Field label="Mulai"><input type="date" className={inputCls} value={form.startsAt} onChange={set("startsAt")} required /></Field>
          <Field label="Berakhir"><input type="date" className={inputCls} min={form.startsAt} value={form.endsAt} onChange={set("endsAt")} required /></Field>
          <div className="col-span-full flex gap-2">
            <Btn type="submit" size="sm">Ajukan banner</Btn>
            <Btn type="button" variant="ghost" size="sm" onClick={() => setForm(null)}>Batal</Btn>
          </div>
        </form>
      )}

      {acc.banners.length === 0 ? (
        <EmptyState title="Belum ada banner" text="Buat banner pertama untuk menjangkau lebih banyak pelanggan." />
      ) : (
        <div className="flex flex-col gap-3">
          {acc.banners.map((b) => {
            const st = STATUS[b.status] || STATUS.paused;
            return (
              <Tile key={b.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5"><p className="text-[14.5px] font-semibold text-zinc-900 m-0">{b.title}</p><Badge tone={st.tone}>{st.label}</Badge></div>
                  <p className="text-[12.5px] text-zinc-500 m-0">{b.subtitle}</p>
                  <p className="text-[12px] text-zinc-400 m-0 mt-1">{fmtDate(b.startsAt, { day: "numeric", month: "short", year: "numeric" })} – {fmtDate(b.endsAt, { day: "numeric", month: "short", year: "numeric" })} · {fmtNum(b.impressions)} tayangan · {fmtNum(b.clicks)} klik</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {b.status === "active" && <Btn size="sm" variant="outline" onClick={() => upd(b.id, { status: "paused" })}><Pause size={13} /> Jeda</Btn>}
                  {b.status === "paused" && <Btn size="sm" variant="outline" disabled={atLimit} onClick={() => upd(b.id, { status: "active" })}><Play size={13} /> Aktifkan</Btn>}
                  <button className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500" aria-label={`Hapus banner ${b.title}`} onClick={() => patch((a) => ({ ...a, banners: a.banners.filter((x) => x.id !== b.id) }))}><Trash2 size={15} /></button>
                </div>
              </Tile>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------- Highlighted Brand */
export function HighlightedTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const [days, setDays] = useState(14);
  const h = acc.highlighted;
  const set = (active) =>
    patch((a) => ({ ...a, highlighted: { active, until: active ? new Date(Date.now() + days * 864e5).toISOString() : null } }));

  return (
    <ProLock feature="featuredStore" title="Highlighted Brand adalah fitur Pro" text="Buka Featured Store dengan Pro agar toko Anda tampil sebagai brand unggulan di beranda TryLens.">
      <Card className="max-w-[720px]">
        <CardHeader title="Highlighted Brand" subtitle="Tampilkan toko Anda sebagai Featured Store di bagian “Toko Optik Pilihan”." />
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-zinc-900 m-0">Featured Store {h.active && <Badge tone="green" className="ml-1">Aktif</Badge>}</p>
              <p className="text-[12.5px] text-zinc-500 m-0">{h.active ? `Aktif sampai ${fmtDate(h.until)}` : "Belum diaktifkan."}</p>
            </div>
            <Toggle checked={h.active} onChange={set} label="Aktifkan Featured Store" />
          </div>
          <Field label="Durasi penayangan">
            <select className={`${inputCls} max-w-[220px]`} value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={h.active}>
              {[7, 14, 30].map((d) => <option key={d} value={d}>{d} hari</option>)}
            </select>
          </Field>
        </div>
      </Card>
    </ProLock>
  );
}

/* --------------------------------------------------------- Sponsored Frame */
const MAX_SPONSORED = 3;
export function SponsoredTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const toggle = (id) =>
    patch((a) => ({ ...a, sponsored: a.sponsored.includes(id) ? a.sponsored.filter((x) => x !== id) : [...a.sponsored, id].slice(0, MAX_SPONSORED) }));

  return (
    <ProLock feature="sponsoredFrame" title="Sponsored Frame adalah fitur Pro" text="Buka Sponsored Frame dengan Pro agar frame pilihan Anda tampil di posisi teratas hasil pencarian dan beranda.">
      <Card>
        <CardHeader title="Sponsored Frame" subtitle={`Pilih hingga ${MAX_SPONSORED} frame untuk ditampilkan di posisi teratas. Terpilih: ${acc.sponsored.length}/${MAX_SPONSORED}.`} />
        {acc.frames.length === 0 ? (
          <EmptyState title="Belum ada frame" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {acc.frames.map((f) => {
              const on = acc.sponsored.includes(f.id);
              const full = !on && acc.sponsored.length >= MAX_SPONSORED;
              return (
                <button key={f.id} disabled={full} onClick={() => toggle(f.id)} aria-pressed={on} className={`text-left rounded-xl border bg-white p-3 transition-colors disabled:opacity-40 ${on ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200/80 hover:border-zinc-400"}`}>
                  <div className="bg-zinc-50 rounded-lg p-3 mb-2.5"><FrameIcon style={f.style} colorKey={f.colorKey} className="w-full" /></div>
                  <p className="text-[13px] font-medium text-zinc-900 m-0 truncate">{f.name}</p>
                  <p className="text-[12px] text-zinc-500 m-0 mb-1.5">{fmtRp(f.price)}</p>
                  {on ? <Badge tone="dark">Sponsored</Badge> : <span className="text-[11.5px] text-zinc-400">Klik untuk sponsori</span>}
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </ProLock>
  );
}
