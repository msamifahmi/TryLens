import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Glasses, Pencil, Plus, Trash2 } from "lucide-react";
import FrameIcon from "../../components/icons/FrameIcon.jsx";
import StoreForm from "../../components/partner/StoreForm.jsx";
import { Badge, Btn, Card, CardHeader, EmptyState, Field, Flash, Meter, Tile, Toggle, UpgradeLink, inputCls, useFlash } from "../../components/partner/ui.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";
import { FRAME_COLORS, STYLE_LABELS } from "../../data/mockData.js";
import { PLANS, fmtRp } from "../../data/partnerMock.js";
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
        onSubmit={(v) => {
          saveStore(v);
          flash("Profil toko tersimpan");
        }}
        footerExtra={<Flash msg={msg} />}
      />
    </div>
  );
}

/* --------------------------------------------------------- Produk / Frame */
const EMPTY = { name: "", style: "aviator", colorKey: "black", category: "Pria", price: "", oldPrice: "", stock: "10" };

export function ProductsTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const plan = acc.subscription.plan;
  const limit = PLANS[plan].limits.frames;
  const [form, setForm] = useState(null); // null = tertutup; {id?} = tambah/ubah
  const atLimit = acc.frames.length >= limit;
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function save(e) {
    e.preventDefault();
    const frame = {
      id: form.id || `f-${Date.now().toString(36)}`,
      name: form.name.trim(),
      style: form.style,
      colorKey: form.colorKey,
      category: form.category,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      stock: Number(form.stock) || 0,
      published: form.published ?? true,
      vto: form.vto ?? true
    };
    patch((a) => ({ ...a, frames: form.id ? a.frames.map((f) => (f.id === form.id ? frame : f)) : [frame, ...a.frames] }));
    setForm(null);
  }

  const update = (id, part) => patch((a) => ({ ...a, frames: a.frames.map((f) => (f.id === id ? { ...f, ...part } : f)) }));
  const remove = (id) =>
    patch((a) => ({
      ...a,
      frames: a.frames.filter((f) => f.id !== id),
      sponsored: a.sponsored.filter((x) => x !== id),
      collections: a.collections.map((c) => ({ ...c, frameIds: c.frameIds.filter((x) => x !== id) }))
    }));

  return (
    <Card>
      <CardHeader
        title="Produk / Frame"
        subtitle={`${acc.frames.length} frame terdaftar`}
        right={
          <Btn size="sm" disabled={atLimit} onClick={() => setForm({ ...EMPTY })}>
            <Plus size={15} /> Tambah frame
          </Btn>
        }
      />
      <div className="max-w-[360px] mb-4">
        <Meter label={`Kuota frame paket ${PLANS[plan].name}`} value={acc.frames.length} max={limit} />
      </div>
      {atLimit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-amber-900 m-0">Kuota frame paket Basic penuh. Upgrade ke Pro untuk frame tanpa batas.</p>
          <UpgradeLink size="sm" />
        </div>
      )}

      {form && (
        <form onSubmit={save} className="rounded-xl border border-zinc-300 bg-white p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <p className="col-span-full text-[14px] font-semibold text-zinc-900 m-0">{form.id ? "Ubah frame" : "Frame baru"}</p>
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
          <div className="col-span-full flex gap-2">
            <Btn type="submit" size="sm">Simpan frame</Btn>
            <Btn type="button" variant="ghost" size="sm" onClick={() => setForm(null)}>Batal</Btn>
          </div>
        </form>
      )}

      {acc.frames.length === 0 ? (
        <EmptyState title="Belum ada frame" text="Tambahkan frame pertama agar toko Anda tampil lengkap." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white">
          <table className="w-full text-[13px] border-collapse min-w-[720px]">
            <thead>
              <tr className="text-left text-zinc-500 text-[12px]">
                {["Frame", "Kategori", "Harga", "Stok", "Try-On", "Tayang", ""].map((h) => (
                  <th key={h} className="font-medium px-4 py-3 border-b border-zinc-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acc.frames.map((f) => (
                <tr key={f.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-14 h-8 flex-shrink-0"><FrameIcon style={f.style} colorKey={f.colorKey} className="w-full" /></span>
                      <span>
                        <span className="block font-medium text-zinc-900">{f.name}</span>
                        <span className="block text-[11.5px] text-zinc-500">{STYLE_LABELS[f.style]}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{f.category}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{fmtRp(f.price)}</span>
                    {f.oldPrice && <span className="block text-[11.5px] text-zinc-400 line-through">{fmtRp(f.oldPrice)}</span>}
                  </td>
                  <td className="px-4 py-2.5">{f.stock <= 5 ? <Badge tone="amber">{f.stock} tersisa</Badge> : f.stock}</td>
                  <td className="px-4 py-2.5"><Badge tone={f.vto ? "green" : "gray"}>{f.vto ? "Aktif" : "Nonaktif"}</Badge></td>
                  <td className="px-4 py-2.5"><Toggle checked={f.published} onChange={(v) => update(f.id, { published: v })} label={`Tayangkan ${f.name}`} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-600" aria-label={`Ubah ${f.name}`} onClick={() => setForm({ ...f, oldPrice: f.oldPrice ?? "" })}><Pencil size={15} /></button>
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
                  <p className="text-[14.5px] font-semibold text-zinc-900 m-0">{c.name}</p>
                  <p className="text-[12px] text-zinc-500 m-0">{c.frameIds.length} frame</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-[12.5px] text-zinc-600">
                    Tayang <Toggle checked={c.published} onChange={(v) => upd(c.id, { published: v })} label={`Tayangkan ${c.name}`} />
                  </span>
                  <Btn size="sm" variant="outline" onClick={() => setOpenId(openId === c.id ? null : c.id)}>{openId === c.id ? "Tutup" : "Pilih frame"}</Btn>
                  <button className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500" aria-label={`Hapus koleksi ${c.name}`} onClick={() => patch((a) => ({ ...a, collections: a.collections.filter((x) => x.id !== c.id) }))}><Trash2 size={15} /></button>
                </div>
              </div>
              {openId === c.id && (
                <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                  {acc.frames.map((f) => (
                    <label key={f.id} className="flex items-center gap-2.5 text-[13px] text-zinc-800 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={c.frameIds.includes(f.id)}
                        onChange={(e) => upd(c.id, { frameIds: e.target.checked ? [...c.frameIds, f.id] : c.frameIds.filter((x) => x !== f.id) })}
                        className="w-4 h-4 accent-zinc-900"
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
  const links = s.links || {};

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
        <div className="w-16 h-16 rounded-2xl text-white font-extrabold text-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color }}>{s.initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[20px] font-bold text-zinc-900 m-0">{s.name}</h3>
            {acc.highlighted.active && <Badge tone="dark">Featured Store</Badge>}
          </div>
          <p className="text-[13px] text-zinc-500 m-0 mb-1">{[s.city, s.province].filter(Boolean).join(", ")}</p>
          <p className="text-[13px] text-zinc-600 m-0 line-clamp-2">{s.description}</p>
        </div>
        <div className="flex gap-2 text-zinc-500">
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
            <Tile key={f.id} className="p-3 relative">
              {acc.sponsored.includes(f.id) && <Badge tone="amber" className="absolute top-2 left-2">Sponsored</Badge>}
              <div className="bg-zinc-50 rounded-lg p-3 mb-2.5"><FrameIcon style={f.style} colorKey={f.colorKey} className="w-full" /></div>
              <p className="text-[13px] font-medium text-zinc-900 m-0 truncate">{f.name}</p>
              <p className="text-[13px] font-semibold text-zinc-900 m-0">{fmtRp(f.price)}</p>
              {f.vto && <p className="flex items-center gap-1 text-[11.5px] text-zinc-500 m-0 mt-1"><Glasses size={12} /> Try-On</p>}
            </Tile>
          ))}
        </div>
      )}
    </Card>
  );
}
