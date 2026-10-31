import { Link } from "react-router-dom";

/** Logo resmi TryLens (public/brand). Di layar sempit hanya lambang agar kolom cari tidak sempit. */
export default function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center flex-shrink-0" aria-label="TryLens beranda">
      <img src="/brand/logo-mark.png" alt="" width="52" height="27" className={`h-[30px] w-auto ${compact ? "" : "md:hidden"}`} />
      {!compact && <img src="/brand/logo-horizontal.png" alt="TryLens" width="144" height="34" className="hidden md:block h-[34px] w-auto" />}
    </Link>
  );
}
