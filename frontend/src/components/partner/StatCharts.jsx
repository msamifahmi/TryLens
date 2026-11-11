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
