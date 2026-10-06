import fs from "node:fs";
import { RIDGE } from "../../src/ar/eyeFit.js";
export const canon = Float64Array.from(JSON.parse(fs.readFileSync(new URL("../../src/data/canonicalFace.json", import.meta.url))).v);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
export const rad = (d) => (d * Math.PI) / 180;
const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const Ry = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const Rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const Rz = (a) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];

export const IRIS_FWD = 0.9;
export function synth({ s = 1, yaw = 0, pitch = 0, roll = 0, dist = 45, noise = 0, bridge = [0, 0, 0], W = 1280, H = 720, irisMm = 11.7, pdScale = 1, noseShift = [0, 0, 0], eyeDy = [0, 0], tx = 0.6, ty = -0.4, matrixBias = [0, 0], matNoise = 0, rotNoise = 0, gaze = [0, 0] }) {
  // rotNoise (derajat): getaran orientasi matriks pose antar-frame seperti pada MediaPipe nyata.
  const R = mul(mul(Ry(rad(yaw + rotNoise * gauss())), Rx(rad(pitch + rotNoise * gauss()))), Rz(rad(roll + rotNoise * gauss())));
  const C = [];
  for (let i = 0; i < 468; i++) C.push([canon[3 * i] * s, canon[3 * i + 1] * s, canon[3 * i + 2] * s]);
  for (let a = 0; a < 3; a++) C[6][a] += bridge[a] * s;
  for (const i of RIDGE) for (let a = 0; a < 3; a++) C[i][a] += noseShift[a] * s;
  const eye = (i, j, sign) => {
    const c = [0, 1, 2].map((a) => ((canon[3 * i + a] + canon[3 * j + a]) / 2) * s);
    c[0] *= pdScale;
    c[1] += eyeDy[sign ? 1 : 0] * s;
    c[2] += IRIS_FWD * s; // iris menonjol ±9 mm di depan garis sudut mata (asumsi anatomi; mesh kanonik tidak memodelkan bola mata)
    // arah pandang: iris bergeser di dalam rongga mata (mm → cm); sudut mata & landmark wajah lain tidak ikut
    c[0] += gaze[0] / 10; c[1] += gaze[1] / 10; c[2] -= (Math.hypot(gaze[0], gaze[1]) ** 2) / 24 / 10;
    const r = irisMm / 20; // iris tidak ikut membesar bersama wajah
    return [c, [c[0] + r, c[1], c[2]], [c[0], c[1] + r, c[2]], [c[0] - r, c[1], c[2]], [c[0], c[1] - r, c[2]]];
  };
  const iris = [...eye(33, 133, 0), ...eye(362, 263, 1)];
  const all = [...C, ...iris];
  const T0 = [tx, ty, -dist];
  const cam = all.map((p) => [0, 1, 2].map((a) => R[a][0] * p[0] + R[a][1] * p[1] + R[a][2] * p[2] + T0[a]));
  const f = H / 2 / Math.tan(rad(31.5));
  const dm = cam.slice(0, 468).reduce((v, p) => v - p[2] / 468, 0);
  const lm = cam.map((p) => ({
    x: (W / 2 + (f * p[0]) / -p[2] + noise * gauss()) / W,
    y: (H / 2 - (f * p[1]) / -p[2] + noise * gauss()) / H,
    z: ((-p[2] - dm) * (f / dm)) / W + (noise * 2 * gauss()) / W
  }));
  // Matriks pose MediaPipe: wajah dianggap berukuran kanonik -> translasi = T0 / s.
  const d = [R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, (T0[0] + matrixBias[0] + matNoise * gauss()) / s, (T0[1] + matrixBias[1] + matNoise * gauss()) / s, (T0[2] + matNoise * gauss()) / s, 1];
  return { R, res: { faceLandmarks: [lm], facialTransformationMatrixes: [{ data: d }], faceBlendshapes: [{ categories: [] }] }, W, H, T0, R };
}

