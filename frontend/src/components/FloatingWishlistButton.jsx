import { useWishlist } from "../store/useWishlist.js";

export default function FloatingWishlistButton({ onClick }) {
  const count = useWishlist((s) => s.count());

  return (
    <button
      onClick={onClick}
      aria-label="Buka wishlist"
      className="fixed bottom-6 right-6 max-[700px]:bottom-4 max-[700px]:right-4 z-[60] w-[54px] h-[54px] max-[700px]:w-12 max-[700px]:h-12 rounded-full bg-blue hover:bg-blue-deep text-white flex items-center justify-center shadow-[0_8px_22px_rgba(66,122,181,0.45)]"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-10-9.3C.5 8.2 2.3 5 5.6 5c1.9 0 3.4 1 4.4 2.5C11 6 12.5 5 14.4 5c3.3 0 5.1 3.2 3.6 6.7C19.5 16.4 12 21 12 21z" fill="#fff" />
      </svg>
      <span className="absolute -top-[3px] -right-[3px] min-w-[19px] h-[19px] px-1 rounded-full bg-accent-yellow text-ink text-[11px] font-extrabold flex items-center justify-center border-2 border-[#F5F7FA]">
        {count}
      </span>
    </button>
  );
}
