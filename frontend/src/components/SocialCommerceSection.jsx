import { InstagramIcon, XIcon, ShopBagIcon, ExternalIcon } from "./icons/SocialIcons.jsx";

const SOCIAL = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, tone: "text-[#C13584] bg-[#FDF0F7]" },
  { key: "x", label: "X", Icon: XIcon, tone: "text-ink bg-slate-100" }
];

const COMMERCE = [
  { key: "tokopedia", label: "Tokopedia", Icon: ShopBagIcon, tone: "text-[#03AC0E] bg-[#EDFAEE]" },
  { key: "shopee", label: "Shopee", Icon: ShopBagIcon, tone: "text-[#EE4D2D] bg-[#FFF1EE]" }
];

// https://instagram.com/optikkusuma -> @optikkusuma
function handleOf(url) {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last ? `@${last}` : new URL(url).hostname;
  } catch {
    return url;
  }
}

/* ---------- varian "card": kartu besar dengan grid (dipakai di halaman Mitra) ---------- */
function LinkItem({ item, url, sublabel }) {
  const { label, Icon, tone } = item;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-border bg-white p-3 hover:border-blue hover:shadow-sm transition-all"
    >
      <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tone}`}>
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold text-ink-text leading-tight">{label}</span>
        <span className="block text-xs text-ink-muted truncate">{sublabel(url)}</span>
      </span>
      <span className="text-ink-muted group-hover:text-blue flex-shrink-0">
        <ExternalIcon />
      </span>
    </a>
  );
}

function Group({ heading, items, links, sublabel }) {
  const available = items.filter((it) => links?.[it.key]);
  if (available.length === 0) return null;
  return (
    <div>
      <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-muted mb-2.5">{heading}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {available.map((it) => (
          <LinkItem key={it.key} item={it} url={links[it.key]} sublabel={sublabel} />
        ))}
      </div>
    </div>
  );
}

/* ---------- varian "inline": ringkas, tanpa kartu (dipakai di header profil toko) ---------- */
function Chip({ item, url }) {
  const { label, Icon, tone } = item;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={handleOf(url)}
      aria-label={`${label} ${handleOf(url)}`}
      className="h-9 pl-1.5 pr-3 rounded-lg border border-border bg-white inline-flex items-center gap-2 text-[13px] font-semibold text-ink-text hover:border-blue hover:text-blue transition-colors"
    >
      <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${tone}`}>
        <Icon size={14} />
      </span>
      {label}
    </a>
  );
}

function InlineGroup({ heading, items, links }) {
  const available = items.filter((it) => links?.[it.key]);
  if (available.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">{heading}</p>
      <div className="flex flex-wrap gap-2">
        {available.map((it) => (
          <Chip key={it.key} item={it} url={links[it.key]} />
        ))}
      </div>
    </div>
  );
}

/**
 * Link Media Sosial (Instagram, X) dan E-commerce (Tokopedia, Shopee).
 * Grup/tombol yang URL-nya kosong otomatis disembunyikan.
 *
 * variant="card"   : kartu putih besar + subtitle (default; halaman Mitra)
 * variant="inline" : tanpa kartu, ringkas; ditaruh di dalam kartu lain (header profil toko)
 */
export default function SocialCommerceSection({ title, subtitle, links, variant = "card" }) {
  const hasAny = [...SOCIAL, ...COMMERCE].some((it) => links?.[it.key]);
  if (!hasAny) return null;

  if (variant === "inline") {
    return (
      <section aria-label={title} className="flex flex-col gap-3">
        <h2 className="text-[13.5px] font-bold text-ink m-0">{title}</h2>
        <InlineGroup heading="Media Sosial" items={SOCIAL} links={links} />
        <InlineGroup heading="E-commerce" items={COMMERCE} links={links} />
      </section>
    );
  }

  return (
    <section className="bg-white border border-border rounded-2xl p-5 md:p-6" aria-label={title}>
      <div className="mb-4">
        <h2 className="text-[19px] font-bold text-ink tracking-tight mb-1">{title}</h2>
        {subtitle && <p className="text-[13.5px] text-ink-muted m-0">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
        <Group heading="Media Sosial" items={SOCIAL} links={links} sublabel={handleOf} />
        <Group heading="E-commerce" items={COMMERCE} links={links} sublabel={() => "Belanja di toko resmi"} />
      </div>
    </section>
  );
}
