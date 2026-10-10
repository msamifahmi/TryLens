import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import FrameIcon from "../icons/FrameIcon.jsx";
import Model360, { useHasModel } from "../Model360.jsx";
import { assetUrl } from "../../lib/catalog.js";
import { useProductPhotos } from "../../lib/useProductPhotos.js";

const LABEL = { main: "Foto utama", side: "Tampak samping", detail: "Detail", close: "Close-up" };

/**
 * Galeri produk. Aturan foto:
 *  - hanya foto yang ADA yang tampil (cukup main.jpg → satu foto, tanpa thumbnail kosong);
 *  - ilustrasi SVG hanya bila tidak ada foto sama sekali;
 *  - pratinjau 360° muncul bila produk punya model .glb.
 */
export default function ProductGallery({ product }) {
  const { photos, ready } = useProductPhotos(product.id);
  const has360 = useHasModel(product.id);
  const [active, setActive] = useState("main");

  useEffect(() => setActive("main"), [product.id]);
  // Bila foto aktif ternyata tidak ada, pindah ke foto pertama yang ada.
  useEffect(() => {
    if (ready && active !== "360" && photos.length && !photos.includes(active)) setActive(photos[0]);
  }, [ready, photos, active]);

  const items = [...photos.map((v) => ({ key: v, label: LABEL[v] })), ...(has360 ? [{ key: "360", label: "Pratinjau 360 derajat" }] : [])];
  const showThumbs = items.length > 1;
  const show360 = active === "360" && has360;

  return (
    <div className="lg:sticky lg:top-[88px]">
      <div className={`relative aspect-[4/3] rounded-3xl bg-gradient-to-br from-surface-blue to-white border border-border/70 overflow-hidden flex items-center justify-center ${show360 ? "p-3" : "p-6 md:p-10"}`}>
        {!ready ? (
          <div className="w-full h-full rounded-2xl bg-white/60 animate-pulse" aria-hidden="true" />
        ) : show360 ? (
          <Model360 key={product.id} productId={product.id} alt={`Pratinjau 360 derajat ${product.name}`} />
        ) : photos.length ? (
          <img key={`${product.id}-${active}`} src={assetUrl(product.id, `${photos.includes(active) ? active : photos[0]}.jpg`)} alt={product.name} className="max-w-full max-h-full object-contain tl-fade-in" />
        ) : (
          <FrameIcon style={product.style} colorKey={product.colorKey} className="w-4/5 h-4/5" />
        )}
      </div>

      {showThumbs && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-none pb-1" role="tablist" aria-label="Galeri produk">
          {items.map((it) => {
            const on = active === it.key;
            return (
              <button
                key={it.key}
                role="tab"
                aria-selected={on}
                aria-label={it.label}
                onClick={() => setActive(it.key)}
                className={`flex-shrink-0 w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-2xl border-2 overflow-hidden flex items-center justify-center ${
                  it.key === "360" ? "bg-gradient-to-br from-blue to-blue-deep text-white" : "bg-white p-2"
                } ${on ? "border-blue shadow-sm" : "border-border/70 hover:border-blue/60"}`}
              >
                {it.key === "360" ? (
                  <span className="flex flex-col items-center gap-0.5"><RotateCw size={18} strokeWidth={2.2} /><span className="text-[11px] font-bold leading-none">360°</span></span>
                ) : (
                  <img src={assetUrl(product.id, `${it.key}.jpg`)} alt="" loading="lazy" className="w-full h-full object-contain" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
