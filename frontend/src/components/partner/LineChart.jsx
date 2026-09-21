import { useState } from "react";

const W = 640;
const H = 250;
const PAD = { l: 44, r: 10, t: 14, b: 28 };

// Kurva halus (Catmull-Rom → Bezier) supaya mirip grafik referensi.
function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function niceMax(v) {
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

const compact = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}K`.replace(".", ",") : String(n));

/**
 * data: [{ label, current, previous }]
 * currentLabel / previousLabel: teks di tooltip. title: judul tooltip.
 */
export default function LineChart({ data, title = "Kunjungan", currentLabel = "Bulan ini", previousLabel = "Bulan lalu" }) {
  const [hover, setHover] = useState(Math.min(3, data.length - 1));

  const max = niceMax(Math.max(...data.flatMap((d) => [d.current, d.previous])) * 1.05);
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => t * max);
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (data.length - 1);
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  const cur = data.map((d, i) => [x(i), y(d.current)]);
  const prev = data.map((d, i) => [x(i), y(d.previous)]);
  const curPath = smooth(cur);
  const area = `${curPath} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const h = data[hover];

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const leftPct = (x(hover) / W) * 100;
  const flip = leftPct > 62;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`Grafik ${title}: ${data.map((d) => `${d.label} ${d.current}`).join(", ")}`}
        onMouseMove={onMove}
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18181b" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e4e4e7" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "3 4"} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#a1a1aa">
              {compact(t)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#lc-fill)" />
        <path d={smooth(prev)} fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinecap="round" />
        <path d={curPath} fill="none" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />

        <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx={x(hover)} cy={y(h.previous)} r="4" fill="#fff" stroke="#d4d4d8" strokeWidth="2" />
        <circle cx={x(hover)} cy={y(h.current)} r="4.5" fill="#fff" stroke="#18181b" strokeWidth="2.2" />

        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11.5" fill={i === hover ? "#18181b" : "#a1a1aa"}>
            {d.label}
          </text>
        ))}
      </svg>

      <div
        className="absolute top-2 pointer-events-none rounded-xl border border-zinc-200 bg-white shadow-lg px-3 py-2.5 min-w-[150px]"
        style={{ left: `${leftPct}%`, transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        role="status"
      >
        <div className="flex items-center justify-between gap-4 text-[12px] mb-1.5">
          <span className="text-zinc-500">{title}</span>
          <span className="font-semibold text-zinc-900">{h.current.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11.5px] mb-1">
          <span className="flex items-center gap-1.5 text-zinc-700">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-zinc-900 bg-white" /> {currentLabel}
          </span>
          <span className="font-medium text-zinc-900">{h.current.toLocaleString("id-ID")}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11.5px]">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-zinc-300 bg-white" /> {previousLabel}
          </span>
          <span className="font-medium text-zinc-500">{h.previous.toLocaleString("id-ID")}</span>
        </div>
      </div>
    </div>
  );
}
