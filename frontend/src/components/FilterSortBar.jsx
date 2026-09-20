function pill(active) {
  return `h-9 px-4 rounded-full border text-[13px] font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
    active
      ? "bg-blue text-white border-blue"
      : "bg-white text-ink-text border-border hover:border-blue hover:text-blue"
  }`;
}

/**
 * Bar filter + sort yang dipakai ulang di halaman Mitra dan halaman Toko.
 *
 * chips        : [{ label, value }]   pilihan tunggal (mis. wilayah / kategori)
 * activeChip   : value chip aktif
 * toggles      : [{ key, label, active }]  filter on/off (mis. "Sedang promo")
 * sortOptions  : [{ value, label }]
 * onReset      : dipanggil saat tombol "Reset" ditekan (tombol hanya muncul jika canReset)
 */
export default function FilterSortBar({
  chips = [],
  activeChip,
  onChipChange,
  toggles = [],
  onToggle,
  sortOptions = [],
  sortValue,
  onSortChange,
  resultCount,
  unit = "hasil",
  canReset = false,
  onReset,
  ariaLabel = "Filter dan urutkan"
}) {
  return (
    <div
      className="md:sticky md:top-[68px] z-20 bg-[#F5F7FA] py-2.5 mb-4 flex flex-col gap-2.5"
      role="group"
      aria-label={ariaLabel}
    >
      {chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5 md:mx-0 md:px-0" role="tablist">
          {chips.map((c) => (
            <button
              key={c.value}
              role="tab"
              aria-selected={activeChip === c.value}
              onClick={() => onChipChange(c.value)}
              className={pill(activeChip === c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {toggles.map((t) => (
          <button
            key={t.key}
            aria-pressed={t.active}
            onClick={() => onToggle(t.key)}
            className={`${pill(t.active)} flex items-center gap-1.5`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center ${
                t.active ? "bg-white border-white text-blue" : "border-ink-muted/50"
              }`}
              aria-hidden="true"
            >
              {t.active && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {t.label}
          </button>
        ))}

        {canReset && (
          <button onClick={onReset} className="h-9 px-2 text-[13px] font-semibold text-blue hover:underline">
            Reset
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] text-ink-muted hidden sm:inline" aria-live="polite">
            {resultCount} {unit}
          </span>
          <label className="relative flex items-center">
            <span className="sr-only">Urutkan</span>
            <select
              value={sortValue}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-[13px] font-semibold text-ink-text cursor-pointer hover:border-blue focus:outline-none focus:border-blue"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  Urutkan: {o.label}
                </option>
              ))}
            </select>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute right-2.5 pointer-events-none text-ink-muted"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </label>
        </div>
      </div>
    </div>
  );
}
