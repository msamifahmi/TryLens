// Menggambar mesh wajah + titik jangkar (anchor) di atas video yang dicerminkan dan di-crop `object-cover`.
// Hanya gambar: tidak mengubah hasil pemindaian.
import { quatToMat } from "../../ar/rigid.js";
import { FOV_DEG } from "../../ar/faceMetrics.js";
import { DEFAULT_EXTRA_R } from "../../ar/hairline.js";

// Telinga tidak punya titik di Face Landmarker. Perkiraannya DIJANGKARKAN ke landmark tepi wajah di depan telinga (234 kanan-subjek,
// 454 kiri-subjek; mesh kanonik: x = ±7,66 cm, z = −2,44 cm) lalu digeser ke belakang-luar mengikuti arah kepala:
// Δ (cm, ruang kepala) = [±0,7 keluar, +0,4 naik, −2,3 ke belakang]. Posisi akhir = posisi landmark TERDETEKSI + selisih proyeksi
// pose antara titik telinga dan titik jangkar → bias pose sebagian besar saling menghapus, telinga ikut menempel ke wajah.
export const EAR_ANCHOR = { idx: [234, 454], delta: [0.7, 0.4, -2.3] };

/**
 * lm  : landmark (ternormalisasi, bingkai video) · out : keluaran PoseEngine (position/quaternion/scale)
 * Hasil: [{ x, y, ax, ay, visible, side }] — (x,y) telinga, (ax,ay) titik jangkar di tepi wajah, semuanya ternormalisasi.
 */
export function earPoints(lm, out, W, H) {
  if (!lm || !out?.tracked || !out.position || !out.quaternion) return [];
  const R = quatToMat(out.quaternion), k = out.scale || 1, T = out.position;
  const f = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
  const world = (p) => [0, 1, 2].map((r) => T[r] + k * (R[r][0] * p[0] + R[r][1] * p[1] + R[r][2] * p[2]));
  const proj = (w) => { const d = -w[2]; return d < 5 ? null : [W / 2 + (f * w[0]) / d, H / 2 - (f * w[1]) / d]; };
  const pts = [];
  // Koordinat kanonik titik jangkar tepi wajah (konstan; dari canonicalFace.json).
  const ANCH = [[-7.66, 0.67, -2.44], [7.66, 0.67, -2.44]];
  EAR_ANCHOR.idx.forEach((li, n) => {
    const s = n === 0 ? -1 : 1;
    const a = lm[li];
    if (!a) return;
    const pa = ANCH[n];
    const pe = [pa[0] + s * EAR_ANCHOR.delta[0], pa[1] + EAR_ANCHOR.delta[1], pa[2] + EAR_ANCHOR.delta[2]];
    const wa = world(pa), we = world(pe);
    const qa = proj(wa), qe = proj(we);
    if (!qa || !qe) return;
    const ax = a.x * W, ay = a.y * H;
    const ex = ax + (qe[0] - qa[0]), ey = ay + (qe[1] - qa[1]);
    const d = -we[2];
    const len = Math.hypot(we[0], we[1], we[2]) || 1;
    const facing = (s * (R[0][0] * -we[0] + R[1][0] * -we[1] + R[2][0] * -we[2])) / len; // >0: telinga menghadap kamera
    pts.push({ x: ex / W, y: ey / H, ax: a.x, ay: a.y, visible: facing > -0.12 && d > 5, side: s });
  });
  return pts;
}

/**
 * Titik "Dahi": garis rambut hasil deteksi warna bila yakin, bila tidak perkiraan antropometri (landmark 10 digeser ke atas
 * ±9% panjang wajah). Mengembalikan koordinat ternormalisasi + status untuk label.
 */
export function foreheadAnchor(lm, W, H, hair) {
  const a = lm[10], b = lm[152];
  if (!a || !b) return null;
  const ax = a.x * W, ay = a.y * H, bx = b.x * W, by = b.y * H;
  const L = Math.hypot(ax - bx, ay - by) || 1;
  const up = [(ax - bx) / L, (ay - by) / L];
  if (hair?.covered) return { x: a.x, y: a.y, mx: a.x, my: a.y, label: "Dahi (tertutup rambut)", state: "covered", extraR: 0 };
  const sure = hair?.ok && hair.conf >= 0.5;
  const r = sure ? hair.extraR : DEFAULT_EXTRA_R;
  return {
    x: (ax + up[0] * L * r) / W, y: (ay + up[1] * L * r) / H, mx: a.x, my: a.y,
    label: sure ? "Dahi (garis rambut)" : "Dahi (perkiraan)", state: sure ? "measured" : "estimated", extraR: r
  };
}

// Titik jangkar bernama (indeks Face Landmarker). Label hanya untuk yang penting supaya layar tidak penuh.
//  • "Pipi" = tulang pipi (50/280, di bawah mata), BUKAN 234/454: itu titik tepi wajah di depan telinga (dipakai untuk lebar wajah & jangkar telinga).
//  • "Dahi" digambar terpisah (foreheadAnchor) karena posisinya hasil deteksi garis rambut.
export const ANCHORS = [
  { i: 152, label: "Dagu" }, { i: 50, label: "Pipi" }, { i: 280, label: "Pipi" },
  { i: 1, label: "Hidung" }, { i: 33 }, { i: 263 }, { i: 133 }, { i: 362 }, { i: 61 }, { i: 291 },
  { i: 468, label: "Pupil", iris: true }, { i: 473, label: "Pupil", iris: true }, { i: 70 }, { i: 300 }, { i: 172, label: "Rahang" }, { i: 397, label: "Rahang" },
  { i: 234, edge: true }, { i: 454, edge: true }
];

export function drawFace(canvas, video, lm, conn, t = 0, ears = [], fore = null) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  if (!lm || !conn) return;
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  // object-cover: skala terbesar, tengah; lalu cermin horizontal (video juga dicerminkan)
  const sc = Math.max(cw / vw, ch / vh);
  const ox = (cw - vw * sc) / 2, oy = (ch - vh * sc) / 2;
  const X = (p) => cw - (ox + p.x * vw * sc);
  const Y = (p) => oy + p.y * vh * sc;

  const line = (pairs, color, width, alpha) => {
    ctx.beginPath();
    for (const [a, b] of pairs) {
      const pa = lm[a], pb = lm[b];
      if (!pa || !pb) continue;
      ctx.moveTo(X(pa), Y(pa));
      ctx.lineTo(X(pb), Y(pb));
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  ctx.lineCap = "round";
  line(conn.tess, "#7DD3FC", 0.6, 0.32);
  line(conn.oval, "#F7DD7D", 1.8, 0.95);
  line(conn.eyes, "#FFFFFF", 1.3, 0.95);
  line(conn.brows, "#FFFFFF", 1.3, 0.8);
  line(conn.lips, "#FDA4AF", 1.3, 0.9);

  const label = (text, x, y, off = 9, dim = false) => {
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 10;
    const right = x > cw / 2;
    const lx = right ? x + off : x - off - w;
    ctx.globalAlpha = dim ? 0.55 : 1;
    ctx.fillStyle = "rgba(15,23,42,.72)";
    ctx.fillRect(lx, y - 8, w, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, lx + 5, y);
    ctx.globalAlpha = 1;
  };

  // Telinga (perkiraan): garis penghubung ke jangkar di tepi wajah + cincin putus-putus. Sisi yang membelakangi kamera dipudarkan.
  for (const e of ears) {
    const x = X(e), y = Y(e);
    const axp = X({ x: e.ax }), ayp = Y({ y: e.ay });
    ctx.globalAlpha = e.visible ? 0.95 : 0.3;
    ctx.strokeStyle = "#F7DD7D";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(axp, ayp);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#F7DD7D";
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (e.visible) label("Telinga (perkiraan)", x, y, 13);
  }

  // Dahi: garis putus dari ujung mesh (landmark 10) ke garis rambut + titik jangkar di garis rambut.
  if (fore) {
    const fx = X(fore), fy = Y(fore), mx = X({ x: fore.mx }), my = Y({ y: fore.my });
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = fore.state === "measured" ? "#F7DD7D" : "#FFFFFF";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(fx, fy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = fore.state === "measured" ? "#F7DD7D" : "#fff";
    ctx.fill();
    ctx.globalAlpha = 1;
    label(fore.label, fx, fy, 10);
  }

  // Titik jangkar: berdenyut halus
  const pulse = 0.5 + 0.5 * Math.sin(t / 260);
  for (const a of ANCHORS) {
    const p = lm[a.i];
    if (!p) continue;
    const x = X(p), y = Y(p);
    ctx.globalAlpha = a.edge ? 0.7 : 1;
    ctx.beginPath();
    ctx.arc(x, y, (a.edge ? 3 : 5) + pulse * (a.edge ? 1 : 3), 0, Math.PI * 2);
    ctx.fillStyle = a.iris ? "rgba(247,221,125,.3)" : "rgba(125,211,252,.25)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, a.edge ? 2 : 2.6, 0, Math.PI * 2);
    ctx.fillStyle = a.iris ? "#F7DD7D" : "#fff";
    ctx.fill();
    ctx.globalAlpha = 1;
    if (a.label) label(a.label, x, y);
  }
}
