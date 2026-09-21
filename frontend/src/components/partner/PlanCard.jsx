import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, Lock } from "lucide-react";
import { useAccount } from "../../store/usePartner.js";
import { INTERVALS, PLANS, LOCKED_FEATURES, can, fmtDate, fmtRp, planPrice, yearlySaving } from "../../data/partnerMock.js";
import { Btn, Badge, Segmented, UpgradeLink } from "./ui.jsx";

/** Kartu "PAKET ANDA": beda tampilan Basic (fitur terkunci + ajakan upgrade) vs Pro. */
export default function PlanCard({ className = "" }) {
  const acc = useAccount();
  const sub = acc.subscription;
  const plan = PLANS[sub.plan];
  const isPro = sub.plan === "pro";

  return (
    <section className={`rounded-2xl border border-[#DDE8F4] bg-[#F6FAFE] p-4 md:p-5 ${className}`} aria-label="Paket Anda">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted m-0 mb-2">PAKET ANDA</p>
      <div className="flex items-center gap-2 mb-0.5">
        <h3 className="text-[22px] font-bold text-ink tracking-tight m-0 uppercase">{plan.name}</h3>
        {isPro && <span className="w-6 h-6 rounded-full bg-accent-yellow text-ink flex items-center justify-center"><Crown size={13} strokeWidth={2.2} /></span>}
      </div>
      <p className="text-[14px] text-ink-text m-0 mb-3">
        <span className="font-semibold">{fmtRp(planPrice(sub.plan, sub.interval))}</span> / {INTERVALS[sub.interval].per}
      </p>

      <p className="text-[12px] text-ink-muted m-0">{sub.cancelAtPeriodEnd ? "Berakhir pada" : "Tagihan berikutnya"}</p>
      <p className="text-[13.5px] font-medium text-ink m-0 mb-3.5">{fmtDate(sub.nextBillingAt)}</p>

      <Btn as={Link} to="/partner/subscription/current" variant="outline" className="w-full">
        Kelola Langganan
      </Btn>

      <hr className="my-4 border-0 border-t border-[#DDE8F4]" />

      {isPro ? (
        <>
          <p className="text-[12px] font-semibold text-ink-text m-0 mb-2.5">Semua fitur Pro aktif</p>
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {LOCKED_FEATURES.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-[13px] text-ink-text">
                <Check size={14} className="text-success" strokeWidth={2.4} /> {f.label}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="text-[12px] font-semibold text-ink-text m-0 mb-2.5">Tersedia di Pro</p>
          <ul className="list-none m-0 p-0 flex flex-col gap-2 mb-4">
            {LOCKED_FEATURES.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-[13px] text-ink-muted">
                <Lock size={13} strokeWidth={2} /> {f.label}
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-blue-deep text-white p-3.5">
            <p className="text-[13px] font-semibold m-0 mb-2.5 leading-snug">Buka Analitik Lanjutan dengan Pro</p>
            <UpgradeLink variant="accent" size="sm" className="w-full" />
          </div>
        </>
      )}
    </section>
  );
}

/** Bungkus konten khusus Pro. Di Basic: konten diburamkan + kartu ajakan upgrade. */
export function ProLock({ feature, title, text, children }) {
  const acc = useAccount();
  if (can(acc.subscription.plan, feature)) return children;

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[320px]">
      <div className="pointer-events-none select-none blur-[3px] opacity-60" aria-hidden="true" {...{ inert: "" }}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-white/50">
        <div className="max-w-[360px] rounded-2xl bg-white border border-[#DDE8F4] p-6 text-center shadow-xl">
          <span className="w-11 h-11 rounded-full bg-blue-deep text-white flex items-center justify-center mx-auto mb-3">
            <Lock size={18} />
          </span>
          <p className="text-[15px] font-semibold text-ink m-0 mb-1">{title}</p>
          <p className="text-[13px] text-ink-muted m-0 mb-4">{text}</p>
          <UpgradeLink />
        </div>
      </div>
    </div>
  );
}

/**
 * Pilihan paket Basic vs Pro + pilihan Bulanan / Tahunan (hemat 2 bulan).
 * current: { plan, interval } | null · onSelect(planCode, interval)
 */
export function PlanPicker({ current = null, onSelect }) {
  const [interval, setInterval] = useState(current?.interval || "month");

  return (
    <div>
      <div className="flex justify-center mb-7">
        <Segmented
          ariaLabel="Siklus tagihan"
          value={interval}
          onChange={setInterval}
          options={[
            { key: "month", label: "Bulanan" },
            { key: "year", label: "Tahunan · hemat 2 bulan" }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[860px] mx-auto">
        {Object.values(PLANS).map((p) => {
          const pro = p.code === "pro";
          const same = !!current && current.plan === p.code && current.interval === interval;
          let label = `Pilih ${p.name}`;
          let disabled = false;
          if (current) {
            if (same) {
              label = "Paket saat ini";
              disabled = true;
            } else if (current.plan === p.code) {
              if (interval === "year") label = "Ganti ke Tahunan";
              else {
                label = "Tersedia setelah periode berakhir";
                disabled = true;
              }
            } else label = pro ? "Upgrade ke Pro" : "Turunkan ke Basic";
          }
          const missing = LOCKED_FEATURES.filter((f) => !p.features[f.key]);
          const price = planPrice(p.code, interval);

          return (
            <div key={p.code} className={`relative rounded-2xl bg-white p-6 flex flex-col ${pro ? "border-2 border-blue-deep shadow-lg" : "border border-[#DDE8F4]"}`}>
              {pro && <Badge tone="gold" className="absolute -top-3 left-6 font-bold">Paling lengkap</Badge>}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[20px] font-bold text-ink m-0">{p.name}</h3>
                {pro && <span className="w-6 h-6 rounded-full bg-accent-yellow text-ink flex items-center justify-center"><Crown size={13} strokeWidth={2.2} /></span>}
                {current && current.plan === p.code && <Badge tone="green">Aktif</Badge>}
              </div>
              <p className="text-[12.5px] text-ink-muted m-0 mb-4">{p.tagline}</p>
              <p className="m-0 mb-1">
                <span className="text-[28px] font-extrabold text-ink tracking-tight">{fmtRp(price)}</span>
                <span className="text-[13px] text-ink-muted"> / {INTERVALS[interval].per}</span>
              </p>
              <p className="text-[12px] m-0 mb-5 min-h-[18px] text-ink-muted">
                {interval === "year" ? (
                  <>≈ {fmtRp(Math.round(price / 12))} / bulan · <span className="font-semibold text-success">hemat {fmtRp(yearlySaving(p.code))}</span></>
                ) : (
                  <>atau {fmtRp(p.priceYear)} / tahun (hemat 2 bulan)</>
                )}
              </p>

              <ul className="list-none m-0 p-0 flex flex-col gap-2.5 mb-4">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-[13.5px] text-ink-text">
                    <Check size={15} className="text-success mt-0.5 flex-shrink-0" strokeWidth={2.4} /> {perk}
                  </li>
                ))}
                {missing.map((f) => (
                  <li key={f.key} className="flex items-start gap-2 text-[13.5px] text-ink-muted">
                    <Lock size={14} className="mt-0.5 flex-shrink-0" /> {f.label}
                  </li>
                ))}
              </ul>

              <Btn variant={pro ? "primary" : "outline"} size="lg" className="mt-auto w-full" disabled={disabled} onClick={() => onSelect(p.code, interval)}>
                {label}
              </Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}
