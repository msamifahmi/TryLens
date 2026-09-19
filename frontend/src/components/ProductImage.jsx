import { useState, useEffect } from "react";
import FrameIcon from "./icons/FrameIcon.jsx";

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
export default function ProductImage({ productId, variant = "main", style, colorKey, className = "", alt = "" }) {
  const src = `/products/${productId}/${variant}.jpg`;
  const [status, setStatus] = useState("loading"); // loading | photo | fallback

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    const img = new Image();
    img.onload = () => { if (!cancelled) setStatus("photo"); };
    img.onerror = () => { if (!cancelled) setStatus("fallback"); };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);

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
