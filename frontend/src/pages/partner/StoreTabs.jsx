import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Glasses, Pencil, Plus, Trash2 } from "lucide-react";
import { FrameAssetFields, FrameThumb, assetsInitial, commitAssets } from "../../components/partner/FrameAssets.jsx";
import { delFrameMedia } from "../../lib/mediaDb.js";
import { backend } from "../../api/http.js";
import { PLATFORMS, cleanBuyUrl } from "../../lib/ecommerce.js";
import StoreForm from "../../components/partner/StoreForm.jsx";
import FramePreviewModal from "../../components/partner/FramePreviewModal.jsx";
import MerchantAvatar from "../../components/MerchantAvatar.jsx";
import { SIZE_FIELDS, cleanSize, effectiveFrameWidthMm, sizeCode } from "../../data/frameSize.js";
import { Badge, Btn, Card, CardHeader, EmptyState, Field, Flash, Meter, Tile, Toggle, UpgradeLink, inputCls, useFlash } from "../../components/partner/ui.jsx";
import { usePartner, useAccount, whenSynced } from "../../store/usePartner.js";
import { FRAME_COLORS, STYLE_LABELS } from "../../data/mockData.js";
import { PLANS, activeHighlight, fmtRp, sponsoredIds } from "../../data/partnerMock.js";
import { InstagramIcon, XIcon, ShopBagIcon } from "../../components/icons/SocialIcons.jsx";

/* ------------------------------------------------------------ Profil Toko */
export function StoreProfileTab() {
  const acc = useAccount();
  const saveStore = usePartner((s) => s.saveStore);
  const [msg, flash] = useFlash();
  return (
    <div className="max-w-[820px]">
      <CardHeader title="Profil Toko" subtitle="Informasi ini tampil di halaman toko Anda di TryLens." />
      <StoreForm
        initial={acc.store}
        submitLabel="Simpan Perubahan"
        onSubmit={async (v, extra) => {
          const r = await saveStore(v, extra);
          flash(r?.ok === false ? `Profil tersimpan, tetapi foto gagal: ${r.error}` : "Profil toko tersimpan");
        }}
        footerExtra={<Flash msg={msg} />}
      />
    </div>
  );
}

/* --------------------------------------------------------- Produk / Frame */
const EMPTY = { name: "", description: "", size: {}, buy: {}, style: "aviator", colorKey: "black", category: "Pria", price: "", oldPrice: "", stock: "10" };

export function ProductsTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const plan = acc.subscription.plan;
  const limit = PLANS[plan].limits.frames;
  const vtoLimit = PLANS[plan].limits.vto;
  const vtoUsed = acc.frames.filter((f) => f.vto).length;
  const [form, setForm] = useState(null); // null = tertutup; {id?} = tambah/ubah
  const [assets, setAssets] = useState({ photos: [], glb: null });
  const [saving, setSaving] = useState(false);
  const openForm = (f) => {
    const base = f ? { ...f, oldPrice: f.oldPrice ?? "", size: { ...(f.size || {}) } } : { ...EMPTY, id: `f-${Date.now().toString(36)}`, isNew: true };
    setAssets(f ? assetsInitial(f) : { photos: [], glb: null });
    setForm(base);
  };
  const atLimit = acc.frames.length >= limit;
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    // Tautan e-commerce: kosong boleh, isi harus https & domain platform yang benar.
    const buy = {};
    for (const p of PLATFORMS) {
      const raw = (form.buy?.[p.key] || "").trim();
      if (!raw) continue;
      const u = cleanBuyUrl(p.key, raw);
      if (!u) { setSaving(false); return alert(`Tautan ${p.label} tidak valid${p.hosts ? ` — gunakan alamat https dari ${p.hosts[0]}` : " — gunakan alamat https"}.`); }
      buy[p.key] = u;
    }
    const sc = cleanSize(form.size);
    if (sc.error) { setSaving(false); return alert(sc.error); }
    const sizeOut = sc.value;
    const base = {
      id: form.id,
      name: form.name.trim(),
      description: (form.description || "").trim().slice(0, 800),
      size: sizeOut,
      buy,
      style: form.style,
      colorKey: form.colorKey,
      category: form.category,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      stock: Number(form.stock) || 0,
      published: form.published ?? true,
      vto: form.vto ?? vtoUsed < vtoLimit // kuota VTO penuh → frame baru masuk katalog tanpa try-on
    };
    const prevMedia = acc.frames.find((f) => f.id === form.id)?.media;
    const put = (frame) => patch((a) => ({ ...a, frames: form.isNew ? [frame, ...a.frames] : a.frames.map((f) => (f.id === form.id ? frame : f)) }));

    if (backend.partner) {
      // Mode server: frame dibuat dulu (agar ada pemiliknya), baru berkas diunggah & divalidasi server.
      usePartner.getState().clearSyncError();
      put({ ...base, media: prevMedia });
      await whenSynced();
      const errs = usePartner.getState().syncError;
      if (errs) { setSaving(false); return alert(errs); }
      try {
        await commitAssets(form.id, assets, prevMedia);
      } catch (err) {
        await usePartner.getState().refresh();
        setSaving(false);
        return alert(`Frame tersimpan, tetapi berkas ditolak server: ${err.message}`);
      }
      await usePartner.getState().refresh();
      setSaving(false);
      setForm(null);
      return;
    }

    let media;
    try {
      media = await commitAssets(form.id, assets, prevMedia);
    } catch {
      setSaving(false);
      return alert("Berkas gagal disimpan di browser (penyimpanan penuh atau mode privat). Coba kurangi ukuran foto/model.");
    }
    put({ ...base, media });
    setSaving(false);
    setForm(null);
  }

  const update = (id, part) => patch((a) => ({ ...a, frames: a.frames.map((f) => (f.id === id ? { ...f, ...part } : f)) }));
  const remove = (id) => {
    delFrameMedia(id).catch(() => {});
    patch((a) => ({
      ...a,
      frames: a.frames.filter((f) => f.id !== id),
      collections: a.collections.map((c) => ({ ...c, frameIds: c.frameIds.filter((x) => x !== id) }))
    }));
  };

  return (
    <Card>
      <CardHeader
        title="Produk / Frame"
        subtitle={`${acc.frames.length} frame terdaftar`}
        right={
          <Btn size="sm" disabled={atLimit} onClick={() => openForm(null)}>
            <Plus size={15} /> Tambah frame
          </Btn>
        }
      />
      <div className="max-w-[360px] mb-4 flex flex-col gap-3">
        <Meter label="Frame di katalog (tanpa batas)" value={acc.frames.length} max={limit} />
        <Meter label={`Frame Virtual Try-On paket ${PLANS[plan].name}`} value={vtoUsed} max={vtoLimit} />
      </div>
      {vtoUsed >= vtoLimit && (
        <div className="rounded-xl border border-accent-yellow bg-surface-cream px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-ink-text m-0">Kuota Virtual Try-On paket Basic ({vtoLimit} frame) penuh. Frame baru tetap tampil di katalog tanpa try-on. Upgrade ke Pro untuk try-on tanpa batas.</p>
          <UpgradeLink size="sm" />
        </div>
      )}

      {form && (
        <form onSubmit={save} className="rounded-xl border border-[#C5D6EA] bg-white p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <p className="col-span-full text-[14px] font-semibold text-ink m-0">{form.isNew ? "Frame baru" : "Ubah frame"}</p>
          <Field label="Nama frame *" className="col-span-2"><input className={inputCls} value={form.name} onChange={set("name")} required /></Field>
          <Field label="Gaya">
            <select className={inputCls} value={form.style} onChange={set("style")}>
              {Object.entries(STYLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Warna">
            <select className={inputCls} value={form.colorKey} onChange={set("colorKey")}>
              {Object.keys(FRAME_COLORS).map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Kategori">
            <select className={inputCls} value={form.category} onChange={set("category")}>
              {["Pria", "Wanita", "Anak"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Harga (Rp) *"><input className={inputCls} type="number" min="1000" value={form.price} onChange={set("price")} required /></Field>
          <Field label="Harga coret (Rp)"><input className={inputCls} type="number" min="0" value={form.oldPrice ?? ""} onChange={set("oldPrice")} /></Field>
          <Field label="Stok"><input className={inputCls} type="number" min="0" value={form.stock} onChange={set("stock")} /></Field>
          <fieldset className="col-span-full rounded-xl border border-[#DDE8F4] p-3 m-0">
            <legend className="px-1.5 text-[12.5px] font-semibold text-ink-text">Ukuran asli frame (mm) — opsional</legend>
            <p className="text-[12px] text-ink-muted m-0 mb-2.5">
              Bila diisi, frame di Coba Virtual tampil berukuran <strong>1:1</strong> sesuai ukuran asli. Bila kosong, ukuran otomatis disesuaikan dengan lebar wajah pengguna.
              Notasi optik: lebar lensa–jembatan–gagang{sizeCode(form.size) ? <> (saat ini <strong>{sizeCode(form.size)}</strong>)</> : ""}.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {Object.entries(SIZE_FIELDS).map(([k, r]) => (
                <Field key={k} label={`${r.label} (${r.min}–${r.max})`}>
                  <input className={inputCls} type="number" step="0.5" min={r.min} max={r.max} inputMode="decimal" value={form.size?.[k] ?? ""} onChange={(e) => setForm((p) => ({ ...p, size: { ...(p.size || {}), [k]: e.target.value } }))} placeholder="—" />
                </Field>
              ))}
              <Field label="Bahan (opsional)"><input className={inputCls} maxLength={60} value={form.size?.material ?? ""} onChange={(e) => setForm((p) => ({ ...p, size: { ...(p.size || {}), material: e.target.value } }))} placeholder="Asetat, titanium…" /></Field>
            </div>
            {!form.size?.frameWidthMm && effectiveFrameWidthMm(cleanSize(form.size).value) ? <p className="text-[12px] text-ink-muted m-0 mt-2">Lebar total diperkirakan ±{effectiveFrameWidthMm(cleanSize(form.size).value)} mm (2×lensa + jembatan + 12).</p> : null}
          </fieldset>
          <Field label={`Deskripsi produk (${(form.description || "").length}/800)`} className="col-span-full">
            <textarea className={`${inputCls} h-24 py-2.5 resize-none`} maxLength={800} value={form.description || ""} onChange={set("description")} placeholder="Bahan, ukuran lensa, cocok untuk bentuk wajah apa, garansi… Tampil di halaman produk. Kosongkan untuk deskripsi otomatis." />
          </Field>
          <div className="col-span-full">
            <p className="text-[12.5px] font-semibold text-ink m-0">Tautan beli di e-commerce <span className="font-normal text-ink-muted">(opsional)</span></p>
            <p className="text-[12px] text-ink-muted m-0 mt-0.5 mb-2">Pembeli melihat tombolnya di halaman produk. Kosong = memakai tautan Tokopedia/Shopee toko (Store Profile).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PLATFORMS.map((p) => (
                <label key={p.key} className="flex items-center gap-2">
                  <span className="w-[92px] flex-shrink-0 text-[12px] font-medium" style={{ color: p.color }}>{p.label}</span>
                  <input className={inputCls} type="url" inputMode="url" placeholder={p.hosts ? `https://${p.hosts[0]}/…` : "https://…"} value={form.buy?.[p.key] || ""} onChange={(e) => setForm((f) => ({ ...f, buy: { ...f.buy, [p.key]: e.target.value } }))} />
                </label>
              ))}
            </div>
          </div>
          <FrameAssetFields assets={assets} setAssets={setAssets} />
          <div className="col-span-full flex gap-2">
            <Btn type="submit" size="sm" disabled={saving}>{saving ? "Menyimpan…" : "Simpan frame"}</Btn>
            <Btn type="button" variant="ghost" size="sm" onClick={() => setForm(null)}>Batal</Btn>
          </div>
        </form>
      )}

      {acc.frames.length === 0 ? (
        <EmptyState title="Belum ada frame" text="Tambahkan frame pertama agar toko Anda tampil lengkap." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#DDE8F4] bg-white">
          <table className="w-full text-[13px] border-collapse min-w-[720px]">
            <thead>
              <tr className="text-left text-ink-muted text-[12px]">
                {["Frame", "Kategori", "Harga", "Stok", "Try-On", "Tayang", ""].map((h) => (
                  <th key={h} className="font-medium px-4 py-3 border-b border-[#E8F0F8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acc.frames.map((f) => (
                <tr key={f.id} className="border-b border-[#E8F0F8] last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-14 h-10 flex-shrink-0 flex items-center"><FrameThumb frame={f} /></span>
                      <span>
                        <span className="block font-medium text-ink">{f.name}</span>
                        <span className="block text-[11.5px] text-ink-muted">{STYLE_LABELS[f.style]}{f.media?.photos ? ` · ${f.media.photos} foto` : ""}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{f.category}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{fmtRp(f.price)}</span>
                    {f.oldPrice && <span className="block text-[11.5px] text-ink-muted line-through">{fmtRp(f.oldPrice)}</span>}
                  </td>
                  <td className="px-4 py-2.5">{f.stock <= 5 ? <Badge tone="amber">{f.stock} tersisa</Badge> : f.stock}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={f.vto ? "green" : "gray"}>{f.vto ? "Aktif" : "Nonaktif"}</Badge>
                    <span className="block text-[11.5px] text-ink-muted mt-0.5">{f.media?.glb ? (f.media.glb.rig === "ok" ? "3D · rig sesuai" : "3D · tanpa rig") : "Ilustrasi 2D"}</span>
                  </td>
                  <td className="px-4 py-2.5"><Toggle checked={f.published} onChange={(v) => update(f.id, { published: v })} label={`Tayangkan ${f.name}`} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button className="w-8 h-8 rounded-lg hover:bg-surface-blue flex items-center justify-center text-ink-text" aria-label={`Ubah ${f.name}`} onClick={() => openForm(f)}><Pencil size={15} /></button>
                      <button className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500" aria-label={`Hapus ${f.name}`} onClick={() => remove(f.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- Koleksi */
export function CollectionsTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState(null);

  const upd = (id, part) => patch((a) => ({ ...a, collections: a.collections.map((c) => (c.id === id ? { ...c, ...part } : c)) }));

  function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    patch((a) => ({ ...a, collections: [...a.collections, { id: `c-${Date.now().toString(36)}`, name: name.trim(), published: true, frameIds: [] }] }));
    setName("");
  }

  return (
    <Card>
      <CardHeader title="Koleksi" subtitle="Kelompokkan frame agar mudah dijelajahi pelanggan (mis. “Frame Kerja”, “Anak Sekolah”)." />
      <form onSubmit={add} className="flex gap-2 mb-4 max-w-[480px]">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama koleksi baru" aria-label="Nama koleksi baru" />
        <Btn type="submit"><Plus size={15} /> Buat</Btn>
      </form>

      {acc.collections.length === 0 ? (
        <EmptyState title="Belum ada koleksi" />
      ) : (
        <div className="flex flex-col gap-3">
          {acc.collections.map((c) => (
            <Tile key={c.id} className="p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[14.5px] font-semibold text-ink m-0">{c.name}</p>
                  <p className="text-[12px] text-ink-muted m-0">{c.frameIds.length} frame</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-[12.5px] text-ink-text">
                    Tayang <Toggle checked={c.published} onChange={(v) => upd(c.id, { published: v })} label={`Tayangkan ${c.name}`} />
                  </span>
                  <Btn size="sm" variant="outline" onClick={() => setOpenId(openId === c.id ? null : c.id)}>{openId === c.id ? "Tutup" : "Pilih frame"}</Btn>
                  <button className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500" aria-label={`Hapus koleksi ${c.name}`} onClick={() => patch((a) => ({ ...a, collections: a.collections.filter((x) => x.id !== c.id) }))}><Trash2 size={15} /></button>
                </div>
              </div>
              {openId === c.id && (
                <div className="mt-3 pt-3 border-t border-[#E8F0F8] grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                  {acc.frames.map((f) => (
                    <label key={f.id} className="flex items-center gap-2.5 text-[13px] text-ink-text py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.frameIds.includes(f.id)}
                        onChange={(e) => upd(c.id, { frameIds: e.target.checked ? [...c.frameIds, f.id] : c.frameIds.filter((x) => x !== f.id) })}
                        className="w-4 h-4 accent-blue-deep"
                      />
                      {f.name}
                    </label>
                  ))}
                </div>
              )}
            </Tile>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------- Pratinjau Toko */
export function PreviewTab() {
  const acc = useAccount();
  const s = acc.store;
  const published = acc.frames.filter((f) => f.published);
  const sponsored = new Set(sponsoredIds(acc));
  const links = s.links || {};
  const [open, setOpen] = useState(null);

  return (
    <Card>
      <CardHeader
        title="Pratinjau Toko"
        subtitle="Contoh tampilan halaman toko Anda bagi pelanggan."
        right={s.merchantId && (
          <Btn as={Link} to={`/toko/${s.merchantId}`} variant="outline" size="sm"><ExternalLink size={14} /> Buka halaman publik</Btn>
        )}
      />
      <Tile className="p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <MerchantAvatar merchant={s} className="w-16 h-16 rounded-2xl text-xl font-extrabold" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[20px] font-bold text-ink m-0">{s.name}</h3>
            {activeHighlight(acc) && <Badge tone="gold">Highlighted Brand</Badge>}
          </div>
          <p className="text-[13px] text-ink-muted m-0 mb-1">{[s.city, s.province].filter(Boolean).join(", ")}</p>
          <p className="text-[13px] text-ink-text m-0 line-clamp-2">{s.description}</p>
        </div>
        <div className="flex gap-2 text-ink-muted">
          {links.instagram && <InstagramIcon size={18} />}
          {links.x && <XIcon size={16} />}
          {(links.tokopedia || links.shopee) && <ShopBagIcon size={18} />}
        </div>
      </Tile>

      {published.length === 0 ? (
        <EmptyState title="Belum ada frame tayang" text="Aktifkan minimal satu frame di Produk / Frame." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {published.map((f) => (
            <Tile key={f.id} className="p-3 relative cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all focus-within:ring-2 focus-within:ring-blue-deep">
              {sponsored.has(f.id) && <Badge tone="gold" className="absolute top-2 left-2">Sponsored</Badge>}
              <div className="bg-surface-blue/60 rounded-lg p-3 mb-2.5"><FrameThumb frame={f} /></div>
              <button type="button" onClick={() => setOpen(f)} aria-label={`Lihat ${f.name}`} className="text-left w-full after:absolute after:inset-0 after:content-[''] focus:outline-none">
                <span className="block text-[13px] font-medium text-ink truncate">{f.name}</span>
                <span className="block text-[13px] font-semibold text-ink">{fmtRp(f.price)}</span>
                {f.vto && <span className="flex items-center gap-1 text-[11.5px] text-ink-muted mt-1"><Glasses size={12} /> Try-On</span>}
              </button>
            </Tile>
          ))}
        </div>
      )}
      {open && <FramePreviewModal frame={acc.frames.find((x) => x.id === open.id) || open} store={s} sponsored={sponsored.has(open.id)} onClose={() => setOpen(null)} />}
    </Card>
  );
}
