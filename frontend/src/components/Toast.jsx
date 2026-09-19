export default function ToastStack({ toasts }) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-7 z-[90] flex flex-col gap-2 items-center">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-ink text-white px-4.5 py-2.5 rounded-[10px] text-[13.5px] font-semibold shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <path d="M20 6L9 17l-5-5" stroke={t.positive ? "#2E9B62" : "#9AA5B1"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
