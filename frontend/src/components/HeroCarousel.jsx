import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PRODUCTS } from "../data/mockData.js";
import FrameIcon from "./icons/FrameIcon.jsx";
import { catalogInfo, mitraBanners } from "../lib/catalog.js";
import FitImage from "./FitImage.jsx";

// Warna latar slide iklan dari admin (nama tema → gradien); sama dengan pratinjau di /admin.
const THEME_BG = {
  blue: "linear-gradient(120deg, #427AB5 0%, #406AAF 100%)",
  navy: "linear-gradient(120deg, #406AAF 0%, #2F5586 100%)",
  sky: "linear-gradient(120deg, #4C86BF 0%, #427AB5 100%)",
  gold: "linear-gradient(120deg, #406AAF 0%, #C9A24B 130%)"
};

/** Slide dari admin bila ada; kalau kosong/tidak tersedia, pakai slide bawaan di bawah. */
function activeSlides() {
  // Slide berbayar dari Mitra (slot "Beranda TryLens") ikut berputar setelah slide utama.
  const paid = mitraBanners("beranda").map((b) => ({
    key: `mitra-${b.id}`,
    headline: b.title,
    sub: b.subtitle || `Iklan · ${b.storeName}`,
    cta: b.cta || "Lihat Koleksi",
    action: "link",
    link: `/toko/${b.merchantId}`,
    image: b.image || null,
    cta2: null,
    bg: THEME_BG.gold,
    illustration: "collection"
  }));
  const list = catalogInfo.banners?.hero;
  if (!Array.isArray(list) || !list.length) return [...SLIDES, ...paid];
  return [...list.map((b) => ({
    key: `b${b.id}`,
    headline: b.headline,
    sub: b.sub,
    cta: b.cta,
    action: b.action,
    link: b.link,
    image: b.image || null,
    cta2: null,
    bg: THEME_BG[b.theme] || THEME_BG.blue,
    illustration: ILLUSTRATIONS[b.illustration] ? b.illustration : "face"
  })), ...paid];
}

const SLIDES = [
  {
    headline: "Coba Kacamata Sebelum Beli",
    sub: "Lihat langsung bagaimana frame terlihat di wajahmu dengan virtual try-on.",
    cta: "Coba Sekarang",
    action: "try",
    cta2: "Jelajahi Frame",
    bg: "linear-gradient(120deg, #427AB5 0%, #406AAF 100%)",
    illustration: "face"
  },
  {
    headline: "Ribuan Frame dari Optik Lokal",
    sub: "Temukan pilihan frame dari toko optik dan UMKM di kotamu.",
    cta: "Jelajahi Toko",
    action: "merchant",
    cta2: null,
    bg: "linear-gradient(120deg, #406AAF 0%, #2F5586 100%)",
    illustration: "collection"
  },
  {
    headline: "Temukan Frame yang Cocok untukmu",
    sub: "Bandingkan gaya, bentuk, dan harga dalam satu tempat.",
    cta: "Mulai Eksplorasi",
    action: "feed",
    cta2: null,
    bg: "linear-gradient(120deg, #4C86BF 0%, #427AB5 100%)",
    illustration: "compare"
  },
  {
    headline: "Promo Frame Pilihan",
    sub: "Temukan penawaran menarik dari merchant TryLens.",
    cta: "Lihat Promo",
    action: "promo",
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

const AUTOPLAY_MS = 5500;

/**
 * Props: onFeed (gulir ke daftar frame), onMerchants (gulir ke toko), onPromo (filter Promo + gulir ke daftar).
 * Pindah slide: panah, titik, geser jari/mouse, atau otomatis (berhenti saat disorot/disentuh dan saat tab tidak terlihat).
 */
export default function HeroCarousel({ onFeed, onMerchants, onPromo, onCtaClick }) {
  const navigate = useNavigate();
  const [slides] = useState(activeSlides);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // naik tiap pindah slide → animasi progres titik mulai ulang
  const drag = useRef(null);
  const swiped = useRef(false);

  const goTo = useCallback((i) => {
    setIndex((cur) => {
      const n = (i + slides.length) % slides.length;
      return n === cur ? cur : n;
    });
    setCycle((c) => c + 1);
  }, [slides.length]);

  useEffect(() => {
    if (paused) return undefined;
    const t = setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, cycle, paused, goTo]);

  // Tab di latar belakang: jangan terus memutar.
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function runAction(action, link) {
    const feed = onFeed || onCtaClick;
    if (action === "link") {
      if (typeof link === "string" && link.startsWith("/") && !link.startsWith("//")) navigate(link);
      else if (typeof link === "string" && link.startsWith("https://")) window.open(link, "_blank", "noopener,noreferrer");
    } else if (action === "try") navigate(`/try-on/${PRODUCTS[0]?.id || "f0"}`);
    else if (action === "merchant") (onMerchants || feed)?.();
    else if (action === "promo") (onPromo || feed)?.();
    else feed?.();
  }

  // Geser (sentuh & mouse). Hanya gerak horizontal dominan yang dihitung, sehingga gulir vertikal halaman tetap normal.
  function onPointerDown(e) {
    if (e.target.closest("button, a")) return;
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    swiped.current = false;
    setPaused(true);
  }
  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    if (e.pointerType !== "mouse") setPaused(document.hidden); // sentuh: lanjut otomatis setelah jari diangkat
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swiped.current = true;
      goTo(index + (dx < 0 ? 1 : -1));
    }
  }

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-5 pt-4 pb-2">
      <div
        className={`relative rounded-2xl overflow-hidden aspect-[3/1] select-none ${slides.every((x) => x.image) ? "max-[700px]:aspect-[16/10]" : "max-[700px]:aspect-auto max-[700px]:h-[460px]"} shadow-[0_18px_40px_-24px_rgb(30_60_120/.55)]`} 
        style={{ touchAction: "pan-y" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(document.hidden)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; setPaused(false); }}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") goTo(index - 1); if (e.key === "ArrowRight") goTo(index + 1); }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Promosi TryLens"
      >
        {slides.map((slide, i) => {
          const Illustration = ILLUSTRATIONS[slide.illustration] || ILLUSTRATIONS.face;
          const active = i === index;
          return (
            <div
              key={slide.key || slide.headline}
              aria-hidden={!active}
              data-active={active}
              inert={!active ? "" : undefined}
              className={`tl-slide absolute inset-0 flex items-center transition-[opacity,visibility] duration-500 ${
                active ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
              }`}
              style={{ background: slide.image ? "#0d1520" : slide.bg }}
            >
              {slide.image ? (
                <>
                  <FitImage src={slide.image} alt={slide.headline} eager={i === 0} className="absolute inset-0" />
                  {slide.action !== "none" && (
                    <div
                      role="button"
                      tabIndex={active ? 0 : -1}
                      aria-label={slide.headline}
                      onClick={() => { if (!swiped.current) runAction(slide.action, slide.link); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); runAction(slide.action, slide.link); } }}
                      className="absolute inset-0 z-10 cursor-pointer"
                    />
                  )}
                </>
              ) : (<>
              <div className="pointer-events-none absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
              <div className="flex items-center w-full h-full px-8 md:px-14 max-[700px]:flex-col-reverse max-[700px]:justify-end max-[700px]:px-6 max-[700px]:pt-14 max-[700px]:pb-14 max-[700px]:text-center">
                <div className="flex-1 max-w-[480px]">
                  <h1 className="tl-s-item text-[24px] md:text-[34px] font-extrabold text-white leading-tight mb-3 tracking-tight">
                    {slide.headline}
                  </h1>
                  <p className="tl-s-item text-[14.5px] text-white/90 mb-4 leading-relaxed max-w-[400px] max-[700px]:mx-auto">
                    {slide.sub}
                  </p>
                  <div className="tl-s-item flex gap-2.5 flex-wrap max-[700px]:justify-center">
                    <button
                      onClick={() => runAction(slide.action, slide.link)}
                      className="tl-ripple min-h-11 px-6 rounded-xl text-sm font-bold bg-accent-yellow text-ink shadow-[0_8px_18px_-8px_rgb(0_0_0/.45)] hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      {slide.cta}
                    </button>
                    {slide.cta2 && (
                      <button
                        onClick={() => (onFeed || onCtaClick)?.()}
                        className="tl-ripple min-h-11 px-6 rounded-xl text-sm font-bold bg-white/15 text-white border border-white/50 hover:bg-white/25"
                      >
                        {slide.cta2}
                      </button>
                    )}
                  </div>
                </div>
                <div className="tl-s-art flex-shrink-0 w-1/3 max-[700px]:w-1/2 max-[700px]:max-w-[150px] max-[700px]:mb-2 flex items-center justify-center relative z-[1]">
                  <Illustration />
                </div>
              </div>
              </>)}
            </div>
          );
        })}

        {/* Panah: posisi tengah memakai inset + my-auto (bukan transform), supaya tidak bergeser saat ditekan. */}
        {["prev", "next"].map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => goTo(index + (dir === "next" ? 1 : -1))}
            aria-label={dir === "next" ? "Slide berikutnya" : "Slide sebelumnya"}
            className={`absolute inset-y-0 my-auto h-11 w-11 rounded-full bg-white/90 hover:bg-white backdrop-blur flex items-center justify-center shadow-md z-20 max-[700px]:inset-y-auto max-[700px]:top-3 max-[700px]:my-0 max-[700px]:h-10 max-[700px]:w-10 ${
              dir === "next" ? "right-2 md:right-4" : "left-2 md:left-4"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={dir === "next" ? "M9 6l6 6-6 6" : "M15 18l-6-6 6-6"} stroke="#111827" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}

        {/* Titik: slide aktif memanjang dan terisi selama hitung mundur otomatis. */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex z-20">
          {slides.map((s, i) => (
            <button key={s.key || s.headline} onClick={() => goTo(i)} aria-label={`Ke slide ${i + 1}`} aria-current={i === index} className="h-9 px-[5px] flex items-center">
              <span className={`relative block h-[7px] rounded-full overflow-hidden transition-[width,background-color] duration-300 ${i === index ? "w-8 bg-white/40" : "w-[7px] bg-white/50"}`}>
                {i === index && (
                  <span
                    key={cycle}
                    className="absolute inset-0 bg-white origin-left"
                    style={{ animation: paused ? "none" : `tl-dot-fill ${AUTOPLAY_MS}ms linear forwards`, transform: paused ? "scaleX(1)" : undefined }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
