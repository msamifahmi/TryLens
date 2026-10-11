// Penyesuaian model 3D agar hasil AR rapi meski modelnya tidak sempurna. Murni matematika (tanpa three.js) supaya bisa diuji di Node.
//
//  1) analyzePoints — frame TANPA node (tanpa rig): dari kumpulan titik mesh, tentukan
//       · arah hadap (model yang menghadap -Z dibalik 180° — gagangnya tidak boleh mengarah ke kamera),
//       · satuan / skala (model berukuran aneh dinormalkan ke lebar ≈ 14,2 cm),
//       · pusat simetri (titik asal model tak perlu di tengah jembatan),
//       · pusat tiap lensa (dari mesh lensa bila ada, kalau tidak dari proporsi frame),
//       · bagian belakang jembatan (menyentuh hidung) dan engsel gagang.
//     Hasilnya spesifikasi yang sama bentuknya dengan model ber-rig, jadi kunci pupil + laporan kecocokan tetap jalan.
//  2) templeFactor — faktor panjang gagang agar ujungnya jatuh tepat di belakang telinga.
//  3) EAR_TIP_Z / CRANIUM — konstanta ruang kepala kanonik (cm).

/** z ujung gagang di ruang kepala kanonik: telinga ±2,4 cm di belakang tepi masker wajah (z = −2,44) dan ±3,5 cm panjangnya. */
export const EAR_TIP_Z = -6.4;
/** Elips tempurung kepala (pusat, setengah sumbu) — penutup agar gagang tidak melayang di belakang kepala. x dibuat sedikit < lebar gagang (±7,1). */
export const CRANIUM = { center: [0, 0.6, -2.4], radii: [6.85, 9.6, 8.4] };

const FRONT_SLAB_CM = 1.2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function extent(pts) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pts.length; i += 3) for (let a = 0; a < 3; a++) {
    const v = pts[i + a];
    if (v < mn[a]) mn[a] = v;
    if (v > mx[a]) mx[a] = v;
  }
  return { mn, mx };
}

/** Titik di dekat bidang depan (z) dan belakang → mana yang memuat jembatan/rim di tengah. true = model menghadap -Z. */
export function facesBackward(pts) {
  const { mn, mx } = extent(pts);
  const W = mx[0] - mn[0], D = mx[2] - mn[2];
  if (!(W > 0) || !(D > 0)) return false;
  const cx = (mn[0] + mx[0]) / 2, slab = D * 0.18;
  let hiC = 0, loC = 0;
  for (let i = 0; i < pts.length; i += 3) {
    if (Math.abs(pts[i] - cx) > W * 0.3) continue;
    if (pts[i + 2] > mx[2] - slab) hiC++;
    else if (pts[i + 2] < mn[2] + slab) loC++;
  }
  return loC > hiC * 1.2 && loC > 8;
}

/**
 * pts   : Float32Array/array [x,y,z,…] semua titik model (satuan model, sudah menghadap +Z; panggil facesBackward + balik dulu).
 * lens  : opsional { left:[x,y,z,…], right:[…] } titik mesh lensa (kiri = +X).
 * Hasil : { unit, normalized, spec } — spec dalam CM (bentuk sama dengan specFromNodes) + flag `estimated`; null bila bukan kacamata.
 */
export function analyzePoints(pts, lens = null) {
  if (!pts || pts.length < 30) return null;
  const { mn, mx } = extent(pts);
  const size = [0, 1, 2].map((a) => mx[a] - mn[a]);
  if (!size.every((v) => Number.isFinite(v) && v > 0)) return null;
  const W = size[0];
  // Satuan: cm / mm / meter dikenali dari lebar; selain itu dinormalkan supaya lebar ≈ 14,2 cm.
  let unit = W > 40 ? 0.1 : W < 1.5 ? 100 : 1, normalized = false;
  if (W * unit < 8 || W * unit > 22) { unit = 14.2 / W; normalized = true; }
  if (size[1] * unit > 9 || size[1] * unit < 1.2) return null; // bukan kacamata (terlalu tinggi / pipih)
  const cx = (mn[0] + mx[0]) / 2;
  const zF = mx[2];

  // Slab depan: tinggi frame & pusat tinggi (pusat lensa).
  const slab = FRONT_SLAB_CM / unit;
  let ylo = Infinity, yhi = -Infinity;
  for (let i = 0; i < pts.length; i += 3) if (pts[i + 2] > zF - slab) { ylo = Math.min(ylo, pts[i + 1]); yhi = Math.max(yhi, pts[i + 1]); }
  if (!(yhi > ylo)) { ylo = mn[1]; yhi = mx[1]; }
  let yc = (ylo + yhi) / 2, lensH = (yhi - ylo) * 0.88;
  let lensL = null, lensR = null, lensW = W * 0.37, lensZ = zF - 0.3 / unit, fromMesh = false;

  // Pusat lensa dari mesh lensa (kiri = +X). Disahkan: tiap lensa 22–52% lebar frame dan terpisah wajar.
  const box = (p) => (p && p.length >= 9 ? extent(p) : null);
  const bl = box(lens?.left), br = box(lens?.right);
  if (bl && br) {
    const wl = bl.mx[0] - bl.mn[0], wr = br.mx[0] - br.mn[0];
    const cl = [(bl.mn[0] + bl.mx[0]) / 2, (bl.mn[1] + bl.mx[1]) / 2, (bl.mn[2] + bl.mx[2]) / 2];
    const cr = [(br.mn[0] + br.mx[0]) / 2, (br.mn[1] + br.mx[1]) / 2, (br.mn[2] + br.mx[2]) / 2];
    const sep = cl[0] - cr[0];
    if (wl > W * 0.22 && wl < W * 0.52 && wr > W * 0.22 && wr < W * 0.52 && sep > W * 0.3 && sep < W * 0.62 && Math.abs(cl[1] - cr[1]) < W * 0.08) {
      lensL = cl; lensR = cr; lensW = (wl + wr) / 2; lensH = ((bl.mx[1] - bl.mn[1]) + (br.mx[1] - br.mn[1])) / 2;
      yc = (cl[1] + cr[1]) / 2; lensZ = (cl[2] + cr[2]) / 2; fromMesh = true;
    }
  }
  if (!lensL) {
    const half = (W * 0.5) / 2; // jarak antar-lensa ≈ 50% lebar (rata-rata frame optik)
    lensL = [cx + half, yc, lensZ]; lensR = [cx - half, yc, lensZ];
  }

  // Bagian belakang jembatan: titik paling belakang di dekat garis tengah, di ketinggian jembatan (bantalan hidung ikut terhitung).
  const half = Math.abs(lensL[0] - lensR[0]) / 2;
  let bz = Infinity;
  for (let i = 0; i < pts.length; i += 3) {
    if (Math.abs(pts[i] - cx) < Math.max(0.5 / unit, half * 0.35) && pts[i + 1] > yc - lensH * 0.3 && pts[i + 1] < yc + lensH * 0.5 && pts[i + 2] > zF - 3 / unit) bz = Math.min(bz, pts[i + 2]);
  }
  const bridgeZ = Number.isFinite(bz) ? clamp(bz, lensZ - 1.6 / unit, lensZ - 0.1 / unit) : lensZ - 0.7 / unit;

  // Gagang: engsel di belakang bidang depan; sisi gagang = rata-rata y titik jauh di belakang.
  const hingeZ = zF - 1.0 / unit;
  let sy = 0, n = 0;
  for (let i = 0; i < pts.length; i += 3) if (pts[i + 2] < zF - 4 / unit) { sy += pts[i + 1]; n++; }
  const armY = n ? sy / n : yc;
  const hingeX = (W / 2) * 0.97;
  const cm = (p) => p.map((v) => v * unit);
  return {
    unit,
    normalized,
    lensFromMesh: fromMesh,
    spec: {
      unit,
      estimated: true,
      lensL: cm(lensL),
      lensR: cm(lensR),
      bridge: cm([cx, yc - 0.03 * lensH, bridgeZ]),
      templeL: cm([cx + hingeX, armY, hingeZ]),
      templeR: cm([cx - hingeX, armY, hingeZ]),
      frameWidthMm: W * unit * 10,
      lensWidthMm: clamp(lensW * unit * 10, 30, 70),
      lensHeightMm: clamp(lensH * unit * 10, 20, 60),
      bridgeWidthMm: clamp((Math.abs(lensL[0] - lensR[0]) - lensW) * unit * 10, 8, 30),
      templeLengthMm: (hingeZ - mn[2]) * unit * 10,
      lensSepMm: Math.abs(lensL[0] - lensR[0]) * unit * 10
    }
  };
}

/**
 * Faktor panjang gagang (di belakang engsel) supaya ujung jatuh di EAR_TIP_Z.
 *  hingeHeadZ : z engsel di ruang kepala · tipHeadZ : z ujung gagang asli di ruang kepala. Dibatasi 0,7–1,6.
 */
export function templeFactor(hingeHeadZ, tipHeadZ, target = EAR_TIP_Z) {
  const have = hingeHeadZ - tipHeadZ, want = hingeHeadZ - target;
  if (!(have > 0.5) || !(want > 0.5)) return 1;
  return clamp(want / have, 0.7, 1.6);
}
