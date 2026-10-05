// Fitting berbasis PUPIL. Anchor kacamata = pusat lensa, dan pusat lensa dikunci ke pupil pengguna.
//
//   Wajah (metrik, cm)                                   Model GLB (spesifikasi aset TryLens)
//   ├─ Left Eye / Right Eye  = pusat iris (468, 473)  ↔  LeftLensCenter / RightLensCenter
//   ├─ Nose Bridge           = garis punggung hidung  ↔  Bridge (titik belakang jembatan)
//   ├─ Face Orientation      = pose kepala (di PoseEngine, group `head`)
//   └─ Metric Scale          = diameter iris 11,7 mm  →  model dipasang berukuran ASLI (bukan di-scale ke wajah)
//
// Rigid (tanpa skala): titik tengah kedua pusat lensa ditaruh tepat di titik tengah kedua pupil (x,y), roll dari garis
// pupil (dibatasi). Kedalaman (z) tidak bisa "dikunci" ke pupil: ia ditentukan oleh hidung — Bridge tidak boleh masuk ke
// punggung hidung — dengan batas bawah jarak lensa-ke-mata supaya lensa tidak menyentuh bulu mata.
//
// Karena frame itu kaku dan PD tiap orang berbeda, pusat lensa TIDAK bisa pas di kedua pupil sekaligus kecuali jarak
// pusat lensa = PD. Selisihnya (dekantrasi per mata) tidak disembunyikan: dihitung dan dilaporkan.
export const PUPIL = [468, 473]; // [pupil kanan subjek (-x kanonik), pupil kiri subjek (+x kanonik)]
export const RIDGE = [168, 6, 197]; // punggung hidung dari atas ke bawah
export const BROW = [282, 52]; // tepi bawah alis (kiri, kanan)
export const FIT_LIMITS = {
  rollDeg: 4, // batas koreksi roll dari garis pupil
  minVertexCm: 1.2, // jarak minimum pusat lensa → pupil (kornea→lensa ±12 mm + iris di belakang kornea ±3 mm)
  maxVertexCm: 2.8, // lebih dari ini = hidung "mendorong" frame; ditandai
  noseClearCm: 0.05, // celah antara titik belakang Bridge dan punggung hidung
  rimCm: 0.15 // tebal rim di atas lensa (untuk jarak ke alis)
};
export const EYE_LEN = 14;

/** Titik pengukuran dari titik terluruskan (F, satuan rekonstruksi) × m → cm sejati, berpusat di centroid landmark. */
export function eyeTargets(F, m) {
  const P = (i) => [F[3 * i] * m, F[3 * i + 1] * m, F[3 * i + 2] * m];
  const br = BROW.map(P);
  return {
    pR: P(PUPIL[0]),
    pL: P(PUPIL[1]),
    ridge: RIDGE.map((i) => [P(i)[1], P(i)[2]]),
    brow: [(br[0][1] + br[1][1]) / 2, (br[0][2] + br[1][2]) / 2]
  };
}
export const packEyeTargets = (t) => [...t.pR, ...t.pL, ...t.ridge.flat(), ...t.brow];
export const unpackEyeTargets = (v) => ({
  pR: v.slice(0, 3),
  pL: v.slice(3, 6),
  ridge: [0, 1, 2].map((i) => [v[6 + 2 * i], v[7 + 2 * i]]),
  brow: [v[12], v[13]]
});

/** z permukaan punggung hidung pada ketinggian y (interpolasi linear, di luar rentang = ujung terdekat). */
export function ridgeZAt(ridge, y) {
  const r = [...ridge].sort((a, b) => b[0] - a[0]); // dari atas
  if (y >= r[0][0]) return r[0][1];
  for (let i = 0; i < r.length - 1; i++) {
    if (y >= r[i + 1][0]) {
      const u = (r[i][0] - y) / Math.max(1e-6, r[i][0] - r[i + 1][0]);
      return r[i][1] + u * (r[i + 1][1] - r[i][1]);
    }
  }
  return r[r.length - 1][1];
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Letakkan model pada mata.
 * spec : keluaran specFromNodes (cm, ruang GlassesRoot). tg : titik wajah (cm sejati, berpusat di centroid).
 * k    : ukuran wajah pengguna vs kanonik. c0 : centroid model kanonik. userScale : slider ukuran (1 = ukuran asli).
 * Hasil `position` dalam ruang kepala (satuan kanonik), siap dipakai sebagai rig.position.
 */
export function placeOnEyes({ spec, tg, k, c0, userScale = 1, limits = FIT_LIMITS }) {
  const s = userScale;
  const mid = (a, b) => a.map((v, i) => (v + b[i]) / 2);
  const pm = mid(tg.pR, tg.pL);
  const lensL = spec.lensL.map((v) => v * s), lensR = spec.lensR.map((v) => v * s), br = spec.bridge.map((v) => v * s);
  const lm = mid(lensL, lensR);

  // Roll: garis pupil relatif terhadap garis pusat lensa model, dibatasi.
  const eyeAng = Math.atan2(tg.pL[1] - tg.pR[1], tg.pL[0] - tg.pR[0]);
  const modelAng = Math.atan2(lensL[1] - lensR[1], lensL[0] - lensR[0]);
  const lim = (limits.rollDeg * Math.PI) / 180;
  const rollRaw = eyeAng - modelAng;
  const roll = clamp(rollRaw, -lim, lim);
  const c = Math.cos(roll), sn = Math.sin(roll);
  const rot = (p) => [p[0] * c - p[1] * sn, p[0] * sn + p[1] * c, p[2]];

  // x,y: titik tengah lensa tepat di titik tengah pupil.
  const lmR = rot(lm);
  const rx = pm[0] - lmR[0], ry = pm[1] - lmR[1];

  // z: dari hidung (Bridge tidak masuk ke punggung hidung) dan batas bawah jarak lensa-ke-mata.
  const brR = rot(br);
  const ridgeZ = ridgeZAt(tg.ridge, ry + brR[1]);
  const zNose = ridgeZ + limits.noseClearCm - brR[2];
  const zMin = pm[2] + limits.minVertexCm - lmR[2];
  const zMax = pm[2] + limits.maxVertexCm - lmR[2];
  let rz = Math.max(zNose, zMin);
  const noseBlocked = rz > zMax;
  rz = Math.min(rz, zMax);

  const world = (p) => { const q = rot(p); return [q[0] + rx, q[1] + ry, q[2] + rz]; };
  const wL = world(lensL), wR = world(lensR), wB = world(br);
  const dec = (w, p) => ({ x: (p[0] - w[0]) * 10, y: (p[1] - w[1]) * 10 }); // mm; + = pupil di arah +x/+y dari pusat lensa
  const decL = dec(wL, tg.pL), decR = dec(wR, tg.pR);
  const topY = ry + lmR[1] + ((spec.lensHeightMm / 20 + limits.rimCm) * s);

  return {
    position: [c0[0] + rx / k, c0[1] + ry / k, c0[2] + rz / k], // ruang kepala (satuan kanonik)
    roll,
    rollClamped: Math.abs(rollRaw) > lim,
    contact: noseBlocked || zNose >= zMin ? "nose" : "vertex",
    noseBlocked,
    vertexMm: (wL[2] / 2 + wR[2] / 2 - pm[2]) * 10,
    noseGapMm: (wB[2] - ridgeZ) * 10,
    decL,
    decR,
    pdMm: Math.hypot(tg.pL[0] - tg.pR[0], tg.pL[1] - tg.pR[1], tg.pL[2] - tg.pR[2]) * 10,
    browMm: (tg.brow[0] - topY) * 10
  };
}

// v = geseran pupil dari pusat lensa, positif = ke luar (menjauhi hidung).
const side = (v) => (Math.abs(v) < 0.5 ? "tepat" : `${Math.abs(v).toFixed(1).replace(".", ",")} mm ${v > 0 ? "ke luar" : "ke dalam"}`);

/** Laporan kecocokan (mm). Semua angka perkiraan kamera (±2–3 mm). */
export function describeFit({ frameMm, faceMm, fit }) {
  const out = [];
  if (frameMm && faceMm) {
    const r = frameMm / faceMm;
    out.push({
      key: "width",
      title: "Lebar frame vs wajah",
      value: `${Math.round(frameMm)} mm / ±${Math.round(faceMm)} mm`,
      status: r < 0.85 || r > 1.03 ? "bad" : r < 0.9 ? "warn" : "ok",
      note: r < 0.85 ? "Cenderung terasa kecil" : r > 1.03 ? "Cenderung terlalu lebar" : "Pas di lebar wajahmu"
    });
  }
  if (fit) {
    const dl = Math.hypot(fit.decL.x, fit.decL.y), dr = Math.hypot(fit.decR.x, fit.decR.y), worst = Math.max(dl, dr);
    out.push({
      key: "pupil",
      title: "Pusat lensa vs pupil",
      value: `Kiri ${side(fit.decL.x)} · Kanan ${side(-fit.decR.x)}`,
      status: worst <= 2.5 ? "ok" : worst <= 5 ? "warn" : "bad",
      note: worst <= 2.5 ? "Pupil tepat di pusat lensa" : `Pupil meleset hingga ${worst.toFixed(1).replace(".", ",")} mm — minta optik menggeser titik optik lensa`
    });
    out.push({
      key: "vertex",
      title: "Jarak lensa ke mata",
      value: `±${Math.round(fit.vertexMm)} mm`,
      status: fit.noseBlocked || fit.vertexMm > 24 ? "bad" : fit.vertexMm > 18 ? "warn" : "ok",
      note: fit.noseBlocked ? "Hidung mendorong frame ke depan" : fit.vertexMm > 18 ? "Frame agak jauh dari mata" : "Jarak wajar"
    });
    out.push({
      key: "nose",
      title: "Jembatan di hidung",
      value: fit.noseGapMm > 0.5 ? `celah ±${Math.round(fit.noseGapMm)} mm` : "menempel",
      status: fit.noseGapMm <= 4 ? "ok" : "warn",
      note: fit.noseGapMm <= 4 ? "Bertumpu di hidung" : "Ada celah — frame bisa merosot / terasa jauh"
    });
    if (fit.browMm != null) {
      out.push({
        key: "brow",
        title: "Jarak ke alis",
        value: `${fit.browMm >= 0 ? "+" : "−"}${Math.abs(Math.round(fit.browMm))} mm`,
        status: fit.browMm >= 0 ? "ok" : fit.browMm >= -6 ? "warn" : "bad",
        note: fit.browMm >= 0 ? "Frame di bawah alis" : fit.browMm >= -6 ? "Frame menyentuh alis" : "Frame menutupi alis"
      });
    }
  }
  return out;
}
