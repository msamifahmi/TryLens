import { useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { usePartner } from "../store/usePartner.js";
import { flashItems } from "../lib/flashSale.js";
import { useFilter } from "../store/useFilter.js";
import HeroCarousel from "../components/HeroCarousel.jsx";
import FlashSaleSection from "../components/FlashSaleSection.jsx";
import MerchantSection from "../components/MerchantSection.jsx";
import RecommendationSection from "../components/RecommendationSection.jsx";

export default function HomePage() {
  const { onTryOn, showToast, goToProduct } = useOutletContext();
  const setCategory = useFilter((s) => s.setCategory);
  usePartner((st) => st.accounts); // render ulang bila Mitra mengubah Flash Sale
  const flash = flashItems(); // lintas Mitra, terlaris dulu
  const feedRef = useRef(null);
  const cardRefs = useRef({});

  function scrollToFeed() {
    feedRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function seeAllFlash() {
    setCategory("Promo");
    scrollToFeed();
  }

  return (
    <>
      <HeroCarousel
        onFeed={scrollToFeed}
        onMerchants={() => document.getElementById("merchant")?.scrollIntoView({ behavior: "smooth" })}
        onPromo={seeAllFlash}
      />
      <div className="max-w-[1280px] mx-auto px-3 sm:px-5 pt-2 pb-1">
        <FlashSaleSection id="flash-sale" products={flash} limit={12} layout="slider" showMerchant onSeeAll={seeAllFlash} />
      </div>
      {/* Satu section: Toko Optik Pilihan + Koleksi Frame Terbaru (rapat, tanpa ruang kosong di antaranya) */}
      <section className="max-w-[1280px] mx-auto px-3 sm:px-5 py-3 pb-6 tl-scroll-reveal">
        <div className="bg-white border border-border rounded-2xl p-3 sm:p-4">
          <MerchantSection id="merchant" />
          <hr className="border-0 border-t border-[#EEF3FA] my-3" />
          <div ref={feedRef}>
            <RecommendationSection id="feed" onTryOn={onTryOn} showToast={showToast} cardRefs={cardRefs} onOpenDetail={goToProduct} />
          </div>
        </div>
      </section>
    </>
  );
}
