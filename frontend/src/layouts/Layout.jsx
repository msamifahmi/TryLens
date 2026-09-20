import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
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
  const { pathname } = useLocation();

  // Halaman baru selalu mulai dari atas (tanpa ini, /mitra terbuka di posisi scroll halaman sebelumnya).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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

  function jumpToFlash() {
    navigate("/");
    setTimeout(() => {
      document.getElementById("flash-sale")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  }

  function goToMitra() {
    navigate("/mitra");
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <TopPromoBar />
      <MainNav
        onOpenWishlist={() => setDrawerOpen(true)}
        onSelectProduct={goToProduct}
        onSelectMerchant={goToMerchant}
        onJumpToFeed={jumpToFeed}
        onJumpToFlash={jumpToFlash}
      />
      <CategoryNav onJumpToFeed={jumpToFeed} onJumpToMerchant={goToMitra} />

      <main>
        <Outlet context={{ onTryOn: handleTryOn, showToast, goToProduct, jumpToFeed }} />
      </main>

      <FloatingWishlistButton onClick={() => setDrawerOpen(true)} />
      <WishlistDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onTryOn={handleTryOn} showToast={showToast} />
      <Footer />
    </div>
  );
}
