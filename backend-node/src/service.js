// Lapisan data: akun, frame, dan serialisasi ke bentuk yang dipakai front-end (usePartner).
import { defaultDoc } from "./defaults.js";
import { PLANS } from "./pricing.js";
import { vtoToDisable } from "./quota.js";

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
      self.settle(id);
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
    /** Matikan VTO frame yang melebihi kuota paket (urut dari tertua; pilihan Mitra diutamakan). Mengembalikan id yang dimatikan. */
    enforceVto(accountId, preferIds = null) {
      const row = q.accById.get(accountId);
      if (!row) return [];
      const plan = self.docOf(row).subscription?.plan;
      if (!plan || !PLANS[plan]) return [];
      const frames = q.framesOf.all(accountId).reverse().map((r) => ({ id: r.id, vto: !!JSON.parse(r.data).vto }));
      const off = vtoToDisable(frames, PLANS[plan].vtoLimit, preferIds);
      for (const id of off) {
        const r = q.frameById.get(id), d = JSON.parse(r.data);
        db.prepare("UPDATE frames SET data=?, updated_at=? WHERE id=?").run(JSON.stringify({ ...d, vto: false }), new Date().toISOString(), id);
      }
      return off;
    },
    /** Terapkan turun paket yang sudah jatuh tempo (malas: dipanggil saat data diakses) lalu jaga kuota VTO. */
    settle(accountId) {
      const row = q.accById.get(accountId);
      if (!row) return;
      const doc = self.docOf(row), s = doc.subscription;
      let prefer = null, changed = false;
      if (s?.pendingPlan && s.currentPeriodEnd && Date.parse(s.currentPeriodEnd) <= Date.now()) {
        prefer = s.pendingVtoFrameIds || null;
        doc.subscription = { ...s, plan: s.pendingPlan, pendingPlan: null, pendingVtoFrameIds: null };
        changed = true;
      }
      if (changed) self.saveDoc(accountId, doc);
      const off = self.enforceVto(accountId, prefer);
      if (changed || off.length) {
        const d2 = self.docOf(q.accById.get(accountId));
        if (off.length) d2.vtoNotice = { at: new Date().toISOString(), disabled: off.length };
        self.saveDoc(accountId, d2);
      }
    },
    settleAll() { for (const r of db.prepare("SELECT id FROM accounts").all()) self.settle(r.id); },
    frame: (id) => q.frameById.get(id),
    frameCount: (accountId) => db.prepare("SELECT COUNT(*) c FROM frames WHERE account_id=?").get(accountId).c
  };
  return self;
}
