import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { STYLE_LABELS } from "../../data/mockData.js";
import { sizeCode } from "../../data/frameSize.js";

const TIPS = [
  ["Cahaya dari depan", "Hadapkan wajah ke sumber cahaya. Hindari lampu tepat di belakang kepala."],
  ["Poni dan rambut", "Singkirkan poni dari alis dan mata supaya frame menempel stabil di wajah."],
  ["Hadap lurus dulu", "Tatap kamera 1–2 detik, lalu menoleh pelan. Frame menyesuaikan ukuran wajahmu otomatis."],
  ["Jarak ±40–60 cm", "Wajah memenuhi sekitar sepertiga layar. Terlalu jauh membuat pelacakan kurang akurat."]
];

/** Mengisi ruang di bawah kamera: panduan agar hasil pas, detail frame, dan info toko. */
export default function TryOnExtras({ product, merchant, camera }) {
  const reduce = useReducedMotion();
  const item = (i) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" }, transition: { duration: 0.35, delay: i * 0.06, ease: "easeOut" } });
  const specs = [
    ["Gaya", STYLE_LABELS[product.style] || product.style],
    ["Kategori", product.cat],
    ["Stok", product.stock != null ? `${product.stock} unit` : "Tanya toko"],
    ["Ukuran", sizeCode(product.size) ? `${sizeCode(product.size)} mm (skala 1:1)` : "Menyesuaikan wajahmu"],
    ["Try-On", product.vto === false ? "Tidak tersedia" : "Tersedia"]
  ];
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <motion.section {...item(0)} className="bg-white border border-border rounded-2xl p-4" aria-label="Tips agar frame pas">
        <h2 className="text-sm font-bold text-ink-text m-0 mb-3">{camera ? "Tips supaya frame menempel pas" : "Siapkan sebelum menyalakan kamera"}</h2>
        <ol className="m-0 p-0 list-none flex flex-col gap-2.5">
          {TIPS.map(([t, d], i) => (
            <li key={t} className="flex gap-2.5">
              <span className="w-5 h-5 mt-0.5 rounded-full bg-surface-blue text-blue-deep text-[11px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="text-[12.5px] leading-snug text-ink-muted"><strong className="text-ink-text font-semibold">{t}.</strong> {d}</span>
            </li>
          ))}
        </ol>
      </motion.section>

      <motion.section {...item(1)} className="bg-white border border-border rounded-2xl p-4" aria-label="Detail frame">
        <h2 className="text-sm font-bold text-ink-text m-0 mb-3">Detail frame</h2>
        <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
          {specs.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-ink-muted">{k}</dt>
              <dd className="m-0 text-[13px] font-semibold text-ink-text">{v}</dd>
            </div>
          ))}
        </dl>
        {product.description && <p className="text-[12.5px] leading-snug text-ink-muted m-0 mb-3 line-clamp-2">{product.description}</p>}
        <Link to={`/produk/${product.id}`} className="text-[13px] font-bold text-blue-deep hover:underline">Lihat detail lengkap →</Link>
      </motion.section>

      {merchant && (
        <motion.section {...item(2)} className="md:col-span-2 bg-surface-blue/60 border border-border rounded-2xl p-4 flex items-center gap-3 flex-wrap" aria-label="Toko optik">
          <span className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: merchant.color || "#1E5FAF" }}>{merchant.initials || merchant.name.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-ink-text m-0 truncate">{merchant.name}</p>
            <p className="text-[12px] text-ink-muted m-0">{merchant.city}{merchant.count ? ` · ${merchant.count}` : ""}</p>
          </div>
          <Link to={`/toko/${merchant.id}`} className="h-10 px-5 rounded-full border-[1.5px] border-blue text-blue-deep font-bold text-[13px] flex items-center hover:bg-white">Kunjungi toko</Link>
        </motion.section>
      )}
    </div>
  );
}
