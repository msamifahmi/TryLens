import { Navigate, useParams } from "react-router-dom";
import { SubTabs } from "../../components/partner/ui.jsx";
import { StoreProfileTab, ProductsTab, CollectionsTab, PreviewTab } from "./StoreTabs.jsx";
import { VtoLibraryTab, VtoAnalyticsTab, VtoSettingsTab } from "./VtoTabs.jsx";
import { AnalyticsOverviewTab, AnalyticsVisitorsTab, AnalyticsProductsTab, AnalyticsTryOnTab } from "./AnalyticsTabs.jsx";
import { BannersTab, HighlightedTab, SponsoredTab } from "./PromotionTabs.jsx";
import { CurrentPlanTab, BillingTab, UpgradePlanTab } from "./SubscriptionTabs.jsx";
import { AccountTab, StoreSettingsTab, NotificationsTab } from "./SettingsTabs.jsx";

// Peta menu Mitra → sub-menu → halaman. `pro: true` menandai fitur khusus paket Pro (ikon mahkota).
export const SECTIONS = {
  store: {
    title: "Store Management",
    subtitle: "Kelola profil, frame, koleksi, dan tampilan toko Anda.",
    tabs: [
      { key: "profile", label: "Store Profile", C: StoreProfileTab },
      { key: "products", label: "Products / Frames", C: ProductsTab },
      { key: "collections", label: "Collections", C: CollectionsTab },
      { key: "preview", label: "Store Preview", C: PreviewTab }
    ]
  },
  vto: {
    title: "Virtual Try-On",
    subtitle: "Atur frame yang bisa dicoba dan pantau penggunaannya.",
    tabs: [
      { key: "library", label: "Frame Library", C: VtoLibraryTab },
      { key: "analytics", label: "Try-On Analytics", C: VtoAnalyticsTab },
      { key: "settings", label: "VTO Settings", C: VtoSettingsTab }
    ]
  },
  analytics: {
    title: "Analytics",
    subtitle: "Pahami pengunjung, produk, dan performa try-on toko Anda.",
    tabs: [
      { key: "overview", label: "Overview", C: AnalyticsOverviewTab },
      { key: "visitors", label: "Store Visitors", C: AnalyticsVisitorsTab, pro: true },
      { key: "products", label: "Product Performance", C: AnalyticsProductsTab, pro: true },
      { key: "tryon", label: "Try-On Performance", C: AnalyticsTryOnTab, pro: true }
    ]
  },
  promotion: {
    title: "Promotion",
    subtitle: "Jangkau lebih banyak pelanggan lewat banner dan penempatan unggulan.",
    tabs: [
      { key: "banners", label: "Banner Ads", C: BannersTab },
      { key: "highlighted", label: "Highlighted Brand", C: HighlightedTab, pro: true },
      { key: "sponsored", label: "Sponsored Frame", C: SponsoredTab, pro: true }
    ]
  },
  subscription: {
    title: "Subscription",
    subtitle: "Paket, tagihan, dan upgrade — kapan saja, bukan hanya saat pertama berlangganan.",
    tabs: [
      { key: "current", label: "Current Plan", C: CurrentPlanTab },
      { key: "billing", label: "Billing", C: BillingTab },
      { key: "upgrade", label: "Upgrade Plan", C: UpgradePlanTab }
    ]
  },
  settings: {
    title: "Settings",
    subtitle: "Akun, pengaturan toko, dan notifikasi.",
    tabs: [
      { key: "account", label: "Account", C: AccountTab },
      { key: "store", label: "Store Settings", C: StoreSettingsTab },
      { key: "notifications", label: "Notifications", C: NotificationsTab }
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

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight m-0">{cfg.title}</h1>
        <p className="text-[13px] text-ink-muted m-0">{cfg.subtitle}</p>
      </div>
      <SubTabs base={`/partner/${section}`} tabs={cfg.tabs} active={current.key} />
      <Content key={`${section}/${current.key}`} />
    </div>
  );
}
