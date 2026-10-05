// Node wajah — sistem paralel dengan node kacamata (LeftLensCenter / RightLensCenter / Bridge / Temple).
//
//   Jalur LAMBAT (kalibrasi, median 45 frame) : posisi tiap node wajah relatif terhadap centroid wajah (cm, tak
//                                               ikut berputar). Stabil, dipakai untuk ukuran & kedalaman.
//   Jalur CEPAT  (tiap frame, tanpa buffer)   : posisi dunia tiap node dibaca LANGSUNG dari landmark frame ini,
//                                               lalu dikurangi offset lokalnya → tiap node "memilih" di mana
//                                               titik asal kepala berada. Hasilnya dirata-rata berbobot
//                                               (pupil paling berat, terutama sumbu Y) → posisi kepala x,y
//                                               yang tidak menunggu filter.
//
// Dengan begitu, node pupil di wajah menjadi acuan magnet untuk node pusat-lensa di kacamata: yang bergerak
// mengikuti adalah kacamata, bukan wajah.
export const NODES = [
  { id: "pupilR", idx: 468, wx: 2, wy: 3 },
  { id: "pupilL", idx: 473, wx: 2, wy: 3 },
  { id: "ridgeTop", idx: 168, wx: 1, wy: 1.5 },
  { id: "ridgeMid", idx: 6, wx: 1, wy: 1.5 },
  { id: "ridgeLow", idx: 197, wx: 1, wy: 1.5 },
  { id: "templeR", idx: 234, wx: 1, wy: 0.5 },
  { id: "templeL", idx: 454, wx: 1, wy: 0.5 }
];
export const NODE_LEN = NODES.length * 3;

/** Offset lokal tiap node dari centroid (cm sejati, tak ikut berputar) — masukan buffer kalibrasi. */
export function nodeLocals(F, m) {
  const out = [];
  for (const n of NODES) for (let a = 0; a < 3; a++) out.push(F[3 * n.idx + a] * m);
  return out;
}

/** Posisi dunia (satuan matriks) tiap node dari landmark frame ini. Rumus sama dengan reconstructFrontal. */
function worldNodes(lm, W, H, D0, f) {
  return NODES.map((n) => {
    const p = lm[n.idx];
    const d = D0 + p.z * W * (D0 / f);
    return [((p.x - 0.5) * W * d) / f, (-(p.y - 0.5) * H * d) / f, -d];
  });
}

const wmedian = (vals, ws) => {
  const idx = vals.map((_, i) => i).sort((i, j) => vals[i] - vals[j]);
  const tot = ws.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const i of idx) {
    acc += ws[i];
    if (acc >= tot / 2) return vals[i];
  }
  return vals[idx[idx.length - 1]];
};

/**
 * Posisi titik asal kepala (x,y; satuan matriks) dari voting node SEHAT.
 *  locals : median offset lokal (cm) · inst : offset lokal frame ini (cm) · k : ukuran wajah · c0 : offset centroid · R : rotasi kepala
 *  skip   : Set id node yang dikeluarkan (mis. mata dipejamkan, pelipis sisi jauh saat menoleh)
 * Sebuah node dianggap SEHAT bila offset lokalnya sekarang masih dekat dengan median kalibrasi (≤ tol cm): rambut yang
 * menutup landmark, kedipan, atau landmark yang melompat membuat node itu "tidak punya pasangan" → dikeluarkan.
 * Suara akhir = median berbobot (bukan rata-rata), jadi satu node yang lolos tapi melenceng tidak menyeret hasil.
 * Mengembalikan { origin, spread, used, dropped:[id] }; `used` < 3 → pemanggil memakai matriks pose.
 */
export function nodeOrigin({ lm, W, H, R, D0, f, locals, inst, k, c0, skip = null, tol = 0.4 }) {
  const P = worldNodes(lm, W, H, D0, f);
  const xs = [], ys = [], wx = [], wy = [], dropped = [];
  NODES.forEach((n, i) => {
    if (skip?.has(n.id)) { dropped.push(n.id); return; }
    if (inst && Math.hypot(inst[3 * i] - locals[3 * i], inst[3 * i + 1] - locals[3 * i + 1], inst[3 * i + 2] - locals[3 * i + 2]) > tol) { dropped.push(n.id); return; }
    const l = [locals[3 * i] / k + c0[0], locals[3 * i + 1] / k + c0[1], locals[3 * i + 2] / k + c0[2]];
    xs.push(P[i][0] - (R[0][0] * l[0] + R[0][1] * l[1] + R[0][2] * l[2]));
    ys.push(P[i][1] - (R[1][0] * l[0] + R[1][1] * l[1] + R[1][2] * l[2]));
    wx.push(n.wx);
    wy.push(n.wy);
  });
  const used = xs.length;
  if (used < 3) return { origin: null, spread: null, used, dropped };
  const ox = wmedian(xs, wx), oy = wmedian(ys, wy);
  const sd = (v, o) => Math.sqrt(v.reduce((s, x) => s + (x - o) ** 2, 0) / v.length);
  return { origin: [ox, oy], spread: [sd(xs, ox), sd(ys, oy)], used, dropped };
}

/** Centroid 468 landmark wajah di ruang dunia (satuan matriks) — acuan menghitung offset titik asal kepala per pengguna. */
export function centroidWorld(lm, W, H, D0, f) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < 468; i++) {
    const d = D0 + lm[i].z * W * (D0 / f);
    x += ((lm[i].x - 0.5) * W * d) / f;
    y += (-(lm[i].y - 0.5) * H * d) / f;
    z += -d;
  }
  return [x / 468, y / 468, z / 468];
}
