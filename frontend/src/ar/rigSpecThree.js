import * as THREE from "three";
import { NODE_NAMES, estimateSpecFromBox, specFromNodes } from "./rigSpec.js";

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

/** Model tanpa rig → spesifikasi perkiraan dari kotak batas (dihitung pada salinan agar tak terpengaruh transformasi induk). */
export function estimateRigSpec(scene) {
  const tmp = scene.clone(true);
  tmp.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(tmp);
  if (b.isEmpty()) return null;
  return estimateSpecFromBox({ min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z] });
}
