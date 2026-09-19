export default function Logo({ compact = false }) {
  return (
    <a href="#" className="flex items-center gap-2 flex-shrink-0" aria-label="TryLens beranda">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="12" cy="20" r="9" stroke="#427AB5" strokeWidth="3.2" />
        <circle cx="28" cy="20" r="9" stroke="#427AB5" strokeWidth="3.2" />
        <path d="M21 18.5C21.6 17 22.8 16.3 24 16.5" stroke="#427AB5" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M3 20.5C3 18.5 3.6 17 4.6 16" stroke="#427AB5" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="12" cy="20" r="3.4" fill="#F7DD7D" />
      </svg>
      {!compact && (
        <span className="text-[21px] font-extrabold tracking-tight text-ink hidden md:inline">
          Try<span className="text-blue">Lens</span>
        </span>
      )}
    </a>
  );
}
