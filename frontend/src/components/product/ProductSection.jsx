import ProductCard from "../ProductCard.jsx";

/** Judul bagian + grid kartu produk (2 kolom di HP, 4 di desktop). */
export default function ProductSection({ id, eyebrow, title, subtitle, products, onTryOn, showToast, action, badge }) {
  if (!products.length) return null;
  return (
    <section id={id} className="mt-14" aria-label={title}>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11.5px] font-bold tracking-[.14em] uppercase text-blue m-0 mb-1.5 flex items-center gap-2">{eyebrow}{badge}</p>}
          <h2 className="text-[22px] md:text-[26px] font-extrabold text-ink tracking-tight leading-tight m-0">{title}</h2>
          {subtitle && <p className="text-[13.5px] text-ink-muted m-0 mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div data-stagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onTryOn={onTryOn} showToast={showToast} />
        ))}
      </div>
    </section>
  );
}
