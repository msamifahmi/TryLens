import { useEffect, useState } from "react";
import { assetUrl } from "../lib/catalog.js";
import { useProductPhotos } from "../lib/useProductPhotos.js";
import Model360, { useHasModel } from "./Model360.jsx";

/**
 * Pratinjau saat kursor di atas kartu produk (desktop): slide foto bergantian, lalu model 3D berputar 360° bila ada.
 * Hanya dipasang selama kursor di atas kartu (satu konteks WebGL pada satu waktu) dan tidak menangkap klik.
 */
export default function ProductHoverPreview({ product }) {
  const { photos } = useProductPhotos(product.id);
  const hasModel = useHasModel(product.id);
  const [i, setI] = useState(0);
  const [dwell, setDwell] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDwell(true), 300); // kursor lewat sekilas tidak memuat apa-apa
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!dwell || photos.length < 2) return undefined;
    const t = setInterval(() => setI((v) => (v + 1) % photos.length), 1000);
    return () => clearInterval(t);
  }, [dwell, photos.length]);

  if (!dwell) return null;
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none bg-[#F8FAFC] tl-fade-in" aria-hidden="true">
      {photos.map((v, n) => (
        <img key={v} src={assetUrl(product.id, `${v}.jpg`)} alt="" className="absolute inset-0 w-full h-full object-contain p-[14%]"
          style={{ opacity: n === i && !modelReady ? 1 : 0, transition: "opacity .35s ease" }} />
      ))}
      {hasModel && (
        <div className="absolute inset-0 p-[6%]" style={{ opacity: modelReady ? 1 : 0, transition: "opacity .35s ease" }}>
          <Model360 productId={product.id} bare onReady={() => setModelReady(true)} />
        </div>
      )}
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10.5px] font-bold text-blue-deep bg-white/90 rounded-full px-2.5 py-0.5 shadow-sm">
        {modelReady ? "360°" : photos.length > 1 ? `${i + 1}/${photos.length}` : ""}
      </span>
      {photos.length > 1 && !modelReady && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
          {photos.map((v, n) => <span key={v} className={`w-1.5 h-1.5 rounded-full ${n === i ? "bg-blue-deep" : "bg-blue-deep/25"}`} />)}
        </div>
      )}
    </div>
  );
}
