import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext.jsx";
import Layout from "./layouts/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import MerchantPage from "./pages/MerchantPage.jsx";
import TryOnPage from "./pages/TryOnPage.jsx";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/produk/:id" element={<ProductDetailPage />} />
          <Route path="/toko/:id" element={<MerchantPage />} />
          <Route path="/try-on/:id" element={<TryOnPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
