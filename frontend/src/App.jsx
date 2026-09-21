import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext.jsx";
import Layout from "./layouts/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import MerchantPage from "./pages/MerchantPage.jsx";
import MitraPage from "./pages/MitraPage.jsx";
import TryOnPage from "./pages/TryOnPage.jsx";
import ConsultPage from "./pages/ConsultPage.jsx";
import RequestsPage from "./pages/partner/RequestsPage.jsx";
import RequestDetailPage from "./pages/partner/RequestDetailPage.jsx";
import Gate from "./components/partner/Gate.jsx";
import PartnerLayout from "./layouts/PartnerLayout.jsx";
import PartnerLoginPage from "./pages/partner/PartnerLoginPage.jsx";
import PartnerRegisterPage from "./pages/partner/PartnerRegisterPage.jsx";
import OnboardingPage from "./pages/partner/OnboardingPage.jsx";
import CheckoutPage from "./pages/partner/CheckoutPage.jsx";
import PaymentSuccessPage from "./pages/partner/PaymentSuccessPage.jsx";
import StoreSetupPage from "./pages/partner/StoreSetupPage.jsx";
import DashboardPage from "./pages/partner/DashboardPage.jsx";
import SectionPage from "./pages/partner/SectionPage.jsx";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/produk/:id" element={<ProductDetailPage />} />
          <Route path="/mitra" element={<MitraPage />} />
          <Route path="/toko/:id" element={<MerchantPage />} />
          <Route path="/try-on/:id" element={<TryOnPage />} />
          <Route path="/konsultasi" element={<ConsultPage />} />
        </Route>

        {/* ===== Area Mitra (tanpa header/footer beranda) ===== */}
        <Route path="/partner/login" element={<PartnerLoginPage />} />
        <Route path="/partner/register" element={<PartnerRegisterPage />} />
        <Route path="/partner/onboarding" element={<Gate allow={["onboarding"]}><OnboardingPage /></Gate>} />
        <Route path="/partner/checkout" element={<Gate allow={["onboarding", "setup", "dashboard"]}><CheckoutPage /></Gate>} />
        <Route path="/partner/payment-success" element={<Gate allow={["setup", "dashboard"]}><PaymentSuccessPage /></Gate>} />
        <Route path="/partner/setup" element={<Gate allow={["setup"]}><StoreSetupPage /></Gate>} />
        <Route path="/partner" element={<PartnerLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/:id" element={<RequestDetailPage />} />
          <Route path=":section/:tab?" element={<SectionPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
