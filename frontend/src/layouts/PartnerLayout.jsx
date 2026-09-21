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
      <span className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-zinc-900 text-white text-[12px] font-semibold" title="Paket Pro aktif">
        <Crown size={13} className="text-amber-300" /> Pro
      </span>
    );
  }
  return (
    <Link
      to="/partner/subscription/upgrade"
      className="hidden sm:inline-flex items-center gap-2 h-8 pl-3 pr-1.5 rounded-full bg-white border border-zinc-200 text-[12px] font-semibold text-zinc-700 hover:border-zinc-900"
      title="Paket Basic — klik untuk upgrade"
    >
      Basic
      <span className="h-5 px-2 rounded-full bg-zinc-900 text-white text-[11px] flex items-center gap-1"><Crown size={10} className="text-amber-300" /> Upgrade</span>
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
  const newLeads = acc.leads.filter((l) => l.status === "new");
  const settingsActive = pathname.startsWith("/partner/settings");

  const iconBtn = "relative w-9 h-9 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-700 hover:border-zinc-900";

  return (
    <div className="min-h-screen bg-[#F1F1F2] md:p-6">
      <div className="mx-auto max-w-[1360px] bg-[#FBFBFB] md:rounded-[28px] md:border md:border-white md:shadow-[0_24px_70px_rgba(0,0,0,0.07)] p-4 md:p-6 min-h-screen md:min-h-0">
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
                    active ? "bg-white text-zinc-900 font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.08)]" : "text-zinc-500 hover:text-zinc-900"
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
              <button className={iconBtn} aria-label={`Notifikasi, ${newLeads.length} permintaan baru`} aria-expanded={bell.open} onClick={() => bell.setOpen(!bell.open)}>
                <Bell size={17} strokeWidth={1.8} />
                {newLeads.length > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />}
              </button>
              {bell.open && (
                <div className="absolute right-0 top-11 z-50 w-[300px] rounded-2xl border border-zinc-200 bg-white shadow-xl p-2">
                  <p className="text-[12px] font-semibold text-zinc-500 px-2.5 py-1.5 m-0">Notifikasi</p>
                  {newLeads.length === 0 ? (
                    <p className="text-[13px] text-zinc-500 px-2.5 py-3 m-0">Belum ada permintaan baru.</p>
                  ) : (
                    newLeads.slice(0, 4).map((l) => (
                      <Link key={l.id} to="/partner" onClick={() => bell.setOpen(false)} className="block rounded-xl px-2.5 py-2 hover:bg-zinc-50">
                        <span className="block text-[13px] font-medium text-zinc-900">Permintaan baru dari {l.name}</span>
                        <span className="block text-[12px] text-zinc-500 truncate">{l.topic}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            <NavLink to="/partner/settings/account" className={`${iconBtn} ${settingsActive ? "border-zinc-900" : ""}`} aria-label="Pengaturan">
              <Settings size={17} strokeWidth={1.8} />
            </NavLink>

            <div className="relative" ref={user.ref}>
              <button
                onClick={() => user.setOpen(!user.open)}
                aria-expanded={user.open}
                aria-label="Menu akun"
                className="h-9 pl-1 pr-2 rounded-full border border-zinc-200 bg-white flex items-center gap-1.5 hover:border-zinc-900"
              >
                <span className="w-7 h-7 rounded-full bg-zinc-900 text-white text-[12px] font-semibold flex items-center justify-center">{acc.name[0].toUpperCase()}</span>
                <ChevronDown size={14} className="text-zinc-500 hidden sm:block" />
              </button>
              {user.open && (
                <div className="absolute right-0 top-11 z-50 w-[250px] rounded-2xl border border-zinc-200 bg-white shadow-xl p-2">
                  <div className="px-2.5 py-2 border-b border-zinc-100 mb-1">
                    <p className="text-[13px] font-semibold text-zinc-900 m-0 truncate">{acc.name}</p>
                    <p className="text-[12px] text-zinc-500 m-0 truncate">{acc.email}</p>
                  </div>
                  {acc.store?.merchantId && (
                    <Link to={`/toko/${acc.store.merchantId}`} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-zinc-800 hover:bg-zinc-50">
                      <ExternalLink size={15} /> Lihat toko di TryLens
                    </Link>
                  )}
                  <Link to="/" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-zinc-800 hover:bg-zinc-50">
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
                className={`h-9 px-4 rounded-full text-[13px] whitespace-nowrap flex items-center ${active ? "bg-white text-zinc-900 font-semibold shadow-sm border border-zinc-200" : "text-zinc-500"}`}
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
