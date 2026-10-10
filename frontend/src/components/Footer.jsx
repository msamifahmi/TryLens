import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import { SOCIAL } from "../data/siteInfo.js";

const COLUMNS = [
  {
    title: "TryLens",
    links: [
      { label: "Tentang TryLens", to: "/tentang" },
      { label: "Cara Kerja", to: "/cara-kerja" },
      { label: "Virtual Try-On", to: "/virtual-try-on" },
      { label: "Karier", to: "/karier" }
    ]
  },
  {
    title: "Untuk Pengguna",
    links: [
      { label: "Cara Belanja", to: "/cara-belanja" },
      { label: "Wishlist", action: "wishlist" },
      { label: "FAQ", to: "/faq" },
      { label: "Bantuan", to: "/bantuan" }
    ]
  },
  {
    title: "Untuk Merchant",
    links: [
      { label: "Daftar Merchant", to: "/partner/register" },
      { label: "Merchant Center", to: "/partner" },
      { label: "Panduan Merchant", to: "/panduan-merchant" },
      { label: "Kontak", to: "/kontak" }
    ]
  }
];

const ICONS = {
  Instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></>,
  TikTok: <path d="M14 4v10.2a3.2 3.2 0 1 1-3.2-3.2M14 4c.4 2.4 1.9 3.9 4.2 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  LinkedIn: <><path d="M6.5 9.5v8M6.5 6.2v.1M10.5 17.5v-8m0 3c0-2 1.3-3 2.9-3s2.6 1 2.6 3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>
};

export default function Footer({ onOpenWishlist }) {
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
            <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.action === "wishlist" ? (
                    <button type="button" onClick={onOpenWishlist} className="inline-flex items-center min-h-[40px] text-[13.5px] text-ink-muted hover:text-blue p-0 bg-transparent border-0 cursor-pointer">{link.label}</button>
                  ) : (
                    <Link to={link.to} className="inline-flex items-center min-h-[40px] text-[13.5px] text-ink-muted hover:text-blue">{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-[1280px] mx-auto px-5 border-t border-border py-4.5 flex items-center justify-between flex-wrap gap-2.5 text-[12.5px] text-ink-muted">
        <span>© 2026 TryLens. Hak cipta dilindungi.</span>
        <div className="flex gap-2.5">
          {Object.keys(ICONS).map((label) => (
            <a
              key={label}
              href={SOCIAL[label] || "/kontak"}
              {...(SOCIAL[label] ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              aria-label={label}
              title={label}
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-ink-muted hover:text-blue hover:border-blue"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">{ICONS[label]}</svg>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
