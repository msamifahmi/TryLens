import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Bell, Box, CheckCheck, CreditCard, ImageOff, Megaphone, PackageMinus, Settings } from "lucide-react";
import { usePartner, useAccount } from "../store/usePartner.js";
import { buildNotifications, unreadOf } from "../lib/partnerNotifications.js";

const ease = [0.22, 1, 0.36, 1];
const ICON = { stock: PackageMinus, media: ImageOff, model: Box, billing: CreditCard, promo: Megaphone };
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Lonceng notifikasi — hanya untuk pengguna yang sudah masuk (Mitra). Hover/fokus membuka panel yang mengalir
 * keluar; tiap notifikasi bisa diklik (menuju halamannya) dan punya tombol tindakan. Dibaca disimpan di akun.
 */
export default function NotificationBell({ className = "", size = 40 }) {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const timer = useRef(null);

  const list = buildNotifications(acc, today());
  const read = acc?.notifRead || [];
  const unread = unreadOf(list, read);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return undefined;
    const key = (e) => e.key === "Escape" && setOpen(false);
    const down = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", down); };
  }, [open]);

  if (!acc) return null; // belum masuk → tidak ada lonceng

  const later = (v, ms) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(v), ms); };
  const mark = (ids) => patch((a) => ({ ...a, notifRead: [...new Set([...(a.notifRead || []), ...ids])] }));
  const go = (n, to) => { mark([n.id]); setOpen(false); navigate(to); };

  return (
    <div
      ref={wrap}
      className={`relative ${className}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && later(true, 80)}
      onPointerLeave={(e) => e.pointerType === "mouse" && later(false, 180)}
      onFocus={() => later(true, 0)}
      onBlur={(e) => !wrap.current?.contains(e.relatedTarget) && later(false, 120)}
    >
      <motion.button
        type="button"
        aria-label={`Notifikasi${unread.length ? `, ${unread.length} belum dibaca` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.92 }}
        style={{ width: size, height: size }}
        className={`relative flex items-center justify-center rounded-full border bg-white text-ink-text transition-colors ${open ? "border-blue-deep text-blue-deep" : "border-[#DDE8F4] hover:border-blue-deep"}`}
      >
        <motion.span animate={open && !reduced ? { rotate: [0, -18, 14, -8, 0] } : { rotate: 0 }} transition={{ duration: 0.6, ease }} style={{ display: "flex", transformOrigin: "50% 10%" }}>
          <Bell size={19} strokeWidth={1.9} />
        </motion.span>
        <AnimatePresence>
          {unread.length > 0 && (
            <motion.span key={unread.length} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-yellow text-ink text-[10.5px] font-bold flex items-center justify-center border-2 border-white">
              {unread.length}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifikasi"
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-[#DDE8F4] bg-white shadow-[0_24px_60px_rgba(64,106,175,0.25)] overflow-hidden origin-top-right"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.94, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.14 } }}
            transition={{ duration: reduced ? 0.01 : 0.35, ease }}
          >
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <p className="text-[14px] font-semibold text-ink m-0">Notifikasi {unread.length > 0 && <span className="text-ink-muted font-normal">· {unread.length} baru</span>}</p>
              <button type="button" disabled={!unread.length} onClick={() => mark(list.map((n) => n.id))} className="text-[12px] font-semibold text-blue-deep inline-flex items-center gap-1 disabled:opacity-40 hover:underline">
                <CheckCheck size={14} /> Tandai semua dibaca
              </button>
            </div>

            <ul className="m-0 p-1.5 list-none max-h-[380px] overflow-y-auto">
              {list.length === 0 && (
                <li className="px-3 py-8 text-center text-[13px] text-ink-muted">Semua beres — tidak ada yang perlu ditindaklanjuti.</li>
              )}
              {list.map((n, i) => {
                const Icon = n.tone === "warn" && n.kind === "stock" ? AlertTriangle : ICON[n.kind] || Bell;
                const isNew = !read.includes(n.id);
                return (
                  <motion.li key={n.id} layout initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: reduced ? 0 : 0.04 * i, ease }}>
                    <div className={`group relative rounded-xl p-2.5 flex gap-3 transition-colors ${isNew ? "bg-surface-blue/60" : ""} hover:bg-surface-blue`}>
                      <button type="button" onClick={() => go(n, n.action.to)} className="absolute inset-0 rounded-xl" aria-label={`${n.title}. ${n.action.label}`} />
                      <span className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 pointer-events-none ${n.tone === "warn" ? "bg-accent-yellow/70 text-ink" : "bg-white border border-[#DDE8F4] text-blue-deep"}`}>
                        <Icon size={17} strokeWidth={1.9} />
                      </span>
                      <div className="relative min-w-0 flex-1 pointer-events-none">
                        <p className="text-[13px] font-semibold text-ink m-0 leading-snug">{n.title}{isNew && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-deep ml-1.5 align-middle" aria-label="belum dibaca" />}</p>
                        <p className="text-[12px] text-ink-muted m-0 leading-snug">{n.text}</p>
                        <div className="flex items-center gap-2 mt-1.5 pointer-events-auto">
                          <button type="button" onClick={() => go(n, n.action.to)} className="relative h-7 px-3 rounded-full bg-blue-deep text-white text-[12px] font-semibold hover:brightness-90 active:scale-95 transition">
                            {n.action.label}
                          </button>
                          {isNew && (
                            <button type="button" onClick={() => mark([n.id])} className="relative text-[12px] text-ink-muted hover:text-ink">Tandai dibaca</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            <button type="button" onClick={() => { setOpen(false); navigate("/partner/settings/notifications"); }} className="w-full flex items-center justify-center gap-1.5 border-t border-[#E8F0F8] py-2.5 text-[12.5px] font-semibold text-ink-text hover:bg-surface-blue">
              <Settings size={14} /> Atur notifikasi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
