// Uji ukuran frame 1:1: validasi isian Mitra, lebar efektif, penskalaan spesifikasi, dan fit otomatis ke wajah.
import { cleanSize, effectiveFrameWidthMm, sizeCode } from "../src/data/frameSize.js";
import { applyRealSize, autoFitScale } from "../src/ar/sizeSpec.js";
import { fuseFace } from "../src/ar/anthropometry.js";
import { craniumRadiusX } from "../src/ar/modelFit.js";
let n = 0; const ok = (c, m) => { if (!c) { console.error("✗ " + m); process.exit(1); } console.log("✓ " + m); n++; };
ok(cleanSize({}).value === null && cleanSize(null).value === null, "Isian kosong → tanpa ukuran (otomatis fit wajah)");
ok(cleanSize({ lensWidthMm: "52", bridgeMm: 18, templeMm: 140 }).value.lensWidthMm === 52, "Angka dari form (string) diterima");
ok(!!cleanSize({ lensWidthMm: 90 }).error && !!cleanSize({ templeMm: "abc" }).error, "Di luar rentang / bukan angka ditolak");
ok(sizeCode({ lensWidthMm: 52, bridgeMm: 18, templeMm: 140 }) === "52-18-140", "Notasi optik 52-18-140");
ok(effectiveFrameWidthMm({ frameWidthMm: 135 }) === 135 && effectiveFrameWidthMm({ lensWidthMm: 52, bridgeMm: 18 }) === 134 && effectiveFrameWidthMm({ lensWidthMm: 52 }) === null, "Lebar efektif: eksplisit > turunan > tidak ada");
const spec = { unit: 1, lensL: [3, 0, 0], lensR: [-3, 0, 0], bridge: [0, 0, -1], templeL: [7, 0, -1], templeR: [-7, 0, -1], frameWidthMm: 140, lensWidthMm: 50, lensHeightMm: 40, bridgeWidthMm: 18, templeLengthMm: 140, lensSepMm: 60 };
const r = applyRealSize(spec, { frameWidthMm: 126, lensWidthMm: 46 });
ok(Math.abs(r.unit - 0.9) < 1e-9 && Math.abs(r.lensL[0] - 2.7) < 1e-9 && r.frameWidthMm === 126 && r.lensWidthMm === 46 && r.realSize, "Ukuran asli 126 mm pada model 140 mm → skala 0,9, nilai Mitra dipakai");
ok(applyRealSize(spec, null) === spec, "Tanpa ukuran → spesifikasi tidak diubah");
ok(Math.abs(autoFitScale(spec, 140) - 0.99) < 1e-9 && autoFitScale(spec, 200) === 1.07 && autoFitScale(spec, 90) === 0.93 && autoFitScale(spec, null) === 1, "Fit otomatis: ≈ lebar wajah, dibatasi 0,93–1,07× (frame produk berukuran tetap, tidak lagi membesar sampai 1,2×)");
const wide = { ...spec, frameWidthMm: 141, lensSepMm: 70.8 };
const a = autoFitScale(wide, 161, 63);
ok(autoFitScale(wide, 161) >= 1.06 && Math.abs(a - 1.0) < 0.01, "Wajah terukur terlalu lebar dibanding PD 63 mm: lebar diredam (fuse), frame tidak membesar");
ok(autoFitScale(wide, 161, 30) === autoFitScale(wide, 161) && autoFitScale({ ...wide, lensSepMm: 0 }, 161, 63) > 1.0, "PD tidak wajar → patokan lebar wajah saja; model tanpa jarak lensa tidak dipaksa menyesuaikan PD");
// Frame tidak boleh lebih sempit dari wajah (engsel harus di luar kepala) walau PD kecil; jarak lensa tetap didekatkan ke PD.
const roundWire = { ...spec, frameWidthMm: 135, lensSepMm: 76 };
const rw = autoFitScale(roundWire, 131, 59);
ok(rw >= 0.93 - 1e-9 && rw < 1, `Wajah 131 mm / PD 59 mm, model lebar 135 mm & jarak lensa 76 mm: ${rw.toFixed(3)}× (≥ batas bawah 0,93, < 1)`);
ok(fuseFace(170, 59).corrected && fuseFace(170, 59).face / 59 < 2.66 + 0.2 && fuseFace(170, 59).face < 170, "Lebar wajah 170 mm vs PD 59 mm (rasio 2,9) diredam ke rasio wajar");
ok(!fuseFace(153, 63).corrected && fuseFace(153, 63).face === 153 && !fuseFace(155, 59).corrected, "Rasio wajar (2,43 / 2,63) tidak diubah");
ok(fuseFace(140, 30).pd === null && fuseFace(null, 62).face > 130 && fuseFace(null, null).face === null, "PD tak wajar dibuang; tanpa lebar wajah diturunkan dari PD");
ok(Math.abs(craniumRadiusX(6.4) - 6.1) < 1e-9 && craniumRadiusX(8) === 6.85 && craniumRadiusX(3) === 4.8 && craniumRadiusX(0) === 6.85, "Tempurung kepala menyusut mengikuti engsel frame sempit, tetap dalam batas");
console.log(`\nSemua ${n} uji lolos`);
