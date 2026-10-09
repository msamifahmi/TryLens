// Ukuran fisik frame (mm) — fungsi murni. SALINAN IDENTIK ada di frontend/src/data/frameSize.js (diperiksa test parity).
// Notasi optik: lebar lensa – jembatan – panjang gagang, mis. 52-18-140.
export const SIZE_FIELDS = {
  lensWidthMm: { label: "Lebar lensa", min: 30, max: 70 },
  lensHeightMm: { label: "Tinggi lensa", min: 20, max: 65 },
  bridgeMm: { label: "Lebar jembatan", min: 8, max: 30 },
  templeMm: { label: "Panjang gagang", min: 100, max: 160 },
  frameWidthMm: { label: "Lebar total frame", min: 100, max: 180 },
  weightG: { label: "Berat (gram)", min: 1, max: 80 }
};
/** Menerima isian mentah → { value, error }. Kosong dibuang; di luar rentang = error. Semua kosong → value null. */
export function cleanSize(raw) {
  if (!raw || typeof raw !== "object") return { value: null };
  const value = {};
  for (const [k, r] of Object.entries(SIZE_FIELDS)) {
    const v = raw[k];
    if (v === undefined || v === null || v === "") continue;
    const n = Math.round(Number(v) * 10) / 10;
    if (!Number.isFinite(n) || n < r.min || n > r.max) return { value: null, error: `${r.label} harus antara ${r.min} dan ${r.max}.` };
    value[k] = n;
  }
  const mat = typeof raw.material === "string" ? raw.material.trim().slice(0, 60) : "";
  if (mat) value.material = mat;
  return { value: Object.keys(value).length ? value : null };
}
/** Lebar total frame: yang diisi Mitra, atau perkiraan dari 2×lensa + jembatan + 12 mm (rim & engsel). null bila data kurang. */
export const effectiveFrameWidthMm = (s) => (s?.frameWidthMm ? s.frameWidthMm : s?.lensWidthMm && s?.bridgeMm ? 2 * s.lensWidthMm + s.bridgeMm + 12 : null);
/** "52-18-140" bila lengkap, "52-18" / "52" sebagian, "" bila tidak ada. */
export const sizeCode = (s) => [s?.lensWidthMm, s?.bridgeMm, s?.templeMm].filter((v) => v).join("-");
