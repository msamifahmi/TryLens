import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

// Sidebar pohon: rel vertikal, penanda berlian, dan latar sorot yang meluncur mengikuti kursor lalu kembali ke
// baris aktif. Port dari komponen tree-nav (TSX/shadcn) ke JSX proyek ini; semua gerak = transform + opacity.
const MARKER = 7;
const RAIL_X = 10; // pusat rel di dalam gutter 24px
const GLIDE = { type: "spring", visualDuration: 0.22, bounce: 0 };
const FADE = { duration: 0.12, ease: "easeOut" };

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) || false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

const cx = (...a) => a.filter(Boolean).join(" ");

/**
 * items: [{ label, href, badge?, external? }]   activeHref: href halaman aktif
 * linkComponent: komponen tautan ("a" atau pembungkus router yang menerima prop `href`)
 */
export default function TreeNav({ items, activeHref, followHover = true, linkComponent: Link = "a", onSelect, className = "", rowH = 32, textCls = "text-[13px]" }) {
  const ROW_H = rowH;
  const listRef = useRef(null);
  const rowRefs = useRef([]);
  const centersRef = useRef([]);
  const hoveredRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const activeIndex = items.findIndex((i) => i.href === activeHref);
  const reducedRef = useRef(reduced);
  const activeRef = useRef(activeIndex);
  useLayoutEffect(() => {
    reducedRef.current = reduced;
    activeRef.current = activeIndex;
  });

  const [end, setEnd] = useState(0);
  const [measured, setMeasured] = useState(false);
  const centerY = useMotionValue(0);
  const visibility = useMotionValue(0);
  const pillY = useTransform(centerY, (v) => v - ROW_H / 2);
  const markerY = useTransform(centerY, (v) => v - MARKER / 2);
  const accentScale = useTransform(centerY, (v) => (end > 0 ? Math.min(1, v / end) : 0));

  const moveTo = useCallback(
    (index, immediate = false) => {
      const centers = centersRef.current;
      if (index === null || index < 0 || index >= centers.length) {
        animate(visibility, 0, FADE);
        return;
      }
      const target = centers[index];
      const jump = immediate || reducedRef.current || visibility.get() < 0.05;
      if (jump) centerY.jump(target);
      else animate(centerY, target, GLIDE);
      animate(visibility, 1, FADE);
    },
    [centerY, visibility]
  );

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const measure = () => {
      const next = rowRefs.current.slice(0, items.length).map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0));
      centersRef.current = next;
      setEnd(next.length ? next[next.length - 1] : 0);
      setMeasured(true);
      moveTo(hoveredRef.current ?? activeRef.current, true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [items.length, moveTo]);

  useEffect(() => {
    if (hoveredRef.current === null) moveTo(activeIndex);
  }, [activeIndex, moveTo]);

  const enter = (i) => {
    if (!followHover) return;
    hoveredRef.current = i;
    moveTo(i);
  };
  const leave = () => {
    if (!followHover) return;
    hoveredRef.current = null;
    moveTo(activeRef.current);
  };

  return (
    <ul ref={listRef} className={cx("relative flex flex-col gap-0.5 ps-6 m-0 list-none", className)} onPointerLeave={leave}>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 w-5">
        <span className="absolute top-0 w-px bg-[#DDE8F4]" style={{ insetInlineStart: RAIL_X - 0.5, height: end }} />
        <span className="absolute size-1 rounded-full bg-[#DDE8F4]" style={{ insetInlineStart: RAIL_X - 2, top: end - 2, width: 4, height: 4 }} />
        <motion.span
          className="absolute top-0 w-px origin-top bg-blue-deep will-change-transform"
          style={{ insetInlineStart: RAIL_X - 0.5, height: end, scaleY: accentScale, opacity: visibility }}
        />
        <motion.span
          className="absolute top-0 rounded-[1px] bg-blue-deep will-change-transform"
          style={{ insetInlineStart: RAIL_X - MARKER / 2, width: MARKER, height: MARKER, y: markerY, rotate: 45, opacity: visibility }}
        />
      </span>

      <motion.span
        aria-hidden
        className="pointer-events-none absolute end-0 start-6 top-0 rounded-lg bg-blue-deep/[0.07] will-change-transform"
        style={{ height: ROW_H, y: pillY, opacity: visibility }}
      />

      {items.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <li key={item.href} ref={(el) => (rowRefs.current[index] = el)} className="relative" onPointerEnter={() => enter(index)}>
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              aria-current={isActive ? "page" : undefined}
              onClick={onSelect ? (e) => onSelect(item, e) : undefined}
              onFocus={() => enter(index)}
              onBlur={leave}
              style={{ height: ROW_H }}
              className={cx(
                `flex items-center gap-2.5 rounded-lg px-3 ${textCls} leading-5 antialiased transition-colors duration-150 ease-out no-underline`,
                isActive && !measured && "bg-blue-deep/[0.07]",
                isActive ? "font-semibold text-ink" : "font-normal text-ink-muted hover:text-ink"
              )}
            >
              {item.icon && <item.icon size={Math.round(ROW_H / 2.3)} strokeWidth={1.9} className={isActive ? "text-blue-deep" : "text-ink-muted"} aria-hidden="true" />}
              <span className="truncate">{item.label}</span>
              {item.badge && <span className="ml-auto inline-flex h-[18px] shrink-0 items-center rounded-[6px] bg-accent-yellow px-[5px] text-xs font-semibold leading-none text-ink">{item.badge}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
