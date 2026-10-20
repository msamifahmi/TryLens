import { useMemo, useState } from "react";
import { Box, Search, UploadCloud } from "lucide-react";
import ProductImage from "../ProductImage.jsx";
import { STYLE_LABELS } from "../../data/mockData.js";
import { libraryModels } from "../../data/modelLibrary.js";
import { Btn } from "./ui.jsx";

const CATS = ["Semua", "Pria", "Wanita", "Anak"];

/**
 * Langkah 1 saat menambah frame: pilih model 3D siap pakai (frame bawaan TryLens yang sudah punya model & rig),
 * atau lanjut tanpa pustaka (unggah model sendiri / tanpa model).
 */
export default function ModelLibrary({ onPick, onOwn, onCancel }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const all = useMemo(() => libraryModels(), []);
  const list = all.filter(
    (p) => (cat === "Semua" || p.cat === cat) && (!q.trim() || `${p.name} ${STYLE_LABELS[p.style] || p.style}`.toLowerCase().includes(q.trim().toLowerCase()))
  );

  return (
    <div className="rounded-xl border border-[#C5D6EA] bg-white p-4 mb-4" role="region" aria-label="Pustaka model 3D">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink m-0">Langkah 1 — Pilih model 3D siap pakai</p>
          <p className="text-[12.5px] text-ink-muted m-0 mt-0.5">
            {all.length} bentuk frame sudah punya model 3D dan rig Coba Virtual. Pilih yang paling mirip dengan frame Anda, lalu tinggal menambahkan foto produk, harga, dan stok.
          </p>
        </div>
        <Btn type="button" variant="ghost" size="sm" onClick={onCancel}>Batal</Btn>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="relative flex items-center">
          <span className="sr-only">Cari model</span>
          <Search size={14} className="absolute left-3 text-ink-muted pointer-events-none" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari bentuk atau gaya…"
            className="h-9 w-[220px] pl-8 pr-3 rounded-full border border-[#DDE8F4] bg-white text-[13px] outline-none focus:border-blue-deep"
          />
        </label>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none" role="group" aria-label="Kategori">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
              className={`h-9 px-3.5 rounded-full text-[12.5px] font-medium border whitespace-nowrap ${cat === c ? "bg-blue-deep text-white border-blue-deep" : "bg-white text-ink-text border-[#DDE8F4] hover:border-blue-deep"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-[13px] text-ink-muted m-0 py-6 text-center">Tidak ada model yang cocok. Coba kata kunci lain.</p>
      ) : (
        <ul className="list-none m-0 p-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                aria-label={`Pakai model ${p.name}`}
                className="w-full text-left rounded-xl border border-[#DDE8F4] bg-white hover:border-blue-deep hover:shadow-sm transition p-2.5 flex flex-col gap-1.5"
              >
                <span className="aspect-[4/3] rounded-lg bg-surface-blue/60 flex items-center justify-center overflow-hidden">
                  <ProductImage productId={p.id} variant="main" style={p.style} colorKey={p.colorKey} className="w-[78%] h-[78%]" alt="" />
                </span>
                <span className="text-[12.5px] font-semibold text-ink leading-snug line-clamp-2">{p.name}</span>
                <span className="flex items-center gap-1 text-[11.5px] text-ink-muted">
                  <Box size={11} aria-hidden="true" /> 3D · {STYLE_LABELS[p.style] || p.style}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 pt-3 border-t border-[#EEF3F9] flex items-center gap-2 flex-wrap text-[12.5px] text-ink-muted">
        <span>Bentuk frame Anda tidak ada di sini?</span>
        <Btn type="button" variant="outline" size="sm" onClick={onOwn}>
          <UploadCloud size={14} /> Unggah model sendiri / tanpa model
        </Btn>
      </div>
    </div>
  );
}
