// Uji pemindai wajah: gerbang kualitas bertingkat, sampel tak bergantung kalibrasi tryon, ensemble cermin, garis rambut,
// anchor telinga/dahi, ringkasan + skor keandalan. `npm run test:scan`
// Catatan jujur: ini menguji MATEMATIKA & logika pada wajah sintetis, bukan akurasi jaringan MediaPipe pada wajah nyata.
import assert from "node:assert/strict";
import { PoseEngine } from "../src/ar/PoseEngine.js";
import { assessQuality, SCAN_LEVELS } from "../src/ar/quality.js";
import { buildMirrorMap, fuseFlip } from "../src/ar/ensemble.js";
import { detectHairline } from "../src/ar/hairline.js";
import { earPoints, foreheadAnchor, ANCHORS } from "../src/components/consult/faceOverlay.js";
import { summarizeSamples } from "../src/data/faceShape.js";
import { canon, synth, gauss } from "./lib/synthFace.mjs";

globalThis.window ??= { devicePixelRatio: 1 }; // faceOverlay.js hanya memakai window saat menggambar
let n = 0;
const t = (name, fn) => { try { fn(); console.log("✓ " + name); n++; } catch (e) { console.error("✗ " + name + "\n  " + e.message); process.exitCode = 1; } };

/* ---------------------------------------------------------------- gerbang kualitas */
t("Kualitas scan: yaw 12° ditolak di tingkat 0, lolos di tingkat 1; pesan memuat derajat", () => {
  const base = { angles: { yaw: 12, pitch: 2, roll: 1 }, span: 0.3, irisPx: 14, center: [0.5, 0.5], luma: 120, speed: 0.3, mode: "scan" };
  const a = assessQuality({ ...base, level: 0 }), b = assessQuality({ ...base, level: 1 });
  assert.equal(a.ok, false);
  assert.match(a.issues[0], /12°/);
  assert.equal(a.checks.straight, false);
  assert.equal(b.ok, true);
});
t("Kualitas scan: webcam laptop (pitch 16°, roll 10°, bergerak 2 rad/s) lolos di tingkat terlonggar, tidak di tingkat 0", () => {
  const base = { angles: { yaw: 3, pitch: 16, roll: 10 }, span: 0.3, irisPx: 12, center: [0.5, 0.52], luma: 100, speed: 2, mode: "scan" };
  assert.equal(assessQuality({ ...base, level: 0 }).ok, false);
  assert.equal(assessQuality({ ...base, level: SCAN_LEVELS.length - 1 }).ok, true);
});
t("Kualitas: cahaya/jarak/tengah dilaporkan terpisah di checks", () => {
  const q = assessQuality({ angles: { yaw: 0, pitch: 0, roll: 0 }, span: 0.3, irisPx: 5, center: [0.9, 0.5], luma: 30, mode: "scan", level: 1 });
  assert.deepEqual([q.checks.light, q.checks.distance, q.checks.centered], [false, false, false]);
});

/* ---------------------------------------------------------------- sampel scan tanpa bergantung kalibrasi tryon */
function runScan({ level = 1, gaze = 0, yaw = 0, pitch = 0, noise = 0.25, frames = 60, extraCats = [] }) {
  const eng = new PoseEngine(canon, { mode: "scan" });
  eng.scanLevel = level;
  const frs = [];
  let last;
  for (let i = 0; i < frames; i++) {
    const s = synth({ yaw, pitch, noise, gaze: [0, 0], dist: 45 });
    s.res.faceBlendshapes = [{ categories: [{ categoryName: "eyeLookDownLeft", score: gaze }, { categoryName: "eyeLookDownRight", score: gaze }, ...extraCats] }];
    last = eng.update(s.res, s.W, s.H, i * 33, 120);
    if (last.frame && last.quality.ok) frs.push(last.frame);
  }
  return { frs, last };
}
t("Scan: menatap layar di bawah kamera (eyeLookDown 0,55) tetap menghasilkan sampel — dulu ditolak (batas 0,4)", () => {
  const { frs } = runScan({ gaze: 0.55 });
  assert.ok(frs.length >= 30, `hanya ${frs.length} sampel`);
});
t("Scan: ukuran wajah dari sampel longgar tetap benar (±6%) saat kepala menoleh 9° & mengangguk 12°", () => {
  const { frs } = runScan({ yaw: 9, pitch: 12, level: 1 });
  assert.ok(frs.length >= 25, `hanya ${frs.length} sampel`);
  const mm = frs.map((f) => f.mm).sort((a, b) => a - b)[frs.length >> 1];
  const truth = Math.hypot(...[0, 1, 2].map((a) => canon[3 * 454 + a] - canon[3 * 234 + a])) * 10; // 234–454 di wajah kanonik (s=1)
  assert.ok(Math.abs(mm / truth - 1) < 0.06, `mm ${mm.toFixed(1)} vs ${truth.toFixed(1)}`);
});
t("Scan: mata dipejamkan sebelah / lirikan ekstrem → tidak dipakai (bukan sampel)", () => {
  const { frs } = runScan({ gaze: 0.9, frames: 40 });
  assert.equal(frs.length, 0);
  const b = runScan({ frames: 40, extraCats: [{ categoryName: "eyeBlinkLeft", score: 0.8 }] });
  assert.equal(b.frs.length, 0);
});
t("Scan: frame membawa keandalan (rel 0–1) dan diagnosis q", () => {
  const { frs } = runScan({});
  const f = frs[frs.length - 1];
  assert.ok(f.rel > 0.3 && f.rel <= 1 && f.q && Number.isFinite(f.q.spread));
});

/* ---------------------------------------------------------------- kalibrasi VTO lebih tahan */
t("Kalibrasi tryon: tetap selesai bila pelipis tertutup (satu pasangan skala menyimpang 12%) — dulu macet", () => {
  const eng = new PoseEngine(canon, { mode: "tryon", tracker: "magnet" });
  let out;
  for (let i = 0; i < 90; i++) {
    const s = synth({ yaw: 4, noise: 0.2 });
    // pelipis (127/356) tertutup rambut: landmark bergeser ke dalam ±1,2 cm → pasangan 127–356 menyimpang
    for (const [k, sg] of [[127, 1], [356, -1]]) { const lm = s.res.faceLandmarks[0][k]; lm.x += (sg * 0.0255 * s.H) / s.W / 1.0 * 0.75; }
    out = eng.update(s.res, s.W, s.H, i * 33, 120);
  }
  assert.ok(out.calibrated, "tidak terkalibrasi");
});
t("Kalibrasi tryon: wajib ≥20 frame bersih (dulu 12) sebelum 'calibrated'", () => {
  const eng = new PoseEngine(canon, { mode: "tryon", tracker: "magnet" });
  let firstCal = -1;
  for (let i = 0; i < 60; i++) { const s = synth({ noise: 0.15 }); const o = eng.update(s.res, s.W, s.H, i * 33, 120); if (o.calibrated && firstCal < 0) firstCal = i; }
  assert.ok(firstCal >= 19, `terkalibrasi di frame ${firstCal}`);
});

/* ---------------------------------------------------------------- ensemble cermin */
const M = buildMirrorMap(canon);
t("Peta cermin: 468 titik berpasangan timbal-balik (M[M[i]] = i); pusat iris 468↔473", () => {
  for (let i = 0; i < 468; i++) assert.equal(M[M[i]], i, `titik ${i}`);
  assert.equal(M[468], 473);
  assert.equal(M[473], 468);
  assert.equal(M[234], 454);
});
function flipOf(lm) { // landmark bingkai tercermin: titik i hasil jaringan menjadi titik M[i] di x → 1−x
  const out = new Array(478);
  for (let i = 0; i < 478; i++) out[i] = { x: 0.5, y: 0.5, z: 0 };
  for (let i = 0; i < 468; i++) out[M[i]] = { x: 1 - lm[i].x, y: lm[i].y, z: lm[i].z };
  out[473] = { x: 1 - lm[468].x, y: lm[468].y, z: lm[468].z };
  out[468] = { x: 1 - lm[473].x, y: lm[473].y, z: lm[473].z };
  for (let k = 0; k < 4; k++) {
    out[474 + k] = { x: 1 - lm[469 + k].x, y: lm[469 + k].y, z: lm[469 + k].z };
    out[469 + k] = { x: 1 - lm[474 + k].x, y: lm[474 + k].y, z: lm[474 + k].z };
  }
  return out;
}
t("Ensemble cermin: galat acak titik turun ≈ 1/√2 (RMS gabungan < 0,85 × tunggal) dan ketidakpastian ikut terukur", () => {
  const truth = synth({ yaw: 6, noise: 0 });
  const rms = (a, W, H) => Math.sqrt(a.reduce((s, p, i) => s + (((p.x - truth.res.faceLandmarks[0][i].x) * W) ** 2 + ((p.y - truth.res.faceLandmarks[0][i].y) * H) ** 2), 0) / a.length);
  let single = 0, fused = 0, unc = 0, k = 0;
  for (let r = 0; r < 20; r++) {
    const A = synth({ yaw: 6, noise: 0.8 }), B = synth({ yaw: 6, noise: 0.8 });
    const fz = fuseFlip(A.res.faceLandmarks[0], flipOf(B.res.faceLandmarks[0]), A.W, A.H, M);
    assert.ok(fz.ok);
    single += rms(A.res.faceLandmarks[0].slice(0, 468), A.W, A.H);
    fused += rms(fz.lm.slice(0, 468), A.W, A.H);
    unc += fz.unc.meshPx; k++;
  }
  assert.ok(fused / single < 0.85, `rasio ${(fused / single).toFixed(2)}`);
  assert.ok(unc / k > 0.5 && unc / k < 2, `selisih rata-rata ${(unc / k).toFixed(2)} px`); // ≈ √2·σ·√(π/2)… sesuai derau 0,8 px
});
t("Ensemble cermin: deteksi kedua yang tak cocok (wajah lain / geser 6% lebar) ditolak → ok=false", () => {
  const A = synth({ noise: 0.3 }), B = synth({ noise: 0.3, tx: 6 });
  const fz = fuseFlip(A.res.faceLandmarks[0], flipOf(B.res.faceLandmarks[0]), A.W, A.H, M);
  assert.equal(fz.ok, false);
});
t("Ensemble cermin: pencilan lokal besar di satu titik tidak ikut digabung (dipercayakan ke bingkai asli)", () => {
  const A = synth({ noise: 0.2 }), B = synth({ noise: 0.2 });
  const fb = flipOf(B.res.faceLandmarks[0]);
  const j = M[10];
  fb[j] = { ...fb[j], y: fb[j].y + 0.08 };
  const fz = fuseFlip(A.res.faceLandmarks[0], fb, A.W, A.H, M);
  assert.ok(fz.ok);
  assert.ok(Math.abs(fz.lm[10].y - A.res.faceLandmarks[0][10].y) < 1e-9);
});
t("Ensemble cermin: diameter iris = rata-rata iris asli dan pasangan cerminnya", () => {
  const A = synth({ noise: 0 }), B = synth({ noise: 0, irisMm: 12.5 });
  const fz = fuseFlip(A.res.faceLandmarks[0], flipOf(B.res.faceLandmarks[0]), A.W, A.H, M);
  const d = (lm) => Math.hypot((lm[469].x - lm[471].x) * A.W, (lm[469].y - lm[471].y) * A.H);
  const d0 = d(A.res.faceLandmarks[0]), d1 = d(B.res.faceLandmarks[0]);
  assert.ok(Math.abs(d(fz.lm) - (d0 + d1) / 2) < 0.02, `${d(fz.lm)} vs ${(d0 + d1) / 2}`);
});

/* ---------------------------------------------------------------- garis rambut */
function paintFace({ lmP, W, H, hairlineR, fringe = false, noise = 6, bald = false }) {
  const data = new Uint8ClampedArray(W * H * 4);
  const P = (i) => [lmP[i].x * W, lmP[i].y * H];
  const top = P(10), chin = P(152), L = Math.hypot(top[0] - chin[0], top[1] - chin[1]);
  const x0 = P(234)[0] - 6, x1 = P(454)[0] + 6;
  const hairY = top[1] - hairlineR * L;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    let c = [205, 205, 210]; // dinding terang
    if (x >= x0 && x <= x1 && y <= chin[1] + 4) {
      if (y >= hairY) c = [226, 172, 142]; // kulit
      else if (!bald) c = [45, 32, 28]; // rambut
      else c = [226, 172, 142];
      if (fringe && y >= top[1] - 0.2 * L && y < top[1] + 0.08 * L) c = [45, 32, 28]; // poni menutup dahi sampai di bawah landmark 10
    }
    const g = gauss() * noise;
    data[o] = c[0] + g; data[o + 1] = c[1] + g; data[o + 2] = c[2] + g; data[o + 3] = 255;
  }
  return { data, w: W, h: H, hairY, L };
}
t("Garis rambut: terdeteksi dalam ±0,03 panjang wajah (rambut gelap, derau sensor)", () => {
  const s = synth({ noise: 0 });
  for (const r of [0.06, 0.12, 0.2]) {
    const img = paintFace({ lmP: s.res.faceLandmarks[0], W: s.W, H: s.H, hairlineR: r });
    const d = detectHairline(img, s.res.faceLandmarks[0]);
    assert.ok(d.ok && !d.covered && d.conf >= 0.5, `r=${r}: ${JSON.stringify(d)}`);
    assert.ok(Math.abs(d.extraR - r) < 0.03, `r=${r} → ${d.extraR.toFixed(3)}`);
  }
});
t("Garis rambut: kepala miring 15° → arah pencarian ikut miring (tetap ±0,04)", () => {
  const s = synth({ noise: 0, roll: 15 });
  const lm = s.res.faceLandmarks[0];
  // lukis di ruang yang diputar: lukis dengan sumbu wajah, sehingga uji ini hanya memeriksa arah vektor — gunakan sampler rotasi
  const W = s.W, H = s.H, P = (i) => [lm[i].x * W, lm[i].y * H];
  const top = P(10), chin = P(152), L = Math.hypot(top[0] - chin[0], top[1] - chin[1]);
  const up = [(top[0] - chin[0]) / L, (top[1] - chin[1]) / L], hl = 0.1;
  const data = new Uint8ClampedArray(W * H * 4);
  const fw = Math.hypot(P(454)[0] - P(234)[0], P(454)[1] - P(234)[1]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - top[0], dy = y - top[1];
    const along = dx * up[0] + dy * up[1], across = dx * -up[1] + dy * up[0];
    let c = [205, 205, 210];
    if (Math.abs(across) < fw * 0.55 && along < 0.9 * L && along > -1.1 * L) c = along > hl * L ? [45, 32, 28] : [226, 172, 142];
    const o = (y * W + x) * 4, g = gauss() * 5;
    data[o] = c[0] + g; data[o + 1] = c[1] + g; data[o + 2] = c[2] + g; data[o + 3] = 255;
  }
  const d = detectHairline({ data, w: W, h: H }, lm);
  assert.ok(d.ok && Math.abs(d.extraR - hl) < 0.04, JSON.stringify(d));
});
t("Garis rambut: poni menutup dahi → covered (titik Dahi tidak dinaikkan)", () => {
  const s = synth({ noise: 0 });
  const img = paintFace({ lmP: s.res.faceLandmarks[0], W: s.W, H: s.H, hairlineR: 0.12, fringe: true });
  const d = detectHairline(img, s.res.faceLandmarks[0]);
  assert.ok(d.ok && d.covered, JSON.stringify(d));
  assert.equal(foreheadAnchor(s.res.faceLandmarks[0], s.W, s.H, d).state, "covered");
});
t("Garis rambut: tanpa batas warna (botak / latar sama) → ok=false; anchor memakai perkiraan berlabel 'perkiraan'", () => {
  const s = synth({ noise: 0 });
  const img = paintFace({ lmP: s.res.faceLandmarks[0], W: s.W, H: s.H, hairlineR: 0.12, bald: true });
  const d = detectHairline(img, s.res.faceLandmarks[0]);
  assert.equal(d.ok, false);
  const a = foreheadAnchor(s.res.faceLandmarks[0], s.W, s.H, d);
  assert.equal(a.state, "estimated");
  assert.match(a.label, /perkiraan/);
  assert.ok(a.y < s.res.faceLandmarks[0][10].y, "perkiraan harus di ATAS landmark 10");
});
t("Anchor dahi terukur dipakai bila yakin: titik Dahi = garis rambut deteksi", () => {
  const s = synth({ noise: 0 });
  const img = paintFace({ lmP: s.res.faceLandmarks[0], W: s.W, H: s.H, hairlineR: 0.15 });
  const lm = s.res.faceLandmarks[0], d = detectHairline(img, lm), a = foreheadAnchor(lm, s.W, s.H, d);
  assert.equal(a.state, "measured");
  assert.ok(Math.abs((lm[10].y - a.y) * s.H - 0.15 * Math.abs(lm[152].y - lm[10].y) * s.H) < 0.04 * Math.abs(lm[152].y - lm[10].y) * s.H);
});

/* ---------------------------------------------------------------- anchor pipi & telinga */
t("Anchor 'Pipi' bukan titik tepi wajah 234/454 (yang ada di depan telinga) melainkan tulang pipi 50/280", () => {
  const pipi = ANCHORS.filter((a) => a.label === "Pipi").map((a) => a.i).sort((a, b) => a - b);
  assert.deepEqual(pipi, [50, 280]);
  assert.ok(ANCHORS.filter((a) => a.i === 234 || a.i === 454).every((a) => !a.label));
});
function poseOut(s, k = 1) {
  const e = new PoseEngine(canon, { mode: "scan" });
  let o; for (let i = 0; i < 6; i++) o = e.update(s.res, s.W, s.H, i * 33, 120);
  return o;
}
t("Telinga: terjangkar ke landmark tepi wajah — seluruh wajah digeser 30 px → telinga ikut 30 px; berada di LUAR tepi wajah", () => {
  const s = synth({ noise: 0 });
  const o = poseOut(s);
  const lm = s.res.faceLandmarks[0];
  const e0 = earPoints(lm, o, s.W, s.H);
  assert.equal(e0.length, 2);
  const dx = 30 / s.W;
  const lm2 = lm.map((p) => ({ ...p, x: p.x + dx }));
  const e1 = earPoints(lm2, o, s.W, s.H);
  for (let i = 0; i < 2; i++) assert.ok(Math.abs((e1[i].x - e0[i].x) * s.W - 30) < 1e-6);
  const [r, l] = e0; // kanan-subjek (x kecil di gambar tak tercermin)
  const nose = lm[1].x;
  assert.ok(Math.abs(r.x - nose) > Math.abs(lm[234].x - nose) && Math.abs(l.x - nose) > Math.abs(lm[454].x - nose), "telinga harus di luar tepi wajah");
  assert.ok(r.ax === lm[234].x && l.ax === lm[454].x, "titik jangkar = landmark 234/454");
});
t("Telinga: sisi yang membelakangi kamera (yaw 55°) ditandai tidak terlihat, sisi dekat terlihat", () => {
  const s = synth({ noise: 0, yaw: 55 });
  const o = poseOut(s);
  const e = earPoints(s.res.faceLandmarks[0], o, s.W, s.H);
  assert.equal(e.filter((p) => p.visible).length, 1);
});

/* ---------------------------------------------------------------- ringkasan & skor keandalan */
const mkSamples = (k, extra = {}, sd = 0.004) => Array.from({ length: k }, () => ({ lenR: 1.2 + gauss() * sd, jawR: 0.82 + gauss() * sd, foreR: 0.88 + gauss() * sd, mm: 148 + gauss() * 2, pd: 63 + gauss() * 0.6, rel: 0.85, ...extra }));
t("Ringkasan: skor keandalan naik dengan deteksi ganda & turun saat toleransi dilonggarkan; galat ±mm melebar bila dua deteksi berselisih", () => {
  const a = summarizeSamples(mkSamples(45), { level: 0 });
  const b = summarizeSamples(mkSamples(45, { ttaMm: 0.5, meshRel: 0.002 }), { level: 0 });
  const c = summarizeSamples(mkSamples(45, { ttaMm: 0.5, meshRel: 0.002 }), { level: 2 });
  const d = summarizeSamples(mkSamples(45, { ttaMm: 4, meshRel: 0.002 }), { level: 0 });
  assert.ok(b.accuracy.score > a.accuracy.score, `${b.accuracy.score} vs ${a.accuracy.score}`);
  assert.ok(c.accuracy.score < b.accuracy.score && c.confidence !== "high");
  assert.ok(d.mmErr > b.mmErr, `${d.mmErr} vs ${b.mmErr}`);
  assert.equal(b.accuracy.ensemble, true);
  assert.equal(a.accuracy.ensemble, false);
});
t("Ringkasan: sampel berkeandalan rendah berbobot kecil — pencilan 'lemah' tidak menggeser mm", () => {
  const good = mkSamples(36), bad = Array.from({ length: 9 }, () => ({ lenR: 1.2, jawR: 0.82, foreR: 0.88, mm: 160, pd: 63, rel: 0.1 }));
  const r = summarizeSamples([...good, ...bad]);
  assert.ok(Math.abs(r.mm - 148) < 2.5, `mm ${r.mm}`);
});
t("Ringkasan: garis rambut terdeteksi menambah lenFullR; tanpa deteksi tidak ada", () => {
  const withH = summarizeSamples(mkSamples(40), { hair: { extraR: 0.1, conf: 0.8 } });
  const noH = summarizeSamples(mkSamples(40), { hair: { extraR: 0.1, conf: 0.3 } });
  assert.ok(withH.ratios.lenFullR > withH.ratios.lenR && noH.ratios.lenFullR === undefined);
  assert.equal(withH.accuracy.hairline, true);
});

console.log(`\nSelesai: ${n} uji lolos`);
