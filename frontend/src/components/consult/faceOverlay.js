// Menggambar mesh wajah + titik jangkar (anchor) di atas video yang dicerminkan dan di-crop `object-cover`.
// Hanya gambar: tidak mengubah hasil pemindaian.
import { quatToMat } from "../../ar/rigid.js";
import { EAR_TIP_Z } from "../../ar/modelFit.js";
import { FOV_DEG } from "../../ar/faceMetrics.js";

/**
 * Perkiraan posisi telinga. Face Landmarker TIDAK mendeteksi telinga (hanya 478 titik wajah), jadi titik ini
 * diproyeksikan dari geometri kepala kanonik memakai pose kepala hasil pelacakan — perkiraan, bukan deteksi.
 */
export function earPoints(out, W, H, canon) {
  if (!out?.tracked || !out.position || !out.quaternion) return [];
  const R = quatToMat(out.quaternion), k = out.scale || 1, T = out.position;
  const eyeY = (canon[3 * 33 + 1] + canon[3 * 263 + 1]) / 2;
  const f = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
  const pts = [];
  for (const s of [-1, 1]) {
    const p = [s * 7.2, eyeY - 1.0, EAR_TIP_Z + 1.6];
    const w = [0, 1, 2].map((r) => T[r] + k * (R[r][0] * p[0] + R[r][1] * p[1] + R[r][2] * p[2]));
    const d = -w[2];
    if (d < 5) continue;
    const len = Math.hypot(w[0], w[1], w[2]) || 1;
    const facing = (s * (R[0][0] * -w[0] + R[1][0] * -w[1] + R[2][0] * -w[2])) / len; // >0: telinga menghadap kamera
    pts.push({ x: (W / 2 + (f * w[0]) / d) / W, y: (H / 2 - (f * w[1]) / d) / H, visible: facing > -0.12 });
  }
  return pts;
}

// Titik jangkar bernama (indeks Face Landmarker). Label hanya untuk yang penting supaya layar tidak penuh.
export const ANCHORS = [
  { i: 10, label: "Dahi" }, { i: 152, label: "Dagu" }, { i: 234, label: "Pipi" }, { i: 454, label: "Pipi" },
  { i: 1, label: "Hidung" }, { i: 33 }, { i: 263 }, { i: 133 }, { i: 362 }, { i: 61 }, { i: 291 },
  { i: 468, label: "Pupil", iris: true }, { i: 473, label: "Pupil", iris: true }, { i: 70 }, { i: 300 }, { i: 172 }, { i: 397 }
];

export function drawFace(canvas, video, lm, conn, t = 0, ears = []) {
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
  line(conn.oval, "#FACC15", 1.8, 0.95);
  line(conn.eyes, "#FFFFFF", 1.3, 0.95);
  line(conn.brows, "#FFFFFF", 1.3, 0.8);
  line(conn.lips, "#FDA4AF", 1.3, 0.9);

  // Telinga (perkiraan): cincin putus-putus oranye; yang membelakangi kamera dipudarkan
  for (const e of ears) {
    const x = X(e), y = Y(e);
    ctx.globalAlpha = e.visible ? 1 : 0.35;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "#FB923C";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#FB923C";
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    if (e.visible) {
      ctx.font = "600 11px system-ui, sans-serif";
      const label = "Telinga (perkiraan)";
      const w = ctx.measureText(label).width + 10;
      const right = x > cw / 2;
      const lx = right ? x + 13 : x - 13 - w;
      ctx.fillStyle = "rgba(15,23,42,.65)";
      ctx.fillRect(lx, y - 8, w, 16);
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "middle";
      ctx.fillText(label, lx + 5, y);
    }
  }
  ctx.globalAlpha = 1;

  // Titik jangkar: berdenyut halus
  ctx.globalAlpha = 1;
  const pulse = 0.5 + 0.5 * Math.sin(t / 260);
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (const a of ANCHORS) {
    const p = lm[a.i];
    if (!p) continue;
    const x = X(p), y = Y(p);
    ctx.beginPath();
    ctx.arc(x, y, 5 + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = a.iris ? "rgba(250,204,21,.25)" : "rgba(125,211,252,.25)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = a.iris ? "#FACC15" : "#fff";
    ctx.fill();
    if (a.label) {
      const right = x > cw / 2;
      ctx.fillStyle = "rgba(15,23,42,.65)";
      const w = ctx.measureText(a.label).width + 10;
      const lx = right ? x + 9 : x - 9 - w;
      ctx.fillRect(lx, y - 8, w, 16);
      ctx.fillStyle = "#fff";
      ctx.fillText(a.label, lx + 5, y);
    }
  }
}
