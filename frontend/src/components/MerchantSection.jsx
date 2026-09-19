import { useNavigate } from "react-router-dom";
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
    <section id={id} className="max-w-[1280px] mx-auto px-5 py-7">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[21px] font-bold text-ink tracking-tight mb-1">Toko Optik Pilihan</h2>
          <p className="text-[13.5px] text-ink-muted m-0">Belanja dari merchant optik lokal yang tersedia di TryLens.</p>
        </div>
        <a href="#" className="text-[13.5px] font-semibold text-blue hover:underline flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
          Lihat semua toko
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>

      <div className="flex gap-3.5 overflow-x-auto scrollbar-none pb-1">
        {MERCHANTS.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/toko/${m.id}`)}
            className="flex-shrink-0 w-60 bg-white border border-border rounded-2xl p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
            aria-label={`Lihat katalog ${m.name}`}
          >
            <div className="flex gap-3 items-center mb-2.5">
              <div className="w-[46px] h-[46px] rounded-xl flex-shrink-0 flex items-center justify-center text-white font-extrabold text-base" style={{ background: m.color }}>
                {m.initials}
              </div>
              <div>
                <p className="text-[14.5px] font-bold text-ink-text mb-0.5">{m.name}</p>
                <p className="text-xs text-ink-muted m-0 flex items-center gap-1"><PinIcon /> {m.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-ink-muted mb-3.5">
              <span>{m.count}</span>
              <span className="flex items-center gap-1 text-ink-text font-semibold"><span className="text-accent-yellow"><StarIcon /></span> {m.rating}</span>
            </div>
            <span className="block w-full h-9 rounded-lg border-[1.5px] border-blue text-blue text-sm font-bold hover:bg-surface-blue flex items-center justify-center">
              Lihat Katalog
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
