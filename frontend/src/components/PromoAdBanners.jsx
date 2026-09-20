import FrameIcon from "./icons/FrameIcon.jsx";

// Gaya visual mengikuti slide di HeroCarousel (gradien navy, teks putih, CTA kuning),
// dalam ukuran ringkas (±separuh tinggi versi sebelumnya).
const THEMES = {
  promo: {
    bg: "linear-gradient(120deg, #406AAF 0%, #C9A24B 130%)",
    art: (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-white/15" />
        <FrameIcon style="rect" colorKey="brown" className="relative w-[80%]" />
        <span className="absolute -bottom-0.5 right-0 text-[10px] font-extrabold text-accent-yellow">-30%</span>
      </div>
    )
  },
  catalog: {
    bg: "linear-gradient(120deg, #427AB5 0%, #2F5586 100%)",
    art: (
      <div className="relative w-full h-full">
        <FrameIcon style="aviator" colorKey="gold" className="absolute top-[4%] left-0 w-[86%] -rotate-6" />
        <FrameIcon style="round" colorKey="clear" className="absolute bottom-[4%] right-0 w-[86%]" />
      </div>
    )
  }
};

/**
 * ads: [{ id, theme: "promo" | "catalog", tag, headline, sub, cta, onClick }]
 * Komponen ini murni presentasional — logika isi/CTA ditentukan halaman pemakai.
 */
export default function PromoAdBanners({ ads }) {
  if (!ads || ads.length === 0) return null;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Iklan promo dan katalog terbaru">
      {ads.map((ad) => {
        const theme = THEMES[ad.theme] || THEMES.promo;
        return (
          <div
            key={ad.id}
            className="relative rounded-xl overflow-hidden min-h-[80px] flex items-center gap-3 px-4 py-3"
            style={{ background: theme.bg }}
          >
            <div className="hidden sm:block flex-shrink-0 w-14 h-14" aria-hidden="true">
              {theme.art}
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[9.5px] font-bold tracking-wide uppercase bg-white/20 text-white px-1.5 py-px rounded mb-1">
                {ad.tag}
              </span>
              <h3 className="text-[15px] font-extrabold text-white leading-tight tracking-tight m-0">{ad.headline}</h3>
              <p className="text-[12px] text-white/90 leading-snug m-0 mt-0.5 line-clamp-2">{ad.sub}</p>
            </div>
            <button
              onClick={ad.onClick}
              className="h-8 px-3.5 rounded-lg text-[12.5px] font-bold whitespace-nowrap flex-shrink-0 bg-accent-yellow text-ink hover:-translate-y-0.5 hover:shadow-lg transition-transform"
            >
              {ad.cta}
            </button>
          </div>
        );
      })}
    </section>
  );
}
