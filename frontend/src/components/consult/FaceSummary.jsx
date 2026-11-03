import { FACE_SHAPES, FACE_WIDTHS } from "../../data/faceShape.js";
import { STYLE_LABELS } from "../../data/mockData.js";

const CONF = { high: "Tinggi", medium: "Sedang", low: "Rendah — coba scan ulang di tempat lebih terang" };

/** Ringkasan hasil analisis wajah — dipakai di sisi konsumen (hasil scan) dan sisi Mitra (kartu/detail). */
export default function FaceSummary({ face, compact = false, className = "" }) {
  if (!face) return null;
  const shape = FACE_SHAPES[face.shape];
  const styles = face.styles.map((s) => STYLE_LABELS[s] || s);

  if (compact) {
    return (
      <p className={`text-[12px] text-ink-text m-0 ${className}`}>
        <span className="font-semibold">Wajah {shape.label}</span> · lebar {FACE_WIDTHS[face.width].toLowerCase()} · cocok: {styles.join(", ")}
      </p>
    );
  }
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[11.5px] text-ink-muted m-0">Bentuk wajah</p>
          <p className="text-[18px] font-bold text-ink m-0">{shape.label}</p>
        </div>
        <div>
          <p className="text-[11.5px] text-ink-muted m-0">Perkiraan lebar wajah</p>
          <p className="text-[18px] font-bold text-ink m-0">
            {FACE_WIDTHS[face.width]}
            {face.mm ? <span className="text-[12px] font-medium text-ink-muted"> · ≈ {face.mm}{face.mmErr ? ` ± ${face.mmErr}` : ""} mm</span> : null}
          </p>
        </div>
      </div>
      {face.pd ? (
        <p className="text-[12.5px] text-ink-text m-0 mb-3">
          Jarak pupil (PD) <span className="font-bold">≈ {face.pd}{face.pdErr ? ` ± ${face.pdErr}` : ""} mm</span>
          <span className="text-ink-muted"> — perkiraan dari kamera; untuk resep tetap ukur di optik.</span>
        </p>
      ) : null}
      {face.source === "ar" && face.accuracy ? (
        <div className="rounded-xl bg-surface-blue px-3 py-2 mb-3" aria-label="Ketepatan scan">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-[12px] font-semibold text-ink-text">Keandalan scan</span>
            <span className="text-[13px] font-extrabold text-blue-deep">{face.accuracy.score}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-white overflow-hidden mb-1.5" role="presentation">
            <div className="h-full rounded-full bg-blue" style={{ width: `${face.accuracy.score}%` }} />
          </div>
          <p className="text-[11.5px] text-ink-muted m-0">
            {face.accuracy.n} sampel{face.accuracy.ensemble ? ` · deteksi ganda (selisih antar-deteksi ≈ ${face.accuracy.ttaMm} mm)` : " · deteksi tunggal"}
            {face.accuracy.level > 0 ? " · toleransi dilonggarkan" : ""}. Skor ini ukuran konsistensi pengukuran, bukan jaminan ketepatan.
          </p>
        </div>
      ) : null}
      <p className="text-[11.5px] text-ink-muted m-0 mb-1.5">Gaya frame yang disarankan</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {styles.map((s) => (
          <span key={s} className="rounded-full bg-surface-blue text-blue-deep text-[12px] font-semibold px-3 py-1">{s}</span>
        ))}
      </div>
      <p className="text-[11.5px] text-ink-muted m-0">
        {face.source === "ar" ? `Hasil pemindaian AR (estimasi${face.confidence ? `, keyakinan ${CONF[face.confidence]}` : ""}).` : "Dipilih manual oleh pengguna, bukan hasil pemindaian."} {shape.desc}
      </p>
    </div>
  );
}
