// Menggambar mesh wajah + titik jangkar (anchor) di atas video yang dicerminkan dan di-crop `object-cover`.
// Hanya gambar: tidak mengubah hasil pemindaian.

// Titik jangkar bernama (indeks Face Landmarker). Label hanya untuk yang penting supaya layar tidak penuh.
export const ANCHORS = [
  { i: 10, label: "Dahi" }, { i: 152, label: "Dagu" }, { i: 234, label: "Pipi" }, { i: 454, label: "Pipi" },
  { i: 1, label: "Hidung" }, { i: 33 }, { i: 263 }, { i: 133 }, { i: 362 }, { i: 61 }, { i: 291 },
  { i: 468, label: "Pupil", iris: true }, { i: 473, label: "Pupil", iris: true }, { i: 70 }, { i: 300 }, { i: 172 }, { i: 397 }
];

export function drawFace(canvas, video, lm, conn, t = 0) {
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
