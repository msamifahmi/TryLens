// Ukur KEHALUSAN tampilan (px layar) titik-titik kacamata. `node scripts/bench-smooth.mjs [--json]`
// Data buatan (noise landmark + noise rotasi); BUKAN pengukuran pada wajah nyata.
import { PoseEngine } from "../src/ar/PoseEngine.js";
import { specFromNodes } from "../src/ar/rigSpec.js";
import { canon, synth } from "./lib/synthFace.mjs";
import { FOV_DEG } from "../src/ar/faceMetrics.js";

export const SPEC = specFromNodes({
  nodes: { Bridge: [0, 0, 0], LeftLensCenter: [3.2, 0, 0.3], RightLensCenter: [-3.2, 0, 0.3], LeftTemple: [7.2, 0, -0.2], RightTemple: [-7.2, 0, -0.2] },
  meta: { frameWidthMm: 146, lensWidthMm: 55, lensHeightMm: 45, bridgeWidthMm: 18, templeLengthMm: 140, realWorldScale: 10 }
});
const qrot = (q, v) => {
  const [x, y, z, w] = q;
  const t = [2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])];
  return [v[0] + w * t[0] + (y * t[2] - z * t[1]), v[1] + w * t[1] + (z * t[0] - x * t[2]), v[2] + w * t[2] + (x * t[1] - y * t[0])];
};
const PTS = { lensL: [3.2, 0, 0.3], lensR: [-3.2, 0, 0.3], tipR: [-7.2, 0, -9] }; // cm di ruang kacamata
const W = 1280, H = 720, f = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
const proj = (P) => [W / 2 + (f * P[0]) / -P[2], H / 2 - (f * P[1]) / -P[2]];
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / (a.length || 1));

/** path(t) -> {x,y,yaw,pitch,dist}. Mengembalikan titik tampil (px) tiap tick render 60 Hz. */
export function run(path, { frames = 240, warm = 60, noise = 0.5, rotNoise = 0.3, matNoise = 0.05, tracker = "magnet", engineOpts = {}, latency = 0.025 } = {}) {
  const eng = new PoseEngine(canon, { tracker, ...engineOpts });
  eng.setModel(SPEC);
  const disp = Object.fromEntries(Object.keys(PTS).map((k) => [k, []]));
  const truth = Object.fromEntries(Object.keys(PTS).map((k) => [k, []]));
  let base0 = null;
  for (let i = 0; i < frames; i++) {
    const tr = i < warm ? path(0) : path((i - warm) / 30);
    const sy = synth({ tx: tr.x, ty: tr.y, yaw: tr.yaw ?? 0, pitch: tr.pitch ?? 0, dist: tr.dist ?? 45, noise, matNoise, rotNoise, gaze: tr.gaze || [0, 0] });
    const nowMs = i * 33.333;
    const out = eng.update(sy.res, sy.W, sy.H, nowMs);
    if (i < warm || !out.fit) continue;
    for (const dtms of [0, 16.7]) {
      let pos = out.position, q = out.quaternion;
      const pr = eng.predict(nowMs + dtms);
      if (pr) { pos = pr.position; q = pr.quaternion; }
      const base = out.fit.position.map((v) => v * out.scale);
      base0 = base0 || base;
      const gt = path(Math.max(0, (i - warm) / 30 + dtms / 1000 + latency)), gs = synth({ tx: gt.x, ty: gt.y, yaw: gt.yaw ?? 0, pitch: gt.pitch ?? 0, dist: gt.dist ?? 45 });
      for (const [k, loc] of Object.entries(PTS)) {
        const v = [base0[0] + loc[0], base0[1] + loc[1], base0[2] + loc[2]];
        truth[k].push(proj([0, 1, 2].map((a) => gs.T0[a] + gs.R[a][0] * v[0] + gs.R[a][1] * v[1] + gs.R[a][2] * v[2])));
        const r = qrot(q, [base[0] + loc[0], base[1] + loc[1], base[2] + loc[2]]);
        disp[k].push(proj([pos[0] + r[0], pos[1] + r[1], pos[2] + r[2]]));
      }
    }
  }
  return { disp, truth };
}
const d2 = (arr) => { const o = []; for (let i = 1; i < arr.length - 1; i++) o.push(Math.hypot(arr[i - 1][0] - 2 * arr[i][0] + arr[i + 1][0], arr[i - 1][1] - 2 * arr[i][1] + arr[i + 1][1]) / Math.sqrt(6)); return rms(o); };
/** jitter = RMS turunan-2 (px, bebas dari gerak mulus); err = RMS selisih terhadap jalankan tanpa noise (px). */
export function measure(path, opts = {}) {
  const { disp: noisy, truth } = run(path, opts), clean = run(path, { ...opts, noise: 0, rotNoise: 0, matNoise: 0 }).disp;
  const out = {};
  for (const k of Object.keys(PTS)) {
    const e = noisy[k].map((p, i) => Math.hypot(p[0] - truth[k][i][0], p[1] - truth[k][i][1]));
    // jitter = turunan-2 dari (noisy − clean): hanya bagian yang disebabkan noise, bukan percepatan gerak sungguhan.
    out[k] = { jitter: d2(noisy[k].map((p, i) => [p[0] - clean[k][i][0], p[1] - clean[k][i][1]])), err: rms(e) };
  }
  return out;
}
export const PATHS = {
  diam: () => ({ x: 0.6, y: -0.4, yaw: 0 }),
  pelan: (t) => ({ x: 0.6 + 1.0 * Math.sin(2 * Math.PI * 0.25 * t), y: -0.4 + 0.4 * Math.sin(2 * Math.PI * 0.3 * t), yaw: 8 * Math.sin(2 * Math.PI * 0.2 * t) }),
  // pandangan melirik ±3,5 mm (iris bergeser) sambil kepala nyaris diam — hanya iris yang bergerak, bukan kepala
  melirik: (t) => ({ x: 0.6, y: -0.4, yaw: 0, gaze: [3.5 * Math.sin(2 * Math.PI * 0.45 * t) * (Math.sin(2 * Math.PI * 0.13 * t) > -0.3 ? 1 : 0.2), 2.5 * Math.sin(2 * Math.PI * 0.31 * t + 1)] }),
  sapuan: (t) => ({ x: 3 * Math.sin(2 * Math.PI * 0.8 * t), y: 1.5 * Math.sin(2 * Math.PI * 1.1 * t), yaw: 25 * Math.sin(2 * Math.PI * 0.5 * t) })
};
if (process.argv[1]?.endsWith("bench-smooth.mjs")) {
  for (const [n, p] of Object.entries(PATHS)) {
    const m = measure(p);
    console.log(n.padEnd(7), Object.entries(m).map(([k, v]) => `${k} jitter ${v.jitter.toFixed(3)} err ${v.err.toFixed(2)}`).join(" | "));
  }
  console.log("-- One Euro (pembanding)");
  for (const [n, p] of Object.entries(PATHS)) {
    const m = measure(p, { tracker: "oneEuro" });
    console.log(n.padEnd(7), Object.entries(m).map(([k, v]) => `${k} jitter ${v.jitter.toFixed(3)} err ${v.err.toFixed(2)}`).join(" | "));
  }
}
