import { useRef } from "react";
import { useOutletContext } from "react-router-dom";
import HeroCarousel from "../components/HeroCarousel.jsx";
import QuickCategorySection from "../components/QuickCategorySection.jsx";
import MerchantSection from "../components/MerchantSection.jsx";
import RecommendationSection from "../components/RecommendationSection.jsx";

export default function HomePage() {
  const { onTryOn, showToast, goToProduct } = useOutletContext();
  const feedRef = useRef(null);
  const cardRefs = useRef({});

  function scrollToFeed() {
    feedRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <HeroCarousel onCtaClick={scrollToFeed} />
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
