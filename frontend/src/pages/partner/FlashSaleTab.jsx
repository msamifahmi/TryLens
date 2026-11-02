import { useMemo } from "react";
import { Zap } from "lucide-react";
import { FrameThumb } from "../../components/partner/FrameAssets.jsx";
import { Badge, Card, CardHeader, EmptyState, Toggle, inputCls } from "../../components/partner/ui.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";
import { fmtRp } from "../../data/partnerMock.js";
import { flashConfig, flashEligible, flashEndMs, flashPct } from "../../lib/flashSale.js";

/* Mitra mendaftarkan frame ke acara Flash Sale yang diatur admin TryLens: harga kilat + kuota. Tayang otomatis di beranda. */

const when = (ms) => new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function FlashSaleTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const cfg = flashConfig();
  const frames = acc.frames || [];
  const enrolled = frames.filter((f) => f.flash?.on).length;
  const setFlash = (id, fn) =>
    patch((a) => ({ ...a, frames: a.frames.map((f) => (f.id === id ? { ...f, flash: fn(f.flash || { on: false, price: Math.round((f.price * 0.8) / 1000) * 1000, quota: 20, sold: 0 }) } : f)) }));

  const rows = useMemo(() => frames, [frames]);

  return (
    <div className="max-w-[900px] grid gap-4">
      <Card>
        <CardHeader title={cfg.title} subtitle="Acara ini diatur admin TryLens. Daftarkan frame Anda, tentukan harga kilat dan kuota — tayang otomatis di beranda." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[13px]">
          <Info label="Status" value={cfg.enabled ? "Sedang berjalan" : "Dinonaktifkan admin"} tone={cfg.enabled ? "green" : "gray"} />
          <Info label="Berakhir" value={cfg.endsAt ? when(flashEndMs(cfg)) : "Reset tiap tengah malam"} />
          <Info label="Diskon minimum" value={`${cfg.minDiscount}%`} />
          <Info label="Maks. frame / toko" value={`${enrolled} / ${cfg.maxPerMerchant} terdaftar`} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Frame saya" subtitle="Aktifkan saklar, lalu isi harga kilat dan kuota." />
        {rows.length === 0 ? (
          <EmptyState title="Belum ada frame" text="Tambahkan frame di Manajemen Toko → Produk / Frame, lalu kembali ke sini." />
        ) : (
          <ul className="list-none p-0 m-0 grid gap-2.5">
            {rows.map((f) => {
              const fl = f.flash;
              const pct = fl ? flashPct(f.price, fl.price) : 0;
              const ok = fl?.on && flashEligible(f, cfg);
              const full = !fl?.on && enrolled >= cfg.maxPerMerchant;
              const problem = fl?.on && (pct <= 0 ? "Harga kilat harus lebih murah dari harga normal." : pct < cfg.minDiscount ? `Diskon minimal ${cfg.minDiscount}% (sekarang ${pct}%).` : fl.quota <= fl.sold ? "Kuota harus lebih besar dari yang sudah terjual." : f.published === false ? "Frame belum diterbitkan." : null);
              return (
                <li key={f.id} className="rounded-xl border border-[#DDE8F4] bg-white p-3 grid gap-3 md:grid-cols-[72px_1fr_auto] items-center">
                  <span className="w-[72px] hidden md:block"><FrameThumb frame={f} /></span>
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] font-semibold text-ink truncate">{f.name}</p>
                    <p className="m-0 text-[12.5px] text-ink-muted">Harga normal {fmtRp(f.price)}{fl?.on && pct > 0 ? ` · diskon ${pct}%` : ""}{fl?.on ? ` · terjual ${fl.sold}/${fl.quota}` : ""}</p>
                    {fl?.on && (
                      <div className="mt-2 grid grid-cols-2 gap-2 max-w-[360px]">
                        <label className="text-[12px] text-ink-text">Harga kilat (Rp)
                          <input className={`${inputCls} mt-1`} type="number" inputMode="numeric" min="1000" step="1000" value={fl.price}
                            onChange={(e) => setFlash(f.id, (x) => ({ ...x, price: Math.max(0, Math.round(+e.target.value || 0)) }))} />
                        </label>
                        <label className="text-[12px] text-ink-text">Kuota (unit)
                          <input className={`${inputCls} mt-1`} type="number" inputMode="numeric" min="1" max="999" value={fl.quota}
                            onChange={(e) => setFlash(f.id, (x) => ({ ...x, quota: Math.min(999, Math.max(0, Math.round(+e.target.value || 0))) }))} />
                        </label>
                      </div>
                    )}
                    {problem && <p role="alert" className="m-0 mt-1.5 text-[12px] text-red-600">{problem}</p>}
                  </div>
                  <div className="flex md:flex-col items-center md:items-end gap-2 justify-between">
                    {fl?.on ? <Badge tone={ok ? "green" : "amber"}>{ok ? "Tayang" : "Perlu diperbaiki"}</Badge> : <Badge>Tidak ikut</Badge>}
                    <Toggle checked={!!fl?.on} disabled={full} label={`Ikutkan ${f.name} ke Flash Sale`} onChange={(v) => setFlash(f.id, (x) => ({ ...x, on: v }))} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[12px] text-ink-muted m-0 mt-3 flex items-center gap-1.5"><Zap size={13} /> Perubahan langsung terlihat di beranda (mode demo: tersimpan di perangkat ini).</p>
      </Card>
    </div>
  );
}

function Info({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-surface-blue/60 px-3 py-2.5">
      <p className="m-0 text-[11.5px] text-ink-muted">{label}</p>
      <p className="m-0 mt-0.5 font-semibold text-ink">{tone ? <Badge tone={tone}>{value}</Badge> : value}</p>
    </div>
  );
}
