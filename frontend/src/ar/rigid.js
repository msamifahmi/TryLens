// Penyelaras rigid 3D (rotasi + translasi + skala opsional) dengan bobot — metode Horn (quaternion, 1987).
// Fungsi murni, tanpa DOM, supaya bisa diuji di Node dan dipakai di PoseEngine.
//
//   solveRigid(A, P, w, { scale }) : cari R, t, s sehingga P_i ≈ s·R·A_i + t, meminimalkan Σ w_i |P_i − (s R A_i + t)|²
//   A, P : Float64Array berisi xyz berurutan (panjang 3n) · w : bobot per titik (panjang n) atau null
export function jacobiEig4(S) {
  // Eigen-dekomposisi matriks simetris 4x4 dengan rotasi Jacobi. Mengembalikan { values, vectors (kolom) }.
  const A = S.map((r) => r.slice());
  const V = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  for (let sweep = 0; sweep < 30; sweep++) {
    let off = 0;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) off += A[i][j] * A[i][j];
    if (off < 1e-24) break;
    for (let p = 0; p < 3; p++) {
      for (let q = p + 1; q < 4; q++) {
        if (Math.abs(A[p][q]) < 1e-30) continue;
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < 4; k++) {
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 4; k++) {
          const apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 4; k++) {
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { values: [A[0][0], A[1][1], A[2][2], A[3][3]], vectors: V };
}

export const quatToMat = ([x, y, z, w]) => [
  [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]
];

export function solveRigid(A, P, w = null, { scale = false } = {}) {
  const n = A.length / 3;
  let sw = 0;
  const ca = [0, 0, 0], cp = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const wi = w ? w[i] : 1;
    if (!(wi > 0)) continue;
    sw += wi;
    for (let a = 0; a < 3; a++) { ca[a] += wi * A[3 * i + a]; cp[a] += wi * P[3 * i + a]; }
  }
  if (sw <= 0) return null;
  for (let a = 0; a < 3; a++) { ca[a] /= sw; cp[a] /= sw; }
  let Sxx = 0, Sxy = 0, Sxz = 0, Syx = 0, Syy = 0, Syz = 0, Szx = 0, Szy = 0, Szz = 0, saa = 0;
  for (let i = 0; i < n; i++) {
    const wi = w ? w[i] : 1;
    if (!(wi > 0)) continue;
    const ax = A[3 * i] - ca[0], ay = A[3 * i + 1] - ca[1], az = A[3 * i + 2] - ca[2];
    const px = P[3 * i] - cp[0], py = P[3 * i + 1] - cp[1], pz = P[3 * i + 2] - cp[2];
    Sxx += wi * ax * px; Sxy += wi * ax * py; Sxz += wi * ax * pz;
    Syx += wi * ay * px; Syy += wi * ay * py; Syz += wi * ay * pz;
    Szx += wi * az * px; Szy += wi * az * py; Szz += wi * az * pz;
    saa += wi * (ax * ax + ay * ay + az * az);
  }
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]
  ];
  const { values, vectors } = jacobiEig4(N);
  let k = 0;
  for (let i = 1; i < 4; i++) if (values[i] > values[k]) k = i;
  let q = [vectors[1][k], vectors[2][k], vectors[3][k], vectors[0][k]]; // [x,y,z,w]
  const nq = Math.hypot(...q) || 1;
  q = q.map((v) => v / nq);
  const R = quatToMat(q);
  let s = 1;
  if (scale && saa > 0) {
    let num = 0;
    for (let i = 0; i < n; i++) {
      const wi = w ? w[i] : 1;
      if (!(wi > 0)) continue;
      const a = [A[3 * i] - ca[0], A[3 * i + 1] - ca[1], A[3 * i + 2] - ca[2]];
      const ra = [0, 1, 2].map((r) => R[r][0] * a[0] + R[r][1] * a[1] + R[r][2] * a[2]);
      num += wi * (ra[0] * (P[3 * i] - cp[0]) + ra[1] * (P[3 * i + 1] - cp[1]) + ra[2] * (P[3 * i + 2] - cp[2]));
    }
    s = num / saa;
  }
  const t = [0, 1, 2].map((r) => cp[r] - s * (R[r][0] * ca[0] + R[r][1] * ca[1] + R[r][2] * ca[2]));
  return { R, q, t, s };
}
