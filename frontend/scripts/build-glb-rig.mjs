// Ubah GLB biasa menjadi aset sesuai spesifikasi TryLens (node jangkar + metadata).
//   npm run glb:rig -- <masuk.glb> <keluar.glb> [--lens=glass|lens] [--temple-gap=1]
import { NodeIO } from "@gltf-transform/core";
import { buildRig, validateRig } from "./lib/glbRig.mjs";

const [inp, out, ...flags] = process.argv.slice(2);
if (!inp || !out) { console.error("Pemakaian: npm run glb:rig -- <masuk.glb> <keluar.glb> [--lens=<regex>] [--temple-gap=<cm>]"); process.exit(2); }
const flag = (k) => flags.find((f) => f.startsWith(`--${k}=`))?.split("=")[1];
const opts = {};
if (flag("lens")) opts.lens = new RegExp(flag("lens"), "i");
if (flag("temple-gap")) opts.templeGapCm = parseFloat(flag("temple-gap"));

const io = new NodeIO();
const doc = await io.read(inp);
const m = buildRig(doc, opts);
const v = validateRig(doc, opts);
await io.write(out, doc);
const f = (a) => `(${a.map((x) => x.toFixed(2)).join(", ")})`;
console.log(`✓ ${out}`);
console.log("  LeftLensCenter ", f(m.centers.left), "cm\n  RightLensCenter", f(m.centers.right), "cm\n  Bridge         ", f(m.bridge), "cm\n  LeftTemple     ", f(m.hinges.left), "cm");
console.log("  Metadata:", JSON.stringify(m.meta));
v.warnings.forEach((w) => console.log("  ⚠", w));
if (!v.ok) { v.errors.forEach((e) => console.log("  ✗", e)); process.exit(1); }
