// Uji ar/modelFit.js: arah hadap, normalisasi skala, estimasi spesifikasi tanpa rig, dan faktor panjang gagang.
import { analyzePoints, facesBackward, templeFactor, EAR_TIP_Z } from "../src/ar/modelFit.js";
let n = 0; const ok = (c, m) => { if (!c) { console.error("✗ " + m); process.exit(1); } console.log("✓ " + m); n++; };

// Kacamata sintetis (cm): rim depan di z=0 lebar 14, dua lensa, jembatan di tengah, gagang ke -Z sepanjang 12 (z = 0 .. -12).
function glasses(dir = 1, scale = 1, offX = 0) {
  const p = [];
  const add = (x, y, z) => p.push((x + offX) * scale, y * scale, z * dir * scale);
  for (let i = 0; i <= 20; i++) for (const sx of [-1, 1]) { const a = (i / 20) * 6.28; add(sx * 3.6 + 2.6 * Math.cos(a), 2.3 * Math.sin(a), 0); }
  for (let x = -1; x <= 1; x += 0.1) { add(x, 0.6, 0); add(x, 0.6, -0.5); }
  for (let z = 0; z >= -12; z -= 0.3) for (const sx of [-1, 1]) add(sx * 7, 0.8, z);
  return Float32Array.from(p);
}
const f = analyzePoints(glasses());
ok(f && !f.normalized && Math.abs(f.spec.frameWidthMm - 140) < 8, "Model cm: lebar frame terbaca ≈ 14 cm tanpa normalisasi");
ok(f.spec.lensL[0] > 0 && f.spec.lensR[0] < 0 && Math.abs(f.spec.lensL[0] + f.spec.lensR[0]) < 0.2, "Lensa kiri +X, kanan −X, simetris");
ok(f.spec.bridge[2] < f.spec.lensL[2] + 0.01 && f.spec.templeL[2] < f.spec.lensL[2], "Bridge di belakang lensa, engsel gagang di belakang bidang depan");
ok(!facesBackward(glasses(1)) && facesBackward(glasses(-1)), "Model yang menghadap −Z (gagang ke kamera) terdeteksi untuk dibalik");
const big = analyzePoints(glasses(1, 0.01)); // meter-ish: 0,14 → x100
ok(big && Math.abs(big.spec.frameWidthMm - 140) < 8, "Satuan meter dikenali");
const odd = analyzePoints(glasses(1, 0.1)); // lebar 1,4 satuan, tidak lazim
ok(odd && Math.abs(odd.spec.frameWidthMm - 140) < 8, "Skala aneh dinormalkan ke ±14 cm");
const off = analyzePoints(glasses(1, 1, 5)); // titik asal bergeser 5 cm
ok(off && Math.abs((off.spec.lensL[0] + off.spec.lensR[0]) / 2 - 5) < 0.2, "Titik asal tak di tengah jembatan: pusat simetri ikut posisi nyata model");
ok(analyzePoints(Float32Array.from([0, 0, 0, 1, 1, 1])) === null, "Titik terlalu sedikit → null");
// Gagang: engsel di head z=4,5; ujung asli di −7,5 → target −6,4.
const fac = templeFactor(4.5, -7.5);
ok(Math.abs(4.5 - fac * 12 - EAR_TIP_Z) < 0.01 && fac < 1, "Gagang terlalu panjang dipendekkan agar ujung di belakang telinga");
ok(templeFactor(4.5, -3) > 1 && templeFactor(4.5, -3) <= 1.6, "Gagang terlalu pendek dipanjangkan (maks 1,6×)");
ok(templeFactor(4.5, -100) === 0.7 && templeFactor(4.5, 4.4) === 1, "Batas faktor 0,7–1,6 dan data tak wajar diabaikan");
console.log(`\nSemua ${n} uji lolos`);
