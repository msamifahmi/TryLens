// Ukuran 1:1: skala model mengikuti ukuran fisik yang diisi Mitra; tanpa ukuran → disesuaikan dengan lebar wajah.
import { effectiveFrameWidthMm } from "../data/frameSize.js";
import { fuseFace } from "./anthropometry.js";

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

/**
 * Tanpa ukuran dari Mitra: faktor skala agar frame cocok dengan wajah.
 *  - sumber: lebar wajah & PD yang sudah dicek kewajarannya (fuseFace);
 *  - sasaran utama: jarak pusat lensa ≈ PD + 3 mm (aturan optik: 0–6 mm lebih besar dari PD) → pupil di tengah lensa;
 *  - dibatasi: lebar frame 88–103% dari lebar wajah terukur (sama dengan ambang laporan kecocokan; di luar itu terasa
 *    kecil / kebesaran). Gagang tidak masuk ke kepala karena tempurung kepala menyusut mengikuti engsel (craniumRadiusX);
 *  - batas mutlak 0,82–1,2× ukuran model. Tanpa PD → hanya patokan lebar wajah.
 */
export function autoFitScale(spec, faceMm, pdMm) {
  if (!spec || !(faceMm > 0) || !(spec.frameWidthMm > 0)) return 1;
  const { face, pd } = fuseFace(faceMm, pdMm);
  const W = spec.frameWidthMm;
  let s = (face * 0.99) / W;
  if (pd && spec.lensSepMm > 40) s = Math.pow(s, 0.4) * Math.pow((pd + 3) / spec.lensSepMm, 0.6);
  s = Math.min((face * 1.03) / W, Math.max((face * 0.88) / W, s));
  return Math.min(1.2, Math.max(0.82, s));
}
