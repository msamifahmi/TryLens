// Uji pipeline aset GLB (spesifikasi TryLens): npm run test:glb
import assert from "node:assert/strict";
import { NodeIO } from "@gltf-transform/core";
import { buildRig, validateRig, NODE_NAMES } from "./lib/glbRig.mjs";
import fs from "node:fs";
import { inspectGlb } from "../src/ar/inspectGlb.js";
import { specFromNodes } from "../src/ar/rigSpec.js";

const io = new NodeIO();
const PLAIN = new URL("../../assets-mentah/f0/model.plain.glb", import.meta.url).pathname;
const SHIPPED = new URL("../public/products/f0/model.glb", import.meta.url).pathname;
const tests = [];
const test = (n, f) => tests.push([n, f]);
const within = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b} (±${tol})`);
const nodeMap = (doc) => Object.fromEntries(doc.getRoot().listNodes().map((n) => [n.getName(), n]));

test("Model polos → tidak sesuai spesifikasi, ditandai 'legacy' (bukan error fatal)", async () => {
  const r = validateRig(await io.read(PLAIN));
  assert.equal(r.ok, false); assert.equal(r.legacy, true);
});

test("buildRig: 6 node bernama baku, root identitas, metadata lengkap, validasi lolos", async () => {
  const doc = await io.read(PLAIN);
  buildRig(doc);
  const n = nodeMap(doc);
  for (const name of NODE_NAMES) assert.ok(n[name], `node ${name}`);
  const root = n.GlassesRoot;
  assert.deepEqual(root.getTranslation(), [0, 0, 0]); assert.deepEqual(root.getScale(), [1, 1, 1]);
  const meta = root.getExtras().trylens;
  for (const k of ["frameWidthMm", "lensWidthMm", "lensHeightMm", "bridgeWidthMm", "templeLengthMm", "realWorldScale"]) assert.ok(meta[k] > 0, k);
  const r = validateRig(doc);
  assert.equal(r.ok, true, r.errors.join("; "));
});

test("Hasil ukur f0 masuk akal secara optik (rentang frame dewasa)", async () => {
  const doc = await io.read(PLAIN);
  buildRig(doc);
  const n = nodeMap(doc), m = n.GlassesRoot.getExtras().trylens;
  within(m.frameWidthMm, 146, 3, "lebar frame");
  assert.ok(m.lensWidthMm > 40 && m.lensWidthMm < 62, `lensa ${m.lensWidthMm}`);
  assert.ok(m.bridgeWidthMm > 10 && m.bridgeWidthMm < 26, `jembatan ${m.bridgeWidthMm}`);
  assert.ok(m.templeLengthMm > 120 && m.templeLengthMm < 160, `gagang ${m.templeLengthMm}`);
  const L = n.LeftLensCenter.getTranslation(), R = n.RightLensCenter.getTranslation();
  assert.ok(L[0] > 0 && R[0] < 0, "Left = +X");
  within(L[0], -R[0], 0.02, "simetris"); within(L[1], R[1], 0.02, "tinggi sama");
  within(n.Bridge.getTranslation()[0], 0, 0.02, "Bridge di tengah");
  // pusat lensa = tengah lebar lensa + setengah jembatan
  within((L[0] - R[0]) * 10, m.lensWidthMm + m.bridgeWidthMm, 3, "jarak pusat lensa = lebar lensa + jembatan");
});

test("buildRig idempoten: dijalankan dua kali tidak menggandakan node dan hasilnya sama", async () => {
  const doc = await io.read(PLAIN);
  buildRig(doc);
  const a = JSON.stringify(Object.entries(nodeMap(doc)).map(([k, v]) => [k, v.getTranslation()]).sort());
  const count = doc.getRoot().listNodes().length;
  buildRig(doc);
  assert.equal(doc.getRoot().listNodes().length, count);
  assert.equal(JSON.stringify(Object.entries(nodeMap(doc)).map(([k, v]) => [k, v.getTranslation()]).sort()), a);
});

test("Kasus negatif: node hilang, metadata rusak, Left/Right tertukar, Bridge tidak di tengah → semuanya tertangkap", async () => {
  const mk = async () => { const d = await io.read(PLAIN); buildRig(d); return d; };
  let d = await mk(); nodeMap(d).RightTemple.dispose();
  assert.equal(validateRig(d).ok, false);
  d = await mk(); delete nodeMap(d).GlassesRoot.getExtras().trylens.lensWidthMm;
  assert.equal(validateRig(d).ok, false);
  d = await mk(); { const n = nodeMap(d); const l = n.LeftLensCenter.getTranslation(); n.LeftLensCenter.setTranslation([-l[0], l[1], l[2]]); n.RightLensCenter.setTranslation([l[0], l[1], l[2]]); }
  assert.equal(validateRig(d).ok, false, "Left di −X harus ditolak");
  d = await mk(); { const n = nodeMap(d); const b = n.Bridge.getTranslation(); n.Bridge.setTranslation([b[0] + 0.5, b[1], b[2]]); }
  assert.equal(validateRig(d).ok, false, "Bridge geser 5 mm harus ditolak");
  d = await mk(); nodeMap(d).GlassesRoot.getExtras().trylens.frameWidthMm = 300;
  assert.equal(validateRig(d).ok, false, "lebar frame tak cocok dengan geometri");
});

test("Model yang dikirim (public/products/f0/model.glb) sesuai spesifikasi dan terbaca oleh pembaca spesifikasi aplikasi", async () => {
  const doc = await io.read(SHIPPED);
  const r = validateRig(doc);
  assert.equal(r.ok, true, r.errors.join("; "));
  const n = nodeMap(doc);
  const pos = (k) => Array.from(n[k].getTranslation());
  const spec = specFromNodes({
    nodes: Object.fromEntries(["Bridge", "LeftLensCenter", "RightLensCenter", "LeftTemple", "RightTemple"].map((k) => [k, pos(k)])),
    meta: n.GlassesRoot.getExtras().trylens
  });
  assert.ok(spec, "specFromNodes harus berhasil");
  within(spec.lensSepMm, 75.6, 1.5, "jarak pusat lensa f0");
});

const ab = (f) => { const b = fs.readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
test("inspectGlb (pemeriksa di form unggah mitra): model ber-rig 'ok', model polos 'none', file bukan GLB ditolak", async () => {
  const ok = inspectGlb(ab(SHIPPED));
  assert.equal(ok.valid, true); assert.equal(ok.rig, "ok", JSON.stringify(ok)); assert.deepEqual(ok.issues, []);
  within(ok.lensSepMm, 75.6, 1.5, "jarak pusat lensa");
  const plain = inspectGlb(ab(PLAIN));
  assert.equal(plain.valid, true); assert.equal(plain.rig, "none");
  const bad = inspectGlb(new TextEncoder().encode("bukan glb sama sekali, hanya teks biasa").buffer);
  assert.equal(bad.valid, false); assert.ok(bad.error);
});

test("inspectGlb: rig setengah jadi → 'partial'; Left/Right tertukar → ditandai", async () => {
  const doc = await io.read(PLAIN); buildRig(doc);
  const n = nodeMap(doc); n.RightTemple.dispose();
  assert.equal(inspectGlb((await io.writeBinary(doc)).buffer.slice(0)).rig, "partial");
  const d2 = await io.read(PLAIN); buildRig(d2);
  const m = nodeMap(d2), l = m.LeftLensCenter.getTranslation();
  m.LeftLensCenter.setTranslation([-l[0], l[1], l[2]]); m.RightLensCenter.setTranslation([l[0], l[1], l[2]]);
  const r = inspectGlb((await io.writeBinary(d2)).buffer.slice(0));
  assert.ok(r.issues.some((x) => /tertukar/.test(x)), r.issues.join());
});

let fail = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log("✓", name); } catch (e) { fail++; console.log("✗", name, "\n   ", e.message); }
}
console.log(fail ? `\n${fail} gagal` : `\nSemua ${tests.length} uji lolos`);
process.exit(fail ? 1 : 0);
