// Ukuran 1:1: skala model mengikuti ukuran fisik yang diisi Mitra; tanpa ukuran → disesuaikan dengan lebar wajah.
import { effectiveFrameWidthMm } from "../data/frameSize.js";

const mul = (p, f) => p.map((v) => v * f);

/** Skala spesifikasi model agar lebar frame = ukuran asli dari Mitra. Mengembalikan spesifikasi baru (cm) atau spec apa adanya. */
export function applyRealSize(spec, size) {
  const w = effectiveFrameWidthMm(size);
  if (!spec || !w || !(spec.frameWidthMm > 0)) return spec;
  const f = w / spec.frameWidthMm;
  return {
    ...spec,
    unit: spec.unit * f,
    lensL: mul(spec.lensL, f), lensR: mul(spec.lensR, f), bridge: mul(spec.bridge, f), templeL: mul(spec.templeL, f), templeR: mul(spec.templeR, f),
    frameWidthMm: w,
    lensWidthMm: size.lensWidthMm ?? spec.lensWidthMm * f,
    lensHeightMm: size.lensHeightMm ?? spec.lensHeightMm * f,
    bridgeWidthMm: size.bridgeMm ?? spec.bridgeWidthMm * f,
    templeLengthMm: size.templeMm ?? spec.templeLengthMm * f,
    lensSepMm: (spec.lensSepMm || 0) * f,
    estimated: false, // ukuran diketahui dari Mitra
    realSize: true
  };
}

/** Tanpa ukuran dari Mitra: faktor skala agar lebar frame ≈ lebar wajah terukur (dibatasi ±12% dari ukuran model). */
export function autoFitScale(spec, faceMm) {
  if (!spec || !(faceMm > 0) || !(spec.frameWidthMm > 0)) return 1;
  return Math.min(1.12, Math.max(0.88, (faceMm * 0.99) / spec.frameWidthMm));
}
