// Spesifikasi aset kacamata TryLens (GLB) — dibangun dan divalidasi di sini.
//
//   GlassesRoot            (identitas; menyimpan metadata di extras.trylens)
//   ├── <mesh frame, lensa, gagang…>
//   ├── Bridge             titik tumpu jembatan di hidung (tengah, bidang BELAKANG frame)
//   ├── LeftLensCenter     pusat lensa kiri PEMAKAI  (+X)   ← diselaraskan ke pupil kiri
//   ├── RightLensCenter    pusat lensa kanan PEMAKAI (−X)   ← diselaraskan ke pupil kanan
//   ├── LeftTemple         engsel gagang kiri  (+X)
//   └── RightTemple        engsel gagang kanan (−X)
//
// Sumbu: +X = kiri pemakai, +Y = atas, +Z = depan (menghadap kamera). Satuan model = cm (realWorldScale = 10 mm/unit).
// Metadata (extras.trylens), semua mm kecuali dinyatakan lain:
//   frameWidthMm, lensWidthMm, lensHeightMm, bridgeWidthMm, templeLengthMm, realWorldScale (mm per satuan model).
import { Node } from "@gltf-transform/core";

export const NODE_NAMES = ["GlassesRoot", "Bridge", "LeftLensCenter", "RightLensCenter", "LeftTemple", "RightTemple"];
export const META_KEYS = ["frameWidthMm", "lensWidthMm", "lensHeightMm", "bridgeWidthMm", "templeLengthMm", "realWorldScale"];

const apply = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14]
];
const median = (a) => {
  const s = [...a].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Semua primitif mesh dengan verteks di ruang GlassesRoot/scene (transformasi dunia diterapkan). */
export function collectParts(doc) {
  const parts = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const n = pos.getCount();
      const v = new Float64Array(n * 3);
      const tmp = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        pos.getElement(i, tmp);
        v.set(apply(M, tmp[0], tmp[1], tmp[2]), i * 3);
      }
      parts.push({ node, prim, mat: prim.getMaterial()?.getName() ?? "", v });
    }
  }
  return parts;
}

const bbox = (v, pick = () => true) => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let n = 0;
  for (let i = 0; i < v.length; i += 3) {
    if (!pick(v[i], v[i + 1], v[i + 2])) continue;
    n++;
    for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], v[i + a]); max[a] = Math.max(max[a], v[i + a]); }
  }
  return { min, max, n };
};

/** Ukur geometri model (cm). opts: { lens: RegExp, templeGapCm }. */
export function measure(doc, opts = {}) {
  const lensRe = opts.lens ?? /glass|lens/i;
  const gap = opts.templeGapCm ?? 1.0;
  const parts = collectParts(doc);
  if (!parts.length) throw new Error("GLB tidak punya mesh.");
  const all = bbox(parts.flatMap((p) => Array.from(p.v)));
  const lensParts = parts.filter((p) => lensRe.test(p.mat));
  if (!lensParts.length) throw new Error(`Tidak ada material lensa (cocok ${lensRe}). Beri nama material lensa 'glass'/'lens' atau pakai --lens=<regex>.`);
  const rest = parts.filter((p) => !lensRe.test(p.mat));
  const temple = rest.filter((p) => bbox(p.v).max[2] < all.max[2] - gap); // seluruhnya jauh di belakang bidang depan
  const front = rest.filter((p) => !temple.includes(p));
  const cat = (list) => { const o = []; for (const p of list) for (let i = 0; i < p.v.length; i++) o.push(p.v[i]); return Float64Array.from(o); };
  const lensV = cat(lensParts), frontV = cat(front), templeV = cat(temple);

  const eye = (sign) => {
    const b = bbox(lensV, (x) => x * sign > 0);
    if (!b.n) throw new Error("Lensa tidak simetris kiri/kanan di sumbu X (pastikan origin di tengah jembatan).");
    return { b, center: [0, 1, 2].map((a) => (b.min[a] + b.max[a]) / 2), width: b.max[0] - b.min[0], height: b.max[1] - b.min[1] };
  };
  const L = eye(+1), R = eye(-1);
  const lensCenterY = (L.center[1] + R.center[1]) / 2;
  const dbl = L.b.min[0] - R.b.max[0]; // jarak antar lensa (jembatan)

  // Bridge = titik tumpu di hidung: bidang belakang frame di sekitar tepi dalam lensa, setinggi pusat lensa.
  const pad = [];
  for (let i = 0; i < frontV.length; i += 3) {
    const ax = Math.abs(frontV[i]);
    if (ax > dbl / 2 - 0.4 && ax < dbl / 2 + 0.4 && Math.abs(frontV[i + 1] - lensCenterY) < 1.0) pad.push(frontV[i + 2]);
  }
  if (pad.length < 5) throw new Error("Tidak menemukan geometri frame di sekitar jembatan hidung.");
  pad.sort((a, b) => a - b);
  const bridge = [0, lensCenterY, pad[Math.floor(pad.length * 0.2)]];

  const side = (sign) => {
    const b = bbox(templeV, (x) => x * sign > 0);
    if (!b.n) throw new Error("Gagang tidak ditemukan (butuh bagian yang jauh di belakang bidang depan).");
    const zmax = b.max[2];
    const hv = [];
    for (let i = 0; i < templeV.length; i += 3) if (templeV[i] * sign > 0 && templeV[i + 2] > zmax - 0.3) hv.push([templeV[i], templeV[i + 1], templeV[i + 2]]);
    const hinge = [0, 1, 2].map((a) => hv.reduce((s, p) => s + p[a], 0) / hv.length);
    // Panjang gagang = panjang lintasan (pusat penampang) dari engsel sampai ujung, bukan jarak lurus.
    const BIN = 0.25;
    const bins = new Map();
    let tip = null;
    for (let i = 0; i < templeV.length; i += 3) {
      if (templeV[i] * sign <= 0) continue;
      const k = Math.floor((zmax - templeV[i + 2]) / BIN);
      const e = bins.get(k) ?? { n: 0, p: [0, 0, 0] };
      e.n++; for (let a = 0; a < 3; a++) e.p[a] += templeV[i + a];
      bins.set(k, e);
      if (!tip || templeV[i + 2] < tip[2]) tip = [templeV[i], templeV[i + 1], templeV[i + 2]];
    }
    const path = [...bins.keys()].sort((a, b) => a - b).map((k) => bins.get(k).p.map((s) => s / bins.get(k).n));
    path.push(tip);
    let len = 0;
    for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]);
    return { hinge, length: len };
  };
  const TL = side(+1), TR = side(-1);

  return {
    unitCmPerUnit: 1,
    centers: { left: L.center, right: R.center },
    bridge,
    hinges: { left: TL.hinge, right: TR.hinge },
    meta: {
      frameWidthMm: Math.round((all.max[0] - all.min[0]) * 100) / 10,
      lensWidthMm: Math.round(((L.width + R.width) / 2) * 100) / 10,
      lensHeightMm: Math.round(((L.height + R.height) / 2) * 100) / 10,
      bridgeWidthMm: Math.round(dbl * 100) / 10,
      templeLengthMm: Math.round(((TL.length + TR.length) / 2) * 100) / 10,
      realWorldScale: 10
    },
    bbox: all
  };
}

const find = (doc, name) => doc.getRoot().listNodes().find((n) => n.getName() === name);

/** Tambahkan hierarki + metadata sesuai spesifikasi. Idempotent. Mengembalikan hasil ukur. */
export function buildRig(doc, opts = {}) {
  const m = measure(doc, opts);
  const scene = doc.getRoot().listScenes()[0];
  for (const name of NODE_NAMES.slice(1)) find(doc, name)?.dispose();

  let root = find(doc, "GlassesRoot");
  if (!root) {
    root = doc.createNode("GlassesRoot");
    for (const child of scene.listChildren()) { scene.removeChild(child); root.addChild(child); }
    scene.addChild(root);
  }
  const empty = (name, t) => { const n = doc.createNode(name).setTranslation(t.map((v) => Math.round(v * 1e4) / 1e4)); root.addChild(n); return n; };
  empty("Bridge", m.bridge);
  empty("LeftLensCenter", m.centers.left);
  empty("RightLensCenter", m.centers.right);
  empty("LeftTemple", m.hinges.left);
  empty("RightTemple", m.hinges.right);
  root.setExtras({ ...(root.getExtras() ?? {}), trylens: { version: 1, anchor: "pupil", ...m.meta } });
  return m;
}

/** Validasi aset. Mengembalikan { ok, errors[], warnings[], info }. */
export function validateRig(doc, opts = {}) {
  const errors = [], warnings = [];
  const root = find(doc, "GlassesRoot");
  const nodes = Object.fromEntries(NODE_NAMES.map((n) => [n, find(doc, n)]));
  const missing = NODE_NAMES.filter((n) => !nodes[n]);
  if (missing.length) return { ok: false, errors: [`Node wajib hilang: ${missing.join(", ")}`], warnings, info: null, legacy: missing.length === NODE_NAMES.length };

  const t = (n) => nodes[n].getWorldTranslation();
  const meta = root.getExtras()?.trylens;
  if (!meta) errors.push("GlassesRoot.extras.trylens (metadata) hilang.");
  else for (const k of META_KEYS) if (!(typeof meta[k] === "number" && meta[k] > 0)) errors.push(`Metadata '${k}' hilang atau bukan angka positif.`);
  const rw = root.getWorldMatrix();
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1].every((v, i) => Math.abs(rw[i] - v) < 1e-6);
  if (!identity) errors.push("GlassesRoot harus bertransformasi identitas (tanpa posisi/rotasi/skala).");

  const [Lc, Rc, B, Lt, Rt] = ["LeftLensCenter", "RightLensCenter", "Bridge", "LeftTemple", "RightTemple"].map(t);
  if (!(Lc[0] > 0 && Rc[0] < 0)) errors.push("LeftLensCenter harus di +X dan RightLensCenter di −X (kiri/kanan = sisi pemakai).");
  const sym = (a, b, label, tolCm = 0.1) => {
    if (Math.abs(a[0] + b[0]) > tolCm || Math.abs(a[1] - b[1]) > tolCm || Math.abs(a[2] - b[2]) > tolCm) errors.push(`${label} tidak simetris (selisih > ${tolCm * 10} mm).`);
  };
  sym(Lc, Rc, "Pusat lensa"); sym(Lt, Rt, "Engsel gagang");
  if (Math.abs(B[0]) > 0.1) errors.push("Bridge harus di tengah (x≈0).");

  if (meta && !errors.length) {
    try {
      const m = measure(doc, opts);
      const near = (key, tolMm, label) => { if (Math.abs(meta[key] - m.meta[key]) > tolMm) errors.push(`${label} di metadata ${meta[key]} mm ≠ geometri ${m.meta[key]} mm.`); };
      near("frameWidthMm", 3, "Lebar frame"); near("lensWidthMm", 3, "Lebar lensa"); near("lensHeightMm", 3, "Tinggi lensa");
      near("bridgeWidthMm", 3, "Lebar jembatan"); near("templeLengthMm", 6, "Panjang gagang");
      const sepMm = (Lc[0] - Rc[0]) * 10 * (meta.realWorldScale / 10);
      const expect = meta.lensWidthMm + meta.bridgeWidthMm;
      if (Math.abs(sepMm - expect) > 4) warnings.push(`Jarak pusat lensa ${sepMm.toFixed(1)} mm ≠ lebar lensa + jembatan ${expect.toFixed(1)} mm (bentuk lensa tidak simetris?).`);
      const dc = Math.hypot(Lc[0] - m.centers.left[0], Lc[1] - m.centers.left[1], Lc[2] - m.centers.left[2]);
      if (dc > 0.3) warnings.push(`LeftLensCenter ${(dc * 10).toFixed(1)} mm dari pusat geometri lensa — disengaja?`);
    } catch (e) { warnings.push(`Pengukuran geometri dilewati: ${e.message}`); }
  }
  if (meta) {
    if (meta.templeLengthMm < 110 || meta.templeLengthMm > 160) warnings.push(`Panjang gagang ${meta.templeLengthMm} mm di luar kisaran umum 110–160 mm.`);
    if (meta.frameWidthMm < 110 || meta.frameWidthMm > 160) warnings.push(`Lebar frame ${meta.frameWidthMm} mm di luar kisaran umum 110–160 mm.`);
    if (![1, 10, 1000].includes(meta.realWorldScale)) warnings.push(`realWorldScale ${meta.realWorldScale} tidak lazim (1=mm, 10=cm, 1000=m per satuan).`);
  }
  return { ok: errors.length === 0, errors, warnings, info: meta ?? null };
}
