import { useEffect, useState } from "react";
import { assetUrl } from "../lib/catalog.js";
import { useProductPhotos } from "../lib/useProductPhotos.js";
import Model360, { useHasModel } from "./Model360.jsx";

const SLIDE_MS = 1000; // ganti foto tiap ±1 detik
const ROTATE_AFTER_MS = 5000; // kursor tetap di kartu selama ini → beralih ke 360°

/**
 * Pratinjau saat kursor di atas kartu produk (desktop). Urutan SELALU sama untuk semua kartu:
 *   1. "slides": foto bergantian (tanpa menunggu apa pun; foto utama jadi cadangan selagi daftar foto dimuat);
 *   2. setelah kursor bertahan 5 detik dan produk punya model → "rotate": model 3D berputar 360° (fade). Model baru dimuat
 *      pada tahap ini, jadi urutan unduhan tidak memengaruhi apa yang tampil;
 *   3. tanpa model → tetap foto. Keluar dari kartu → komponen dilepas (satu konteks WebGL pada satu waktu).
 * prefers-reduced-motion: tanpa auto-slide dan model tidak auto-putar. Tidak menangkap klik.
 */
export default function ProductHoverPreview({ product }) {
  const { photos } = useProductPhotos(product.id);
  const hasModel = useHasModel(product.id);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState("slides"); // slides | rotate
  const [modelReady, setModelReady] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const list = photos.length ? photos : ["main"];

  useEffect(() => {
    const t = setTimeout(() => setStage("rotate"), ROTATE_AFTER_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (reduced || stage !== "slides" || list.length < 2) return undefined;
    const t = setInterval(() => setI((v) => (v + 1) % list.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [stage, list.length, reduced]);

  const rotating = stage === "rotate" && hasModel;
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none bg-surface-blue tl-fade-in" aria-hidden="true">
      {list.map((v, n) => (
        <img key={v} src={assetUrl(product.id, `${v}.jpg`)} alt="" className="absolute inset-0 w-full h-full object-contain p-[14%]"
          style={{ opacity: n === i % list.length && !(rotating && modelReady) ? 1 : 0, transition: "opacity .35s ease" }} />
      ))}
      {rotating && (
        <div className="absolute inset-0 p-[6%]" style={{ opacity: modelReady ? 1 : 0, transition: "opacity .35s ease" }}>
          <Model360 productId={product.id} bare onReady={() => setModelReady(true)} />
        </div>
      )}
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10.5px] font-bold text-blue-deep bg-white/90 rounded-full px-2.5 py-0.5 shadow-sm">
        {rotating && modelReady ? "360°" : list.length > 1 ? `${(i % list.length) + 1}/${list.length}` : ""}
      </span>
      {list.length > 1 && !(rotating && modelReady) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
          {list.map((v, n) => <span key={v} className={`w-1.5 h-1.5 rounded-full ${n === i % list.length ? "bg-blue-deep" : "bg-blue-deep/25"}`} />)}
        </div>
      )}
    </div>
  );
}
