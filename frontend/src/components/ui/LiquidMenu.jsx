import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Menu "liquid morph": pil kuning yang mengembang jadi panel gelap; lingkaran gelap naik dari bawah, huruf tiap item
// bergulir saat di-hover. Port dari liquid-morph-floating-menu (TSX/framer-motion) ke JSX; dipasang sebagai popover
// yang menempel di sudut kanan atas pemicunya (bukan melayang di tengah bawah layar).
const ease = [0.22, 1, 0.36, 1];
const DISPLAY = "'Bebas Neue', 'Plus Jakarta Sans', sans-serif";

function RollButton({ label, onClick, isOpen, index, reduced }) {
  const [hovered, setHovered] = useState(false);
  const animating = useRef(false);
  const pendingLeave = useRef(false);
  const chars = [...label];
  const lock = 30 * chars.length + 300;

  const enter = useCallback(() => {
    pendingLeave.current = false;
    if (hovered) return;
    setHovered(true);
    animating.current = true;
    setTimeout(() => {
      animating.current = false;
      if (pendingLeave.current) {
        pendingLeave.current = false;
        setHovered(false);
      }
    }, lock);
  }, [hovered, lock]);
  const leave = useCallback(() => {
    if (animating.current) pendingLeave.current = true;
    else setHovered(false);
  }, []);

  return (
    <motion.button
      type="button"
      role="menuitem"
      tabIndex={isOpen ? 0 : -1}
      onClick={onClick}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      aria-label={label}
      className="text-[#FFE8BE] text-[24px] uppercase leading-none overflow-hidden bg-transparent border-0 p-0 cursor-pointer"
      style={{ fontFamily: DISPLAY, letterSpacing: "-0.03em", height: "1em" }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: reduced ? 0 : 0.4, delay: isOpen && !reduced ? 0.4 + 0.08 * index : 0, ease }}
    >
      <div className="flex justify-center" aria-hidden="true">
        {chars.map((c, i) => (
          <span key={i} className="inline-block overflow-hidden" style={{ height: "1em" }}>
            <span
              className="flex flex-col"
              style={{
                transitionProperty: "transform",
                transitionDuration: hovered && !reduced ? "800ms" : "0ms",
                transitionDelay: hovered && !reduced ? `${30 * i}ms` : "0ms",
                transform: hovered ? "translateY(-50%)" : "translateY(0%)",
                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)"
              }}
            >
              <span className="block" style={{ height: "1em", lineHeight: "1em" }}>{c === " " ? " " : c}</span>
              <span className="block" style={{ height: "1em", lineHeight: "1em" }}>{c === " " ? " " : c}</span>
            </span>
          </span>
        ))}
      </div>
    </motion.button>
  );
}

/**
 * icon  : isi tombol saat tertutup (ikon pengguna / inisial). Tertutup = lingkaran barH × barH.
 * items : [{ label, onClick }]   openW : lebar panel terbuka (px)
 * Warna mengikuti palet TryLens: biru #406aaf (tombol), biru tua #1E3560 (panel), krem #FFE8BE (teks), kuning #F7DD7D (sorot).
 */
export default function LiquidMenu({ icon, label = "Akun", items, barH = 40, openW = 240, className = "", ariaLabel = "Menu akun" }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const closedW = barH;
  const dur = (d) => (reduced ? 0.01 : d);
  const n = items.length;
  const openH = 48 + 92 + n * 48 - 24; // 3 item ≈ 260 px seperti aslinya

  useEffect(() => {
    if (!isOpen) return undefined;
    const down = (e) => ref.current && !ref.current.contains(e.target) && setIsOpen(false);
    const key = (e) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className={`relative flex-shrink-0 ${className}`} style={{ width: closedW, height: barH }}>
      <motion.div
        className="absolute right-0 top-0 z-50 overflow-hidden flex flex-col"
        style={{ letterSpacing: "-0.02em", cursor: isOpen ? "default" : "pointer", boxShadow: isOpen ? "0 18px 50px rgba(30,53,96,0.38)" : "0 1px 3px rgba(30,53,96,0.25)" }}
        animate={{ width: isOpen ? openW : closedW, height: isOpen ? openH : barH, borderRadius: isOpen ? 32 : barH }}
        whileHover={isOpen || reduced ? undefined : { scale: 1.05 }}
        transition={{ duration: dur(0.8), ease, height: { duration: dur(isOpen ? 0.8 : 0.35) }, scale: { duration: 0.25, ease } }}
        onClick={() => !isOpen && setIsOpen(true)}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ backgroundColor: "#406aaf", borderColor: isOpen ? "#406aaf" : "#F7DD7D" }}
          transition={{ duration: dur(isOpen ? 0.1 : 0.3), ease }}
          style={{ borderWidth: 1, borderStyle: "solid", borderRadius: "inherit" }}
        />
        <motion.div
          className="absolute left-1/2 bg-[#1E3560]"
          style={{ width: "200%", height: "200%", borderRadius: "50%", x: "-50%" }}
          animate={{ bottom: isOpen ? "-20%" : "-200%" }}
          transition={{ duration: dur(0.8), ease, delay: isOpen && !reduced ? 0.1 : 0 }}
        />

        <div
          role="menu"
          aria-label={ariaLabel}
          className="relative z-10 flex flex-col gap-6 items-center justify-center"
          style={{ pointerEvents: isOpen ? "auto" : "none", opacity: isOpen ? 1 : 0, flex: isOpen ? 1 : 0, overflow: "hidden" }}
        >
          {items.map((it, i) => (
            <RollButton
              key={it.label}
              label={it.label}
              index={i}
              isOpen={isOpen}
              reduced={reduced}
              onClick={() => {
                setIsOpen(false);
                it.onClick?.();
              }}
            />
          ))}
        </div>

        <motion.button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Tutup menu" : `${ariaLabel}: ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="relative z-10 flex items-center w-full shrink-0 cursor-pointer bg-transparent border-0"
          animate={{ paddingLeft: isOpen ? 24 : 0, paddingRight: isOpen ? 24 : 0, paddingBottom: isOpen ? 24 : 0, height: isOpen ? 48 : barH }}
          transition={{ duration: dur(0.8), ease }}
          style={{ alignItems: "center", justifyContent: isOpen ? "space-between" : "center" }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {isOpen ? (
              <motion.span key="menu" className="text-[14px] font-semibold leading-none text-[#FFE8BE]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                Menu
              </motion.span>
            ) : (
              <motion.span key="icon" className="flex items-center justify-center text-white font-bold text-[14px]" initial={{ opacity: 0, scale: 0.6, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.3, ease }}>
                {icon}
              </motion.span>
            )}
          </AnimatePresence>
          {isOpen && (
            <div className="relative w-[24px] h-[24px] flex items-center justify-center flex-shrink-0">
              {[1, -1].map((d) => (
                <motion.span key={d} className="absolute block w-[18px] h-[2px] rounded-full bg-[#F7DD7D]" initial={{ rotate: 0 }} animate={{ rotate: 45 * d }} transition={{ duration: dur(0.4), ease }} />
              ))}
            </div>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
