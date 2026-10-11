import * as THREE from "three";
import { NODE_NAMES, estimateSpecFromBox, specFromNodes } from "./rigSpec.js";
import { analyzePoints, facesBackward, templeFactor } from "./modelFit.js";

/** Baca spesifikasi aset dari scene hasil GLTFLoader. null = model tanpa rig (model lama → penempatan cadangan). */
export function readRigSpec(scene) {
  const root = scene.getObjectByName("GlassesRoot");
  if (!root) return null;
  scene.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const v = new THREE.Vector3();
  const nodes = {};
  for (const name of NODE_NAMES.slice(1)) {
    const o = root.getObjectByName(name);
    if (!o) return null;
    v.setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv);
    nodes[name] = [v.x, v.y, v.z];
  }
  return specFromNodes({ nodes, meta: root.userData?.trylens });
}

const LENS_NAME = /lens|glass|kaca|lensa/i;
const isLensMesh = (m) => {
  const mats = Array.isArray(m.material) ? m.material : [m.material];
  return mats.some((x) => x && ((x.transparent && x.opacity < 0.95) || LENS_NAME.test(x.name || ""))) || LENS_NAME.test(m.name || "");
};

/** Kumpulkan titik semua mesh di ruang `scene` (satuan model). lens = titik mesh yang tampak seperti lensa, dipisah kiri/kanan. */
function collect(scene) {
  scene.updateMatrixWorld(true);
  const inv = scene.matrixWorld.clone().invert();
  const all = [], lensAll = [];
  const v = new THREE.Vector3(), m4 = new THREE.Matrix4(), rel = new THREE.Matrix4();
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    rel.multiplyMatrices(inv, o.matrixWorld);
    m4.multiplyMatrices(scene.matrix, rel); // ruang rig: ikut putaran balik (flip) pada scene
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 6000)); // cukup 6 ribu titik per mesh
    const lens = isLensMesh(o);
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m4);
      all.push(v.x, v.y, v.z);
      if (lens) lensAll.push(v.x, v.y, v.z);
    }
  });
  return { all: Float32Array.from(all), lensAll };
}

/**
 * Banyak model unggahan hanya setengah (modifier Mirror di Blender belum diterapkan): satu lensa, satu sisi rim, tetapi gagang & bantalan ada
 * di kedua sisi. Mesh yang berada di satu sisi dan TIDAK punya pasangan cermin (posisi & ukuran sebanding) dicerminkan terhadap bidang tengah.
 * Mengembalikan jumlah mesh yang ditambahkan.
 */
export function completeSymmetry(scene) {
  scene.updateMatrixWorld(true);
  const inv = scene.matrixWorld.clone().invert();
  const items = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position || o.isSkinnedMesh) return;
    o.geometry.computeBoundingBox();
    const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const b = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(scene.matrix, rel));
    items.push({ o, rel, b, c: b.getCenter(new THREE.Vector3()), s: b.getSize(new THREE.Vector3()) });
  });
  if (items.length < 2) return 0;
  const all = new THREE.Box3();
  items.forEach((i) => all.union(i.b));
  const W = all.max.x - all.min.x, cx = (all.max.x + all.min.x) / 2;
  if (!(W > 0)) return 0;
  const vol = (i) => Math.max(1e-9, i.s.x * i.s.y * i.s.z);
  const mirrorRig = new THREE.Matrix4().makeTranslation(2 * cx, 0, 0).multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
  const toLocal = scene.matrix.clone().invert();
  const mir = toLocal.multiply(mirrorRig).multiply(scene.matrix); // cermin dalam ruang lokal scene
  let added = 0;
  for (const it of items) {
    const off = it.c.x - cx;
    if (Math.abs(off) < W * 0.08) continue; // di tengah: tidak perlu
    const paired = items.some((n) => n !== it && Math.abs((n.c.x - cx) + off) < W * 0.05 && Math.abs(n.c.y - it.c.y) < W * 0.05 && vol(n) / vol(it) > 0.6 && vol(n) / vol(it) < 1.65);
    if (paired) continue;
    const clone = it.o.clone(false);
    clone.matrixAutoUpdate = false;
    clone.matrix.multiplyMatrices(mir, it.rel);
    clone.name = `${it.o.name || "mesh"}_mirror`;
    scene.add(clone);
    added++;
  }
  scene.updateMatrixWorld(true);
  return added;
}

/** Model tak sempurna: bidang tunggal (plane) terlihat dari dua sisi; lensa buram dibuat tembus pandang. */
function normalizeMaterials(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const lens = isLensMesh(o);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, i) => {
      if (!m) return;
      m.side = THREE.DoubleSide;
      if (lens && !m.transparent && m.opacity >= 0.95 && !(m.map || m.alphaMap)) {
        const c = m.clone(); // material bisa dipakai bersama mesh lain
        c.transparent = true; c.opacity = 0.5; c.depthWrite = false; c.side = THREE.DoubleSide;
        if (Array.isArray(o.material)) o.material[i] = c; else o.material = c;
      }
    });
    if (lens) o.renderOrder = 2; // lensa digambar terakhir supaya rim tetap terlihat di belakangnya
  });
}

/**
 * Model tanpa rig → spesifikasi dari bentuk mesh (lihat ar/modelFit.js). Bila model menghadap -Z, scene DIBALIK 180° (mutasi) supaya
 * gagang mengarah ke belakang kepala. Gagal mengenali sebagai kacamata → cadangan: kotak batas.
 */
export function estimateRigSpec(scene) {
  let { all, lensAll } = collect(scene);
  if (all.length < 30) return null;
  if (facesBackward(all)) {
    scene.rotation.y += Math.PI;
    scene.updateMatrixWorld(true);
    ({ all, lensAll } = collect(scene));
    scene.userData.flipped = true;
  }
  const mirrored = completeSymmetry(scene);
  normalizeMaterials(scene);
  if (mirrored) ({ all, lensAll } = collect(scene));
  // Pisahkan lensa kiri/kanan di sekitar pusat lebar.
  let mnx = Infinity, mxx = -Infinity;
  for (let i = 0; i < all.length; i += 3) { mnx = Math.min(mnx, all[i]); mxx = Math.max(mxx, all[i]); }
  const cx = (mnx + mxx) / 2, left = [], right = [];
  for (let i = 0; i < lensAll.length; i += 3) (lensAll[i] >= cx ? left : right).push(lensAll[i], lensAll[i + 1], lensAll[i + 2]);
  const r = analyzePoints(all, { left, right });
  if (r) {
    scene.userData.fitInfo = { flipped: !!scene.userData.flipped, normalized: r.normalized, lensFromMesh: r.lensFromMesh, mirrored };
    return r.spec;
  }
  const b = new THREE.Box3().setFromObject(scene);
  if (b.isEmpty()) return null;
  return estimateSpecFromBox({ min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z] });
}

/**
 * Atur panjang gagang model agar ujungnya jatuh di belakang telinga. Semua mesh disimpan posisi aslinya; tiap perubahan
 * faktor menghitung ulang titik di belakang engsel (z < hz) terhadap posisi asli, jadi tidak menumpuk/drift.
 */
export class TempleReach {
  constructor(scene, hingeZ) {
    this.scene = scene;
    this.hz = hingeZ; // satuan model, ruang scene
    this.f = 1;
    this.parts = [];
    this.tip = Infinity; // z ujung gagang asli
    scene.updateMatrixWorld(true);
    const inv = scene.matrixWorld.clone().invert();
    const toScene = scene.matrix.clone();
    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry?.attributes?.position || o.isSkinnedMesh) return;
      const M = new THREE.Matrix4().multiplyMatrices(toScene, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const inverse = M.clone().invert();
      const pos = o.geometry.attributes.position;
      const v = new THREE.Vector3();
      const idx = [];
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(M);
        if (v.z < this.hz) { idx.push(i); this.tip = Math.min(this.tip, v.z); }
      }
      if (!idx.length) return;
      o.geometry = o.geometry.clone(); // geometri bisa dipakai bersama; ubah salinan
      this.parts.push({ mesh: o, M, inverse, idx: Uint32Array.from(idx), orig: idx.map((i) => new THREE.Vector3().fromBufferAttribute(o.geometry.attributes.position, i).applyMatrix4(M)) });
    });
    this.ok = this.parts.length > 0 && Number.isFinite(this.tip) && this.hz - this.tip > 1e-3;
  }
  /** z ujung gagang (model) setelah faktor f. */
  tipAt(f = this.f) { return this.hz + (this.tip - this.hz) * f; }
  /** Pasang faktor baru (abaikan perubahan kecil agar tidak menghitung ulang tiap frame). */
  set(f) {
    if (!this.ok || Math.abs(f - this.f) < 0.025) return false;
    this.f = f;
    const v = new THREE.Vector3();
    for (const p of this.parts) {
      const pos = p.mesh.geometry.attributes.position;
      p.idx.forEach((i, k) => {
        const o = p.orig[k];
        v.set(o.x, o.y, this.hz + (o.z - this.hz) * f).applyMatrix4(p.inverse);
        pos.setXYZ(i, v.x, v.y, v.z);
      });
      pos.needsUpdate = true;
      p.mesh.geometry.computeBoundingSphere();
    }
    return true;
  }
  /** Hitung & pasang faktor dari penempatan saat ini. rigZ/scale = rig.position.z, rig.scale (ruang kepala). */
  fit(rigZ, scale) {
    if (!this.ok) return 1;
    const f = templeFactor(rigZ + scale * this.hz, rigZ + scale * this.tip);
    this.set(f);
    return this.f;
  }
}
