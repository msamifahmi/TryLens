import Logo from "./Logo.jsx";

const COLUMNS = [
  {
    title: "TryLens",
    links: ["Tentang TryLens", "Cara Kerja", "Virtual Try-On", "Karier"]
  },
  {
    title: "Untuk Pengguna",
    links: ["Cara Belanja", "Wishlist", "FAQ", "Bantuan"]
  },
  {
    title: "Untuk Merchant",
    links: ["Daftar Merchant", "Merchant Center", "Panduan Merchant", "Kontak"]
  }
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-5">
      <div className="max-w-[1280px] mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8 py-11">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="text-[13px] text-ink-muted leading-relaxed mt-3 max-w-[260px]">
            Marketplace kacamata dengan teknologi coba virtual, menghubungkan kamu dengan toko optik lokal di
            seluruh Indonesia.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-[13px] font-bold text-ink mb-3.5">{col.title}</h4>
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-[13.5px] text-ink-muted hover:text-blue">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-[1280px] mx-auto px-5 border-t border-border py-4.5 flex items-center justify-between flex-wrap gap-2.5 text-[12.5px] text-ink-muted">
        <span>© 2026 TryLens. Hak cipta dilindungi.</span>
        <div className="flex gap-2.5">
          {["Instagram", "TikTok", "LinkedIn"].map((label) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-ink-muted hover:text-blue hover:border-blue"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /></svg>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
