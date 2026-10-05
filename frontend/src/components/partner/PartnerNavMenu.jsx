import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown, Crown } from "lucide-react";
import { SECTIONS } from "../../pages/partner/SectionPage.jsx";

// Navbar Mitra bergaya navigation-menu: item punya dropdown (panel isi sub-menu + kartu sorotan). Satu panel bersama
// ("viewport") yang bergeser/berubah ukuran mengikuti item yang disorot; pil putih meluncur antar item (layoutId).
const ease = [0.22, 1, 0.36, 1];
const PANEL_W = 560;

function Panel({ sectionKey, onNavigate }) {
  const cfg = SECTIONS[sectionKey];
  const f = cfg.feature;
  return (
    <div className="grid grid-cols-[1fr_190px] gap-3 p-3" style={{ width: PANEL_W }}>
      <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
        {cfg.tabs.map((t, i) => (
          <motion.li key={t.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.04 * i, ease }}>
            <Link
              to={`/partner/${sectionKey}/${t.key}`}
              onClick={onNavigate}
              className="group flex items-start gap-3 rounded-xl p-2.5 no-underline hover:bg-surface-blue focus-visible:bg-surface-blue outline-none transition-colors"
            >
              <span className="w-9 h-9 rounded-lg border border-[#DDE8F4] bg-white flex items-center justify-center text-ink-text group-hover:border-blue-deep group-hover:text-blue-deep transition-colors flex-shrink-0">
                <t.icon size={17} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink leading-tight">
                  {t.label}
                  {t.pro && <span className="w-[16px] h-[16px] rounded-full bg-accent-yellow text-ink inline-flex items-center justify-center"><Crown size={10} strokeWidth={2.2} /></span>}
                </span>
                <span className="block text-[12px] text-ink-muted leading-snug mt-0.5">{t.desc}</span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
      {f && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, delay: 0.08, ease }}>
          <Link to={f.to} onClick={onNavigate} className="h-full min-h-[150px] rounded-xl bg-gradient-to-br from-blue-deep to-blue p-4 flex flex-col justify-between no-underline text-white group">
            <span>
              <span className="block text-[14px] font-bold leading-tight">{f.title}</span>
              <span className="block text-[12px] text-white/85 leading-snug mt-1.5">{f.text}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent-yellow">
              {f.cta} <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.div>
      )}
    </div>
  );
}

/** items: [{ key, label, to, match(pathname), menu?: sectionKey }] */
export default function PartnerNavMenu({ items }) {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const [openKey, setOpenKey] = useState(null);
  const [hoverKey, setHoverKey] = useState(null);
  const [place, setPlace] = useState({ left: 0, h: 0 });
  const prevIdx = useRef(0);
  const dir = useRef(1);
  const navRef = useRef(null);
  const trigRefs = useRef({});
  const panelRef = useRef(null);
  const timer = useRef(null);

  const idx = (k) => items.findIndex((i) => i.key === k);
  const hold = () => clearTimeout(timer.current);
  const later = (fn, ms) => { hold(); timer.current = setTimeout(fn, ms); };
  const open = (k) => {
    if (k !== openKey) dir.current = idx(k) >= prevIdx.current ? 1 : -1;
    prevIdx.current = Math.max(0, idx(k));
    setOpenKey(k);
  };
  const close = useCallback(() => setOpenKey(null), []);

  // Posisi panel: di bawah item yang aktif, ditahan di dalam header.
  const measure = useCallback(() => {
    const t = trigRefs.current[openKey];
    const header = navRef.current?.closest("header");
    if (!t || !header) return;
    const hb = header.getBoundingClientRect(), tb = t.getBoundingClientRect();
    const center = tb.left - hb.left + tb.width / 2;
    setPlace((p) => ({ ...p, left: Math.max(0, Math.min(hb.width - PANEL_W, center - PANEL_W / 2)), top: tb.bottom - hb.top + 10 }));
  }, [openKey]);
  useLayoutEffect(() => { if (openKey) measure(); }, [openKey, measure]);
  useLayoutEffect(() => {
    if (!openKey || !panelRef.current) return undefined;
    const ro = new ResizeObserver(() => setPlace((p) => ({ ...p, h: panelRef.current?.offsetHeight || 0 })));
    ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, [openKey]);
  useEffect(() => {
    if (!openKey) return undefined;
    const key = (e) => e.key === "Escape" && close();
    const down = (e) => !navRef.current?.closest("header")?.contains(e.target) && close();
    window.addEventListener("resize", measure);
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    return () => { window.removeEventListener("resize", measure); document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", down); };
  }, [openKey, measure, close]);
  useEffect(() => close(), [pathname, close]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const pillKey = hoverKey ?? items.find((i) => i.match(pathname))?.key ?? null;

  return (
    <nav ref={navRef} className="hidden lg:flex items-center gap-1" aria-label="Menu Mitra" onPointerLeave={() => { setHoverKey(null); later(close, 160); }}>
      {items.map((n) => {
        const active = n.match(pathname);
        const isOpen = openKey === n.key;
        const common = {
          ref: (el) => (trigRefs.current[n.key] = el),
          onPointerEnter: () => { hold(); setHoverKey(n.key); n.menu ? later(() => open(n.key), openKey ? 0 : 90) : later(close, 120); },
          onFocus: () => setHoverKey(n.key),
          onBlur: () => setHoverKey(null),
          className: `relative h-9 px-4 rounded-full text-[13.5px] flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/30 transition-colors ${active || isOpen ? "text-ink font-semibold" : "text-ink-muted hover:text-ink"}`
        };
        const pill = pillKey === n.key && (
          <motion.span layoutId="partner-nav-pill" className="absolute inset-0 rounded-full bg-white shadow-[0_1px_4px_rgba(64,106,175,0.18)]" transition={reduced ? { duration: 0 } : { type: "spring", visualDuration: 0.3, bounce: 0.12 }} />
        );
        return n.menu ? (
          <button key={n.key} type="button" {...common} aria-expanded={isOpen} aria-haspopup="true" aria-current={active ? "page" : undefined} onClick={() => (isOpen ? close() : open(n.key))}>
            {pill}
            <span className="relative z-10">{n.label}</span>
            <ChevronDown size={13} className={`relative z-10 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        ) : (
          <NavLink key={n.key} to={n.to} {...common} aria-current={active ? "page" : undefined}>
            {pill}
            <span className="relative z-10">{n.label}</span>
          </NavLink>
        );
      })}

      <AnimatePresence>
        {openKey && (
          <motion.div
            key="viewport"
            className="absolute z-40 rounded-2xl border border-[#DDE8F4] bg-white shadow-[0_24px_60px_rgba(64,106,175,0.22)] overflow-hidden"
            style={{ top: place.top, width: PANEL_W }}
            initial={{ opacity: 0, y: -8, scale: 0.97, left: place.left, height: place.h || "auto" }}
            animate={{ opacity: 1, y: 0, scale: 1, left: place.left, height: place.h || "auto" }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: reduced ? 0 : 0.35, ease }}
            onPointerEnter={hold}
            onPointerLeave={() => later(close, 160)}
          >
            <AnimatePresence mode="popLayout" initial={false} custom={dir.current}>
              <motion.div
                key={openKey}
                ref={panelRef}
                custom={dir.current}
                initial={{ opacity: 0, x: reduced ? 0 : 40 * dir.current }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : -40 * dir.current }}
                transition={{ duration: reduced ? 0 : 0.3, ease }}
              >
                <Panel sectionKey={items.find((i) => i.key === openKey).menu} onNavigate={close} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
