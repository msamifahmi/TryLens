// Lapisan data: akun, frame, dan serialisasi ke bentuk yang dipakai front-end (usePartner).
import { defaultDoc } from "./defaults.js";

export const FRAME_FIELDS = ["name", "description", "buy", "style", "colorKey", "category", "price", "oldPrice", "stock", "published", "vto"];
export const STYLES = ["aviator", "round", "square", "cateye", "rect", "browline"];
export const COLORS = ["brown", "black", "gold", "tort", "clear", "blue", "navy", "red"];
export const CATEGORIES = ["Pria", "Wanita", "Anak"];

export function Service(db) {
  const q = {
    accById: db.prepare("SELECT * FROM accounts WHERE id=?"),
    accByEmail: db.prepare("SELECT * FROM accounts WHERE email=?"),
    framesOf: db.prepare("SELECT * FROM frames WHERE account_id=? ORDER BY created_at DESC, rowid DESC"),
    frameById: db.prepare("SELECT * FROM frames WHERE id=?"),
    updDoc: db.prepare("UPDATE accounts SET doc=?, name=?, phone=? WHERE id=?")
  };

  const frameOut = (r) => {
    const d = JSON.parse(r.data);
    return {
      id: r.id,
      ...d,
      published: !!r.published,
      media: (() => {
        const rig = r.rig ? JSON.parse(r.rig) : null;
        // Bentuk glb sama dengan hasil inspectGlb di browser, supaya UI Mitra tak perlu dibedakan.
        const glb = r.has_model && rig
          ? { name: "model.glb", size: rig.size, valid: true, nodeCount: rig.nodeCount, rig: rig.state, missingNodes: rig.missingNodes, missingMeta: rig.missingMeta, issues: [], meta: rig.meta }
          : null;
        return { photos: r.photos, model: !!r.has_model, glb, v: r.media_v };
      })()
    };
  };

  const self = {
    q,
    frameOut,
    docOf: (row) => ({ ...defaultDoc(), ...JSON.parse(row.doc) }),
    account(id) {
      const row = q.accById.get(id);
      if (!row) return null;
      const doc = self.docOf(row);
      if (doc.store) doc.store = { ...doc.store, logo: doc.store.logoV ? `/media/store/${row.id}.jpg?v=${doc.store.logoV}` : null };
      return {
        ...doc,
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        createdAt: row.created_at,
        frames: q.framesOf.all(id).map(frameOut)
      };
    },
    saveDoc(id, doc, { name, phone } = {}) {
      const row = q.accById.get(id);
      q.updDoc.run(JSON.stringify(doc), name ?? row.name, phone ?? row.phone, id);
    },
    frame: (id) => q.frameById.get(id),
    frameCount: (accountId) => db.prepare("SELECT COUNT(*) c FROM frames WHERE account_id=?").get(accountId).c
  };
  return self;
}
