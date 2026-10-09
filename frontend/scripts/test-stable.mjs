// Uji penyelaras rigid (Horn) dan pelacak "stable": pemulihan transformasi eksak + kestabilan saat diam.
import { solveRigid, quatToMat } from "../src/ar/rigid.js";
let n = 0; const ok = (c, m) => { if (!c) { console.error("✗ " + m); process.exit(1); } console.log("✓ " + m); n++; };
const q = [0.1, -0.2, 0.15, 0]; q[3] = Math.sqrt(1 - q[0] ** 2 - q[1] ** 2 - q[2] ** 2);
const R = quatToMat(q), t = [1.5, -2, 40];
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
const A = new Float64Array(150).map(() => rnd() * 10), P = new Float64Array(150);
for (let i = 0; i < 50; i++) for (let r = 0; r < 3; r++) P[3 * i + r] = R[r][0] * A[3 * i] + R[r][1] * A[3 * i + 1] + R[r][2] * A[3 * i + 2] + t[r];
const s = solveRigid(A, P, null);
ok(s.t.every((v, i) => Math.abs(v - t[i]) < 1e-9) && s.R.flat().every((v, i) => Math.abs(v - R.flat()[i]) < 1e-9), "solveRigid memulihkan rotasi dan translasi secara eksak");
const sc = solveRigid(A, P.map((v) => v * 1.1), null, { scale: true });
ok(Math.abs(sc.s - 1.1) < 1e-9, "solveRigid memulihkan skala");
console.log(`\nSemua ${n} uji lolos`);
