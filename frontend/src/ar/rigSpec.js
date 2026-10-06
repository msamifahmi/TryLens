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

/**
 * Spesifikasi PERKIRAAN untuk model tanpa rig (model lama / unggahan Mitra yang belum diberi node), dari kotak batas model
 * (`box` = {min:[x,y,z], max:[x,y,z]} dalam satuan model, titik asal ≈ tengah jembatan, menghadap +Z).
 * Satuan ditebak dari lebar (≈14 cm → cm, ≈140 → mm, ≈0,14 → meter). Pusat lensa dianggap simetris:
 * jarak antar-lensa ≈ 50% lebar frame (rata-rata frame optik), tinggi = pusat kotak, bidang lensa tepat di belakang muka depan.
 * Hasilnya `estimated: true` — laporan kecocokan tetap tampil, tetapi diberi catatan bahwa dimensinya perkiraan.
 */
export function estimateSpecFromBox(box) {
  if (!box) return null;
  const size = [0, 1, 2].map((a) => box.max[a] - box.min[a]);
  if (!size.every((v) => Number.isFinite(v) && v > 0)) return null;
  const w = size[0];
  const unit = w > 40 ? 0.1 : w < 1.5 ? 100 : 1; // cm per satuan model
  const wc = w * unit; // lebar dalam cm
  if (wc < 8 || wc > 22) return null; // bukan kacamata (model rusak / skala aneh)
  const yc = ((box.min[1] + box.max[1]) / 2) * unit;
  const zFront = box.max[2] * unit;
  const lensZ = zFront - 0.25;
  const half = (wc * 0.5) / 2; // setengah jarak antar-lensa
  const lensW = wc * 0.37, bridgeW = wc * 0.125;
  return {
    unit,
    estimated: true,
    lensL: [half, yc, lensZ],
    lensR: [-half, yc, lensZ],
    bridge: [0, yc - 0.3, Math.max(box.min[2] * unit, lensZ - 1.0)],
    templeL: [wc / 2, yc, box.min[2] * unit * 0.5],
    templeR: [-wc / 2, yc, box.min[2] * unit * 0.5],
    frameWidthMm: wc * 10,
    lensWidthMm: lensW * 10,
    lensHeightMm: Math.min(size[1] * unit * 0.95, 60) * 10 || 45,
    bridgeWidthMm: bridgeW * 10,
    templeLengthMm: size[2] * unit * 10,
    lensSepMm: half * 20
  };
}
