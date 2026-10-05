import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowUpCircle, Award, Bell, Boxes, CreditCard, Eye, FolderOpen, Gauge, Glasses, LineChart, Megaphone, Receipt, ScanFace, Settings2, ShoppingBag, SlidersHorizontal, Sparkles, Store, User, Users } from "lucide-react";
import { motion } from "motion/react";
import TreeNav from "../../components/ui/TreeNav.jsx";
import { SubTabs } from "../../components/partner/ui.jsx";
import { StoreProfileTab, ProductsTab, CollectionsTab, PreviewTab } from "./StoreTabs.jsx";
import { VtoLibraryTab, VtoAnalyticsTab, VtoSettingsTab } from "./VtoTabs.jsx";
import { AnalyticsOverviewTab, AnalyticsVisitorsTab, AnalyticsProductsTab, AnalyticsTryOnTab } from "./AnalyticsTabs.jsx";
import { BannersTab, HighlightedTab, SponsoredTab } from "./PromotionTabs.jsx";
import { CurrentPlanTab, BillingTab, UpgradePlanTab } from "./SubscriptionTabs.jsx";
import { AccountTab, StoreSettingsTab, NotificationsTab } from "./SettingsTabs.jsx";

// Peta menu Mitra → sub-menu → halaman. `pro: true` menandai fitur khusus paket Pro (ikon mahkota).
// Semua bagian yang punya sub-menu tampil dengan sidebar pohon di kiri (di HP tetap tab horizontal).
// Tiap tab punya `icon` + `desc` (dipakai juga oleh dropdown navbar di PartnerLayout) dan tiap bagian punya `feature`
// (kartu sorotan di dropdown).
const RouterAnchor = ({ href, ...rest }) => <Link to={href} {...rest} />;

export const SECTIONS = {
  store: {
    title: "Store Management",
    subtitle: "Kelola profil, frame, koleksi, dan tampilan toko Anda.",
    feature: { title: "Tambah frame baru", text: "Unggah foto produk dan model 3D agar bisa dicoba pelanggan.", to: "/partner/store/products", cta: "Buka Produk / Frame" },
    tabs: [
      { key: "profile", label: "Store Profile", icon: Store, desc: "Nama, alamat, kontak, dan tautan toko", C: StoreProfileTab },
      { key: "products", label: "Products / Frames", icon: Boxes, desc: "Frame, harga, stok, foto, dan model 3D", C: ProductsTab },
      { key: "collections", label: "Collections", icon: FolderOpen, desc: "Kelompokkan frame jadi koleksi", C: CollectionsTab },
      { key: "preview", label: "Store Preview", icon: Eye, desc: "Lihat toko seperti dilihat pelanggan", C: PreviewTab }
    ]
  },
  vto: {
    title: "Virtual Try-On",
    subtitle: "Atur frame yang bisa dicoba dan pantau penggunaannya.",
    feature: { title: "Model 3D siap pakai?", text: "Pastikan rig GLB sesuai spesifikasi agar lensa terkunci ke pupil.", to: "/partner/vto/library", cta: "Cek Frame Library" },
    tabs: [
      { key: "library", label: "Frame Library", icon: Glasses, desc: "Frame mana yang bisa dicoba virtual", C: VtoLibraryTab },
      { key: "analytics", label: "Try-On Analytics", icon: LineChart, desc: "Seberapa sering frame dicoba", C: VtoAnalyticsTab },
      { key: "settings", label: "VTO Settings", icon: SlidersHorizontal, desc: "Tint lensa dan opsi berbagi", C: VtoSettingsTab }
    ]
  },
  analytics: {
    title: "Analytics",
    subtitle: "Pahami pengunjung, produk, dan performa try-on toko Anda.",
    feature: { title: "Ringkasan minggu ini", text: "Pengunjung, klik, dan percobaan try-on dalam satu layar.", to: "/partner/analytics/overview", cta: "Lihat Overview" },
    tabs: [
      { key: "overview", label: "Overview", icon: Gauge, desc: "Angka utama toko Anda", C: AnalyticsOverviewTab },
      { key: "visitors", label: "Store Visitors", icon: Users, desc: "Siapa yang mengunjungi toko", C: AnalyticsVisitorsTab, pro: true },
      { key: "products", label: "Product Performance", icon: ShoppingBag, desc: "Frame terlaris dan paling dilihat", C: AnalyticsProductsTab, pro: true },
      { key: "tryon", label: "Try-On Performance", icon: ScanFace, desc: "Percobaan virtual per frame", C: AnalyticsTryOnTab, pro: true }
    ]
  },
  promotion: {
    title: "Promotion",
    subtitle: "Jangkau lebih banyak pelanggan lewat banner dan penempatan unggulan.",
    feature: { title: "Jangkau lebih banyak", text: "Pasang banner di beranda atau tonjolkan frame andalan.", to: "/partner/promotion/banners", cta: "Buat Banner" },
    tabs: [
      { key: "banners", label: "Banner Ads", icon: Megaphone, desc: "Banner di beranda TryLens", C: BannersTab },
      { key: "highlighted", label: "Highlighted Brand", icon: Award, desc: "Toko tampil di slot unggulan", C: HighlightedTab, pro: true },
      { key: "sponsored", label: "Sponsored Frame", icon: Sparkles, desc: "Frame tampil di rekomendasi", C: SponsoredTab, pro: true }
    ]
  },
  subscription: {
    title: "Subscription",
    subtitle: "Paket, tagihan, dan upgrade — kapan saja, bukan hanya saat pertama berlangganan.",
    feature: { title: "Butuh lebih banyak?", text: "Pro: frame tanpa batas, analitik lengkap, dan promosi.", to: "/partner/subscription/upgrade", cta: "Lihat Paket" },
    tabs: [
      { key: "current", label: "Current Plan", icon: CreditCard, desc: "Paket dan kuota yang aktif", C: CurrentPlanTab },
      { key: "billing", label: "Billing", icon: Receipt, desc: "Riwayat tagihan dan invoice", C: BillingTab },
      { key: "upgrade", label: "Upgrade Plan", icon: ArrowUpCircle, desc: "Bandingkan dan ganti paket", C: UpgradePlanTab }
    ]
  },
  settings: {
    title: "Settings",
    subtitle: "Akun, pengaturan toko, dan notifikasi.",
    tabs: [
      { key: "account", label: "Account", icon: User, desc: "Nama, email, dan kata sandi", C: AccountTab },
      { key: "store", label: "Store Settings", icon: Settings2, desc: "Visibilitas dan jam operasional", C: StoreSettingsTab },
      { key: "notifications", label: "Notifications", icon: Bell, desc: "Email, WhatsApp, dan aplikasi", C: NotificationsTab }
    ]
  }
};

/** Halaman bagian (/partner/:section/:tab) — judul + sub-menu + isi tab. */
export default function SectionPage() {
  const { section, tab } = useParams();
  const cfg = SECTIONS[section];
  if (!cfg) return <Navigate to="/partner" replace />;
  const current = cfg.tabs.find((t) => t.key === tab);
  if (!current) return <Navigate to={`/partner/${section}/${cfg.tabs[0].key}`} replace />;
  const Content = current.C;

  const head = (
    <div className="mb-4">
      <h1 className="text-[22px] font-semibold text-ink tracking-tight m-0">{cfg.title}</h1>
      <p className="text-[13px] text-ink-muted m-0">{cfg.subtitle}</p>
    </div>
  );
  const base = `/partner/${section}`;
  const body = (
    <motion.div key={`${section}/${current.key}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <Content />
    </motion.div>
  );

  return (
    <div>
      {head}
      <div className="md:hidden"><SubTabs base={base} tabs={cfg.tabs} active={current.key} /></div>
      <div className="md:grid md:grid-cols-[304px_minmax(0,1fr)] md:gap-7 items-start">
        <aside className="hidden md:block sticky top-4 rounded-2xl border border-[#DDE8F4] bg-[#F6FAFE] p-4" aria-label={`Menu ${cfg.title}`}>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted m-0 mb-1 px-3">{cfg.title}</p>
          <p className="text-[12px] text-ink-muted m-0 mb-3 px-3 leading-snug">{cfg.subtitle}</p>
          <TreeNav
            items={cfg.tabs.map((t) => ({ label: t.label, icon: t.icon, href: `${base}/${t.key}`, badge: t.pro ? "Pro" : undefined }))}
            rowH={42}
            textCls="text-[14.5px]"
            activeHref={`${base}/${current.key}`}
            linkComponent={RouterAnchor}
          />
        </aside>
        <div className="min-w-0">{body}</div>
      </div>
    </div>
  );
}
