export default function TopPromoBar() {
  return (
    <div className="h-9 bg-blue-deep text-white text-[13px] hidden sm:flex items-center">
      <div className="max-w-[1280px] mx-auto px-5 w-full flex items-center justify-between">
        <span className="font-medium truncate">
          ✨ Coba kacamata secara virtual — gratis, tanpa install aplikasi
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
