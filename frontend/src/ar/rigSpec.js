// Membaca spesifikasi aset TryLens dari model .glb (lihat README → "Spesifikasi aset kacamata").
//
//   GlassesRoot ─┬─ Bridge          titik BELAKANG jembatan (yang menyentuh hidung)
//                ├─ LeftLensCenter   +X = kiri pemakai
//                ├─ RightLensCenter
//                ├─ LeftTemple / RightTemple   engsel gagang
//   GlassesRoot.extras.trylens = { frameWidthMm, lensWidthMm, lensHeightMm, bridgeWidthMm, templeLengthMm, realWorldScale }
//   realWorldScale = mm per satuan model (10 = model dalam cm).
export const NODE_NAMES = ["GlassesRoot", "Bridge", "LeftLensCenter", "RightLensCenter", "LeftTemple", "RightTemple"];
export const META_KEYS = ["frameWidthMm", "lensWidthMm", "lensHeightMm", "bridgeWidthMm", "templeLengthMm", "realWorldScale"];

const num = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * nodes: { Bridge:[x,y,z], LeftLensCenter:[...], ... } posisi di ruang GlassesRoot, satuan model.
 * meta : isi extras.trylens. Mengembalikan spesifikasi dalam CM, atau null bila tidak lengkap (model lama → cadangan).
 */
export function specFromNodes({ nodes, meta }) {
  if (!nodes || !meta) return null;
  const need = ["Bridge", "LeftLensCenter", "RightLensCenter", "LeftTemple", "RightTemple"];
  if (need.some((n) => !Array.isArray(nodes[n]) || nodes[n].length !== 3 || nodes[n].some((v) => !Number.isFinite(v)))) return null;
  if (META_KEYS.some((k) => !num(meta[k]))) return null;
  const unit = meta.realWorldScale / 10; // cm per satuan model
  const cm = (p) => p.map((v) => v * unit);
  const spec = {
    unit,
    lensL: cm(nodes.LeftLensCenter),
    lensR: cm(nodes.RightLensCenter),
    bridge: cm(nodes.Bridge),
    templeL: cm(nodes.LeftTemple),
    templeR: cm(nodes.RightTemple),
    frameWidthMm: meta.frameWidthMm,
    lensWidthMm: meta.lensWidthMm,
    lensHeightMm: meta.lensHeightMm,
    bridgeWidthMm: meta.bridgeWidthMm,
    templeLengthMm: meta.templeLengthMm
  };
  if (spec.lensL[0] <= spec.lensR[0]) return null; // Left harus di +X
  spec.lensSepMm = (spec.lensL[0] - spec.lensR[0]) * 10;
  return spec;
}
