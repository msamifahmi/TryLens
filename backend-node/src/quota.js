// Aturan kuota Virtual Try-On (VTO) — fungsi murni. SALINAN IDENTIK ada di frontend/src/data/quota.js (diperiksa test parity).
// Katalog tidak dibatasi; hanya jumlah frame ber-VTO yang dibatasi per paket (Basic 20, Pro tanpa batas).
/**
 * frames : [{ id, vto }] diurutkan dari yang TERTUA (urutan unggah) · limit : angka atau Infinity
 * preferIds : pilihan Mitra (opsional). Hasil: Set id yang tetap ber-VTO.
 * Pilihan Mitra diutamakan (maks. limit); sisa kuota diisi otomatis berurutan dari yang tertua.
 */
export function pickVtoKeep(frames, limit, preferIds = null) {
  const on = frames.filter((f) => f.vto).map((f) => f.id);
  if (on.length <= limit) return new Set(on);
  const keep = [];
  for (const id of preferIds || []) if (on.includes(id) && !keep.includes(id) && keep.length < limit) keep.push(id);
  for (const id of on) if (keep.length < limit && !keep.includes(id)) keep.push(id);
  return new Set(keep);
}
/** Frame yang harus dimatikan VTO-nya agar sesuai kuota. */
export const vtoToDisable = (frames, limit, preferIds = null) => {
  const keep = pickVtoKeep(frames, limit, preferIds);
  return frames.filter((f) => f.vto && !keep.has(f.id)).map((f) => f.id);
};
