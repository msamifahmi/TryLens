// Uji menyeluruh semua public/products/*/model.glb lewat jalur yang sama dengan aplikasi:
// GLTFLoader → readRigSpec / estimateRigSpec → PoseEngine (wajah sintetis) → harus ada kunci pupil + laporan kecocokan.
import fs from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { readRigSpec, estimateRigSpec, TempleReach } from "../src/ar/rigSpecThree.js";
import { PoseEngine } from "../src/ar/PoseEngine.js";
import { canon, synth } from "./lib/synthFace.mjs";
let n = 0; const ok = (c, m) => { if (!c) { console.error("✗ " + m); process.exitCode = 1; } else { console.log("✓ " + m); n++; } };
const root = new URL("../public/products/", import.meta.url).pathname;
const parse = (buf) => new Promise((res, rej) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "", res, rej));
for (const id of fs.readdirSync(root).filter((d) => fs.existsSync(`${root}${d}/model.glb`)).sort()) {
  const gltf = await parse(fs.readFileSync(`${root}${id}/model.glb`));
  const real = readRigSpec(gltf.scene);
  const spec = real || estimateRigSpec(gltf.scene);
  ok(!!spec, `${id}: spesifikasi didapat (${real ? "ber-rig" : "perkiraan dari bentuk mesh"})`);
  if (!spec) continue;
  const reach = new TempleReach(gltf.scene, (spec.templeL[2] + spec.templeR[2]) / 2 / spec.unit);
  ok(reach.ok, `${id}: gagang terdeteksi (panjang ${(reach.hz - reach.tip).toFixed(2)} satuan model)`);
  ok(spec.frameWidthMm > 100 && spec.frameWidthMm < 200 && spec.lensL[0] > 0 && spec.lensR[0] < 0, `${id}: lebar ${Math.round(spec.frameWidthMm)} mm, lensa kiri +X / kanan −X`);
  const eng = new PoseEngine(canon, { mode: "tryon" });
  eng.setModel(spec);
  let out;
  for (let i = 0; i < 70; i++) { const s = synth({ yaw: 3, dist: 45 }); out = eng.update(s.res, s.W, s.H, i * 33); }
  ok(out.tracked && !!out.fit, `${id}: pupil terkunci (fit ada)`);
  ok(Array.isArray(out.report) && out.report.length >= 4, `${id}: laporan kecocokan terisi (${out.report?.length ?? 0} baris)`);
}
console.log(`\nSelesai: ${n} uji lolos`);
