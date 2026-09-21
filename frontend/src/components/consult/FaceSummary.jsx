import { FACE_SHAPES, FACE_WIDTHS } from "../../data/faceShape.js";
import { STYLE_LABELS } from "../../data/mockData.js";

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
            {face.mm ? <span className="text-[12px] font-medium text-ink-muted"> · ±{face.mm} mm</span> : null}
          </p>
        </div>
      </div>
      <p className="text-[11.5px] text-ink-muted m-0 mb-1.5">Gaya frame yang disarankan</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {styles.map((s) => (
          <span key={s} className="rounded-full bg-surface-blue text-blue-deep text-[12px] font-semibold px-3 py-1">{s}</span>
        ))}
      </div>
      <p className="text-[11.5px] text-ink-muted m-0">
        {face.source === "ar" ? "Hasil pemindaian AR (estimasi)." : "Dipilih manual oleh pengguna, bukan hasil pemindaian."} {shape.desc}
      </p>
    </div>
  );
}
