// Validasi aset GLB terhadap spesifikasi TryLens.  npm run glb:check [-- file.glb ...]   (default: semua public/products/*/model.glb)
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { validateRig } from "./lib/glbRig.mjs";

let files = process.argv.slice(2);
if (!files.length) {
  const dir = new URL("../public/products/", import.meta.url).pathname;
  files = fs.readdirSync(dir).map((d) => path.join(dir, d, "model.glb")).filter((f) => fs.existsSync(f));
}
let bad = 0;
for (const f of files) {
  const r = validateRig(await new NodeIO().read(f));
  const tag = r.ok ? "✓ sesuai spesifikasi" : r.legacy ? "• model lama (tanpa rig) — pakai cadangan, jalankan npm run glb:rig" : "✗ tidak sesuai";
  console.log(`${tag}  ${path.relative(process.cwd(), f)}`);
  r.errors.forEach((e) => console.log("    ✗", e));
  r.warnings.forEach((w) => console.log("    ⚠", w));
  if (!r.ok && !r.legacy) bad++;
}
process.exit(bad ? 1 : 0);
