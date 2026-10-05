// Validasi .glb di sisi server (sama semangatnya dengan frontend/src/ar/inspectGlb.js): struktur biner glTF 2.0
// dan rig TryLens (node + extras). Tidak membaca geometri; hanya header + chunk JSON.
export const RIG_NODES = ["GlassesRoot", "Bridge", "LeftLensCenter", "RightLensCenter", "LeftTemple", "RightTemple"];
export const RIG_META = ["frameWidthMm", "lensWidthMm", "lensHeightMm", "bridgeWidthMm", "templeLengthMm", "realWorldScale"];

export function inspectGlb(buf, maxBytes) {
  const fail = (error) => ({ ok: false, error });
  if (!Buffer.isBuffer(buf) || buf.length < 20) return fail("Berkas terlalu kecil untuk .glb");
  if (buf.length > maxBytes) return fail(`Ukuran .glb melebihi ${Math.round(maxBytes / 1048576)} MB`);
  if (buf.readUInt32LE(0) !== 0x46546c67) return fail("Bukan berkas .glb (header glTF tidak ditemukan)");
  if (buf.readUInt32LE(4) !== 2) return fail("Hanya glTF 2.0 yang didukung");
  if (buf.readUInt32LE(8) !== buf.length) return fail("Panjang berkas tidak cocok dengan header (berkas terpotong?)");
  const jsonLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a || 20 + jsonLen > buf.length) return fail("Chunk JSON glTF rusak");
  let gltf;
  try {
    gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  } catch {
    return fail("JSON glTF tidak dapat dibaca");
  }
  if (!Array.isArray(gltf.meshes) || !gltf.meshes.length) return fail("Model tidak berisi mesh");
  const nodes = gltf.nodes || [];
  const names = new Set(nodes.map((n) => n.name).filter(Boolean));
  const missing = RIG_NODES.filter((n) => !names.has(n));
  const root = nodes.find((n) => n.name === "GlassesRoot");
  const meta = root?.extras?.trylens || null;
  const metaMissing = meta ? RIG_META.filter((k) => !(Number(meta[k]) > 0)) : RIG_META;
  const complete = missing.length === 0 && metaMissing.length === 0;
  return {
    ok: true,
    rig: {
      complete,
      state: complete ? "ok" : missing.length === RIG_NODES.length && !meta ? "none" : "partial",
      missingNodes: missing,
      missingMeta: metaMissing,
      meta,
      nodeCount: nodes.length,
      size: buf.length,
      frameWidthMm: meta ? Number(meta.frameWidthMm) || null : null
    },
    warnings: complete ? [] : ["Rig TryLens tidak lengkap: Coba Virtual memakai penempatan cadangan (kurang akurat)."]
  };
}

export const isJpeg = (b) => Buffer.isBuffer(b) && b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
