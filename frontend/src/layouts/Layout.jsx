import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import TopPromoBar from "../components/TopPromoBar.jsx";
import MainNav from "../components/MainNav.jsx";
import CategoryNav from "../components/CategoryNav.jsx";
import FloatingWishlistButton from "../components/FloatingWishlistButton.jsx";
import WishlistDrawer from "../components/WishlistDrawer.jsx";
import Footer from "../components/Footer.jsx";
import { useToastContext } from "../context/ToastContext.jsx";

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showToast = useToastContext();
  const navigate = useNavigate();

  function handleTryOn(product) {
    navigate(`/try-on/${product.id}`);
  }

  function goToProduct(id) {
    navigate(`/produk/${id}`);
  }

  function goToMerchant(id) {
    navigate(`/toko/${id}`);
  }

  function jumpToFeed() {
    navigate("/");
    // beri waktu halaman utama render sebelum scroll
    setTimeout(() => {
      document.getElementById("feed")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }

  function scrollToMerchantSection() {
    navigate("/");
    setTimeout(() => {
      document.getElementById("merchant")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <TopPromoBar />
      <MainNav onOpenWishlist={() => setDrawerOpen(true)} onSelectProduct={goToProduct} onSelectMerchant={goToMerchant} />
      <CategoryNav onJumpToFeed={jumpToFeed} onJumpToMerchant={scrollToMerchantSection} />

      <main>
        <Outlet context={{ onTryOn: handleTryOn, showToast, goToProduct, jumpToFeed }} />
      </main>

      <FloatingWishlistButton onClick={() => setDrawerOpen(true)} />
      <WishlistDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onTryOn={handleTryOn} showToast={showToast} />
      <Footer />
    </div>
  );
}
