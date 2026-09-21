import { useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";
import SearchBar from "./SearchBar.jsx";
import ExploreMenu from "./ExploreMenu.jsx";
import PartnerAccountButton from "./PartnerAccountButton.jsx";
import { useWishlist } from "../store/useWishlist.js";

export default function MainNav({ onOpenWishlist, onSelectProduct, onSelectMerchant, onJumpToFeed, onJumpToFlash }) {
  const wishCount = useWishlist((s) => s.count());
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  // history.state.idx > 0 = ada halaman sebelumnya di dalam aplikasi ini.
  // Kalau tidak ada (mis. halaman dibuka langsung dari link), fallback ke beranda.
  function goBack() {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/");
  }

  return (
    <header className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-[1280px] mx-auto px-5 h-[60px] md:h-[68px] flex items-center gap-4 md:gap-6">
        {!isHome && (
          <button
            onClick={goBack}
            aria-label="Kembali ke halaman sebelumnya"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-ink-text hover:bg-surface-blue flex-shrink-0"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {/* Di HP pada halaman non-beranda, tombol back menggantikan logo agar kolom cari tidak sempit. */}
        <div className={isHome ? "flex" : "hidden md:flex"}>
          <Logo />
        </div>
        <ExploreMenu onJumpToFeed={onJumpToFeed} onJumpToFlash={onJumpToFlash} />

        <SearchBar onSelectProduct={onSelectProduct} onSelectMerchant={onSelectMerchant} />

        <nav className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-auto" aria-label="Aksi pengguna">
          <button className="relative w-10 h-10 flex items-center justify-center rounded-lg text-ink-text hover:bg-surface-blue flex-shrink-0" aria-label="Notifikasi, 5 belum dibaca">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M13.7 21a2 2 0 01-3.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-error text-white rounded-full text-[10px] font-bold flex items-center justify-center">5</span>
          </button>

          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-lg text-ink-text hover:bg-surface-blue flex-shrink-0"
            aria-label="Wishlist"
            onClick={onOpenWishlist}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-error text-white rounded-full text-[10px] font-bold flex items-center justify-center">{wishCount}</span>
          </button>

          <PartnerAccountButton />
        </nav>
      </div>
    </header>
  );
}
