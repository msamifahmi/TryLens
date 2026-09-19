import Logo from "./Logo.jsx";
import SearchBar from "./SearchBar.jsx";
import { useWishlist } from "../store/useWishlist.js";

export default function MainNav({ onOpenWishlist, onSelectProduct, onSelectMerchant }) {
  const wishCount = useWishlist((s) => s.count());

  return (
    <header className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-[1280px] mx-auto px-5 h-[60px] md:h-[68px] flex items-center gap-4 md:gap-6">
        <Logo />
        <button className="hidden md:flex items-center gap-1 text-sm font-semibold text-ink-text flex-shrink-0 py-2">
          Jelajahi
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <SearchBar onSelectProduct={onSelectProduct} onSelectMerchant={onSelectMerchant} />

        <nav className="flex items-center gap-1 flex-shrink-0" aria-label="Aksi pengguna">
          <button className="relative w-10 h-10 flex items-center justify-center rounded-lg text-ink-text hover:bg-surface-blue" aria-label="Notifikasi, 5 belum dibaca">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M13.7 21a2 2 0 01-3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-error text-white rounded-full text-[10px] font-bold flex items-center justify-center">5</span>
          </button>

          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-lg text-ink-text hover:bg-surface-blue"
            aria-label="Wishlist"
            onClick={onOpenWishlist}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 21s-7.5-4.6-10-9.3C.5 8.2 2.3 5 5.6 5c1.9 0 3.4 1 4.4 2.5C11 6 12.5 5 14.4 5c3.3 0 5.1 3.2 3.6 6.7C19.5 16.4 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-error text-white rounded-full text-[10px] font-bold flex items-center justify-center">{wishCount}</span>
          </button>

          <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-blue to-blue-deep text-white font-bold text-[13px] flex items-center justify-center ml-1" title="Ameeyyyyy">
            A
          </div>
        </nav>
      </div>
    </header>
  );
}
