import { useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { PRODUCTS } from "../data/mockData.js";
import { useFilter } from "../store/useFilter.js";
import HeroCarousel from "../components/HeroCarousel.jsx";
import FlashSaleSection from "../components/FlashSaleSection.jsx";
import QuickCategorySection from "../components/QuickCategorySection.jsx";
import MerchantSection from "../components/MerchantSection.jsx";
import RecommendationSection from "../components/RecommendationSection.jsx";

// Flash sale lintas mitra: yang paling banyak terjual tampil lebih dulu.
const FLASH_ITEMS = PRODUCTS.filter((p) => p.flash).sort((a, b) => b.flashSold - a.flashSold);

export default function HomePage() {
  const { onTryOn, showToast, goToProduct } = useOutletContext();
  const setCategory = useFilter((s) => s.setCategory);
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
      <HeroCarousel onCtaClick={scrollToFeed} />
      <div className="max-w-[1280px] mx-auto px-5 pt-2 pb-1">
        <FlashSaleSection id="flash-sale" products={FLASH_ITEMS} limit={6} columns={3} showMerchant onSeeAll={seeAllFlash} />
      </div>
      <QuickCategorySection />
      <MerchantSection id="merchant" />
      <div ref={feedRef}>
        <RecommendationSection
          id="feed"
          onTryOn={onTryOn}
          showToast={showToast}
          cardRefs={cardRefs}
          onOpenDetail={goToProduct}
        />
      </div>
    </>
  );
}
