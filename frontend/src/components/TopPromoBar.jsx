import { catalogInfo } from "../lib/catalog.js";

const DEFAULT_TEXT = "Coba kacamata secara virtual — gratis, tanpa install aplikasi";

export default function TopPromoBar() {
  // Teks dari admin (tab Iklan). Server lama tanpa fitur iklan → teks bawaan; admin menghapus semua teks → hanya menu.
  const list = catalogInfo.banners?.topbar;
  const text = Array.isArray(list) ? list[0]?.headline || "" : DEFAULT_TEXT;
  return (
    <div className="h-9 bg-blue-deep text-white text-[13px] hidden sm:flex items-center">
      <div className="max-w-[1280px] mx-auto px-5 w-full flex items-center justify-between">
        <span className="font-medium truncate">
          {text && `✨ ${text}`}
        </span>
        <nav className="flex gap-5 flex-shrink-0">
          <a href="#tentang" className="opacity-90 hover:opacity-100 hover:underline">Tentang TryLens</a>
          <a href="#merchant" className="opacity-90 hover:opacity-100 hover:underline">Untuk Merchant</a>
          <a href="#faq" className="opacity-90 hover:opacity-100 hover:underline">FAQ</a>
          <a href="#kontak" className="opacity-90 hover:opacity-100 hover:underline">Hubungi Kami</a>
        </nav>
      </div>
    </div>
  );
}
