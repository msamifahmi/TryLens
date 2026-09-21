import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Crown } from "lucide-react";

/* Primitif UI area Mitra — gaya monokrom (hitam/putih/abu) mengikuti referensi dashboard. */

export const inputCls =
  "w-full h-10 px-3.5 rounded-xl border border-[#DDE8F4] bg-white text-[13.5px] text-ink placeholder:text-ink-muted outline-none focus:border-blue-deep focus:ring-2 focus:ring-blue-deep/15 disabled:bg-surface-blue/60 disabled:text-ink-muted";

export function Card({ className = "", children, ...rest }) {
  return (
    <section className={`rounded-2xl border border-[#DDE8F4] bg-[#F6FAFE] p-4 md:p-5 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function Tile({ className = "", children }) {
  return <div className={`rounded-xl border border-[#DDE8F4] bg-white ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold text-ink tracking-tight m-0">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-ink-muted m-0 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function IconBox({ icon: Icon, className = "" }) {
  return (
    <span className={`w-9 h-9 rounded-lg border border-[#DDE8F4] bg-white flex items-center justify-center text-ink-text flex-shrink-0 ${className}`}>
      <Icon size={17} strokeWidth={1.8} />
    </span>
  );
}

export function Btn({ variant = "primary", size = "md", className = "", as: As = "button", ...rest }) {
  const v = {
    primary: "bg-blue-deep text-white hover:brightness-90 border border-blue-deep",
    outline: "bg-white text-ink-text border border-[#DDE8F4] hover:border-blue-deep",
    ghost: "bg-transparent text-ink-text hover:bg-surface-blue border border-transparent",
    danger: "bg-white text-error border border-red-200 hover:bg-red-50",
    accent: "bg-accent-yellow text-ink hover:brightness-95 border border-accent-yellow"
  }[variant];
  const s = { sm: "h-8 px-3 text-[12.5px]", md: "h-10 px-4 text-[13.5px]", lg: "h-11 px-6 text-sm" }[size];
  return (
    <As
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors disabled:opacity-40 disabled:pointer-events-none ${v} ${s} ${className}`}
      {...rest}
    />
  );
}

/** Kontrol segmen "Hari ini / Minggu ini / Bulan ini". */
export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-surface-blue border border-[#DDE8F4]" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`h-8 px-3.5 rounded-lg text-[13px] font-medium transition-colors ${
            value === o.key ? "bg-white text-ink shadow-sm" : "text-ink-muted hover:text-ink-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tab anak (sub-menu) berbasis rute. */
export function SubTabs({ base, tabs, active }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-5" role="tablist">
      {tabs.map((t) => (
        <NavLink
          key={t.key}
          to={`${base}/${t.key}`}
          role="tab"
          aria-selected={active === t.key}
          className={`h-9 px-4 rounded-full text-[13px] font-medium whitespace-nowrap flex items-center gap-1.5 border transition-colors ${
            active === t.key
              ? "bg-blue-deep text-white border-blue-deep"
              : "bg-white text-ink-text border-[#DDE8F4] hover:border-blue-deep hover:text-ink"
          }`}
        >
          {t.label}
          {t.pro && <span className="w-[18px] h-[18px] rounded-full bg-accent-yellow text-ink flex items-center justify-center"><Crown size={11} strokeWidth={2.2} /></span>}
        </NavLink>
      ))}
    </div>
  );
}

export function Badge({ tone = "gray", children, className = "" }) {
  const t = {
    gray: "bg-surface-blue text-ink-text",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-accent-cream text-ink",
    red: "bg-red-50 text-red-600",
    dark: "bg-blue-deep text-white",
    gold: "bg-accent-yellow text-ink"
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium ${t} ${className}`}>{children}</span>;
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors disabled:opacity-40 ${checked ? "bg-blue-deep" : "bg-[#C5D6EA]"}`}
    >
      <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-[18px]" : ""}`} />
    </button>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[12.5px] font-medium text-ink-text mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11.5px] text-ink-muted mt-1">{hint}</span>}
    </label>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-[#C5D6EA] bg-white py-10 px-4 text-center">
      <p className="text-[14px] font-semibold text-ink m-0 mb-1">{title}</p>
      {text && <p className="text-[12.5px] text-ink-muted m-0 mb-3">{text}</p>}
      {action}
    </div>
  );
}

export function Meter({ value, max, label }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-[12.5px] mb-1.5">
        <span className="text-ink-text">{label}</span>
        <span className="font-medium text-ink">
          {value}
          {max < 9000 ? ` / ${max}` : " / ∞"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#DDE8F4] overflow-hidden">
        <div className="h-full rounded-full bg-blue-deep" style={{ width: `${max < 9000 ? pct : 6}%` }} />
      </div>
    </div>
  );
}

export function UpgradeLink({ children = "Upgrade ke Pro", className = "", variant = "primary", size = "md" }) {
  return (
    <Btn as={Link} to="/partner/subscription/upgrade" variant={variant} size={size} className={className}>
      <Crown size={14} strokeWidth={2.2} className={variant === "accent" ? "text-ink" : "text-accent-yellow"} /> {children}
    </Btn>
  );
}

/** Umpan balik singkat "Tersimpan ✓" setelah aksi simpan. */
export function useFlash(ms = 2200) {
  const [msg, setMsg] = useState("");
  const t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  return [
    msg,
    (text = "Tersimpan") => {
      setMsg(text);
      clearTimeout(t.current);
      t.current = setTimeout(() => setMsg(""), ms);
    }
  ];
}

export function Flash({ msg }) {
  return msg ? (
    <span role="status" className="text-[13px] font-medium text-emerald-700">
      ✓ {msg}
    </span>
  ) : null;
}
