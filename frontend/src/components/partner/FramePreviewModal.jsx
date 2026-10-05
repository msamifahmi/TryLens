import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Glasses, X } from "lucide-react";
import { FrameThumb } from "./FrameAssets.jsx";
import { Badge, Btn } from "./ui.jsx";
import { mediaKey, useMediaUrl } from "../../lib/mediaDb.js";
import { buyLinks } from "../../lib/ecommerce.js";
import { PRODUCTS, STYLE_LABELS } from "../../data/mockData.js";
import { fmtRp } from "../../data/partnerMock.js";

function Photo({ frame, index }) {
  const url = useMediaUrl(mediaKey(frame.id, `photo-${index}`), frame.media?.v);
  return url ? <img src={url} alt={`${frame.name} ${index + 1}`} className="w-full h-full object-contain bg-white" /> : null;
}

/** Detail frame sebagaimana dilihat pelanggan — dibuka dari Pratinjau Toko. */
export default function FramePreviewModal({ frame, store, onClose, sponsored }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!frame) return null;
  const photos = frame.media?.photos || 0;
  const shops = buyLinks(frame, store);
  const isPublic = PRODUCTS.some((p) => p.id === frame.id);
  const disc = frame.oldPrice ? Math.round((1 - frame.price / frame.oldPrice) * 100) : 0;

  return (
    <>
      <div className="fixed inset-0 bg-ink/45 z-[80]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={`Pratinjau ${frame.name}`}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-[min(720px,94vw)] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 md:p-6">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-muted m-0 mb-1">Tampilan di mata pelanggan</p>
            <h3 className="text-lg font-bold text-ink m-0 truncate">{frame.name}</h3>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-blue flex-shrink-0"><X size={18} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="bg-surface-blue/60 rounded-xl p-4 aspect-[4/3] flex items-center justify-center overflow-hidden">
              {photos > 0 ? <Photo frame={frame} index={Math.min(idx, photos - 1)} /> : <FrameThumb frame={frame} />}
            </div>
            {photos > 1 && (
              <div className="flex gap-2 mt-2">
                {Array.from({ length: photos }, (_, i) => (
                  <button key={i} onClick={() => setIdx(i)} aria-label={`Foto ${i + 1}`} aria-pressed={idx === i}
                    className={`w-14 h-12 rounded-lg overflow-hidden border-2 ${idx === i ? "border-blue-deep" : "border-transparent"} bg-surface-blue/60`}>
                    <Photo frame={frame} index={i} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {sponsored && <Badge tone="gold">Sponsored</Badge>}
              {frame.vto && <Badge><Glasses size={11} className="inline mr-1" />Try-On</Badge>}
              {disc > 0 && <Badge>-{disc}%</Badge>}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink m-0">{fmtRp(frame.price)}</p>
              {frame.oldPrice ? <p className="text-[13px] text-ink-muted line-through m-0">{fmtRp(frame.oldPrice)}</p> : null}
            </div>
            <p className="text-[13px] text-ink-muted m-0">
              {STYLE_LABELS[frame.style] || frame.style} · {frame.colorKey} · {frame.category} · stok {frame.stock}
            </p>
            <p className="text-[13.5px] text-ink-text m-0 whitespace-pre-line">
              {frame.description?.trim() || <span className="text-ink-muted italic">Belum ada deskripsi — tambahkan di Produk / Frame → Ubah.</span>}
            </p>
            <div>
              <p className="text-[12.5px] font-semibold text-ink-text m-0 mb-1.5">Tombol beli yang tampil</p>
              {shops.length ? (
                <div className="flex flex-col gap-1.5">
                  {shops.map((s) => (
                    <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer nofollow"
                      className="flex items-center gap-2 h-9 px-3 rounded-lg text-white text-[13px] font-semibold hover:brightness-95" style={{ background: s.color }}>
                      <span className="flex-1">Beli di {s.label}</span>
                      {s.scope === "toko" && <span className="text-[10.5px] opacity-85">halaman toko</span>}
                      <ExternalLink size={13} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-muted m-0">Belum ada tautan e-commerce. Pelanggan hanya bisa WhatsApp/telepon.</p>
              )}
            </div>
            <div className="mt-auto pt-2 flex flex-wrap gap-2">
              {isPublic ? (
                <Btn as={Link} to={`/produk/${frame.id}`} size="sm"><ExternalLink size={14} /> Buka halaman produk publik</Btn>
              ) : (
                <p className="text-[12px] text-ink-muted m-0">Halaman publik tersedia saat backend tersambung (mode demo hanya pratinjau).</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
