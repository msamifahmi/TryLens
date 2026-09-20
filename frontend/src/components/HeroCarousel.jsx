import { useEffect, useRef, useState } from "react";
import FrameIcon from "./icons/FrameIcon.jsx";

const SLIDES = [
  {
    headline: "Coba Kacamata Sebelum Beli",
    sub: "Lihat langsung bagaimana frame terlihat di wajahmu dengan virtual try-on.",
    cta: "Coba Sekarang",
    cta2: "Jelajahi Frame",
    bg: "linear-gradient(120deg, #427AB5 0%, #406AAF 100%)",
    illustration: "face"
  },
  {
    headline: "Ribuan Frame dari Optik Lokal",
    sub: "Temukan pilihan frame dari toko optik dan UMKM di kotamu.",
    cta: "Jelajahi Toko",
    cta2: null,
    bg: "linear-gradient(120deg, #406AAF 0%, #2F5586 100%)",
    illustration: "collection"
  },
  {
    headline: "Temukan Frame yang Cocok untukmu",
    sub: "Bandingkan gaya, bentuk, dan harga dalam satu tempat.",
    cta: "Mulai Eksplorasi",
    cta2: null,
    bg: "linear-gradient(120deg, #4C86BF 0%, #427AB5 100%)",
    illustration: "compare"
  },
  {
    headline: "Promo Frame Pilihan",
    sub: "Temukan penawaran menarik dari merchant TryLens.",
    cta: "Lihat Promo",
    cta2: null,
    bg: "linear-gradient(120deg, #406AAF 0%, #C9A24B 130%)",
    illustration: "promo"
  }
];

function FaceIllustration() {
  return (
    <svg viewBox="0 0 220 220" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="110" cy="100" r="72" fill="#FFE8BE" opacity="0.9" />
      <ellipse cx="110" cy="118" rx="52" ry="60" fill="#E7C9A0" />
      <path d="M62 92 Q110 62 158 92" stroke="#5C3A22" strokeWidth="10" strokeLinecap="round" fill="none" />
      <circle cx="86" cy="118" r="17" fill="#D8E8F7" stroke="#111827" strokeWidth="4" />
      <circle cx="134" cy="118" r="17" fill="#D8E8F7" stroke="#111827" strokeWidth="4" />
      <path d="M103 118 Q110 113 117 118" stroke="#111827" strokeWidth="4" fill="none" />
      <path d="M69 108 L52 100" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
      <path d="M151 108 L168 100" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
      <path d="M95 158 Q110 168 125 158" stroke="#5C3A22" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function CollectionIllustration() {
  return (
    <svg viewBox="0 0 220 220" fill="none" aria-hidden="true" className="w-full h-full">
      <foreignObject x="10" y="30" width="180" height="90"><div style={{ transform: "rotate(-8deg)" }}><FrameIcon style="aviator" colorKey="gold" /></div></foreignObject>
      <foreignObject x="30" y="100" width="180" height="90"><FrameIcon style="round" colorKey="clear" /></foreignObject>
      <foreignObject x="10" y="165" width="180" height="90"><div style={{ transform: "rotate(6deg)" }}><FrameIcon style="cateye" colorKey="tort" /></div></foreignObject>
    </svg>
  );
}

function CompareIllustration() {
  return (
    <svg viewBox="0 0 220 220" fill="none" aria-hidden="true" className="w-full h-full">
      <rect x="14" y="50" width="90" height="120" rx="14" fill="rgba(255,255,255,0.14)" />
      <rect x="116" y="50" width="90" height="120" rx="14" fill="rgba(255,255,255,0.22)" />
      <foreignObject x="26" y="95" width="80" height="50"><FrameIcon style="square" colorKey="black" /></foreignObject>
      <foreignObject x="128" y="95" width="80" height="50"><FrameIcon style="round" colorKey="blue" /></foreignObject>
    </svg>
  );
}

function PromoIllustration() {
  return (
    <svg viewBox="0 0 220 220" fill="none" aria-hidden="true" className="w-full h-full">
      <circle cx="110" cy="105" r="80" fill="rgba(255,255,255,0.14)" />
      <foreignObject x="30" y="75" width="160" height="80"><FrameIcon style="rect" colorKey="brown" /></foreignObject>
      <text x="110" y="185" textAnchor="middle" fontSize="26" fontWeight="800" fill="#F7DD7D">-30%</text>
    </svg>
  );
}

const ILLUSTRATIONS = {
  face: FaceIllustration,
  collection: CollectionIllustration,
  compare: CompareIllustration,
  promo: PromoIllustration
};

export default function HeroCarousel({ onCtaClick }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  function goTo(i) {
    setIndex((i + SLIDES.length) % SLIDES.length);
  }

  function startAutoplay() {
    stopAutoplay();
    timerRef.current = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
  }
  function stopAutoplay() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
  }, []);

  return (
    <section className="max-w-[1280px] mx-auto px-5 pt-4 pb-2">
      <div
        className="relative rounded-2xl overflow-hidden aspect-[3/1] max-[700px]:aspect-[5/6]"
        onMouseEnter={stopAutoplay}
        onMouseLeave={startAutoplay}
        role="region"
        aria-roledescription="carousel"
        aria-label="Promosi TryLens"
      >
        {SLIDES.map((slide, i) => {
          const Illustration = ILLUSTRATIONS[slide.illustration];
          return (
            <div
              key={slide.headline}
              className={`absolute inset-0 flex items-center transition-opacity duration-500 ${
                i === index ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
              style={{ background: slide.bg }}
            >
              <div className="flex items-center w-full h-full px-8 md:px-14 max-[700px]:flex-col-reverse max-[700px]:justify-end max-[700px]:px-7 max-[700px]:pb-7 max-[700px]:text-center">
                <div className="flex-1 max-w-[480px] relative z-10">
                  <h1 className="text-[24px] md:text-[34px] font-extrabold text-white leading-tight mb-3 tracking-tight">
                    {slide.headline}
                  </h1>
                  <p className="text-[14.5px] text-white/90 mb-4 leading-relaxed max-w-[400px] max-[700px]:mx-auto">
                    {slide.sub}
                  </p>
                  <div className="flex gap-2.5 flex-wrap max-[700px]:justify-center">
                    <button
                      onClick={onCtaClick}
                      className="h-10 px-5 rounded-[10px] text-sm font-bold bg-accent-yellow text-ink hover:-translate-y-0.5 hover:shadow-lg transition-transform"
                    >
                      {slide.cta}
                    </button>
                    {slide.cta2 && (
                      <button className="h-10 px-5 rounded-[10px] text-sm font-bold bg-white/15 text-white border border-white/50 hover:bg-white/25">
                        {slide.cta2}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 w-1/3 max-[700px]:w-1/2 max-[700px]:max-w-[150px] max-[700px]:mb-2 flex items-center justify-center relative z-[1]">
                  <Illustration />
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => goTo(index - 1)}
          aria-label="Slide sebelumnya"
          className="absolute top-1/2 -translate-y-1/2 left-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md z-[5]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button
          onClick={() => goTo(index + 1)}
          aria-label="Slide berikutnya"
          className="absolute top-1/2 -translate-y-1/2 right-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md z-[5]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-[5]">
          {SLIDES.map((s, i) => (
            <button
              key={s.headline}
              onClick={() => goTo(i)}
              aria-label={`Ke slide ${i + 1}`}
              className={`h-[7px] rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-[7px] bg-white/50"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
