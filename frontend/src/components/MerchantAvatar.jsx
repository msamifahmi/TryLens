import { useState } from "react";

/**
 * Avatar toko: foto profil (merchant.logo) bila ada, kalau tidak ada / gagal dimuat → inisial di atas warna toko.
 * `className` mengatur ukuran, radius, dan font.
 */
export default function MerchantAvatar({ merchant, className = "w-11 h-11 rounded-lg text-sm", src }) {
  const [broken, setBroken] = useState(false);
  const url = src !== undefined ? src : merchant?.logo;
  const initials = merchant?.initials || (merchant?.name || "?").slice(0, 2).toUpperCase();
  if (url && !broken) {
    return (
      <img
        src={url}
        alt={merchant?.name ? `Logo ${merchant.name}` : ""}
        onError={() => setBroken(true)}
        className={`${className} object-cover flex-shrink-0 bg-surface-blue`}
        draggable={false}
      />
    );
  }
  return (
    <div
      className={`${className} flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: merchant?.color || "#406aaf" }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
