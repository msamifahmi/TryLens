import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Box, CheckCircle2, ImagePlus, Star, Trash2, UploadCloud, XCircle } from "lucide-react";
import FrameIcon from "../icons/FrameIcon.jsx";
import { MAX_GLB_BYTES, inspectGlb } from "../../ar/inspectGlb.js";
import { delMedia, getMedia, mediaKey, putMedia, shrinkImage, useMediaUrl } from "../../lib/mediaDb.js";
import { Btn } from "./ui.jsx";

export const MAX_PHOTOS = 4;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Gambar frame: foto utama unggahan mitra bila ada, jika tidak ilustrasi. */
export function FrameThumb({ frame, className = "w-full" }) {
  const url = useMediaUrl(frame.media?.photos ? mediaKey(frame.id, "photo-0") : null, frame.media?.v);
  return url ? (
    <img src={url} alt={frame.name} className={`${className} aspect-[3/2] object-contain bg-white`} loading="lazy" />
  ) : (
    <FrameIcon style={frame.style} colorKey={frame.colorKey} className={className} />
  );
}

/** Keadaan awal bagian aset di form (ubah/tambah). */
export function assetsInitial(frame) {
  const m = frame?.media;
  return {
    photos: Array.from({ length: m?.photos || 0 }, (_, i) => ({ key: mediaKey(frame.id, `photo-${i}`) })),
    glb: m?.glb ? { saved: true, ...m.glb } : null
  };
}

/** Tulis aset form ke penyimpanan; hasilnya disimpan di frame.media. */
export async function commitAssets(frameId, assets, prev) {
  // 1) ambil blob foto yang berpindah slot (sebelum ada slot yang ditimpa); foto yang tetap di slotnya tidak disentuh
  const items = assets.photos;
  const same = (p, i) => !p.blob && p.key === mediaKey(frameId, `photo-${i}`);
  const blobs = [];
  for (let i = 0; i < items.length; i++) blobs.push(same(items[i], i) ? null : items[i].blob || (await getMedia(items[i].key)));
  for (let i = 0; i < blobs.length; i++) if (blobs[i]) await putMedia(mediaKey(frameId, `photo-${i}`), blobs[i]);
  // hapus dari slot tertinggi ke bawah (server merapatkan slot tiap penghapusan)
  for (let i = (prev?.photos || 0) - 1; i >= items.length; i--) await delMedia(mediaKey(frameId, `photo-${i}`));
  // 2) model 3D
  let glb = null;
  if (assets.glb?.blob) {
    await putMedia(mediaKey(frameId, "model"), assets.glb.blob);
    const { blob, saved, ...meta } = assets.glb;
    glb = meta;
  } else if (assets.glb?.saved) {
    const { saved, ...meta } = assets.glb;
    glb = meta;
  } else if (prev?.glb) {
    await delMedia(mediaKey(frameId, "model"));
  }
  return { photos: items.length, glb, v: Date.now() };
}

function PhotoTile({ item, index, onMain, onRemove }) {
  const stored = useMediaUrl(item.blob ? null : item.key);
  const [made, setMade] = useState(null);
  useEffect(() => {
    if (!item.blob) return undefined;
    const u = URL.createObjectURL(item.blob);
    setMade(u);
    return () => URL.revokeObjectURL(u);
  }, [item.blob]);
  const src = item.blob ? made : stored;
  return (
    <div className="relative rounded-xl border border-[#DDE8F4] bg-white overflow-hidden group">
      <div className="aspect-square bg-surface-blue/50 flex items-center justify-center">
        {src ? <img src={src} alt={`Foto produk ${index + 1}`} className="w-full h-full object-contain" /> : <span className="text-[11px] text-ink-muted">Memuat…</span>}
      </div>
      {index === 0 && <span className="absolute top-1.5 left-1.5 h-5 px-2 rounded-full bg-blue-deep text-white text-[10.5px] font-semibold flex items-center">Utama</span>}
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        {index > 0 && (
          <button type="button" onClick={onMain} className="w-7 h-7 rounded-lg bg-white/95 border border-[#DDE8F4] flex items-center justify-center text-ink-text hover:text-blue-deep" aria-label={`Jadikan foto ${index + 1} sebagai foto utama`} title="Jadikan utama"><Star size={13} /></button>
        )}
        <button type="button" onClick={onRemove} className="w-7 h-7 rounded-lg bg-white/95 border border-[#DDE8F4] flex items-center justify-center text-red-500 hover:bg-red-50" aria-label={`Hapus foto ${index + 1}`}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

const RIG_UI = {
  ok: { tone: "text-[#15803D]", Icon: CheckCircle2, title: "Sesuai spesifikasi TryLens", text: "Pusat lensa akan dikunci ke pupil pengguna dan frame tampil berukuran asli." },
  partial: { tone: "text-[#B45309]", Icon: AlertTriangle, title: "Rig belum lengkap", text: "Try-on tetap jalan, tetapi penempatan hanya perkiraan." },
  none: { tone: "text-[#B45309]", Icon: AlertTriangle, title: "Model tanpa rig", text: "Try-on tetap jalan dengan penempatan perkiraan (tanpa kunci pupil dan tanpa laporan kecocokan)." }
};

function GlbStatus({ info }) {
  if (!info.valid && info.valid !== undefined) {
    return <p className="flex items-start gap-2 text-[12.5px] text-red-600 m-0"><XCircle size={15} className="mt-0.5 flex-shrink-0" /> {info.error}</p>;
  }
  const ui = RIG_UI[info.rig] || RIG_UI.none;
  const probs = [
    ...(info.missingNodes?.length && info.rig === "partial" ? [`Node belum ada: ${info.missingNodes.join(", ")}`] : []),
    ...(info.missingMeta?.length && info.rig !== "none" ? [`Metadata belum ada: ${info.missingMeta.join(", ")}`] : []),
    ...(info.issues || [])
  ];
  return (
    <div className="text-[12.5px]">
      <p className={`flex items-start gap-2 m-0 font-semibold ${ui.tone}`}><ui.Icon size={15} className="mt-0.5 flex-shrink-0" /> {ui.title}</p>
      <p className="text-ink-muted m-0 mt-0.5 ml-[23px]">{ui.text}{info.lensSepMm ? ` Jarak pusat lensa ±${Math.round(info.lensSepMm)} mm.` : ""}</p>
      {probs.length > 0 && <ul className="m-0 mt-1 ml-[23px] pl-4 text-ink-text">{probs.map((p) => <li key={p}>{p}</li>)}</ul>}
      {info.rig !== "ok" && (
        <p className="text-ink-muted m-0 mt-1 ml-[23px]">Cara membuat rig otomatis: <code className="bg-surface-blue px-1 rounded">npm run glb:rig -- masuk.glb keluar.glb</code> (lihat README → Spesifikasi aset).</p>
      )}
    </div>
  );
}

/** Bagian "Foto & Model 3D" di form frame. assets/setAssets = state dari assetsInitial(). */
export function FrameAssetFields({ assets, setAssets }) {
  const photoIn = useRef(null);
  const glbIn = useRef(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function addPhotos(files) {
    setErr("");
    const room = MAX_PHOTOS - assets.photos.length;
    const list = [...files];
    if (list.length > room) setErr(`Maksimal ${MAX_PHOTOS} foto; ${list.length - room} file diabaikan.`);
    const add = [];
    setBusy(true);
    for (const f of list.slice(0, Math.max(0, room))) {
      if (!PHOTO_TYPES.includes(f.type)) { setErr(`"${f.name}" bukan JPG/PNG/WebP.`); continue; }
      if (f.size > 15 * 1048576) { setErr(`"${f.name}" lebih dari 15 MB.`); continue; }
      try { add.push({ blob: await shrinkImage(f), name: f.name }); } catch { setErr(`"${f.name}" tidak bisa dibaca.`); }
    }
    setBusy(false);
    if (add.length) setAssets((a) => ({ ...a, photos: [...a.photos, ...add] }));
  }

  async function pickGlb(file) {
    setErr("");
    if (!file) return;
    if (!/\.glb$/i.test(file.name)) return setErr("Gunakan file berformat .glb (glTF Binary).");
    if (file.size > MAX_GLB_BYTES) return setErr(`File ${kb(file.size)} melebihi batas ${kb(MAX_GLB_BYTES)}. Kompres tekstur atau decimate mesh.`);
    setBusy(true);
    const info = inspectGlb(await file.arrayBuffer());
    setBusy(false);
    if (!info.valid) return setErr(info.error);
    const { valid, error, ...meta } = info;
    setAssets((a) => ({ ...a, glb: { blob: file, name: file.name, size: file.size, ...meta } }));
  }

  const move = (i) => setAssets((a) => ({ ...a, photos: [a.photos[i], ...a.photos.filter((_, k) => k !== i)] }));
  const drop = (i) => setAssets((a) => ({ ...a, photos: a.photos.filter((_, k) => k !== i) }));

  return (
    <div className="col-span-full grid md:grid-cols-2 gap-4 pt-1">
      <div>
        <p className="text-[12.5px] font-semibold text-ink m-0">Foto produk</p>
        <p className="text-[11.5px] text-ink-muted m-0 mb-2">Maks. {MAX_PHOTOS} foto (JPG/PNG/WebP). Latar polos, rasio 1:1, minimal 800 px. Foto pertama = foto utama.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {assets.photos.map((p, i) => <PhotoTile key={p.key || `${i}-${p.name}`} item={p} index={i} onMain={() => move(i)} onRemove={() => drop(i)} />)}
          {assets.photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => photoIn.current?.click()} className="aspect-square rounded-xl border border-dashed border-[#9DB8D8] bg-white hover:border-blue-deep hover:bg-surface-blue/40 flex flex-col items-center justify-center gap-1 text-[12px] text-ink-text">
              <ImagePlus size={20} /> Tambah foto
            </button>
          )}
        </div>
        <input ref={photoIn} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
      </div>

      <div>
        <p className="text-[12.5px] font-semibold text-ink m-0">Model 3D untuk Virtual Try-On (.glb)</p>
        <p className="text-[11.5px] text-ink-muted m-0 mb-2">Maks. {kb(MAX_GLB_BYTES)}. Satuan cm, menghadap +Z; idealnya dengan rig TryLens (GlassesRoot, Bridge, Left/RightLensCenter, Left/RightTemple).</p>
        {assets.glb ? (
          <div className="rounded-xl border border-[#DDE8F4] bg-white p-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-lg bg-surface-blue flex items-center justify-center text-blue-deep flex-shrink-0"><Box size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink m-0 truncate">{assets.glb.name}</p>
                <p className="text-[11.5px] text-ink-muted m-0">{kb(assets.glb.size)}{assets.glb.saved ? " · tersimpan" : " · belum disimpan"}</p>
              </div>
              <Btn type="button" variant="outline" size="sm" onClick={() => glbIn.current?.click()}>Ganti</Btn>
              <button type="button" onClick={() => setAssets((a) => ({ ...a, glb: null }))} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500" aria-label="Hapus model 3D"><Trash2 size={15} /></button>
            </div>
            <GlbStatus info={assets.glb} />
          </div>
        ) : (
          <button type="button" onClick={() => glbIn.current?.click()} className="w-full rounded-xl border border-dashed border-[#9DB8D8] bg-white hover:border-blue-deep hover:bg-surface-blue/40 py-6 flex flex-col items-center gap-1 text-[12.5px] text-ink-text">
            <UploadCloud size={22} /> Unggah file .glb
            <span className="text-[11.5px] text-ink-muted">Tanpa model, try-on memakai ilustrasi 2D</span>
          </button>
        )}
        <input ref={glbIn} type="file" accept=".glb,model/gltf-binary" hidden onChange={(e) => { pickGlb(e.target.files[0]); e.target.value = ""; }} />
      </div>
      {(err || busy) && <p role="status" className={`col-span-full text-[12.5px] m-0 ${err ? "text-red-600" : "text-ink-muted"}`}>{err || "Memproses berkas…"}</p>}
    </div>
  );
}
