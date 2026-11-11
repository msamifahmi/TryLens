import { useState, useEffect } from "react";
import FrameIcon from "./icons/FrameIcon.jsx";
import { assetUrl } from "../lib/catalog.js";

/**
 * Renders a REAL product photo when one is available, and only falls back
 * to the illustrated SVG frame when it isn't.
 *
 * How to add real photos:
 * Drop actual photographs of your frames into:
 *   frontend/public/products/<productId>/main.jpg
 *   frontend/public/products/<productId>/side.jpg
 *   frontend/public/products/<productId>/detail.jpg
 *   frontend/public/products/<productId>/close.jpg
 *
 * <productId> is the frame's id, e.g. "f0", "f1" (see src/data/mockData.js).
 * Nothing else needs to change in the code — this component checks whether
 * the file exists and automatically switches from the illustration to your
 * real photo the moment it's placed in that folder.
 */
const RETRY_MS = [2000, 8000];

export default function ProductImage({ productId, variant = "main", style, colorKey, className = "", alt = "" }) {
  const base = assetUrl(productId, `${variant}.jpg`); // unggahan Mitra (/media) atau berkas bawaan (/products)
  const [status, setStatus] = useState("loading"); // loading | photo | fallback
  const [src, setSrc] = useState(base);

  // Gagal memuat (mis. sesaat ketika hosting sedang memperbarui berkas) → coba lagi 2× (2 dtk, 8 dtk) dengan alamat
  // anti-cache, supaya kartu tidak "tersangkut" di ilustrasi SVG padahal fotonya ada.
  useEffect(() => {
    let cancelled = false, timer = null;
    setStatus("loading");
    setSrc(base);
    const load = (attempt) => {
      const url = attempt ? `${base}${base.includes("?") ? "&" : "?"}r=${attempt}` : base;
      const img = new Image();
      img.onload = () => { if (!cancelled) { setSrc(url); setStatus("photo"); } };
      img.onerror = () => {
        if (cancelled) return;
        setStatus("fallback");
        if (attempt < RETRY_MS.length) timer = setTimeout(() => load(attempt + 1), RETRY_MS[attempt]);
      };
      img.src = url;
    };
    load(0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [base]);

  if (status === "photo") {
    return <img src={src} alt={alt} className={`object-contain ${className}`} loading="lazy" />;
  }

  // While checking, and if no real photo exists yet, show the illustration
  // so the layout never breaks or shows a broken-image icon.
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <FrameIcon style={style} colorKey={colorKey} className="w-full h-full" />
    </div>
  );
}
