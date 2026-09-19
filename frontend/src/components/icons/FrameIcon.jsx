import { FRAME_COLORS } from "../../data/mockData.js";

/**
 * Renders an original, non-photographic SVG illustration of a pair of
 * glasses in one of several silhouette styles. Used everywhere a "product
 * photo" is needed, so the whole storefront never depends on external or
 * copyrighted imagery.
 */
export default function FrameIcon({ style = "square", colorKey = "black", className = "" }) {
  const c = FRAME_COLORS[colorKey] || FRAME_COLORS.black;
  const stroke = c.frame;
  const lens = c.lens;

  const bridge = (
    <path d="M56 26 Q60 22 64 26" stroke={stroke} strokeWidth="3.4" fill="none" strokeLinecap="round" />
  );
  const temples = (
    <>
      <path d="M14 25 L2 20" stroke={stroke} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M106 25 L118 20" stroke={stroke} strokeWidth="3.4" strokeLinecap="round" />
    </>
  );

  let shapes;
  if (style === "round") {
    shapes = (
      <>
        <circle cx="35" cy="30" r="22" fill={lens} stroke={stroke} strokeWidth="4" />
        <circle cx="85" cy="30" r="22" fill={lens} stroke={stroke} strokeWidth="4" />
      </>
    );
  } else if (style === "aviator") {
    shapes = (
      <>
        <path d="M14 30 Q14 12 36 14 Q56 16 56 34 Q56 48 36 46 Q14 44 14 30Z" fill={lens} stroke={stroke} strokeWidth="4" />
        <path d="M64 34 Q64 16 84 14 Q106 12 106 30 Q106 44 84 46 Q64 48 64 34Z" fill={lens} stroke={stroke} strokeWidth="4" />
      </>
    );
  } else if (style === "cateye") {
    shapes = (
      <>
        <path d="M14 32 Q12 14 38 14 Q58 15 56 32 Q54 46 34 44 Q14 42 14 32Z" fill={lens} stroke={stroke} strokeWidth="4" />
        <path d="M64 32 Q62 15 82 14 Q108 14 106 32 Q106 42 86 44 Q66 46 64 32Z" fill={lens} stroke={stroke} strokeWidth="4" />
      </>
    );
  } else if (style === "browline") {
    shapes = (
      <>
        <rect x="14" y="16" width="42" height="30" rx="8" fill={lens} stroke={stroke} strokeWidth="3.2" />
        <rect x="64" y="16" width="42" height="30" rx="8" fill={lens} stroke={stroke} strokeWidth="3.2" />
        <path d="M12 16 Q35 8 58 16" stroke={stroke} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M62 16 Q85 8 108 16" stroke={stroke} strokeWidth="5" fill="none" strokeLinecap="round" />
      </>
    );
  } else if (style === "rect") {
    shapes = (
      <>
        <rect x="12" y="16" width="44" height="28" rx="3" fill={lens} stroke={stroke} strokeWidth="4" />
        <rect x="64" y="16" width="44" height="28" rx="3" fill={lens} stroke={stroke} strokeWidth="4" />
      </>
    );
  } else {
    // square (default)
    shapes = (
      <>
        <rect x="14" y="12" width="42" height="34" rx="6" fill={lens} stroke={stroke} strokeWidth="4" />
        <rect x="64" y="12" width="42" height="34" rx="6" fill={lens} stroke={stroke} strokeWidth="4" />
      </>
    );
  }

  return (
    <svg viewBox="0 0 120 60" className={className} role="img" aria-hidden="true">
      {shapes}
      {bridge}
      {temples}
    </svg>
  );
}
