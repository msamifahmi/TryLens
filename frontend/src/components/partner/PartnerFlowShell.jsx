import { Link, useNavigate } from "react-router-dom";
import { Check, Glasses, LogOut } from "lucide-react";
import { usePartner } from "../../store/usePartner.js";

export const FLOW_STEPS = ["Pilih Paket", "Pembayaran", "Konfirmasi", "Setup Toko"];

export function PartnerLogo({ to = "/partner" }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-ink" aria-label="TryLens Partner">
      <span className="w-8 h-8 rounded-[10px] bg-blue-deep text-white flex items-center justify-center">
        <Glasses size={18} strokeWidth={2} />
      </span>
      <span className="text-[19px] font-bold tracking-tight">trylens</span>
      <span className="text-[10px] font-semibold tracking-wider uppercase bg-[#DDE8F4] text-ink-text rounded px-1.5 py-0.5">Partner</span>
    </Link>
  );
}

/** Kerangka halaman alur onboarding: Pilih Paket → Checkout → Sukses → Setup Toko. */
export default function PartnerFlowShell({ step, title, subtitle, children, width = "max-w-[980px]" }) {
  const logout = usePartner((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-blue">
      <header className="max-w-[1100px] mx-auto px-5 py-5 flex items-center justify-between gap-4">
        <PartnerLogo to="/partner/onboarding" />
        <button
          onClick={() => {
            logout();
            navigate("/", { replace: true });
          }}
          className="text-[13px] text-ink-muted hover:text-ink flex items-center gap-1.5"
        >
          <LogOut size={15} /> Keluar
        </button>
      </header>

      <div className={`${width} mx-auto px-5 pb-16`}>
        <ol className="list-none m-0 p-0 flex items-center justify-center gap-2 md:gap-3 mb-8 flex-wrap" aria-label="Langkah">
          {FLOW_STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={label} className="flex items-center gap-2 md:gap-3">
                <span className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-[12px] font-semibold flex items-center justify-center ${
                      done ? "bg-blue-deep text-white" : active ? "bg-blue-deep text-white ring-4 ring-blue-deep/15" : "bg-[#DDE8F4] text-ink-muted"
                    }`}
                  >
                    {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-[13px] ${active ? "font-semibold text-ink" : "text-ink-muted"} hidden sm:inline`}>{label}</span>
                </span>
                {i < FLOW_STEPS.length - 1 && <span className="w-6 md:w-10 h-px bg-[#C5D6EA]" />}
              </li>
            );
          })}
        </ol>

        <div className="text-center mb-8">
          <h1 className="text-[28px] md:text-[32px] font-extrabold tracking-tight text-ink m-0 mb-2">{title}</h1>
          {subtitle && <p className="text-[14.5px] text-ink-muted m-0">{subtitle}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}
