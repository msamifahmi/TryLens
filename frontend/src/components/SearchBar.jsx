import { useEffect, useRef, useState } from "react";
import { PRODUCTS, MERCHANTS } from "../data/mockData.js";

export default function SearchBar({ onSelectProduct, onSelectMerchant }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const productResults = q
    ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)).slice(0, 5)
    : [];
  const merchantResults = q
    ? MERCHANTS.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 3)
    : [];
  const noResults = q && productResults.length === 0 && merchantResults.length === 0;

  return (
    <div className="relative flex-1 max-w-[620px]" ref={wrapRef}>
      <div className="flex items-center h-[46px] border-[1.5px] border-border rounded-[10px] bg-white px-3.5 gap-2.5 focus-within:border-blue transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-ink-muted flex-shrink-0" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <label htmlFor="searchInput" className="sr-only">Cari frame atau toko optik</label>
        <input
          id="searchInput"
          type="text"
          placeholder="Cari frame atau toko optik"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          className="flex-1 outline-none border-none bg-transparent text-sm text-ink-text placeholder:text-ink-muted"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim() && setOpen(true)}
        />
      </div>

      {open && q && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-border rounded-xl shadow-lg p-2 z-50 max-h-[360px] overflow-y-auto">
          {noResults && (
            <div className="px-2.5 py-2.5 text-sm text-ink-muted">Tidak ada hasil untuk &ldquo;{query}&rdquo;</div>
          )}
          {productResults.length > 0 && (
            <>
              <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold text-ink-muted">Frame</div>
              {productResults.map((p) => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-text hover:bg-surface-blue text-left"
                  onClick={() => {
                    onSelectProduct?.(p.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-ink-muted flex-shrink-0"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  <span>{p.name}</span>
                </button>
              ))}
            </>
          )}
          {merchantResults.length > 0 && (
            <>
              <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold text-ink-muted">Toko terkait</div>
              {merchantResults.map((m) => (
                <button
                  key={m.id}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-text hover:bg-surface-blue text-left"
                  onClick={() => {
                    onSelectMerchant?.(m.id);
                    setOpen(false);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-ink-muted flex-shrink-0"><path d="M4 9l1-5h14l1 5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M5 9v10h14V9" stroke="currentColor" strokeWidth="1.8" /></svg>
                  <span>{m.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
