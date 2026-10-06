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
// `eye: true` = node bola mata. Iris ikut bergeser saat pandangan melirik (±3–4 mm), padahal kepala diam — kalau ikut
// menentukan posisi kepala, kacamata ikut "melirik" (jiggle). Maka posisi kepala ditentukan node KAKU (tulang/hidung/dahi/
// tulang pipi); node mata hanya diterima bila sepakat dengan konsensus node kaku, dan bobotnya kecil.
export const NODES = [
  { id: "pupilR", idx: 468, wx: 1, wy: 1, eye: true },
  { id: "pupilL", idx: 473, wx: 1, wy: 1, eye: true },
  { id: "ridgeTop", idx: 168, wx: 1.5, wy: 2 },
  { id: "ridgeMid", idx: 6, wx: 1.5, wy: 2 },
  { id: "ridgeLow", idx: 197, wx: 1.5, wy: 2 },
  { id: "glabella", idx: 9, wx: 1, wy: 1.5 },
  { id: "forehead", idx: 151, wx: 1, wy: 1.5 },
  { id: "cheekR", idx: 123, wx: 1, wy: 1 },
  { id: "cheekL", idx: 352, wx: 1, wy: 1 },
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
export function nodeOrigin({ lm, W, H, R, D0, f, locals, inst, k, c0, skip = null, wscale = null, tol = 0.4, eyeTol = 0.12, soft = 0.08 }) {
  const P = worldNodes(lm, W, H, D0, f);
  const votes = [], dropped = [];
  NODES.forEach((n, i) => {
    if (skip?.has(n.id)) { dropped.push(n.id); return; }
    if (inst && Math.hypot(inst[3 * i] - locals[3 * i], inst[3 * i + 1] - locals[3 * i + 1], inst[3 * i + 2] - locals[3 * i + 2]) > tol) { dropped.push(n.id); return; }
    const l = [locals[3 * i] / k + c0[0], locals[3 * i + 1] / k + c0[1], locals[3 * i + 2] / k + c0[2]];
    votes.push({
      n,
      x: P[i][0] - (R[0][0] * l[0] + R[0][1] * l[1] + R[0][2] * l[2]),
      y: P[i][1] - (R[1][0] * l[0] + R[1][1] * l[1] + R[1][2] * l[2])
    });
  });
  const ws = (v) => wscale?.[v.n.id] ?? 1;
  const med = (vs) => [wmedian(vs.map((v) => v.x), vs.map((v) => v.n.wx * ws(v))), wmedian(vs.map((v) => v.y), vs.map((v) => v.n.wy * ws(v)))];
  // Rata-rata berbobot yang kokoh: bobot tiap node dikecilkan mulus menurut jaraknya dari median (Cauchy). Median murni
  // melompat saat urutan suara berganti (node masuk/keluar); rata-rata kokoh ini bergerak mulus dan tetap menolak outlier.
  const robust = (vs) => {
    const [mx, my] = med(vs);
    let sx = 0, sy = 0, tx = 0, ty = 0;
    for (const v of vs) {
      const cx = 1 / (1 + ((v.x - mx) / soft) ** 2), cy = 1 / (1 + ((v.y - my) / soft) ** 2);
      const wx = v.n.wx * ws(v) * cx, wy = v.n.wy * ws(v) * cy;
      sx += wx * v.x; tx += wx; sy += wy * v.y; ty += wy;
    }
    return tx > 0 && ty > 0 ? [sx / tx, sy / ty] : [mx, my];
  };
  const rigid = votes.filter((v) => !v.n.eye), eyes = votes.filter((v) => v.n.eye);
  let use = votes;
  if (rigid.length >= 3) {
    // Konsensus node kaku dulu; node mata hanya ikut bila searah (pandangan lurus / mata bergeser sangat kecil).
    const [rx, ry] = med(rigid);
    const okEyes = eyes.filter((v) => Math.hypot(v.x - rx, v.y - ry) <= eyeTol);
    eyes.forEach((v) => { if (!okEyes.includes(v)) dropped.push(v.n.id); });
    use = [...rigid, ...okEyes];
  }
  const used = use.length;
  if (used < 3) return { origin: null, spread: null, used, dropped };
  const [ox, oy] = robust(use);
  const sd = (key, o) => Math.sqrt(use.reduce((s, v) => s + (v[key] - o) ** 2, 0) / use.length);
  return { origin: [ox, oy], spread: [sd("x", ox), sd("y", oy)], used, dropped };
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
