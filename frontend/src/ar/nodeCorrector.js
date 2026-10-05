// Inferensi "node corrector" (dilatih offline oleh ml/train_node_corrector.py). Regresi ridge: y = ((x-mean)/std)·W + b.
// Memperbaiki bias kedalaman z pupil & z punggung hidung. Hanya model `kind: "real"` yang dipakai; model sintetis/absen
// membuat koreksi = 0 (PoseEngine berperilaku persis seperti tanpa corrector).
export const FEATURES = ["pd_mm", "face_mm", "ridge_top_dy", "ridge_top_dz", "ridge_mid_dz", "ridge_low_dz", "brow_dy"];

export function makeCorrector(model) {
  if (!model || model.kind !== "real" || model.version !== 1 || model.features?.join() !== FEATURES.join()) return null;
  const { mean, std, W, b, clamp_cm: cap = 0.5 } = model;
  return {
    model,
    /** x = FEATURES; hasil [dzPupil, dzRidge] dalam cm, dibatasi ±cap. */
    predict(x) {
      const z = x.map((v, i) => (v - mean[i]) / std[i]);
      return b.map((bj, j) => Math.max(-cap, Math.min(cap, z.reduce((s, zi, i) => s + zi * W[i][j], bj))));
    }
  };
}

/** Fitur dari target wajah hasil kalibrasi (cm sejati, ruang kepala): pupil, punggung hidung [y,z]×3, alis [y,z]. */
export function featuresOf(tg, pdMm, faceMm) {
  const py = (tg.pR[1] + tg.pL[1]) / 2, pz = (tg.pR[2] + tg.pL[2]) / 2;
  return [pdMm, faceMm, tg.ridge[0][0] - py, tg.ridge[0][1] - pz, tg.ridge[1][1] - pz, tg.ridge[2][1] - pz, tg.brow[0] - py];
}
