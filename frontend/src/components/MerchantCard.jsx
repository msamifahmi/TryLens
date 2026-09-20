import { Link } from "react-router-dom";
import { InstagramIcon, XIcon, ShopBagIcon } from "./icons/SocialIcons.jsx";

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1L12 2z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** Kartu merchant untuk grid halaman Mitra. `productCount` & `promoCount` dihitung oleh pemanggil. */
export default function MerchantCard({ merchant: m, productCount, promoCount }) {
  const hasSocial = !!(m.links?.instagram || m.links?.x);
  const hasCommerce = !!(m.links?.tokopedia || m.links?.shopee);

  return (
    <Link
      to={`/toko/${m.id}`}
      className="bg-white border border-border rounded-2xl p-4 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all"
      aria-label={`Lihat katalog ${m.name}`}
    >
      <div className="flex gap-3 items-center mb-3">
        <div
          className="w-[46px] h-[46px] rounded-xl flex-shrink-0 flex items-center justify-center text-white font-extrabold text-base"
          style={{ background: m.color }}
        >
          {m.initials}
        </div>
        <div className="min-w-0">
          <p className="text-[14.5px] font-bold text-ink-text mb-0.5 truncate">{m.name}</p>
          <p className="text-xs text-ink-muted m-0 flex items-center gap-1 truncate">
            <PinIcon /> {m.city}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-xs text-ink-muted mb-2.5 flex-wrap">
        <span className="flex items-center gap-1 text-ink-text font-semibold">
          <span className="text-accent-yellow"><StarIcon /></span> {m.rating}
        </span>
        <span>{m.count}</span>
        <span>{productCount} di TryLens</span>
      </div>

      <div className="flex items-center gap-1.5 mb-3.5 min-h-[22px]">
        {promoCount > 0 && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-error text-white">{promoCount} promo</span>
        )}
        {(hasSocial || hasCommerce) && (
          <span className="ml-auto flex items-center gap-1.5 text-ink-muted" aria-label="Tersedia di media sosial dan e-commerce">
            {m.links.instagram && <InstagramIcon size={15} />}
            {m.links.x && <XIcon size={13} />}
            {hasCommerce && <ShopBagIcon size={15} />}
          </span>
        )}
      </div>

      <span className="mt-auto w-full h-9 rounded-lg border-[1.5px] border-blue text-blue text-sm font-bold flex items-center justify-center hover:bg-surface-blue">
        Lihat Katalog
      </span>
    </Link>
  );
}
