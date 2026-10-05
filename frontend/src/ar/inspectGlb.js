// Pemeriksaan cepat file .glb di browser (tanpa three.js): struktur GLB valid? node rig & metadata sesuai spesifikasi TryLens?
// Hanya membaca chunk JSON, jadi aman untuk file besar. Validasi geometri lengkap: `npm run glb:check`.
import { META_KEYS, NODE_NAMES } from "./rigSpec.js";

const MAGIC = 0x46546c67; // "glTF"
export const MAX_GLB_BYTES = 12 * 1024 * 1024;

export function inspectGlb(buf) {
  const out = { valid: false, error: null, nodeCount: 0, rig: "none", missingNodes: [], missingMeta: [], issues: [], meta: null };
  try {
    if (buf.byteLength < 20) throw new Error("File terlalu kecil untuk .glb");
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== MAGIC) throw new Error("Bukan file .glb (header tidak dikenali). Ekspor ulang sebagai glTF Binary (.glb).");
    if (dv.getUint32(4, true) !== 2) throw new Error("Hanya glTF versi 2 yang didukung.");
    const jsonLen = dv.getUint32(12, true);
    if (dv.getUint32(16, true) !== 0x4e4f534a) throw new Error("Chunk JSON tidak ditemukan.");
    const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
    const nodes = gltf.nodes || [];
    out.valid = true;
    out.nodeCount = nodes.length;

    const byName = new Map(nodes.map((n, i) => [n.name, i]));
    out.missingNodes = NODE_NAMES.filter((n) => !byName.has(n));
    const rootNode = nodes[byName.get("GlassesRoot")];
    const meta = rootNode?.extras?.trylens || null;
    out.meta = meta;
    out.missingMeta = meta ? META_KEYS.filter((k) => !(typeof meta[k] === "number" && meta[k] > 0)) : META_KEYS.slice();

    if (out.missingNodes.length === NODE_NAMES.length && !meta) out.rig = "none";
    else if (out.missingNodes.length || out.missingMeta.length) out.rig = "partial";
    else out.rig = "ok";

    if (out.rig === "ok") {
      // posisi dunia kasar (hanya translasi) untuk memeriksa Left = +X dan Bridge di tengah
      const parent = new Map();
      nodes.forEach((n, i) => (n.children || []).forEach((c) => parent.set(c, i)));
      const pos = (name) => {
        let i = byName.get(name), p = [0, 0, 0];
        while (i !== undefined) {
          const t = nodes[i].translation || [0, 0, 0], s = nodes[i].scale || [1, 1, 1];
          p = [p[0] * s[0] + t[0], p[1] * s[1] + t[1], p[2] * s[2] + t[2]];
          i = parent.get(i);
        }
        return p;
      };
      const root = pos("GlassesRoot"), rel = (n) => pos(n).map((v, k) => v - root[k]);
      const L = rel("LeftLensCenter"), R = rel("RightLensCenter"), B = rel("Bridge");
      if (!(L[0] > R[0])) out.issues.push("LeftLensCenter harus di sisi +X (kiri pemakai); posisi kiri/kanan tertukar.");
      if (Math.abs(B[0]) > 0.05 * meta.realWorldScale / 10) out.issues.push("Node Bridge harus di tengah (x = 0).");
      const sepMm = ((L[0] - R[0]) * meta.realWorldScale);
      if (sepMm < 50 || sepMm > 95) out.issues.push(`Jarak pusat lensa ${Math.round(sepMm)} mm tidak wajar (cek realWorldScale: 10 = model dalam cm).`);
      out.lensSepMm = sepMm;
    }
  } catch (e) {
    out.valid = false;
    out.error = e.message;
  }
  return out;
}
