// Uji sintetis untuk mesin presisi AR: `npm run test:ar`
// Membangun wajah buatan (model kanonik × ukuran, iris 11,7 mm), memutar & memproyeksikannya ke kamera
// perspektif, lalu memeriksa apakah PoseEngine memulihkan ukuran/posisi yang sebenarnya.
// Catatan: ini menguji MATEMATIKA, bukan akurasi jaringan saraf MediaPipe pada wajah nyata.
import fs from "node:fs";
import assert from "node:assert/strict";
import { OneEuro, OneEuroQuat } from "../src/ar/oneEuro.js";
import { PoseEngine } from "../src/ar/PoseEngine.js";
import { decomposeMatrix, poseAngles } from "../src/ar/faceMetrics.js";
import { placeOnEyes, describeFit, ridgeZAt, FIT_LIMITS, RIDGE } from "../src/ar/eyeFit.js";
import { specFromNodes } from "../src/ar/rigSpec.js";

const canon = Float64Array.from(JSON.parse(fs.readFileSync(new URL("../src/data/canonicalFace.json", import.meta.url))).v);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const rad = (d) => (d * Math.PI) / 180;
const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const Ry = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const Rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const Rz = (a) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];

const IRIS_FWD = 0.9;
function synth({ s = 1, yaw = 0, pitch = 0, roll = 0, dist = 45, noise = 0, bridge = [0, 0, 0], W = 1280, H = 720, irisMm = 11.7, pdScale = 1, noseShift = [0, 0, 0], eyeDy = [0, 0] }) {
  const R = mul(mul(Ry(rad(yaw)), Rx(rad(pitch))), Rz(rad(roll)));
  const C = [];
  for (let i = 0; i < 468; i++) C.push([canon[3 * i] * s, canon[3 * i + 1] * s, canon[3 * i + 2] * s]);
  for (let a = 0; a < 3; a++) C[6][a] += bridge[a] * s;
  for (const i of RIDGE) for (let a = 0; a < 3; a++) C[i][a] += noseShift[a] * s;
  const eye = (i, j, sign) => {
    const c = [0, 1, 2].map((a) => ((canon[3 * i + a] + canon[3 * j + a]) / 2) * s);
    c[0] *= pdScale;
    c[1] += eyeDy[sign ? 1 : 0] * s;
    c[2] += IRIS_FWD * s; // iris menonjol ±9 mm di depan garis sudut mata (asumsi anatomi; mesh kanonik tidak memodelkan bola mata)
    const r = irisMm / 20; // iris tidak ikut membesar bersama wajah
    return [c, [c[0] + r, c[1], c[2]], [c[0], c[1] + r, c[2]], [c[0] - r, c[1], c[2]], [c[0], c[1] - r, c[2]]];
  };
  const iris = [...eye(33, 133, 0), ...eye(362, 263, 1)];
  const all = [...C, ...iris];
  const T0 = [0.6, -0.4, -dist];
  const cam = all.map((p) => [0, 1, 2].map((a) => R[a][0] * p[0] + R[a][1] * p[1] + R[a][2] * p[2] + T0[a]));
  const f = H / 2 / Math.tan(rad(31.5));
  const dm = cam.slice(0, 468).reduce((v, p) => v - p[2] / 468, 0);
  const lm = cam.map((p) => ({
    x: (W / 2 + (f * p[0]) / -p[2] + noise * gauss()) / W,
    y: (H / 2 - (f * p[1]) / -p[2] + noise * gauss()) / H,
    z: ((-p[2] - dm) * (f / dm)) / W + (noise * 2 * gauss()) / W
  }));
  // Matriks pose MediaPipe: wajah dianggap berukuran kanonik -> translasi = T0 / s.
  const d = [R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, T0[0] / s, T0[1] / s, T0[2] / s, 1];
  return { res: { faceLandmarks: [lm], facialTransformationMatrixes: [{ data: d }], faceBlendshapes: [{ categories: [] }] }, W, H, T0 };
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const within = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(3)} vs ${b.toFixed(3)} (±${tol})`);

test("One Euro: getaran diam (0.03 cm ≈ 0.4 px di 45 cm) turun >2.5x, gerak cepat tidak tertinggal", () => {
  const f = new OneEuro({ minCutoff: 0.8, beta: 0.3 });
  let raw = 0, filt = 0, n = 0;
  for (let i = 0; i < 300; i++) {
    const x = 10 + 0.03 * gauss();
    const y = f.filter(x, i / 30);
    if (i > 30) { raw += (x - 10) ** 2; filt += (y - 10) ** 2; n++; }
  }
  assert.ok(Math.sqrt(raw / n) / Math.sqrt(filt / n) > 2.5, "rasio redaman rendah");
  const g = new OneEuro({ minCutoff: 0.8, beta: 0.3 });
  let lag = 0;
  for (let i = 0; i < 60; i++) { const x = i * 0.8; const y = g.filter(x, i / 30); if (i > 20) lag = Math.max(lag, x - y); }
  assert.ok(lag < 1.6, `lag gerak cepat ${lag.toFixed(2)} cm (maks 1.6 ≈ 2 frame)`);
});

test("One Euro quaternion: tidak melompat melewati tanda ganda (q ≡ -q)", () => {
  const f = new OneEuroQuat({ minCutoff: 1.2, beta: 4 });
  f.filter([0, 0, 0, 1], 0);
  const out = f.filter([0, 0, 0, -1], 1 / 30);
  assert.ok(Math.abs(out[3]) > 0.99);
});

test("Pose: sudut dari matriks cocok dengan sudut yang disuntikkan", () => {
  const { res } = synth({ yaw: 20, pitch: -10, roll: 7 });
  const a = poseAngles(decomposeMatrix(res.facialTransformationMatrixes[0].data).R);
  within(a.yaw, 20, 0.05, "yaw"); within(a.pitch, -10, 0.05, "pitch"); within(a.roll, 7, 0.05, "roll");
});

test("Skala: ukuran wajah 0.9–1.1× dan jarak 35–70 cm dipulihkan <2% (tanpa noise, berbagai pose)", () => {
  for (const s of [0.9, 1, 1.1]) for (const dist of [35, 50, 70]) for (const [yaw, pitch, roll] of [[0, 0, 0], [20, 8, 6], [-25, -10, 10]]) {
    const eng = new PoseEngine(canon);
    let out;
    for (let i = 0; i < 40; i++) { const sy = synth({ s, yaw, pitch, roll, dist }); out = eng.update(sy.res, sy.W, sy.H, i * 33); }
    within(out.scale, s, 0.02 * s, `k (s=${s}, dist=${dist}, yaw=${yaw})`);
    within(-out.position[2], dist, 0.02 * dist, `jarak (s=${s}, dist=${dist})`);
  }
});

test("Skala: dengan noise landmark 0.5 px, median 45 frame tetap <3%", () => {
  for (const s of [0.92, 1.08]) {
    const eng = new PoseEngine(canon);
    let out;
    for (let i = 0; i < 45; i++) { const sy = synth({ s, yaw: 12, pitch: 4, dist: 50, noise: 0.5 }); out = eng.update(sy.res, sy.W, sy.H, i * 33); }
    within(out.scale, s, 0.03 * s, `k noise (s=${s})`);
  }
});

test("Iris di luar 11.7 mm (±0.5) → galat skala ≈ proporsional (batas akurasi yang jujur)", () => {
  const eng = new PoseEngine(canon);
  let out;
  for (let i = 0; i < 20; i++) { const sy = synth({ s: 1, irisMm: 12.2, dist: 50 }); out = eng.update(sy.res, sy.W, sy.H, i * 33); }
  within(out.scale, 1 * (11.7 / 12.2), 0.015, "k saat iris 12.2 mm");
});

test("PD & lebar wajah (mm) dipulihkan, juga saat menoleh", () => {
  for (const yaw of [0, 15, -20]) {
    const eng = new PoseEngine(canon);
    let out;
    for (let i = 0; i < 20; i++) { const sy = synth({ s: 1.04, yaw, dist: 45 }); out = eng.update(sy.res, sy.W, sy.H, i * 33); }
    within(out.pdMm, 63 * 1.04, 1.5, `PD (yaw=${yaw})`);
    within(out.faceMm, 153.2 * 1.04, 3, `lebar wajah (yaw=${yaw})`);
  }
});

test("Rasio bentuk wajah tidak berubah >2% antara menghadap lurus dan menoleh/mengangguk", () => {
  const get = (yaw, pitch) => {
    const eng = new PoseEngine(canon);
    let out;
    for (let i = 0; i < 15; i++) { const sy = synth({ yaw, pitch, dist: 45 }); out = eng.update(sy.res, sy.W, sy.H, i * 33); }
    return out.frame;
  };
  const f0 = get(0, 0);
  for (const [yaw, pitch] of [[18, 0], [-18, 6], [0, -12]]) {
    const f = get(yaw, pitch);
    for (const key of ["lenR", "jawR", "foreR"]) within(f[key], f0[key], 0.02 * f0[key], `${key} (yaw=${yaw}, pitch=${pitch})`);
  }
});

test("Titik tempel hidung: pergeseran 0.3 cm (y) / 0.3 cm (z) terbaca sebagian & terbatas", () => {
  const eng = new PoseEngine(canon);
  let out;
  for (let i = 0; i < 30; i++) { const sy = synth({ bridge: [0, 0.3, 0.3], dist: 45 }); out = eng.update(sy.res, sy.W, sy.H, i * 33); }
  within(out.anchorDelta[1], 0.24, 0.08, "delta y");
  within(out.anchorDelta[2], 0.18, 0.08, "delta z");
  const eng2 = new PoseEngine(canon);
  for (let i = 0; i < 30; i++) { const sy = synth({ bridge: [0, 3, 3] }); out = eng2.update(sy.res, sy.W, sy.H, i * 33); }
  assert.ok(out.anchorDelta[1] <= 0.7 && out.anchorDelta[2] <= 0.7, "koreksi dibatasi ±0.7 cm");
  const eng3 = new PoseEngine(canon);
  for (let i = 0; i < 30; i++) { const sy = synth({}); out = eng3.update(sy.res, sy.W, sy.H, i * 33); }
  within(out.anchorDelta[1], 0, 0.05, "delta y wajah kanonik"); within(out.anchorDelta[2], 0, 0.05, "delta z wajah kanonik");
});

test("Kehilangan wajah: tracked=false setelah 7 frame kosong, lalu pulih", () => {
  const eng = new PoseEngine(canon);
  const sy = synth({});
  for (let i = 0; i < 20; i++) eng.update(sy.res, sy.W, sy.H, i * 33);
  let o;
  for (let i = 0; i < 8; i++) o = eng.update({}, sy.W, sy.H, (20 + i) * 33);
  assert.equal(o.tracked, false);
  o = eng.update(sy.res, sy.W, sy.H, 40 * 33);
  assert.equal(o.tracked, true);
});

// Spesifikasi f0 hasil `npm run glb:rig` (cm, ruang GlassesRoot).
const META = { frameWidthMm: 146, lensWidthMm: 55.9, lensHeightMm: 52.7, bridgeWidthMm: 19.8, templeLengthMm: 138.4, realWorldScale: 10 };
const NODES = { Bridge: [0, -1.31, -0.68], LeftLensCenter: [3.78, -1.31, -0.37], RightLensCenter: [-3.78, -1.31, -0.37], LeftTemple: [7.09, -1.45, -1.39], RightTemple: [-7.09, -1.45, -1.39] };
const SPEC = specFromNodes({ nodes: NODES, meta: META });
const c0 = (() => { const c = [0, 0, 0]; for (let i = 0; i < 468; i++) for (let a = 0; a < 3; a++) c[a] += canon[3 * i + a] / 468; return c; })();

const fitRun = (opts, { spec = SPEC, userScale = 1, frames = 45 } = {}) => {
  const eng = new PoseEngine(canon);
  eng.setModel(spec);
  eng.setUserScale(userScale);
  let out;
  for (let i = 0; i < frames; i++) { const sy = synth(opts); out = eng.update(sy.res, sy.W, sy.H, i * 33); }
  return out;
};
// Pupil sebenarnya di ruang kepala (satuan kanonik) untuk wajah buatan.
const truePupil = (pdScale = 1, eyeDy = [0, 0]) => {
  const e = (i, j, dy) => [0, 1, 2].map((a) => (canon[3 * i + a] + canon[3 * j + a]) / 2).map((v, a) => (a === 0 ? v * pdScale : a === 1 ? v + dy : v + IRIS_FWD));
  return { R: e(33, 133, eyeDy[0]), L: e(362, 263, eyeDy[1]) };
};
// Pusat lensa (tengah kiri-kanan) hasil fit, ruang kepala.
const lensMidHead = (out, userScale = 1) => {
  const k = out.scale, { position: p, roll } = out.fit, c = Math.cos(roll), sn = Math.sin(roll);
  const m = SPEC.lensL.map((v, i) => ((v + SPEC.lensR[i]) / 2) * userScale / k);
  return [p[0] + m[0] * c - m[1] * sn, p[1] + m[0] * sn + m[1] * c, p[2] + m[2]];
};

test("Spesifikasi aset: satuan model (mm/cm) dikonversi ke cm; Left harus +X; node/metadata kurang → null (model lama)", () => {
  assert.ok(SPEC && Math.abs(SPEC.lensSepMm - 75.6) < 1e-6);
  const mm = Object.fromEntries(Object.entries(NODES).map(([k, v]) => [k, v.map((x) => x * 10)]));
  const sMm = specFromNodes({ nodes: mm, meta: { ...META, realWorldScale: 1 } });
  within(sMm.lensL[0], SPEC.lensL[0], 1e-9, "x lensa dari model dalam mm"); within(sMm.unit, 0.1, 1e-12, "unit");
  assert.equal(specFromNodes({ nodes: { ...NODES, LeftLensCenter: NODES.RightLensCenter, RightLensCenter: NODES.LeftLensCenter }, meta: META }), null);
  assert.equal(specFromNodes({ nodes: NODES, meta: { ...META, lensWidthMm: undefined } }), null);
  assert.equal(specFromNodes({ nodes: { Bridge: NODES.Bridge }, meta: META }), null);
  assert.equal(specFromNodes({ nodes: NODES, meta: null }), null);
});

test("Pupil: titik tengah lensa jatuh di titik tengah pupil (<1 mm x,y) untuk berbagai ukuran, jarak, pose, PD", () => {
  for (const s of [0.95, 1.05]) for (const dist of [40, 55]) for (const yaw of [0, 15]) for (const pdScale of [0.95, 1.05]) {
    const out = fitRun({ s, yaw, dist, pdScale });
    assert.ok(out.fit, "fit harus tersedia setelah kalibrasi");
    const tp = truePupil(pdScale), gt = [(tp.R[0] + tp.L[0]) / 2, (tp.R[1] + tp.L[1]) / 2, (tp.R[2] + tp.L[2]) / 2];
    const lm = lensMidHead(out);
    const ex = Math.abs(lm[0] - gt[0]) * s * 10, ey = Math.abs(lm[1] - gt[1]) * s * 10;
    assert.ok(ex < 1 && ey < 1, `galat pupil x=${ex.toFixed(2)} y=${ey.toFixed(2)} mm (s=${s}, dist=${dist}, yaw=${yaw}, pd×${pdScale})`);
    const vtx = (lm[2] - gt[2]) * s * 10;
    assert.ok(vtx >= FIT_LIMITS.minVertexCm * 10 - 0.5 && vtx <= FIT_LIMITS.maxVertexCm * 10 + 0.5, `jarak lensa-mata ${vtx.toFixed(1)} mm di dalam batas`);
  }
});

test("Pupil: slider ukuran 0.9–1.1 tetap menjaga pusat lensa di pupil (<1 mm)", () => {
  for (const us of [0.9, 1.1]) {
    const out = fitRun({ s: 1, dist: 45 }, { userScale: us });
    const tp = truePupil(), gt = [(tp.R[0] + tp.L[0]) / 2, (tp.R[1] + tp.L[1]) / 2];
    const lm = lensMidHead(out, us);
    assert.ok(Math.abs(lm[0] - gt[0]) * 10 < 1 && Math.abs(lm[1] - gt[1]) * 10 < 1, `userScale=${us}`);
  }
});

test("Dekantrasi: pupil 63 mm vs pusat lensa 75,6 mm → ±6,3 mm per mata; PD sama → ≈0", () => {
  const tg = { pR: [-3.15, 0, 3], pL: [3.15, 0, 3], ridge: [[1, 4.5], [0, 4.6], [-1, 4.4]], brow: [2.6, 4] };
  const r = placeOnEyes({ spec: SPEC, tg, k: 1, c0, userScale: 1 });
  within(r.decL.x, -6.3, 0.01, "kiri"); within(r.decR.x, 6.3, 0.01, "kanan"); within(r.decL.y, 0, 1e-6, "y");
  const rep = describeFit({ frameMm: 146, faceMm: 153, fit: r });
  assert.equal(rep.find((x) => x.key === "pupil").status, "bad");
  const sp = specFromNodes({ nodes: { ...NODES, LeftLensCenter: [3.15, -1.31, -0.37], RightLensCenter: [-3.15, -1.31, -0.37] }, meta: META });
  const r2 = placeOnEyes({ spec: sp, tg, k: 1, c0, userScale: 1 });
  within(r2.decL.x, 0, 1e-6, "kiri"); within(r2.decR.x, 0, 1e-6, "kanan");
  assert.equal(describeFit({ frameMm: 146, faceMm: 153, fit: r2 }).find((x) => x.key === "pupil").status, "ok");
});

test("Roll: garis pupil miring diikuti, dibatasi ±4° dan ditandai", () => {
  const tgAt = (dy) => ({ pR: [-3.15, -dy, 3], pL: [3.15, dy, 3], ridge: [[1, 4.5], [0, 4.6], [-1, 4.4]], brow: [2.6, 4] });
  const small = placeOnEyes({ spec: SPEC, tg: tgAt(0.1), k: 1, c0 });
  within(small.roll, Math.atan2(0.2, 6.3), 1e-9, "roll kecil mengikuti garis pupil"); assert.equal(small.rollClamped, false);
  const big = placeOnEyes({ spec: SPEC, tg: tgAt(0.8), k: 1, c0 });
  within(big.roll, (4 * Math.PI) / 180, 1e-9, "roll dibatasi"); assert.equal(big.rollClamped, true);
  const out = fitRun({ eyeDy: [-0.1, 0.1] });
  assert.ok(out.fit.roll > 0.025 && out.fit.roll < 0.04, "roll dari mesin tertangkap");
});

test("Kedalaman: hidung lebih maju mendorong frame ke depan; sangat maju → 'noseBlocked'; z tetap ≥ batas bawah", () => {
  const base = fitRun({}), fwd = fitRun({ noseShift: [0, 0, 0.5] }), huge = fitRun({ noseShift: [0, 0, 4] });
  assert.ok(fwd.fit.position[2] > base.fit.position[2] + 0.3, `${base.fit.position[2].toFixed(2)} → ${fwd.fit.position[2].toFixed(2)}`);
  assert.equal(fwd.fit.contact, "nose");
  assert.equal(huge.fit.noseBlocked, true);
  assert.equal(describeFit({ frameMm: 146, faceMm: 150, fit: { ...placeOnEyes({ spec: SPEC, tg: { pR: [-3.15, 0, 3], pL: [3.15, 0, 3], ridge: [[1, 9], [0, 9], [-1, 9]], brow: [2.6, 4] }, k: 1, c0 }) } }).find((x) => x.key === "vertex").status, "bad");
  assert.ok(ridgeZAt([[1, 4], [0, 5], [-1, 6]], 0.5) === 4.5 && ridgeZAt([[1, 4], [0, 5], [-1, 6]], 9) === 4 && ridgeZAt([[1, 4], [0, 5], [-1, 6]], -9) === 6);
});

test("Tanpa rig (model lama): tidak ada fit pupil, koreksi jembatan cadangan tetap tersedia", () => {
  const out = fitRun({}, { spec: null });
  assert.equal(out.fit, null); assert.equal(out.report, null);
  assert.equal(out.anchorDelta.length, 3);
});

test("Laporan: lebar, pupil, jarak lensa, hidung, alis — semua berstatus", () => {
  const out = fitRun({ s: 1, dist: 45 });
  assert.equal(out.report.map((r) => r.key).sort().join(), "brow,nose,pupil,vertex,width");
  assert.ok(out.report.every((r) => ["ok", "warn", "bad"].includes(r.status)));
  assert.ok(["ok", "warn"].includes(out.report.find((r) => r.key === "width").status), "frame 146 mm di wajah ±153 mm tidak boleh 'bad'");
});

let fail = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log("✓", name); } catch (e) { fail++; console.log("✗", name, "\n   ", e.message); }
}
console.log(fail ? `\n${fail} gagal` : `\nSemua ${tests.length} uji lolos`);
process.exit(fail ? 1 : 0);
