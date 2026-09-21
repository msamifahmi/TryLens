import { Link } from "react-router-dom";
import { Check, Crown, Lock } from "lucide-react";
import { useAccount } from "../../store/usePartner.js";
import { PLANS, LOCKED_FEATURES, can, fmtDate, fmtRp } from "../../data/partnerMock.js";
import { Btn, Badge, UpgradeLink } from "./ui.jsx";

/** Kartu "PAKET ANDA": beda tampilan Basic (fitur terkunci + ajakan upgrade) vs Pro. */
export default function PlanCard({ className = "" }) {
  const acc = useAccount();
  const sub = acc.subscription;
  const plan = PLANS[sub.plan];
  const isPro = sub.plan === "pro";

  return (
    <section className={`rounded-2xl border border-zinc-200/80 bg-[#FAFAFA] p-4 md:p-5 ${className}`} aria-label="Paket Anda">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-zinc-500 m-0 mb-2">PAKET ANDA</p>
      <div className="flex items-center gap-2 mb-0.5">
        <h3 className="text-[22px] font-bold text-zinc-900 tracking-tight m-0 uppercase">{plan.name}</h3>
        {isPro && <Crown size={17} className="text-amber-500" strokeWidth={2} />}
      </div>
      <p className="text-[14px] text-zinc-700 m-0 mb-3">
        <span className="font-semibold">{fmtRp(plan.price)}</span> / bulan
      </p>

      <p className="text-[12px] text-zinc-500 m-0">{sub.cancelAtPeriodEnd ? "Berakhir pada" : "Tagihan berikutnya"}</p>
      <p className="text-[13.5px] font-medium text-zinc-900 m-0 mb-3.5">{fmtDate(sub.nextBillingAt)}</p>

      <Btn as={Link} to="/partner/subscription/current" variant="outline" className="w-full">
        Kelola Langganan
      </Btn>

      <hr className="my-4 border-0 border-t border-zinc-200" />

      {isPro ? (
        <>
          <p className="text-[12px] font-semibold text-zinc-700 m-0 mb-2.5">Semua fitur Pro aktif</p>
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {LOCKED_FEATURES.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-[13px] text-zinc-800">
                <Check size={14} className="text-emerald-600" strokeWidth={2.4} /> {f.label}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="text-[12px] font-semibold text-zinc-700 m-0 mb-2.5">Tersedia di Pro</p>
          <ul className="list-none m-0 p-0 flex flex-col gap-2 mb-4">
            {LOCKED_FEATURES.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-[13px] text-zinc-500">
                <Lock size={13} strokeWidth={2} /> {f.label}
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-zinc-900 text-white p-3.5">
            <p className="text-[13px] font-semibold m-0 mb-2.5 leading-snug">Buka Analitik Lanjutan dengan Pro</p>
            <UpgradeLink variant="outline" size="sm" className="w-full" />
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
        <div className="max-w-[360px] rounded-2xl bg-white border border-zinc-200 p-6 text-center shadow-xl">
          <span className="w-11 h-11 rounded-full bg-zinc-900 text-white flex items-center justify-center mx-auto mb-3">
            <Lock size={18} />
          </span>
          <p className="text-[15px] font-semibold text-zinc-900 m-0 mb-1">{title}</p>
          <p className="text-[13px] text-zinc-500 m-0 mb-4">{text}</p>
          <UpgradeLink />
        </div>
      </div>
    </div>
  );
}

/** Pilihan paket Basic vs Pro. Dipakai di onboarding dan di Langganan → Upgrade. */
export function PlanPicker({ current = null, onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[860px] mx-auto">
      {Object.values(PLANS).map((p) => {
        const isCurrent = current === p.code;
        const pro = p.code === "pro";
        let label = `Pilih ${p.name}`;
        if (current === "basic" && pro) label = "Upgrade ke Pro";
        if (current === "pro" && !pro) label = "Turunkan ke Basic";
        if (isCurrent) label = "Paket saat ini";
        const missing = LOCKED_FEATURES.filter((f) => !p.features[f.key]);

        return (
          <div
            key={p.code}
            className={`relative rounded-2xl bg-white p-6 flex flex-col ${pro ? "border-2 border-zinc-900 shadow-lg" : "border border-zinc-200"}`}
          >
            {pro && <Badge tone="dark" className="absolute -top-3 left-6">Paling lengkap</Badge>}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[20px] font-bold text-zinc-900 m-0">{p.name}</h3>
              {pro && <Crown size={17} className="text-amber-500" />}
              {isCurrent && <Badge tone="green">Aktif</Badge>}
            </div>
            <p className="text-[12.5px] text-zinc-500 m-0 mb-4">{p.tagline}</p>
            <p className="m-0 mb-5">
              <span className="text-[28px] font-extrabold text-zinc-900 tracking-tight">{fmtRp(p.price)}</span>
              <span className="text-[13px] text-zinc-500"> / bulan</span>
            </p>

            <ul className="list-none m-0 p-0 flex flex-col gap-2.5 mb-4">
              {p.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-[13.5px] text-zinc-800">
                  <Check size={15} className="text-emerald-600 mt-0.5 flex-shrink-0" strokeWidth={2.4} /> {perk}
                </li>
              ))}
              {missing.map((f) => (
                <li key={f.key} className="flex items-start gap-2 text-[13.5px] text-zinc-400">
                  <Lock size={14} className="mt-0.5 flex-shrink-0" /> {f.label}
                </li>
              ))}
            </ul>

            <Btn
              variant={pro ? "primary" : "outline"}
              size="lg"
              className="mt-auto w-full"
              disabled={isCurrent}
              onClick={() => onSelect(p.code)}
            >
              {label}
            </Btn>
          </div>
        );
      })}
    </div>
  );
}
