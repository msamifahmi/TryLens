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
      {/* Dua kartu terpisah: Toko Optik Pilihan, lalu Koleksi Frame Terbaru */}
      <div className="max-w-[1280px] mx-auto px-3 sm:px-5 pt-4 pb-8 grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5">
        <section aria-label="Toko Optik Pilihan" className="bg-white border border-border rounded-2xl p-3.5 sm:p-5 shadow-sm tl-scroll-reveal">
          <MerchantSection id="merchant" />
        </section>
        <section aria-label="Koleksi Frame Terbaru" ref={feedRef} className="bg-white border border-border rounded-2xl p-3.5 sm:p-5 shadow-sm">
          <RecommendationSection id="feed" onTryOn={onTryOn} showToast={showToast} cardRefs={cardRefs} onOpenDetail={goToProduct} />
        </section>
      </div>
    </>
  );
}
