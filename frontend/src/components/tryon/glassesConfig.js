// Konfigurasi penempatan model 3D (.glb) di wajah. Satuan = cm, sistem koordinat
// kanonik MediaPipe (x kanan, y atas, z keluar dari wajah; hidung ≈ y -1, z 7.5).
//
// File model: frontend/public/products/<id>/model.glb
// Titik asal (origin) model = tengah jembatan hidung, menghadap +Z, lebar ≈ 14.6 cm.
// Titik `anchor` = posisi origin itu di wajah. Nilai bawaan menaruh jembatan frame di
// batang hidung dan lensa sejajar mata. Kalau ada model yang melenceng, cukup
// tambahkan override per produk di PER_PRODUCT (atau suruh pengguna geser lewat slider).
export const DEFAULT_CONFIG = { anchor: [0, 3.6, 6.0], scale: 1 };

// Model dengan rig (node GlassesRoot/Bridge/LeftLensCenter/… + extras.trylens, lihat README) TIDAK memakai `anchor`:
// pusat lensanya dikunci ke pupil pengguna oleh ar/eyeFit.js. `anchor` hanya dipakai model lama tanpa rig.
// Cek/buat rig: npm run glb:check / npm run glb:rig.

const PER_PRODUCT = {
  // f0: { anchor: [0, 3.6, 6.0], scale: 1 },
};

export function getTryOnConfig(productId) {
  return { ...DEFAULT_CONFIG, ...(PER_PRODUCT[productId] || {}) };
}
