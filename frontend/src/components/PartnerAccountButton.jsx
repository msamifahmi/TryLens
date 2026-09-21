import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Store, User } from "lucide-react";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../store/usePartner.js";

const STAGE_LABEL = {
  dashboard: "Dashboard Mitra",
  onboarding: "Lanjutkan berlangganan",
  setup: "Lanjutkan setup toko"
};

/**
 * Ikon user di header beranda = pintu masuk Mitra.
 * Belum masuk → ke /partner/login. Sudah masuk → menu kecil (dashboard / keluar).
 */
export default function PartnerAccountButton() {
  const account = useAccount();
  const logout = usePartner((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const base = "w-[34px] h-[34px] rounded-full bg-gradient-to-br from-blue to-blue-deep text-white flex items-center justify-center flex-shrink-0";

  if (!account) {
    return (
      <button onClick={() => navigate("/partner/login")} className={base} aria-label="Masuk sebagai Mitra" title="Masuk sebagai Mitra">
        <User size={17} strokeWidth={2} />
      </button>
    );
  }

  const stage = stageOf(account);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={`${base} font-bold text-[13px]`} aria-label="Menu akun Mitra" aria-expanded={open} title={account.name}>
        {account.name[0].toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[240px] rounded-xl border border-border bg-white shadow-xl p-2">
          <div className="px-2.5 py-2 border-b border-border mb-1">
            <p className="text-[13px] font-semibold text-ink m-0 truncate">{account.name}</p>
            <p className="text-[12px] text-ink-muted m-0 truncate">{account.email}</p>
          </div>
          <Link to={STAGE_PATH[stage]} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-ink-text hover:bg-surface-blue">
            {stage === "dashboard" ? <LayoutDashboard size={15} /> : <Store size={15} />} {STAGE_LABEL[stage]}
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-error hover:bg-red-50"
          >
            <LogOut size={15} /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}
