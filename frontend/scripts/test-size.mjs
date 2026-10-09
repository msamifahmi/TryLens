// Uji ukuran frame 1:1: validasi isian Mitra, lebar efektif, penskalaan spesifikasi, dan fit otomatis ke wajah.
import { cleanSize, effectiveFrameWidthMm, sizeCode } from "../src/data/frameSize.js";
import { applyRealSize, autoFitScale } from "../src/ar/sizeSpec.js";
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
ok(Math.abs(autoFitScale(spec, 140) - 0.99) < 1e-9 && autoFitScale(spec, 200) === 1.12 && autoFitScale(spec, 90) === 0.88 && autoFitScale(spec, null) === 1, "Fit otomatis: ≈ lebar wajah, dibatasi ±12%");
console.log(`\nSemua ${n} uji lolos`);
