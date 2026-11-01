// Siapkan model 3D mentah (hasil unduhan/marketplace) menjadi aset katalog TryLens.
//   node scripts/prepare-glb.mjs <masuk.glb> <keluar.glb> --id=f21 --width=140 --temple=130 [opsi]
//
// Yang dikerjakan: (1) menerapkan transformasi node ke geometri & membuang lampu/kubus warna/node kosong,
// (2) skala ke ukuran nyata (cm) dan pusatkan di sumbu X, (3) memanjangkan gagang bila model terlalu pendek,
// (4) memberi nama material, mewarnai ulang, dan membuat lensa bila model tidak punya, lalu (5) memasang rig TryLens
// (npm run glb:rig) dan memvalidasinya. Sumbu masukan harus sudah +Y atas, +Z depan (gagang ke −Z).
//
// Opsi: --width=<mm lebar frame>  --temple=<mm panjang gagang>  --drop-small=<n> buang mesh ≤ n verteks (kubus swatch)
//       --temple-mat=<regex>  --front-mat=<regex> (bagian depan; untuk membuat lensa)  --gen-lens=<r,g,b,a>
//       --recolor=<regex>:<r>,<g>,<b>;…  --temple-gap=<cm>  --lens=<regex material lensa, default glass|lens>
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { buildRig, validateRig } from "./lib/glbRig.mjs";

const [inp, out, ...flags] = process.argv.slice(2);
if (!inp || !out) { console.error("Pemakaian: node scripts/prepare-glb.mjs <masuk.glb> <keluar.glb> --id=fNN --width=140 --temple=130 [opsi]"); process.exit(2); }
const opt = Object.fromEntries(flags.map((f) => f.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const id = opt.id || "model";
const widthCm = parseFloat(opt.width || "140") / 10;
const templeCm = opt.temple ? parseFloat(opt.temple) / 10 : null;
const lensRe = new RegExp(opt.lens || "glass|lens", "i");

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
const scene = root.listScenes()[0];

/* 1) terapkan transformasi node ke verteks, ratakan hierarki */
const cof = (m) => { // kofaktor 3x3 (matriks normal)
  const [a, b, c, d, e, f, g, h, i] = [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
  return [e * i - f * h, f * g - d * i, d * h - e * g, c * h - b * i, a * i - c * g, b * g - a * h, b * f - c * e, c * d - a * f, a * e - b * d];
};
const meshNodes = root.listNodes().filter((n) => n.getMesh());
for (const n of meshNodes) {
  const M = n.getWorldMatrix(), C = cof(M);
  for (const prim of n.getMesh().listPrimitives()) {
    const pos = prim.getAttribute("POSITION"), nor = prim.getAttribute("NORMAL");
    const P = pos.getArray(), cnt = pos.getCount();
    for (let i = 0; i < cnt; i++) {
      const x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2];
      P[3 * i] = M[0] * x + M[4] * y + M[8] * z + M[12];
      P[3 * i + 1] = M[1] * x + M[5] * y + M[9] * z + M[13];
      P[3 * i + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
    }
    pos.setArray(P);
    if (nor) {
      const N = nor.getArray();
      for (let i = 0; i < nor.getCount(); i++) {
        const x = N[3 * i], y = N[3 * i + 1], z = N[3 * i + 2];
        const nx = C[0] * x + C[1] * y + C[2] * z, ny = C[3] * x + C[4] * y + C[5] * z, nz = C[6] * x + C[7] * y + C[8] * z;
        const l = Math.hypot(nx, ny, nz) || 1;
        N[3 * i] = nx / l; N[3 * i + 1] = ny / l; N[3 * i + 2] = nz / l;
      }
      nor.setArray(N);
    }
  }
}
for (const n of meshNodes) { n.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]); n.getParentNode()?.removeChild(n); scene.addChild(n); }
for (const n of root.listNodes()) if (!n.getMesh()) n.dispose();

/* 2) buang mesh kecil (kubus pilihan warna dsb.) */
const dropN = parseInt(opt["drop-small"] || "0", 10);
if (dropN) for (const n of meshNodes) {
  const prims = n.getMesh().listPrimitives();
  if (prims.every((p) => p.getAttribute("POSITION").getCount() <= dropN)) { const m = n.getMesh(); n.dispose(); m.dispose(); }
}

const prims = () => root.listNodes().flatMap((n) => n.getMesh()?.listPrimitives() ?? []);
const matName = (p) => p.getMaterial()?.getName() ?? "";

/* 3) skala ke cm, pusatkan X, depan di z=0 */
const bb = () => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of prims()) { const a = p.getAttribute("POSITION").getArray(); for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a[i + k]); mx[k] = Math.max(mx[k], a[i + k]); } } return { mn, mx }; };
{
  const { mn, mx } = bb();
  const s = widthCm / (mx[0] - mn[0]), cx = (mx[0] + mn[0]) / 2, fz = mx[2];
  for (const p of prims()) { const pos = p.getAttribute("POSITION"), a = pos.getArray(); for (let i = 0; i < a.length; i += 3) { a[i] = (a[i] - cx) * s; a[i + 1] *= s; a[i + 2] = (a[i + 2] - fz) * s; } pos.setArray(a); }
}

/* 3b) satu mesh berisi rim + gagang (kawat): pecah menjadi bagian depan dan gagang menurut posisi segitiga (z < ambang, di tepi luar) */
if (opt["split-temples"]) {
  const zt = parseFloat(opt["split-temples"]);
  const re = new RegExp(opt["temple-mat"] || ".", "i");
  const { mn, mx } = bb();
  const outerX = ((mx[0] - mn[0]) / 2) * 0.76;
  for (const node of root.listNodes().filter((n) => n.getMesh())) {
    const mesh = node.getMesh();
    for (const prim of mesh.listPrimitives()) {
      if (!re.test(matName(prim)) || !prim.getIndices()) continue;
      const idx = prim.getIndices().getArray(), P = prim.getAttribute("POSITION").getArray();
      const front = [], temple = [];
      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2];
        const zmax = Math.max(P[3 * a + 2], P[3 * b + 2], P[3 * c + 2]);
        const xm = Math.abs(P[3 * a] + P[3 * b] + P[3 * c]) / 3;
        (zmax < zt && xm > outerX ? temple : front).push(a, b, c);
      }
      if (!temple.length) continue;
      const make = (list, name) => {
        const remap = new Map(); const attrs = {};
        for (const sem of prim.listSemantics()) attrs[sem] = [];
        const ni = [];
        for (const v of list) { if (!remap.has(v)) { remap.set(v, remap.size); for (const sem of prim.listSemantics()) { const acc = prim.getAttribute(sem), es = acc.getElementSize(); for (let e = 0; e < es; e++) attrs[sem].push(acc.getArray()[v * es + e]); } } ni.push(remap.get(v)); }
        const np = doc.createPrimitive().setMaterial(prim.getMaterial()).setName(name);
        const buf = root.listBuffers()[0];
        for (const sem of prim.listSemantics()) { const old = prim.getAttribute(sem); np.setAttribute(sem, doc.createAccessor().setType(old.getType()).setArray(new (old.getArray().constructor)(attrs[sem])).setBuffer(buf).setNormalized(old.getNormalized())); }
        np.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(ni)).setBuffer(buf));
        return np;
      };
      const fp = make(front, "front"), tp = make(temple, "temples");
      mesh.removePrimitive(prim); mesh.addPrimitive(fp);
      const tmesh = doc.createMesh("temples").addPrimitive(tp);
      scene.addChild(doc.createNode("temples").setMesh(tmesh));
      console.log(`mesh dipecah: depan ${front.length / 3} segitiga, gagang ${temple.length / 3}`);
    }
  }
}

/* 4) panjangkan gagang bila model terlalu pendek (regangkan di sepanjang −Z dari engsel) */
if (templeCm && opt["temple-mat"]) {
  const re = new RegExp(opt["temple-mat"], "i");
  const tp = prims().filter((p) => re.test(matName(p)) && (!opt["split-temples"] || p.getName() === "temples"));
  let tz0 = -1e9, tmin = 1e9;
  for (const p of tp) { const a = p.getAttribute("POSITION").getArray(); for (let i = 2; i < a.length; i += 3) { tz0 = Math.max(tz0, a[i]); tmin = Math.min(tmin, a[i]); } }
  const k = templeCm / (tz0 - tmin);
  if (k > 1.02) for (const p of tp) { const pos = p.getAttribute("POSITION"), a = pos.getArray(); for (let i = 2; i < a.length; i += 3) a[i] = tz0 + (a[i] - tz0) * k; pos.setArray(a); }
  console.log(`gagang: ${((tz0 - tmin) * 10).toFixed(0)} mm → ${((tz0 - tmin) * 10 * Math.max(k, 1)).toFixed(0)} mm (×${Math.max(k, 1).toFixed(2)})`);
}

/* 5) nama & warna material */
for (const m of root.listMaterials()) m.setName(`${/glass|lens/i.test(m.getName()) ? "glass" : "mat"}_${id}_${m.getName().replace(/[^A-Za-z0-9]+/g, "_")}`);
for (const rule of (opt.recolor || "").split(";").filter(Boolean)) {
  const [re, rgb] = rule.split(":");
  for (const m of root.listMaterials()) if (new RegExp(re, "i").test(m.getName())) m.setBaseColorFactor([...rgb.split(",").map(Number), 1]);
}

/* 6) lensa: buat bila belum ada. Rasterkan proyeksi bagian depan (XY), cari lubang tertutup = bukaan lensa. */
const hasLens = prims().some((p) => lensRe.test(matName(p)) || /^glass_/.test(matName(p)));
if (!hasLens && opt["gen-lens"]) {
  const frontRe = new RegExp(opt["front-mat"] || ".", "i");
  const fp = prims().filter((p) => frontRe.test(matName(p)) && !new RegExp(opt["temple-mat"] || "^$", "i").test(matName(p)));
  const RES = 0.025;
  const { mn, mx } = (() => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of fp) { const a = p.getAttribute("POSITION").getArray(); for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a[i + k]); mx[k] = Math.max(mx[k], a[i + k]); } } return { mn, mx }; })();
  const W = Math.ceil((mx[0] - mn[0]) / RES) + 3, H = Math.ceil((mx[1] - mn[1]) / RES) + 3;
  const fill = new Uint8Array(W * H);
  const gx = (x) => (x - mn[0]) / RES + 1, gy = (y) => (y - mn[1]) / RES + 1;
  const zs = [];
  for (const p of fp) {
    const a = p.getAttribute("POSITION").getArray(), idx = p.getIndices()?.getArray();
    const T = idx ? idx.length / 3 : a.length / 9;
    for (let i = 2; i < a.length; i += 3) zs.push([a[i - 2], a[i - 1], a[i]]);
    for (let t = 0; t < T; t++) {
      const v = [0, 1, 2].map((q) => { const j = idx ? idx[3 * t + q] : 3 * t + q; return [gx(a[3 * j]), gy(a[3 * j + 1])]; });
      const x0 = Math.max(0, Math.floor(Math.min(v[0][0], v[1][0], v[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(v[0][0], v[1][0], v[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(v[0][1], v[1][1], v[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(v[0][1], v[1][1], v[2][1])));
      const e = (A, B, x, y) => (B[0] - A[0]) * (y - A[1]) - (B[1] - A[1]) * (x - A[0]);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const w0 = e(v[1], v[2], x, y), w1 = e(v[2], v[0], x, y), w2 = e(v[0], v[1], x, y);
        if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) fill[y * W + x] = 1;
      }
    }
  }
  // tutup celah kecil (retakan antar segitiga) lalu banjiri dari luar
  const outside = new Uint8Array(W * H), q = [0];
  outside[0] = 1;
  while (q.length) { const c = q.pop(), x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (!fill[n] && !outside[n]) { outside[n] = 1; q.push(n); } } }
  const comp = new Int32Array(W * H).fill(-1), comps = [];
  for (let c = 0; c < W * H; c++) {
    if (fill[c] || outside[c] || comp[c] >= 0) continue;
    const cells = [c]; comp[c] = comps.length; const st = [c];
    while (st.length) { const u = st.pop(), x = u % W, y = (u / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + dy) * W + x + dx; if (!fill[n] && !outside[n] && comp[n] < 0) { comp[n] = comps.length; cells.push(n); st.push(n); } } }
    comps.push(cells);
  }
  const big = comps.map((cells, i) => ({ cells, i })).filter((c) => c.cells.length * RES * RES > 3); // > 3 cm²
  const cx = (c) => c.cells.reduce((s, u) => s + (u % W), 0) / c.cells.length;
  const pick = (sign) => big.filter((c) => (mn[0] + (cx(c) - 1) * RES) * sign > 0).sort((a, b) => b.cells.length - a.cells.length)[0];
  const holes = [pick(+1), pick(-1)];
  if (holes.some((h) => !h)) throw new Error("Bukaan lensa kiri/kanan tidak ditemukan pada frame depan.");
  const [r, g, b, al] = opt["gen-lens"].split(",").map(Number);
  const mat = doc.createMaterial(`glass_${id}_lens`).setBaseColorFactor([r, g, b, al]).setAlphaMode("BLEND").setDoubleSided(true).setRoughnessFactor(0.05).setMetallicFactor(0);
  const N = 96, pos = [], idx = [];
  for (const h of holes) {
    const set = new Set(h.cells), mx0 = cx(h), my0 = h.cells.reduce((s, u) => s + ((u / W) | 0), 0) / h.cells.length;
    const base = pos.length / 3;
    const zAt = (x, y) => { let s = 0, n = 0; for (const p of zs) if (Math.hypot(p[0] - x, p[1] - y) < 0.2) { s += p[2]; n++; } return n ? s / n : (mn[2] + mx[2]) / 2; };
    const ring = [];
    for (let k = 0; k < N; k++) {
      const th = (k / N) * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
      let t = 0; while (set.has(Math.round(my0 + dy * (t + 1)) * W + Math.round(mx0 + dx * (t + 1)))) t++;
      t = Math.max(0, t - 1); // sisakan ~0,25 mm agar lensa menyelip di bawah bingkai
      ring.push([mn[0] + (mx0 + dx * t - 1) * RES, mn[1] + (my0 + dy * t - 1) * RES]);
    }
    const c = [mn[0] + (mx0 - 1) * RES, mn[1] + (my0 - 1) * RES];
    const zc = ring.reduce((s, p) => s + zAt(p[0], p[1]), 0) / N;
    pos.push(c[0], c[1], zc);
    for (const p of ring) pos.push(p[0], p[1], zc);
    for (let k = 0; k < N; k++) idx.push(base, base + 1 + k, base + 1 + ((k + 1) % N));
  }
  const buf = root.listBuffers()[0] ?? doc.createBuffer();
  const A = doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)).setBuffer(buf);
  const nrm = doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos.length).map((_, i) => (i % 3 === 2 ? 1 : 0))).setBuffer(buf);
  const I = doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(idx)).setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute("POSITION", A).setAttribute("NORMAL", nrm).setIndices(I).setMaterial(mat);
  const mesh = doc.createMesh("lens").addPrimitive(prim);
  scene.addChild(doc.createNode("lens").setMesh(mesh));
  console.log(`lensa dibuat: ${holes.map((h) => (h.cells.length * RES * RES).toFixed(1) + " cm²").join(" + ")}`);
}

/* 6b) beri nama node gagang "temples" agar pengukur rig tidak salah mengira bantalan hidung sebagai gagang */
if (opt["temple-mat"]) {
  const re = new RegExp(opt["temple-mat"], "i");
  for (const n of root.listNodes()) {
    const ps = n.getMesh()?.listPrimitives() ?? [];
    if (ps.length && ps.every((p) => (opt["split-temples"] ? p.getName() === "temples" : re.test(matName(p).replace(/^mat_[^_]+_/, ""))))) n.setName("temples");
  }
}

/* 7) rig TryLens + validasi */
const ropt = { lens: lensRe };
if (opt["temple-gap"]) ropt.templeGapCm = parseFloat(opt["temple-gap"]);
const m = buildRig(doc, ropt);
const v = validateRig(doc, ropt);
await io.write(out, doc);
console.log(`✓ ${out}\n  Metadata:`, JSON.stringify(m.meta));
v.warnings.forEach((w) => console.log("  ⚠", w));
if (!v.ok) { v.errors.forEach((e) => console.log("  ✗", e)); process.exit(1); }
