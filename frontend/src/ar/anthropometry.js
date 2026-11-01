// Cek kewajaran ukuran wajah hasil kamera. Fungsi murni (diuji di Node).
//
// Lebar wajah (landmark 234–454, di area telinga: lebih lebar dari tulang pipi) dan PD (pusat iris) berasal dari skala iris
// yang sama, jadi RASIO keduanya tidak terpengaruh kesalahan skala. Rasio di luar kewajaran = salah satu landmark bergeser
// (kepala menunduk, kelopak menutup iris, rambut menutup pipi). Pada model wajah kanonik MediaPipe rasionya 153,2/63 ≈ 2,43;
// orang nyata bervariasi ±8%. Angka ini PERKIRAAN praktis untuk landmark ini (bukan standar klinis) — hanya untuk meredam
// nilai ekstrem, tidak untuk menentukan ukuran pasti.
export const PD_RANGE = [50, 75];
export const FACE_RANGE = [125, 180];
export const FACE_PD_RATIO = [2.2, 2.66];
export const FACE_PD_PRIOR = 2.43;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** → { face, pd, corrected }. Nilai tak valid → null. */
export function fuseFace(faceMm, pdMm) {
  const pd = pdMm >= PD_RANGE[0] && pdMm <= PD_RANGE[1] ? pdMm : null;
  const face = faceMm > 0 ? clamp(faceMm, FACE_RANGE[0], FACE_RANGE[1]) : null;
  if (!pd) return { face, pd: null, corrected: false };
  if (!face) return { face: clamp(pd * FACE_PD_PRIOR, FACE_RANGE[0], FACE_RANGE[1]), pd, corrected: true };
  const r = face / pd;
  if (r >= FACE_PD_RATIO[0] && r <= FACE_PD_RATIO[1]) return { face, pd, corrected: false };
  // Percayai PD lebih (dua titik iris terdeteksi sangat stabil), tarik lebar wajah ke arah rasio wajar.
  return { face: clamp(0.35 * face + 0.65 * pd * FACE_PD_PRIOR, FACE_RANGE[0], FACE_RANGE[1]), pd, corrected: true };
}
