import { useEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Crown, ExternalLink, Home, LogOut, Settings } from "lucide-react";
import { PartnerLogo } from "../components/partner/PartnerFlowShell.jsx";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../store/usePartner.js";

// Struktur menu Mitra: Dashboard · Toko · Virtual Try-On · Analitik · Promosi · Langganan (+ Pengaturan via ikon gear)
export const PARTNER_NAV = [
  { key: "dashboard", label: "Dashboard", to: "/partner", match: (p) => p === "/partner" },
  { key: "store", label: "Toko", to: "/partner/store/profile", match: (p) => p.startsWith("/partner/store") },
  { key: "vto", label: "Virtual Try-On", to: "/partner/vto/library", match: (p) => p.startsWith("/partner/vto") },
  { key: "analytics", label: "Analitik", to: "/partner/analytics/overview", match: (p) => p.startsWith("/partner/analytics") },
  { key: "promotion", label: "Promosi", to: "/partner/promotion/banners", match: (p) => p.startsWith("/partner/promotion") },
  { key: "subscription", label: "Langganan", to: "/partner/subscription/current", match: (p) => p.startsWith("/partner/subscription") }
];

function usePopover() {
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
  return { open, setOpen, ref };
}

function PlanChip({ plan }) {
  if (plan === "pro") {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-accent-yellow text-ink text-[12px] font-bold" title="Paket Pro aktif">
        <Crown size={13} strokeWidth={2.2} /> Pro
      </span>
    );
  }
  return (
    <Link
      to="/partner/subscription/upgrade"
      className="hidden sm:inline-flex items-center gap-2 h-8 pl-3 pr-1.5 rounded-full bg-white border border-[#DDE8F4] text-[12px] font-semibold text-ink-text hover:border-blue-deep"
      title="Paket Basic — klik untuk upgrade"
    >
      Basic
      <span className="h-5 px-2 rounded-full bg-accent-yellow text-ink text-[11px] font-bold flex items-center gap-1"><Crown size={10} strokeWidth={2.2} /> Upgrade</span>
    </Link>
  );
}

export default function PartnerLayout() {
  const acc = useAccount();
  const logout = usePartner((s) => s.logout);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bell = usePopover();
  const user = usePopover();

  const stage = stageOf(acc);
  if (stage !== "dashboard") return <Navigate to={STAGE_PATH[stage]} replace />;

  const plan = acc.subscription.plan;
  const settingsActive = pathname.startsWith("/partner/settings");

  const iconBtn = "relative w-9 h-9 rounded-full border border-[#DDE8F4] bg-white flex items-center justify-center text-ink-text hover:border-blue-deep";

  return (
    <div className="min-h-screen bg-surface-blue md:p-6">
      <div className="mx-auto max-w-[1360px] bg-white md:rounded-[28px] md:border md:border-white md:shadow-[0_24px_70px_rgba(64,106,175,0.12)] p-4 md:p-6 min-h-screen md:min-h-0">
        <header className="flex items-center justify-between gap-3 mb-4 md:mb-5">
          <PartnerLogo />

          <nav className="hidden lg:flex items-center gap-1" aria-label="Menu Mitra">
            {PARTNER_NAV.map((n) => {
              const active = n.match(pathname);
              return (
                <NavLink
                  key={n.key}
                  to={n.to}
                  aria-current={active ? "page" : undefined}
                  className={`h-9 px-4 rounded-full text-[13.5px] flex items-center transition-colors ${
                    active ? "bg-white text-ink font-semibold shadow-[0_1px_4px_rgba(64,106,175,0.18)]" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {n.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <PlanChip plan={plan} />

            <div className="relative" ref={bell.ref}>
              <button className={iconBtn} aria-label="Notifikasi" aria-expanded={bell.open} onClick={() => bell.setOpen(!bell.open)}>
                <Bell size={17} strokeWidth={1.8} />
              </button>
              {bell.open && (
                <div className="absolute right-0 top-11 z-50 w-[300px] rounded-2xl border border-[#DDE8F4] bg-white shadow-xl p-2">
                  <p className="text-[12px] font-semibold text-ink-muted px-2.5 py-1.5 m-0">Notifikasi</p>
                  <p className="text-[13px] text-ink-muted px-2.5 py-3 m-0">Belum ada notifikasi.</p>
                </div>
              )}
            </div>

            <NavLink to="/partner/settings/account" className={`${iconBtn} ${settingsActive ? "border-blue-deep" : ""}`} aria-label="Pengaturan">
              <Settings size={17} strokeWidth={1.8} />
            </NavLink>

            <div className="relative" ref={user.ref}>
              <button
                onClick={() => user.setOpen(!user.open)}
                aria-expanded={user.open}
                aria-label="Menu akun"
                className="h-9 pl-1 pr-2 rounded-full border border-[#DDE8F4] bg-white flex items-center gap-1.5 hover:border-blue-deep"
              >
                <span className="w-7 h-7 rounded-full bg-blue-deep text-white text-[12px] font-semibold flex items-center justify-center">{acc.name[0].toUpperCase()}</span>
                <ChevronDown size={14} className="text-ink-muted hidden sm:block" />
              </button>
              {user.open && (
                <div className="absolute right-0 top-11 z-50 w-[250px] rounded-2xl border border-[#DDE8F4] bg-white shadow-xl p-2">
                  <div className="px-2.5 py-2 border-b border-[#E8F0F8] mb-1">
                    <p className="text-[13px] font-semibold text-ink m-0 truncate">{acc.name}</p>
                    <p className="text-[12px] text-ink-muted m-0 truncate">{acc.email}</p>
                  </div>
                  {acc.store?.merchantId && (
                    <Link to={`/toko/${acc.store.merchantId}`} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-ink-text hover:bg-surface-blue">
                      <ExternalLink size={15} /> Lihat toko di TryLens
                    </Link>
                  )}
                  <Link to="/" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-ink-text hover:bg-surface-blue">
                    <Home size={15} /> Beranda TryLens
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/", { replace: true });
                    }}
                    className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={15} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Menu untuk layar kecil */}
        <nav className="lg:hidden flex gap-1 overflow-x-auto scrollbar-none mb-4 -mx-1 px-1" aria-label="Menu Mitra">
          {PARTNER_NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <NavLink
                key={n.key}
                to={n.to}
                className={`h-9 px-4 rounded-full text-[13px] whitespace-nowrap flex items-center ${active ? "bg-white text-ink font-semibold shadow-sm border border-[#DDE8F4]" : "text-ink-muted"}`}
              >
                {n.label}
              </NavLink>
            );
          })}
        </nav>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
