// Benchmark pelacak pada landmark dari jaringan MediaPipe ASLI: node scripts/bench-realnet.mjs <dirSeq> [tracker,tracker,...]
// Keluaran: tabel piksel layar (getaran saat diam, galat gerak, loncatan, galat saat kedip/poni).
import { PoseEngine } from "../src/ar/PoseEngine.js";
import { canon, faces, loadSeq, metrics, runSeq, shippedSpec } from "./lib/realSeq.mjs";

const dir = process.argv[2];
const trackers = (process.argv[3] || "oneEuro,magnet").split(",");
const spec = await shippedSpec();
const SC = {
  still: {},
  nod: { motion: [3.6, 10.0] },
  drift: { motion: [3.6, 10.0] },
  jump: { motion: [4.2, 6.0] },
  wink: { event: [4.5, 7.2] },
  fringe: { event: [4.5, 7.2] },
  wink_nod: { event: [4.5, 7.2], motion: [3.6, 10.0] }
};
const f = (v, d = 2) => (v == null ? "   -  " : v.toFixed(d).padStart(6));
console.log("tracker   skenario    jitterDiam  stepDiam   galatGerak  maksGerak   maksPeristiwa  stepPeristiwa  rollJit°");
for (const tr of trackers) {
  for (const [name, opt] of Object.entries(SC)) {
    let seq;
    try { seq = loadSeq(dir, name); } catch { continue; }
    const series = runSeq(seq, () => new PoseEngine(canon, { tracker: tr, faces }), spec);
    const m = metrics(series, { motion: opt.motion, event: opt.event });
    console.log(`${tr.padEnd(9)} ${name.padEnd(10)}  ${f(m.stillJitter)}     ${f(m.stillMaxStep)}      ${f(m.trackRms)}     ${f(m.trackMax)}      ${f(m.eventMax)}       ${f(m.eventMaxStep)}       ${f(m.rollJitterDeg, 3)}`);
  }
}
