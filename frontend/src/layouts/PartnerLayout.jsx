import PageTransition from "../components/ui/PageTransition.jsx";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Crown, Settings } from "lucide-react";
import NotificationBell from "../components/NotificationBell.jsx";
import LiquidMenu from "../components/ui/LiquidMenu.jsx";
import PartnerNavMenu from "../components/partner/PartnerNavMenu.jsx";
import { PartnerLogo } from "../components/partner/PartnerFlowShell.jsx";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../store/usePartner.js";

// Struktur menu Mitra: Dashboard · Toko · Virtual Try-On · Analitik · Promosi · Langganan (+ Pengaturan via ikon gear)
export const PARTNER_NAV = [
  { key: "dashboard", label: "Dashboard", to: "/partner", match: (p) => p === "/partner" },
  { key: "store", menu: "store", label: "Toko", to: "/partner/store/profile", match: (p) => p.startsWith("/partner/store") },
  { key: "vto", menu: "vto", label: "Virtual Try-On", to: "/partner/vto/library", match: (p) => p.startsWith("/partner/vto") },
  { key: "analytics", menu: "analytics", label: "Analitik", to: "/partner/analytics/overview", match: (p) => p.startsWith("/partner/analytics") },
  { key: "promotion", menu: "promotion", label: "Promosi", to: "/partner/promotion/banners", match: (p) => p.startsWith("/partner/promotion") },
  { key: "subscription", menu: "subscription", label: "Langganan", to: "/partner/subscription/current", match: (p) => p.startsWith("/partner/subscription") }
];

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

  const stage = stageOf(acc);
  if (stage !== "dashboard") return <Navigate to={STAGE_PATH[stage]} replace />;

  const plan = acc.subscription.plan;
  const settingsActive = pathname.startsWith("/partner/settings");

  const iconBtn = "relative w-9 h-9 rounded-full border border-[#DDE8F4] bg-white flex items-center justify-center text-ink-text hover:border-blue-deep";

  return (
    <div className="min-h-screen bg-surface-blue md:p-6">
      <div className="mx-auto max-w-[1360px] bg-white md:rounded-[28px] md:border md:border-white md:shadow-[0_24px_70px_rgba(64,106,175,0.12)] p-4 md:p-6 min-h-screen md:min-h-0">
        <header className="relative flex items-center justify-between gap-3 mb-4 md:mb-5">
          <PartnerLogo />

          <PartnerNavMenu items={PARTNER_NAV} />

          <div className="flex items-center gap-2">
            <PlanChip plan={plan} />

            <NotificationBell size={36} />

            <NavLink to="/partner/settings/account" className={`${iconBtn} ${settingsActive ? "border-blue-deep" : ""}`} aria-label="Pengaturan">
              <Settings size={17} strokeWidth={1.8} />
            </NavLink>

            <LiquidMenu
              label={acc.name}
              icon={acc.name[0].toUpperCase()}
              barH={36}
              ariaLabel="Menu akun"
              items={[
                ...(acc.store?.merchantId ? [{ label: "Toko Saya", onClick: () => navigate(`/toko/${acc.store.merchantId}`) }] : [{ label: "Profil Toko", onClick: () => navigate("/partner/store/profile") }]),
                { label: "Beranda", onClick: () => navigate("/") },
                { label: "Keluar", onClick: () => { logout(); navigate("/", { replace: true }); } }
              ]}
            />
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

        <motion.main key={pathname.split("/").slice(0, 3).join("/")} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <SyncError />
          <PageTransition><Outlet /></PageTransition>
        </motion.main>
      </div>
    </div>
  );
}

/** Pesan bila server menolak perubahan (kuota, validasi, sesi habis…). Tampil sampai ditutup. */
function SyncError() {
  const msg = usePartner((s) => s.syncError);
  const clear = usePartner((s) => s.clearSyncError);
  if (!msg) return null;
  return (
    <div role="alert" className="mb-4 rounded-xl border border-[#F2C2BD] bg-[#FDF1EF] px-4 py-3 text-[13px] text-ink flex items-center justify-between gap-3">
      <span>Perubahan tidak tersimpan di server: {msg}</span>
      <button type="button" onClick={clear} className="underline text-ink-muted hover:text-ink">Tutup</button>
    </div>
  );
}
