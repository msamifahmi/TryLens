import { useNavigate } from "react-router-dom";
import ProductImage from "./ProductImage.jsx";
import { formatRp } from "../data/mockData.js";
import { useWishlist } from "../store/useWishlist.js";

function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function HeartIcon({ active }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"}>
      <path d="M12 21s-7.5-4.6-10-9.3C.5 8.2 2.3 5 5.6 5c1.9 0 3.4 1 4.4 2.5C11 6 12.5 5 14.4 5c3.3 0 5.1 3.2 3.6 6.7C19.5 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function TryIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" stroke="#fff" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.6" fill="#fff" />
    </svg>
  );
}

export default function ProductCard({ product, onTryOn, showToast, cardRef, onOpenDetail }) {
  const isWished = useWishlist((s) => s.isWished(product.id));
  const toggle = useWishlist((s) => s.toggle);
  const navigate = useNavigate();

  function openDetail() {
    if (onOpenDetail) onOpenDetail(product.id);
    else navigate(`/produk/${product.id}`);
  }

  return (
    <div ref={cardRef} data-id={product.id} className="bg-white border border-border rounded-xl overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all group">
      <div className="relative aspect-square bg-[#F8FAFC] overflow-hidden">
        {product.badge && (
          <span
            className={`absolute top-2.5 left-2.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${
              product.badge.startsWith("-") ? "bg-error text-white" : "bg-accent-yellow text-ink"
            }`}
          >
            {product.badge}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle(product, showToast);
          }}
          aria-pressed={isWished}
          aria-label={`Tambah ke wishlist ${product.name}`}
          className={`absolute top-[7px] right-[7px] w-[30px] h-[30px] rounded-full bg-white/95 shadow-sm flex items-center justify-center hover:scale-110 transition-transform ${
            isWished ? "text-error" : "text-ink-muted"
          }`}
        >
          <HeartIcon active={isWished} />
        </button>
        <button
          onClick={openDetail}
          className="w-full h-full flex items-center justify-center p-[20%]"
          aria-label={`Lihat detail ${product.name}`}
        >
          <ProductImage
            productId={product.id}
            variant="main"
            style={product.style}
            colorKey={product.colorKey}
            className="w-full h-full group-hover:scale-105 transition-transform duration-200"
            alt={product.name}
          />
        </button>
      </div>

      <div className="p-3 pb-3.5 flex flex-col gap-1.5 flex-1">
        <button onClick={openDetail} className="text-left">
          <p className="text-[13.5px] font-semibold text-ink-text line-clamp-2 min-h-[36px] m-0 hover:text-blue">{product.name}</p>
        </button>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[15.5px] font-extrabold text-blue-deep">{formatRp(product.price)}</span>
          {product.oldPrice && <span className="text-xs text-ink-muted line-through">{formatRp(product.oldPrice)}</span>}
        </div>
        <p className="text-[11.5px] text-ink-muted m-0 flex items-center gap-1">
          <PinIcon /> {product.merchant} · {product.city}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTryOn(product);
          }}
          className="mt-1 w-full h-[34px] rounded-lg bg-blue hover:bg-blue-deep text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5"
        >
          <TryIcon /> Coba Sekarang
        </button>
      </div>
    </div>
  );
}
