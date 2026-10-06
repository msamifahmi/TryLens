// Uji pelacak magnet + node wajah: `npm run test:magnet`
// Menguji MATEMATIKA lag/konvergensi pada gerak buatan. Bukan pengukuran pada wajah nyata.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeCorrector } from "../src/ar/nodeCorrector.js";
import { PoseEngine } from "../src/ar/PoseEngine.js";
import { MagnetQuat } from "../src/ar/magnet.js";
import { OneEuroQuat } from "../src/ar/oneEuro.js";
import { canon, synth, gauss } from "./lib/synthFace.mjs";
import { measure, PATHS, SPEC } from "./bench-smooth.mjs";
import { estimateSpecFromBox } from "../src/ar/rigSpec.js";

const tests = [];
const test = (n, f) => tests.push([n, f]);
const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

// Kebenaran dinilai pada saat gambar TAMPIL = saat tangkap + LATENCY (deteksi → render → layar ±25 ms). Pelacak tanpa
// ekstrapolasi selalu menampilkan posisi "masa lalu"; itulah delay yang dikeluhkan.
const LATENCY = 0.025;
/** Jalankan lintasan; kembalikan galat posisi kepala (cm) terhadap kebenaran. */
function run(tracker, path, { frames = 150, warm = 45, noise = 0.3, siz = 1, matNoise = 0.03 } = {}) {
  const eng = new PoseEngine(canon, { tracker });
  const err = [];
  for (let i = 0; i < frames; i++) {
    const t = i / 30;
    const tr = i < warm ? path(0) : path(t - warm / 30);
    const sy = synth({ s: siz, dist: tr.dist ?? 45, tx: tr.x, ty: tr.y, yaw: tr.yaw ?? 0, noise, matNoise, matrixBias: tr.bias });
    const out = eng.update(sy.res, sy.W, sy.H, i * 33.333);
    if (i >= warm && out.position) { const d = i < warm ? tr : path(t - warm / 30 + LATENCY); err.push([out.position[0] - d.x, out.position[1] - d.y, out.position[2] + (d.dist ?? 45)]); }
  }
  return err;
}
const sweep = (t) => ({ x: 3 * Math.sin(2 * Math.PI * 0.8 * t), y: 1.5 * Math.sin(2 * Math.PI * 1.1 * t), yaw: 25 * Math.sin(2 * Math.PI * 0.5 * t) });
const rest = () => ({ x: 0.6, y: -0.4, yaw: 0 });

test("Gerak kepala (±3 cm x, ±1,5 cm y, yaw ±25°): galat posisi Y/X magnet lebih kecil dari One Euro", () => {
  const a = run("oneEuro", sweep), b = run("magnet", sweep);
  const ey = [rms(a.map((e) => e[1])), rms(b.map((e) => e[1]))], ex = [rms(a.map((e) => e[0])), rms(b.map((e) => e[0]))];
  console.log(`   RMS galat Y: One Euro ${(ey[0] * 10).toFixed(2)} mm → magnet ${(ey[1] * 10).toFixed(2)} mm | X: ${(ex[0] * 10).toFixed(2)} → ${(ex[1] * 10).toFixed(2)} mm`);
  assert.ok(ey[1] < ey[0] * 0.6, "Y harus turun >40%");
  assert.ok(ex[1] < ex[0] * 0.6, "X harus turun >40%");
});

test("Diam: getaran magnet tidak lebih buruk dari 1.5× One Euro (tanpa 'bergetar' karena menyedot noise)", () => {
  const a = run("oneEuro", rest, { frames: 200, noise: 0.5 }), b = run("magnet", rest, { frames: 200, noise: 0.5 });
  const ja = rms(a.map((e) => e[1])), jb = rms(b.map((e) => e[1]));
  console.log(`   getaran Y diam: One Euro ${(ja * 10).toFixed(3)} mm, magnet ${(jb * 10).toFixed(3)} mm`);
  assert.ok(jb < Math.max(ja * 1.5, 0.05), "getaran tidak boleh melonjak");
});

test("Magnet Y: lompatan mendadak 2 cm → kembali <1 mm dalam ≤4 frame (One Euro lebih lambat)", () => {
  const step = (t) => ({ x: 0.6, y: t >= 0 ? 1.6 : -0.4, yaw: 0 });
  const settle = (tr) => {
    const eng = new PoseEngine(canon, { tracker: tr });
    let n = -1;
    for (let i = 0; i < 100; i++) {
      const p = step(i < 50 ? -1 : 0), sy = synth({ tx: p.x, ty: p.y, noise: 0 });
      const out = eng.update(sy.res, sy.W, sy.H, i * 33.333);
      if (i >= 50 && n < 0 && Math.abs(out.position[1] - p.y) < 0.1) n = i - 50;
    }
    return n;
  };
  const a = settle("oneEuro"), b = settle("magnet");
  console.log(`   frame sampai <1 mm: One Euro ${a}, magnet ${b}`);
  assert.ok(b >= 0 && b <= 4, "magnet harus menyedot dalam ≤4 frame");
  assert.ok(b < a, "lebih cepat dari One Euro");
});

test("Node wajah: matriks pose menyimpang sesaat (Y +3 mm selama 0,5 dtk, mis. lag solver) dikoreksi voting node; One Euro mewarisinya", () => {
  const biased = (t) => ({ x: 0.6, y: -0.4, yaw: 0, bias: t > 0 && t < 0.5 ? [0, 0.3] : [0, 0] });
  const a = run("oneEuro", biased, { noise: 0 }), b = run("magnet", biased, { noise: 0 });
  const ea = rms(a.slice(1, 14).map((e) => e[1])), eb = rms(b.slice(1, 14).map((e) => e[1]));
  console.log(`   galat Y dengan bias matriks 3 mm: One Euro ${(ea * 10).toFixed(2)} mm, magnet ${(eb * 10).toFixed(2)} mm`);
  assert.ok(ea * 10 > 1.5 && eb * 10 < 0.8, "magnet harus menetralkan bias Y");
});

test("Kalibrasi ulang cepat: pengguna lain (wajah 1.0 → 1.1×) terdeteksi <25 frame, bukan 45+", () => {
  const eng = new PoseEngine(canon);
  let n = -1;
  for (let i = 0; i < 120; i++) {
    const s = i < 50 ? 1 : 1.1, sy = synth({ s, dist: 45, noise: 0.2 });
    const out = eng.update(sy.res, sy.W, sy.H, i * 33.333);
    if (i >= 50 && n < 0 && Math.abs(out.scale - 1.1) / 1.1 < 0.03) n = i - 50;
  }
  console.log(`   frame sampai skala <3%: ${n}, relock ${eng.relocks || 0}×`);
  assert.ok(n >= 0 && n <= 25 && eng.relocks >= 1);
});

test("Kalibrasi ulang tidak terpicu oleh gerak/noise biasa", () => {
  const eng = new PoseEngine(canon);
  for (let i = 0; i < 200; i++) {
    const p = sweep(i / 30), sy = synth({ tx: p.x, ty: p.y, yaw: p.yaw, noise: 0.5 });
    eng.update(sy.res, sy.W, sy.H, i * 33.333);
  }
  assert.equal(eng.relocks || 0, 0);
});

test("Rotasi: quaternion magnet melacak kecepatan sudut konstan dengan lag < One Euro, tanpa lompatan tanda", () => {
  const axisAng = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
  const mq = new MagnetQuat(), oq = new OneEuroQuat({ minCutoff: 1.2, beta: 4, dCutoff: 1 });
  let em = [], eo = [];
  for (let i = 0; i < 90; i++) {
    const a = 0.5 * Math.sin(2 * Math.PI * 0.6 * (i / 30)), z = axisAng(a), aShown = 0.5 * Math.sin(2 * Math.PI * 0.6 * (i / 30 + LATENCY));
    const zn = z.map((v, j) => v + (j < 3 ? 0.002 * gauss() : 0));
    const m = mq.filter(zn, i / 30), o = oq.filter(zn, i / 30);
    const ang = (q) => 2 * Math.atan2(q[1], q[3]);
    if (i > 20) { em.push(ang(m) - aShown); eo.push(ang(o) - aShown); }
  }
  console.log(`   galat sudut: One Euro ${(rms(eo) * 57.3).toFixed(2)}° → magnet ${(rms(em) * 57.3).toFixed(2)}°`);
  assert.ok(rms(em) < rms(eo) * 0.7);
});

/* ------------------------------------------------ ketahanan: satu mata dipejamkan, alis/pelipis tertutup rambut */
const BROWS = [46, 52, 53, 55, 63, 65, 66, 70, 105, 107, 276, 282, 283, 285, 293, 295, 296, 300, 334, 336];
function stress({ mutate, blend, frames = 120, warm = 45, tracker = "magnet" }) {
  const eng = new PoseEngine(canon, { tracker });
  const pos = [], ks = [];
  for (let i = 0; i < frames; i++) {
    const sy = synth({ noise: 0.3, matNoise: 0.03 });
    const lm = sy.res.faceLandmarks[0];
    if (i >= warm) {
      mutate?.(lm, i - warm, sy.W, sy.H);
      if (blend) sy.res.faceBlendshapes = [{ categories: blend }];
    }
    const o = eng.update(sy.res, sy.W, sy.H, i * 33.333);
    if (i >= warm) { pos.push([o.position[0] - 0.6, o.position[1] + 0.4]); ks.push(o.scale); }
  }
  const dk = ks.slice(1).map((k, i) => Math.abs(k - ks[i]) / ks[i]);
  return { ey: rms(pos.map((p) => p[1])) * 10, ex: rms(pos.map((p) => p[0])) * 10, kDev: Math.max(...ks.map((k) => Math.abs(k - 1))), dkMax: Math.max(...dk), relocks: eng.relocks || 0 };
}
// Iris mata kiri subjek (473–477) rusak seperti saat dipejamkan: turun & mengecil.
const closeLeftEye = (lm, _i, W, H) => {
  const c = lm[473];
  for (let j = 473; j <= 477; j++) { lm[j].x = c.x + (lm[j].x - c.x) * 0.35; lm[j].y = c.y + (lm[j].y - c.y) * 0.35 + 7 / H; }
};
const hairOver = (lm, _i, W, H) => {
  for (const j of [...BROWS, 127, 356, 234, 454]) { lm[j].x += (gauss() * 7) / W; lm[j].y += (gauss() * 7) / H; }
};

test("Satu mata dipejamkan (blendshape ada): posisi tetap <1 mm, ukuran tidak berubah, tanpa kalibrasi ulang", () => {
  const r = stress({ mutate: closeLeftEye, blend: [{ categoryName: "eyeBlinkLeft", score: 0.9 }] });
  console.log(`   galat Y ${r.ey.toFixed(2)} mm, X ${r.ex.toFixed(2)} mm, penyimpangan ukuran maks ${(r.kDev * 100).toFixed(2)}%, lompatan ukuran/frame maks ${(r.dkMax * 100).toFixed(2)}%`);
  assert.ok(r.ey < 1 && r.ex < 1, "posisi stabil");
  assert.ok(r.kDev < 0.01 && r.dkMax < 0.006, "ukuran stabil");
  assert.equal(r.relocks, 0);
});

test("Satu mata dipejamkan TANPA sinyal blendshape (deteksi gagal): node tak sehat tetap dikeluarkan", () => {
  const r = stress({ mutate: closeLeftEye });
  console.log(`   galat Y ${r.ey.toFixed(2)} mm, ukuran maks ${(r.kDev * 100).toFixed(2)}%`);
  assert.ok(r.ey < 1.2 && r.ex < 1.2);
  assert.ok(r.kDev < 0.01 && r.relocks === 0);
});

test("Alis & pelipis tertutup rambut (landmark goyang ±7 px acak tiap frame): ukuran dan posisi tidak 'berdenyut'", () => {
  const r = stress({ mutate: hairOver });
  console.log(`   galat Y ${r.ey.toFixed(2)} mm, X ${r.ex.toFixed(2)} mm, ukuran maks ${(r.kDev * 100).toFixed(2)}%, lompatan ukuran/frame maks ${(r.dkMax * 100).toFixed(2)}%`);
  assert.ok(r.ey < 1.5 && r.ex < 1.5);
  assert.ok(r.kDev < 0.02 && r.dkMax < 0.006, "ukuran tidak membesar-mengecil");
  assert.equal(r.relocks, 0);
});

test("Mata dipejamkan bergantian (wink kiri 1 dtk → kanan 1 dtk) + rambut: tidak ada loncatan posisi >2 mm antar frame", () => {
  const eng = new PoseEngine(canon);
  let prev = null, worst = 0, kmax = 0;
  for (let i = 0; i < 200; i++) {
    const sy = synth({ noise: 0.3, matNoise: 0.03 });
    const lm = sy.res.faceLandmarks[0];
    let blend = [];
    if (i >= 45) {
      const ph = Math.floor((i - 45) / 30) % 4;
      if (ph === 1) { closeLeftEye(lm, 0, sy.W, sy.H); blend = [{ categoryName: "eyeBlinkLeft", score: 0.9 }]; }
      if (ph === 3) { for (let j = 468; j <= 472; j++) { const c = lm[468]; lm[j].x = c.x + (lm[j].x - c.x) * 0.35; lm[j].y = c.y + (lm[j].y - c.y) * 0.35 + 7 / sy.H; } blend = [{ categoryName: "eyeBlinkRight", score: 0.9 }]; }
      hairOver(lm, 0, sy.W, sy.H);
    }
    sy.res.faceBlendshapes = [{ categories: blend }];
    const o = eng.update(sy.res, sy.W, sy.H, i * 33.333);
    if (i >= 50) { worst = Math.max(worst, Math.hypot(o.position[0] - prev[0], o.position[1] - prev[1])); kmax = Math.max(kmax, Math.abs(o.scale - 1)); }
    prev = o.position;
  }
  console.log(`   loncatan posisi maks ${(worst * 10).toFixed(2)} mm/frame, ukuran maks ${(kmax * 100).toFixed(2)}%`);
  assert.ok(worst * 10 < 2, "tanpa patah-patah");
  assert.ok(kmax < 0.02);
});

test("ML (Python→JSON→JS): prediksi JS identik dengan numpy; model sintetis diabaikan; koreksi z benar-benar masuk ke fit", () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "nc-")), "m.json");
  try {
    execFileSync("python3", [new URL("../../ml/train_node_corrector.py", import.meta.url).pathname, "--demo", "--out", out], { stdio: "pipe" });
  } catch (e) {
    console.log("   (python3/numpy tidak tersedia — uji dilewati)");
    return;
  }
  const model = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(model.kind, "synthetic");
  assert.equal(makeCorrector(model), null, "model sintetis tidak boleh aktif");
  const real = makeCorrector({ ...model, kind: "real", clamp_cm: 99 });
  const got = real.predict(model.golden.x);
  model.golden.y.forEach((v, i) => assert.ok(Math.abs(got[i] - v) < 1e-9, `paritas JS/Python target ${i}: ${got[i]} vs ${v}`));
  // Efek pada fit: model konstan (W=0, b=+0.2 / −0.1 cm) menggeser kedalaman persis sebesar itu.
  const feat = model.features;
  const flat = { version: 1, kind: "real", features: feat, mean: feat.map(() => 0), std: feat.map(() => 1), W: feat.map(() => [0, 0]), b: [0.2, -0.1], clamp_cm: 0.5 };
  const SPEC = { lensL: [3.78, -1.31, -0.37], lensR: [-3.78, -1.31, -0.37], bridge: [0, -1.31, -0.68], frameWidthMm: 146, lensWidthMm: 55.9, lensHeightMm: 52.7 };
  const fitZ = (corr) => {
    const eng = new PoseEngine(canon, { corrector: corr });
    eng.setModel(SPEC);
    let o;
    for (let i = 0; i < 45; i++) { const sy = synth({ noise: 0 }); o = eng.update(sy.res, sy.W, sy.H, i * 33.333); }
    return o.fit;
  };
  const a = fitZ(null), b = fitZ(flat), c = fitZ(model); // c: sintetis → identik dengan a
  assert.deepEqual(c.position, a.position);
  assert.ok(Math.abs(b.position[2] - a.position[2]) > 0.05, `koreksi z memengaruhi kedalaman (${a.position[2].toFixed(3)} → ${b.position[2].toFixed(3)})`);
});

test("Melirik (iris bergeser ±3,5 mm, kepala diam): kacamata tidak ikut bergerak — getaran layar < 0,15 px", () => {
  const m = measure(PATHS.melirik), j = Math.max(...Object.values(m).map((v) => v.jitter));
  console.log(`   getaran tampil saat melirik: ${j.toFixed(3)} px (sebelum node kaku: ±0,75 px)`);
  assert.ok(j < 0.15);
});

test("Gerak cepat (sapuan ±3 cm, yaw ±25°) dengan noise landmark & rotasi: getaran tampil < 1 px, galat < 4 px", () => {
  const m = measure(PATHS.sapuan), v = Object.values(m), j = Math.max(...v.map((x) => x.jitter)), e = Math.max(...v.map((x) => x.err));
  console.log(`   sapuan: getaran ${j.toFixed(2)} px, galat ${e.toFixed(2)} px (One Euro: galat ±14 px)`);
  assert.ok(j < 1.0, `getaran ${j}`);
  assert.ok(e < 4, `galat ${e}`);
});

test("Diam & gerak pelan: getaran tampil < 0,1 px", () => {
  for (const k of ["diam", "pelan"]) {
    const j = Math.max(...Object.values(measure(PATHS[k])).map((v) => v.jitter));
    assert.ok(j < 0.1, `${k}: ${j}`);
  }
});

test("Model tanpa rig: dimensi diperkirakan dari kotak batas → laporan kecocokan tetap muncul (diberi catatan 'diperkirakan')", () => {
  const cm = estimateSpecFromBox({ min: [-7.2, -2.3, -9], max: [7.2, 2.3, 0.9] });
  const mm = estimateSpecFromBox({ min: [-72, -23, -90], max: [72, 23, 9] });
  assert.ok(cm.estimated && Math.abs(cm.frameWidthMm - 144) < 0.5);
  assert.ok(Math.abs(mm.frameWidthMm - 144) < 0.5 && Math.abs(mm.unit - 0.1) < 1e-9, "satuan mm terdeteksi");
  assert.equal(estimateSpecFromBox({ min: [-1, -1, -1], max: [1, 1, 1] }), null, "bukan ukuran kacamata → ditolak");
  const eng = new PoseEngine(canon, { tracker: "magnet" });
  eng.setModel(cm);
  let out;
  for (let i = 0; i < 90; i++) { const sy = synth({ noise: 0.3 }); out = eng.update(sy.res, sy.W, sy.H, i * 33.333); }
  assert.ok(out.fit && out.report?.length >= 4, "ada fit + laporan");
  assert.ok(out.report.some((r) => r.key === "estimated"), "catatan perkiraan ada");
  assert.ok(out.report.some((r) => r.key === "width") && out.report.some((r) => r.key === "pupil"));
});

let fail = 0;
for (const [n, f] of tests) {
  try { f(); console.log("✓", n); } catch (e) { fail++; console.log("✗", n, "\n  ", e.message); }
}
console.log(fail ? `\n${fail} gagal` : `\nSemua ${tests.length} uji lolos`);
process.exit(fail ? 1 : 0);
