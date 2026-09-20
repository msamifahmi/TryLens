import FrameIcon from "./icons/FrameIcon.jsx";

// Gaya visual mengikuti slide di HeroCarousel (gradien navy, teks putih, CTA kuning).
const THEMES = {
  promo: {
    bg: "linear-gradient(120deg, #406AAF 0%, #C9A24B 130%)",
    art: (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 m-auto w-[86%] aspect-square rounded-full bg-white/15" />
        <FrameIcon style="rect" colorKey="brown" className="relative w-[78%]" />
        <span className="absolute bottom-0 right-0 text-[22px] font-extrabold text-accent-yellow">-30%</span>
      </div>
    )
  },
  catalog: {
    bg: "linear-gradient(120deg, #427AB5 0%, #2F5586 100%)",
    art: (
      <div className="relative w-full h-full">
        <FrameIcon style="aviator" colorKey="gold" className="absolute top-0 left-0 w-[82%] -rotate-6" />
        <FrameIcon style="round" colorKey="clear" className="absolute top-[34%] right-0 w-[82%]" />
        <FrameIcon style="cateye" colorKey="tort" className="absolute bottom-0 left-[6%] w-[78%] rotate-6" />
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
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5" aria-label="Iklan promo dan katalog terbaru">
      {ads.map((ad) => {
        const theme = THEMES[ad.theme] || THEMES.promo;
        return (
          <div
            key={ad.id}
            className="relative rounded-2xl overflow-hidden min-h-[160px] flex items-center px-6 py-5 md:px-8 gap-4"
            style={{ background: theme.bg }}
          >
            <div className="flex-1 min-w-0 relative z-10">
              <span className="inline-block text-[10.5px] font-bold tracking-wide uppercase bg-white/20 text-white px-2 py-0.5 rounded-md mb-2.5">
                {ad.tag}
              </span>
              <h3 className="text-[21px] md:text-[24px] font-extrabold text-white leading-tight tracking-tight mb-1.5">
                {ad.headline}
              </h3>
              <p className="text-[13.5px] text-white/90 leading-relaxed mb-3.5 max-w-[320px]">{ad.sub}</p>
              <button
                onClick={ad.onClick}
                className="h-10 px-5 rounded-[10px] text-[13.5px] font-bold bg-accent-yellow text-ink hover:-translate-y-0.5 hover:shadow-lg transition-transform"
              >
                {ad.cta}
              </button>
            </div>
            <div className="flex-shrink-0 w-[34%] max-w-[150px] aspect-square" aria-hidden="true">
              {theme.art}
            </div>
          </div>
        );
      })}
    </section>
  );
}
