import { Link, useNavigate } from "react-router-dom";
import MerchantAvatar from "./MerchantAvatar.jsx";
import { MERCHANTS } from "../data/mockData.js";

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1L12 2z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function MerchantSection({ id }) {
  const navigate = useNavigate();

  return (
    <div id={id} className="scroll-mt-24">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-baseline gap-x-3 gap-y-0.5 flex-wrap min-w-0">
          <h2 className="text-[20px] md:text-[22px] font-extrabold text-ink tracking-tight m-0 flex items-center gap-2">
            <span aria-hidden="true" className="w-1.5 h-5 rounded-full bg-blue" />Toko Optik Pilihan
          </h2>
          <p className="text-[12.5px] text-ink-muted m-0 hidden sm:block">Belanja dari merchant optik lokal yang tersedia di TryLens.</p>
        </div>
        <Link to="/mitra" className="min-h-11 text-[13px] font-bold text-blue hover:underline flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap">
          Lihat semua
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </div>

      <div data-stagger className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {MERCHANTS.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/toko/${m.id}`)}
            className="tl-lift group flex-shrink-0 w-[220px] bg-[#F5F9FE] border border-[#DDE8F4] rounded-xl p-2.5 text-left cursor-pointer flex items-center gap-2.5 min-h-[56px]"
            aria-label={`Lihat katalog ${m.name}`}
          >
            <MerchantAvatar merchant={m} className="w-10 h-10 rounded-lg text-[14px] font-extrabold tl-zoom group-hover:rotate-3" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-bold text-ink-text truncate">{m.name}</span>
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink-muted truncate">
                <PinIcon /> {m.city.split(",")[0]} · {m.count}
              </span>
            </span>
            <span className="flex items-center gap-0.5 text-[12px] font-bold text-ink-text flex-shrink-0"><span className="text-accent-yellow"><StarIcon /></span>{m.rating}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
