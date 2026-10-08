// Pemuat & pengukur urutan landmark dari jaringan MediaPipe ASLI (dibuat ml/realnet/gen_sequences.py).
// Dipakai test-realnet.mjs dan bench-realnet.mjs.
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { canon } from "./synthFace.mjs";
import { FOV_DEG } from "../../src/ar/faceMetrics.js";
import { solveRigid } from "../../src/ar/rigid.js";
import { specFromNodes } from "../../src/ar/rigSpec.js";

export { canon };
export const faces = JSON.parse(fs.readFileSync(new URL("../../src/data/canonicalFace.json", import.meta.url))).f;
const half = (h) => {
  const s = (h & 0x8000) >> 15, e = (h & 0x7c00) >> 10, f = h & 0x03ff;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : (s ? -Infinity : Infinity);
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
};

/** Muat satu skenario. Mendukung .f32 (float32) dan .f16 (float16, lebih kecil untuk disimpan di repo). */
export function loadSeq(dir, name) {
  const meta = JSON.parse(fs.readFileSync(path.join(dir, name + ".json"), "utf8"));
  const read = (base) => {
    const f32 = path.join(dir, base + ".f32"), f16 = path.join(dir, base + ".f16");
    if (fs.existsSync(f32)) { const b = fs.readFileSync(f32); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); }
    const b = fs.readFileSync(f16);
    const u = new Uint16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    const out = new Float32Array(u.length);
    for (let i = 0; i < u.length; i++) out[i] = half(u[i]);
    return out;
  };
  return { ...meta, lm: read(name), base: read(name + ".base"), W: meta.W, H: meta.H };
}

/** Landmark frame i sebagai larik {x,y,z} (ternormalisasi, seperti keluaran Face Landmarker). */
export function frameLm(seq, i) {
  const out = new Array(478);
  const o = i * 478 * 3;
  for (let k = 0; k < 478; k++) out[k] = { x: seq.lm[o + 3 * k], y: seq.lm[o + 3 * k + 1], z: seq.lm[o + 3 * k + 2] };
  return out;
}

// Pengganti matriks pose MediaPipe (Face Geometry): Procrustes berbobot ke ±24 landmark dasar pada mesh kanonik.
const MP_BASIS = [4, 6, 10, 33, 54, 67, 117, 119, 121, 127, 129, 132, 142, 148, 151, 168, 175, 197, 199, 200, 234, 263, 284, 297, 324, 327, 332, 347, 356, 358];
export function standInMatrix(lm, W, H) {
  const f = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
  const A = new Float64Array(MP_BASIS.length * 3);
  MP_BASIS.forEach((i, k) => { for (let a = 0; a < 3; a++) A[3 * k + a] = canon[3 * i + a]; });
  const unproject = (D0) => {
    const P = new Float64Array(MP_BASIS.length * 3);
    MP_BASIS.forEach((i, k) => {
      const d = D0 + lm[i].z * W * (D0 / f);
      P[3 * k] = ((lm[i].x - 0.5) * W * d) / f; P[3 * k + 1] = (-(lm[i].y - 0.5) * H * d) / f; P[3 * k + 2] = -d;
    });
    return P;
  };
  let D0 = 50, sol = null;
  for (let it = 0; it < 3; it++) {
    sol = solveRigid(A, unproject(D0), null, { scale: true });
    D0 = D0 / sol.s;
  }
  sol = solveRigid(A, unproject(D0), null, { scale: false });
  const R = sol.R, t = sol.t;
  return { data: [R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, t[0], t[1], t[2], 1] };
}

/** Skor kedip dari rasio aspek mata (EAR), format Face Landmarker blendshapes. */
export function blinkScores(lm, ear0) {
  const d = (a, b) => Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);
  const earR = (d(160, 144) + d(158, 153)) / (2 * d(33, 133));
  const earL = (d(385, 380) + d(387, 373)) / (2 * d(362, 263));
  const sc = (e, e0) => Math.max(0, Math.min(1, (e0 - e) / (e0 - 0.08)));
  return { r: sc(earR, ear0.r), l: sc(earL, ear0.l), earR, earL };
}

export function makeRes(seq, i, ear0, { matrix = true } = {}) {
  const lm = frameLm(seq, i);
  const bs = blinkScores(lm, ear0);
  // Stand-in blendshape: pada jendela wink skenario, MediaPipe nyata melaporkan eyeBlinkLeft tinggi (EAR dari inpaint terlalu lemah).
  if (seq.name.startsWith("wink") && i >= 135 && i < 215) bs.l = 0.9;
  const res = {
    faceLandmarks: [lm],
    faceBlendshapes: [{ categories: [{ categoryName: "eyeBlinkLeft", score: bs.l }, { categoryName: "eyeBlinkRight", score: bs.r }] }]
  };
  if (matrix) res.facialTransformationMatrixes = [standInMatrix(lm, seq.W, seq.H)];
  return res;
}

/** EAR mata terbuka dari 45 frame pertama (median). */
export function openEar(seq) {
  const r = [], l = [];
  for (let i = 0; i < 45; i++) { const b = blinkScores(frameLm(seq, i), { r: 0.3, l: 0.3 }); r.push(b.earR); l.push(b.earL); }
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  return { r: med(r), l: med(l) };
}

/** Spesifikasi rig f0 yang dikirim bersama aplikasi. */
export async function shippedSpec() {
  const doc = await new NodeIO().read(new URL("../../public/products/f0/model.glb", import.meta.url).pathname);
  const nodes = {};
  let meta = null;
  for (const n of doc.getRoot().listNodes()) {
    nodes[n.getName()] = Array.from(n.getTranslation());
    if (n.getName() === "GlassesRoot") meta = n.getExtras().trylens;
  }
  return specFromNodes({ nodes, meta });
}

// ---- kebenaran dasar & proyeksi ----
const lerp = (a, b, u) => a + (b - a) * u;
/** Transformasi (s, θ, dx, dy) pada waktu t (interpolasi linear antar-sampel). */
export function gtAt(seq, t) {
  const x = Math.max(0, Math.min(seq.N - 1, t * seq.fps));
  const i = Math.min(seq.N - 2, Math.floor(x)), u = x - i;
  const a = seq.gt[i], b = seq.gt[i + 1];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)];
}
export const applyGt = (g, p, c0) => {
  const [s, th, dx, dy] = g, ct = Math.cos(th) * s, st = Math.sin(th) * s;
  const x = p[0] - c0[0], y = p[1] - c0[1];
  return [c0[0] + ct * x - st * y + dx, c0[1] + st * x + ct * y + dy];
};
/** Posisi piksel titik kebenaran (indeks landmark dasar) pada waktu t. */
export function gtPoint(seq, idx, t) {
  const p = idx.map((i) => [seq.base[3 * i] * seq.W, seq.base[3 * i + 1] * seq.H]);
  const m = [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
  return applyGt(gtAt(seq, t), m, seq.c0);
}

const quatRot = (q, v) => {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
};
/** Titik di ruang rig (cm) → piksel layar, memakai pose kepala (position, quaternion, k) dan fit (position, roll). */
export function rigToPixel({ position, quaternion, scale: k }, fit, local, W, H) {
  const c = Math.cos(fit.roll), s = Math.sin(fit.roll);
  const lr = [local[0] * c - local[1] * s, local[0] * s + local[1] * c, local[2]];
  const ph = [k * fit.position[0] + lr[0], k * fit.position[1] + lr[1], k * fit.position[2] + lr[2]];
  const r = quatRot(quaternion, ph);
  const X = position[0] + r[0], Y = position[1] + r[1], Z = position[2] + r[2];
  const f = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
  return [W / 2 + (f * X) / -Z, H / 2 - (f * Y) / -Z];
}

/**
 * Jalankan satu mesin pada satu skenario dengan jadwal render 60 Hz.
 *  mkEngine() → objek dengan update(res,W,H,nowMs) & (opsional) predict(nowMs)
 * Mengembalikan deret { t, out:[x,y] piksel titik tengah lensa, roll:rad, gt:[x,y], gtRoll, tracked }.
 */
export function runSeq(seq, mkEngine, spec, { procMs = 25, matrix = true } = {}) {
  const ear0 = openEar(seq);
  const eng = mkEngine();
  eng.setModel?.(spec);
  const lensMid = [(spec.lensL[0] + spec.lensR[0]) / 2, (spec.lensL[1] + spec.lensR[1]) / 2, (spec.lensL[2] + spec.lensR[2]) / 2];
  const series = [];
  let last = null;
  const sample = (tMs, tSec) => {
    let pose = null;
    if (eng.predict) { const p = eng.predict(tMs); if (p) pose = { position: p.position, quaternion: p.quaternion, scale: last.scale }; }
    if (!pose) pose = { position: last.position, quaternion: last.quaternion, scale: last.scale };
    const fit = last.fit;
    if (!last.tracked || !fit) { series.push({ t: tSec, tracked: false }); return; }
    const px = rigToPixel(pose, fit, lensMid, seq.W, seq.H);
    const pl = rigToPixel(pose, fit, spec.lensL, seq.W, seq.H), pr = rigToPixel(pose, fit, spec.lensR, seq.W, seq.H);
    const g = [468, 473];
    const gR = gtPoint(seq, [468], tSec), gL = gtPoint(seq, [473], tSec);
    series.push({
      t: tSec, tracked: true, out: px, gt: [(gR[0] + gL[0]) / 2, (gR[1] + gL[1]) / 2],
      roll: Math.atan2(pl[1] - pr[1], pl[0] - pr[0]), gtRoll: Math.atan2(gL[1] - gR[1], gL[0] - gR[0])
    });
  };
  for (let i = 0; i < seq.N; i++) {
    const tCap = i / seq.fps, tArr = tCap + procMs / 1000;
    const res = makeRes(seq, i, ear0, { matrix });
    const out = eng.update(res, seq.W, seq.H, tArr * 1000);
    if (out?.tracked) last = out;
    else if (!last) continue;
    else last = { ...last, tracked: !!out?.tracked };
    sample(tArr * 1000, tArr);
    sample((tArr + 1 / 60) * 1000, tArr + 1 / 60);
  }
  return series;
}

/** Ukuran: getaran diam, galat gerak, loncatan terlihat, galat maksimum di jendela peristiwa. Semua dalam piksel layar. */
export function metrics(series, { still = [2.0, 3.4], motion = null, event = null } = {}) {
  const ok = series.filter((s) => s.tracked);
  const seg = (a, b) => ok.filter((s) => s.t >= a && s.t < b);
  const st = seg(still[0], still[1]);
  const off = [st.reduce((s, r) => s + r.out[0] - r.gt[0], 0) / st.length, st.reduce((s, r) => s + r.out[1] - r.gt[1], 0) / st.length];
  const offRoll = st.reduce((s, r) => s + r.roll - r.gtRoll, 0) / st.length;
  const err = (r) => [r.out[0] - r.gt[0] - off[0], r.out[1] - r.gt[1] - off[1]];
  const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length));
  const m = {};
  const jit = (rows) => { const e = rows.map(err); const mx = e.reduce((s, v) => s + v[0], 0) / e.length, my = e.reduce((s, v) => s + v[1], 0) / e.length; return rms(e.map((v) => Math.hypot(v[0] - mx, v[1] - my))); };
  m.stillJitter = jit(st);
  const steps = (rows) => { let mx = 0; for (let i = 1; i < rows.length; i++) { const a = err(rows[i - 1]), b = err(rows[i]); mx = Math.max(mx, Math.hypot(b[0] - a[0], b[1] - a[1])); } return mx; };
  m.stillMaxStep = steps(st);
  if (motion) { const mo = seg(...motion); m.trackRms = rms(mo.map((r) => Math.hypot(...err(r)))); m.trackMax = Math.max(...mo.map((r) => Math.hypot(...err(r)))); }
  if (event) {
    const ev = seg(...event);
    m.eventMax = Math.max(...ev.map((r) => Math.hypot(...err(r))));
    m.eventRms = rms(ev.map((r) => Math.hypot(...err(r))));
    m.eventMaxStep = steps(ev);
    m.eventJitter = jit(ev);
  }
  m.rollJitterDeg = (rms(st.map((r) => r.roll - r.gtRoll - offRoll)) * 180) / Math.PI;
  return m;
}
