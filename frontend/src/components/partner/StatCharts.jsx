// Grafik analitik Mitra (Update 45): ringan (SVG/CSS), beranimasi lembut, terbaca orang awam,
// dan menghormati "kurangi gerak". Warna hanya dari token brand; identitas tidak pernah bergantung pada warna saja.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Lightbulb, Minus, TrendingUp } from "lucide-react";
import { FrameThumb } from "./FrameAssets.jsx";
import { fmtNum } from "../../data/partnerMock.js";

const EASE = [0.22, 1, 0.36, 1];

/** Angka yang "berhitung" naik ke nilainya. */
export function CountUp({ value, format = fmtNum, className = "" }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); from.current = value; return undefined; }
    const c = animate(from.current, value, { duration: 0.9, ease: EASE, onUpdate: (v) => setShown(v) });
    from.current = value;
    return () => c.stop();
  }, [value, reduce]);
  return <span className={`tabular-nums ${className}`}>{format(Math.round(shown))}</span>;
}

/** Perubahan dalam kata-kata + panah (bukan warna saja). */
export function Change({ cur, prev, unit = "periode sebelumnya" }) {
  if (!prev && !cur) return <span className="text-[12px] text-ink-muted">belum ada data</span>;
  if (!prev) return <span className="text-[12px] text-ink-muted inline-flex items-center gap-1"><TrendingUp size={12} aria-hidden="true" /> baru ada di periode ini</span>;
  const d = Math.round(((cur - prev) / prev) * 100);
  const Icon = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
  const tone = d > 0 ? "text-success" : d < 0 ? "text-error" : "text-ink-muted";
  return (
    <span className="text-[12px] text-ink-muted inline-flex items-center gap-1 flex-wrap">
      <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}><Icon size={13} aria-hidden="true" />{d > 0 ? "naik" : d < 0 ? "turun" : "sama"}{d ? ` ${Math.abs(d)}%` : ""}</span> dari {unit}
    </span>
  );
}

/** Garis kecil di kartu angka. */
export function Spark({ values, className = "" }) {
  const reduce = useReducedMotion();
  if (!values?.length) return null;
  const W = 100, H = 28, max = Math.max(1, ...values);
  const pts = values.map((v, i) => [values.length === 1 ? W : (i / (values.length - 1)) * W, H - 2 - (v / max) * (H - 4)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`w-full h-7 ${className}`} aria-hidden="true">
      <motion.path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} />
    </svg>
  );
}

/** Kartu angka utama: bisa diklik untuk memilih angka di grafik. */
export function KpiTile({ label, desc, value, prev, spark, active, onClick, unit }) {
  const As = onClick ? "button" : "div";
  return (
    <As type={onClick ? "button" : undefined} onClick={onClick} aria-pressed={onClick ? !!active : undefined}
      className={`text-left rounded-2xl border p-4 transition-colors ${active ? "border-blue-deep bg-surface-blue ring-1 ring-blue-deep" : "border-[#DDE8F4] bg-white hover:border-blue"}`}>
      <p className="text-[12.5px] font-medium text-ink-text m-0">{label}</p>
      <p className="text-[26px] leading-tight font-semibold text-ink tracking-tight m-0 mt-1"><CountUp value={value} /></p>
      <Change cur={value} prev={prev} unit={unit} />
      {spark && <div className="text-blue-deep mt-2"><Spark values={spark} /></div>}
      {desc && <p className="text-[11.5px] text-ink-muted m-0 mt-1.5">{desc}</p>}
    </As>
  );
}

const nice = (m) => {
  if (m <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(m));
  return Math.ceil(m / p) * p;
};

/** Grafik area satu angka dari waktu ke waktu, dengan tooltip saat disorot/disentuh. */
export function TrendChart({ series, metric, label }) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const wrap = useRef(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = w < 480 ? 190 : 230, L = 34, R = 10, T = 14, B = 26;
  const vals = series.map((s) => s[metric] || 0);
  const top = nice(Math.max(1, ...vals));
  const n = series.length;
  const x = (i) => (n === 1 ? (L + w - R) / 2 : L + (i / (n - 1)) * (w - L - R));
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const line = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];
  const step = (w - L - R) / Math.max(1, n - 1);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * w;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px - L) / (step || 1)))));
  };
  const total = vals.reduce((a, b) => a + b, 0);
  return (
    <div ref={wrap} className="relative w-full">
      <svg viewBox={`0 0 ${w} ${H}`} className="block w-full h-auto touch-none" role="img"
        aria-label={`${label}: total ${fmtNum(total)} pada periode ini`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#427AB5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#427AB5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => {
          const v = Math.round(top * f);
          if (f === 0.5 && top % 2) return null;
          return (
            <g key={f}>
              <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="#E3ECF6" strokeWidth="1" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{fmtNum(v)}</text>
            </g>
          );
        })}
        <motion.path key={`a${metric}${n}`} d={area} fill={`url(#g${gid})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
        <motion.path key={`l${metric}${n}`} d={line} fill="none" stroke="#406AAF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE }} />
        {n <= 31 && vals.map((v, i) => (v > 0 ? <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill="#fff" stroke="#406AAF" strokeWidth="2" /> : null))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} stroke="#9FB4CF" strokeDasharray="3 3" />}
        {ticks.map((i, j) => (
          <text key={i} x={j === 0 && n > 1 ? L : j === ticks.length - 1 && n > 1 ? w - R : x(i)} y={H - 8} fontSize="11" fill="#6B7280"
            textAnchor={n === 1 ? "middle" : j === 0 ? "start" : j === ticks.length - 1 ? "end" : "middle"}>{series[i]?.label}</text>
        ))}
      </svg>
      {hover != null && series[hover] && (
        <div className="absolute pointer-events-none -translate-x-1/2 -translate-y-full rounded-lg bg-ink text-white text-[12px] px-2.5 py-1.5 whitespace-nowrap shadow-lg"
          style={{ left: `${(x(hover) / w) * 100}%`, top: `${(y(vals[hover]) / H) * 100}%`, marginTop: -8 }}>
          <b>{fmtNum(vals[hover])}</b> {label.toLowerCase()} · {series[hover].label}
        </div>
      )}
    </div>
  );
}

/** Daftar batang horizontal (frame terlaris, per gaya, dll.). */
export function BarList({ rows, unit = "", empty = "Belum ada data." }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length || rows.every((r) => !r.value)) return <p className="text-[13px] text-ink-muted m-0">{empty}</p>;
  return (
    <ol className="list-none m-0 p-0 flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.id || r.label} className="flex items-center gap-3">
          {r.frame ? <span className="w-12 h-7 flex-shrink-0"><FrameThumb frame={r.frame} className="w-full h-full" /></span> : <span className="w-5 text-[12px] text-ink-muted text-right">{i + 1}</span>}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2 text-[12.5px] mb-1">
              <span className="text-ink truncate" title={r.label}>{r.label}</span>
              <span className="font-semibold text-ink whitespace-nowrap">{fmtNum(r.value)}{unit}{r.sub ? <span className="text-ink-muted font-normal"> · {r.sub}</span> : null}</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-blue overflow-hidden">
              <motion.div className="h-full rounded-full bg-blue-deep" initial={reduce ? false : { width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE, delay: reduce ? 0 : i * 0.05 }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Corong: tiap langkah sebagai batang yang mengecil + kalimat "dari 100 orang …".
 * steps: [{ label, value }]
 */
export function FunnelViz({ steps }) {
  const reduce = useReducedMotion();
  const top = Math.max(1, ...steps.map((s) => s.value || 0)); // skala: langkah terbesar (pengunjung bisa langsung ke try-on)
  const base = Math.max(1, steps[0]?.value || 0);
  const per100 = (v) => Math.round((v / base) * 100);
  return (
    <div>
      <div className="flex flex-col gap-2">
        {steps.map((s, i) => {
          const w = Math.max(6, (s.value / top) * 100);
          return (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-[38%] sm:w-[30%] text-[12.5px] text-ink-text leading-tight">{s.label}</div>
              <div className="flex-1 h-9 rounded-lg bg-surface-blue/60 relative overflow-hidden">
                <motion.div className="absolute inset-y-0 left-0 rounded-lg" style={{ background: `rgba(64,106,175,${1 - i * 0.18})` }}
                  initial={reduce ? false : { width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.9, ease: EASE, delay: reduce ? 0 : i * 0.12 }} />
                <span className="absolute inset-y-0 left-3 flex items-center text-[13px] font-semibold text-white drop-shadow-sm mix-blend-normal">
                  <span className={w < 22 ? "text-ink" : ""} style={w < 22 ? { marginLeft: `calc(${w}% + 4px)` } : undefined}>{fmtNum(s.value)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {steps[0]?.value > 0 && steps.every((s) => s.value <= steps[0].value) && (
        <p className="text-[13px] text-ink-text m-0 mt-3 rounded-xl bg-surface-cream/70 border border-accent-yellow/60 px-3.5 py-2.5">
          Artinya: dari setiap <b>100</b> {steps[0].noun || "orang"}, sekitar {steps.slice(1).map((s, i) => <span key={s.label}>{i ? (i === steps.length - 2 ? ", lalu " : ", ") : ""}<b>{per100(s.value)}</b> {s.verb || s.label.toLowerCase()}</span>)}.
        </p>
      )}
    </div>
  );
}

/** 24 batang per jam (WIB), jam tersibuk ditandai. */
export function HourBars({ hours, field = (h) => h.store + h.view + h.try }) {
  const reduce = useReducedMotion();
  const vals = hours.map(field);
  const max = Math.max(1, ...vals);
  const peak = vals.indexOf(Math.max(...vals));
  return (
    <div>
      <div className="flex items-end gap-[3px] h-36" role="img" aria-label={vals.some(Boolean) ? `Jam paling ramai ${String(peak).padStart(2, "0")}.00` : "Belum ada data per jam"}>
        {vals.map((v, h) => (
          <div key={h} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${String(h).padStart(2, "0")}.00 — ${fmtNum(v)}`}>
            <motion.div className={`w-full rounded-t ${h === peak && v ? "bg-accent-yellow ring-1 ring-[#E3C25A]" : "bg-blue-deep/80"}`}
              initial={reduce ? false : { height: 0 }} animate={{ height: `${Math.max(v ? 4 : 1, (v / max) * 100)}%` }} transition={{ duration: 0.7, ease: EASE, delay: reduce ? 0 : h * 0.015 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10.5px] text-ink-muted mt-1"><span>00.00</span><span>06.00</span><span>12.00</span><span>18.00</span><span>23.00</span></div>
    </div>
  );
}

const TONE = {
  good: ["bg-emerald-50 border-emerald-200", TrendingUp, "text-emerald-700", "Bagus"],
  warn: ["bg-amber-50 border-amber-200", AlertTriangle, "text-amber-700", "Perlu perhatian"],
  tip: ["bg-surface-blue/60 border-[#DDE8F4]", Lightbulb, "text-blue-deep", "Saran"]
};
/** Kartu insight berbahasa sehari-hari. */
export function InsightCards({ items }) {
  const reduce = useReducedMotion();
  if (!items.length) return <p className="text-[13px] text-ink-muted m-0">Belum cukup data untuk insight. Insight muncul setelah ada pengunjung.</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="insights">
      {items.map((it, i) => {
        const [box, Icon, ic, tag] = TONE[it.tone] || TONE.tip;
        return (
          <motion.div key={it.title} className={`rounded-xl border p-3.5 flex gap-3 ${box}`}
            initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: reduce ? 0 : i * 0.07 }}>
            <Icon size={18} className={`${ic} flex-shrink-0 mt-0.5`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide m-0 mb-0.5 text-ink-muted">{tag}</p>
              <p className="text-[13.5px] font-semibold text-ink m-0 mb-0.5">{it.title}</p>
              <p className="text-[12.5px] text-ink-text m-0">{it.text}</p>
              {it.action && <p className="text-[12px] text-ink m-0 mt-1.5"><b>Yang bisa dilakukan:</b> {it.action}</p>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Lingkaran persentase (mis. "coba → beli"). */
export function Ring({ pct, label, sub }) {
  const reduce = useReducedMotion();
  const r = 34, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="flex items-center gap-3">
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#EEF5FC" strokeWidth="9" />
        <motion.circle cx="42" cy="42" r={r} fill="none" stroke="#406AAF" strokeWidth="9" strokeLinecap="round" transform="rotate(-90 42 42)"
          strokeDasharray={c} initial={reduce ? false : { strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p / 100) }} transition={{ duration: 1, ease: EASE }} />
        <text x="42" y="47" textAnchor="middle" fontSize="16" fontWeight="700" fill="#111827">{Math.round(p)}%</text>
      </svg>
      <div>
        <p className="text-[13.5px] font-semibold text-ink m-0">{label}</p>
        {sub && <p className="text-[12px] text-ink-muted m-0">{sub}</p>}
      </div>
    </div>
  );
}

/** Rata-rata per hari dalam seminggu dari deret harian. */
export function useWeekday(series, field) {
  return useMemo(() => {
    const sum = Array(7).fill(0), cnt = Array(7).fill(0);
    for (const s of series) {
      if (!s.date) continue;
      const d = new Date(s.date + "T00:00:00Z").getUTCDay();
      sum[d] += field(s); cnt[d] += 1;
    }
    return ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((label, i) => ({ label, value: cnt[i] ? Math.round(sum[i] / cnt[i]) : 0 }));
  }, [series, field]);
}

/* ======================================================= Overview bergaya dasbor (Update 46) */

/** Kelompokkan deret agar grafik kapsul tetap terbaca: 1 hari → 12 × 2 jam, 1 minggu → 7 hari, 1 bulan → 10 × 3 hari, 60 hari → per minggu. */
export function bucketize(series, days, kinds) {
  const size = days === 1 ? 2 : days <= 7 ? 1 : days <= 30 ? 3 : 7;
  const out = [];
  for (let i = 0; i < series.length; i += size) {
    const part = series.slice(i, i + size);
    const v = Object.fromEntries(kinds.map((k) => [k, part.reduce((a, s) => a + (s[k] || 0), 0)]));
    const first = part[0], last = part[part.length - 1];
    let label, title;
    if (days === 1) { label = first.label.slice(0, 2); title = `${first.label}–${String((Number(first.label.slice(0, 2)) + size) % 24).padStart(2, "0")}.00 WIB`; }
    else if (size === 1) {
      const d = new Date(first.date + "T00:00:00Z");
      label = d.toLocaleDateString("id-ID", { weekday: "short", timeZone: "UTC" });
      title = d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    } else { label = first.label; title = `${first.label} – ${last.label}`; }
    out.push({ key: first.key, label, title, ...v });
  }
  return out;
}

/** Kartu angka utama bergradasi brand (seperti kartu "Offline Store" di referensi). */
export function HeroCard({ title, sub, value, prev, unit, children, tone = "brand" }) {
  const d = prev ? Math.round(((value - prev) / prev) * 100) : null;
  const brand = tone === "brand";
  return (
    <div className={`rounded-2xl p-5 relative overflow-hidden ${brand ? "text-white shadow-[0_10px_30px_-12px_rgba(47,85,154,.7)]" : "bg-white border border-[#DDE8F4] text-ink"}`}
      style={brand ? { background: "linear-gradient(135deg,#2F559A 0%,#427AB5 100%)" } : undefined}>
      {brand && <span aria-hidden="true" className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10" />}
      <p className={`text-[15px] font-semibold m-0 ${brand ? "text-white" : "text-ink"}`}>{title}</p>
      {sub && <p className={`text-[12px] m-0 ${brand ? "text-white/80" : "text-ink-muted"}`}>{sub}</p>}
      <p className="text-[34px] leading-tight font-bold tracking-tight m-0 mt-3"><CountUp value={value} /></p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold ${brand ? "bg-white/20 text-white" : d == null || d >= 0 ? "bg-emerald-50 text-success" : "bg-red-50 text-error"}`}>
          {d == null ? "baru" : <>{d >= 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}{Math.abs(d)}%</>}
        </span>
        <span className={`text-[12px] ${brand ? "text-white/85" : "text-ink-muted"}`}>{d == null ? "belum ada pembanding" : `${d >= 0 ? "naik" : "turun"} dari ${unit}`}</span>
      </div>
      {children}
    </div>
  );
}

/** Area kecil di dalam kartu (seperti "Chat Performance" di referensi). */
export function MiniArea({ values, height = 120 }) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const W = 300, H = height, max = Math.max(1, ...values), n = values.length;
  const pts = values.map((v, i) => [n === 1 ? W / 2 : (i / (n - 1)) * W, H - 8 - (v / max) * (H - 24)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const step = Math.max(1, Math.ceil(n / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden="true">
      <defs><linearGradient id={`m${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#427AB5" stopOpacity=".25" /><stop offset="100%" stopColor="#427AB5" stopOpacity="0" /></linearGradient></defs>
      <motion.path d={area} fill={`url(#m${gid})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
      <motion.path d={line} fill="none" stroke="#406AAF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: EASE }} />
      {pts.map(([x, y], i) => (i % step === 0 || i === n - 1 ? <circle key={i} cx={x} cy={y} r="3.5" fill="#406AAF" stroke="#fff" strokeWidth="1.5" /> : null))}
    </svg>
  );
}

/** Grafik batang kapsul bergaris (seperti "Sales Overview" di referensi), dengan tooltip. */
export function CapsuleBars({ buckets, metric, label, height = 230 }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(null);
  const vals = buckets.map((b) => b[metric] || 0);
  const top = nice(Math.max(1, ...vals));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(top * f));
  const peak = vals.indexOf(Math.max(...vals));
  return (
    <div className="flex gap-2 sm:gap-3">
      <div className="flex flex-col justify-between text-[11px] text-ink-muted text-right pb-6" style={{ height }} aria-hidden="true">
        {ticks.map((t, i) => <span key={i}>{fmtNum(t)}</span>)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative flex items-end gap-1.5 sm:gap-3" style={{ height: height - 24 }} role="img" aria-label={`${label}: ${buckets.map((b, i) => `${b.title} ${vals[i]}`).join(", ")}`}
          onPointerLeave={() => setHover(null)}>
          {buckets.map((b, i) => {
            const h = (vals[i] / top) * 100;
            const on = hover === i;
            return (
              <div key={b.key} className="relative flex-1 h-full flex items-end justify-center" onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${b.title}: ${fmtNum(vals[i])}`}>
                <div className="absolute inset-x-0 mx-auto bottom-0 top-0 rounded-full max-w-[46px]"
                  style={{ background: "repeating-linear-gradient(135deg,#E6EEF8 0 5px,#F4F8FC 5px 10px)" }} />
                <motion.div className={`relative w-full max-w-[46px] rounded-full ${on || (hover == null && i === peak) ? "" : "opacity-90"}`}
                  style={{ background: on ? "linear-gradient(180deg,#5B8FD0 0%,#2F559A 100%)" : "linear-gradient(180deg,#5583C3 0%,#406AAF 100%)", minHeight: vals[i] ? 10 : 0 }}
                  initial={reduce ? false : { height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.8, ease: EASE, delay: reduce ? 0 : i * 0.04 }} />
                {on && (
                  <div className="absolute z-10 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 rounded-xl bg-white border border-[#DDE8F4] shadow-lg px-3 py-2 whitespace-nowrap pointer-events-none"
                    style={{ bottom: `calc(${h}% + 10px)` }}>
                    <p className="text-[12.5px] font-semibold text-ink m-0">{b.title}</p>
                    <p className="text-[12px] text-ink-muted m-0 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border-2 border-blue-deep" aria-hidden="true" />{label} <b className="text-ink text-[13px]">{fmtNum(vals[i])}</b></p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5 sm:gap-3 mt-2">
          {buckets.map((b) => <span key={b.key} className="flex-1 text-center text-[11px] text-ink-muted truncate">{b.label}</span>)}
        </div>
      </div>
    </div>
  );
}

const GAUGE_COLORS = ["#2F559A", "#5583C3", "#A9C4E6", "#F7DD7D"];
/** Gauge setengah lingkaran bersegmen (seperti "Sales Categories" di referensi). */
export function HalfGauge({ parts, total, unit = "sesi" }) {
  const reduce = useReducedMotion();
  const sum = parts.reduce((a, p) => a + p.value, 0);
  const cx = 150, cy = 140, r = 104, sw = 38, gap = 0.035;
  let start = Math.PI;
  const arcs = parts.map((p, i) => {
    const frac = sum ? p.value / sum : 1 / parts.length;
    const a0 = start + (i ? gap / 2 : 0), a1 = start + frac * Math.PI - (i < parts.length - 1 ? gap / 2 : 0);
    start += frac * Math.PI;
    const P = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = P(a0), [x1, y1] = P(Math.max(a0 + 0.001, a1));
    return { d: `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`, color: GAUGE_COLORS[i % GAUGE_COLORS.length], p };
  });
  return (
    <div>
      <svg viewBox="0 0 300 160" className="w-full max-w-[340px] mx-auto block" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {arcs.map((a, i) => (
          <motion.path key={a.p.label} d={a.d} fill="none" stroke={a.color} strokeWidth={sw} strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE, delay: reduce ? 0 : 0.15 + i * 0.18 }} />
        ))}
        <text x={cx} y={cy - 34} textAnchor="middle" fontSize="13" fill="#6B7280">Total</text>
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="700" fill="#111827">{fmtNum(total ?? sum)} {unit}</text>
      </svg>
      <ul className="list-none m-0 p-0 mt-3 flex flex-col gap-2.5">
        {arcs.map((a) => (
          <li key={a.p.label} className="flex items-center gap-2.5 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} aria-hidden="true" />
            <span className="flex-1 text-ink-text">{a.p.label}</span>
            <span className="font-semibold text-ink">{fmtNum(a.p.value)} {unit}</span>
            <span className="w-11 text-right text-[12px] text-ink-muted">{sum ? Math.round((a.p.value / sum) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS = {
  laris: ["Laris", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  naik: ["Naik", "bg-surface-blue text-blue-deep border-[#C9DAF0]"],
  perhatian: ["Perlu perhatian", "bg-amber-50 text-amber-700 border-amber-200"],
  belum: ["Belum dicoba", "bg-red-50 text-error border-red-200"],
  stabil: ["Stabil", "bg-slate-50 text-ink-muted border-slate-200"]
};
/** Status sederhana tiap frame (dibaca orang awam). */
export function frameStatus(f, all) {
  if (!f.try && !f.view) return "belum";
  if (f.try >= 3 && f.buy + f.contact === 0) return "perhatian";
  const sorted = [...all].map((x) => x.try).sort((a, b) => b - a);
  const cut = sorted[Math.max(0, Math.ceil(sorted.length * 0.25) - 1)] || 0;
  if (f.try > 0 && f.try >= cut) return "laris";
  if (f.prevView && f.view >= f.prevView * 1.2) return "naik";
  if (!f.try) return "belum";
  return "stabil";
}
export function StatusBadge({ code }) {
  const [label, cls] = STATUS[code] || STATUS.stabil;
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${cls}`}><span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />{label}</span>;
}
export const STATUS_OPTIONS = Object.entries(STATUS).map(([k, [l]]) => ({ key: k, label: l }));
