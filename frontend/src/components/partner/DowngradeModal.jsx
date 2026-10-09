import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";
import { Btn } from "./ui.jsx";
import { PLANS, fmtDate } from "../../data/partnerMock.js";
import { pickVtoKeep } from "../../data/quota.js";

/**
 * Konfirmasi turun paket Pro → Basic. Katalog tidak dibatasi, tetapi hanya 20 frame yang boleh ber-VTO.
 * Mitra memilih: OTOMATIS (20 frame tertua) atau PILIH SENDIRI. Hasil: onConfirm({ ids | null }).
 * frames: urutan tampil (terbaru di atas) — "berurutan" berarti dari yang tertua.
 */
export default function DowngradeModal({ open, frames, endsAt, onClose, onConfirm }) {
  const reduce = useReducedMotion();
  const limit = PLANS.basic.limits.vto;
  const vtoFrames = useMemo(() => [...frames].reverse().filter((f) => f.vto), [frames]);
  const over = vtoFrames.length > limit;
  const auto = useMemo(() => pickVtoKeep(vtoFrames, limit), [vtoFrames, limit]);
  const [mode, setMode] = useState("auto");
  const [sel, setSel] = useState(() => new Set());
  useEffect(() => { if (open) { setMode("auto"); setSel(new Set(auto)); } }, [open, auto]);
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : p.size < limit && n.add(id); return n; });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 bg-ink/45 z-[80]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.18 }} />
          <motion.div role="dialog" aria-modal="true" aria-label="Turun ke paket Basic"
            className="fixed left-1/2 top-1/2 z-[81] w-[min(640px,94vw)] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 md:p-6"
            style={{ x: "-50%", y: "-50%" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: "-46%" }} animate={{ opacity: 1, scale: 1, y: "-50%" }} exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: "-48%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-ink m-0">Turun ke paket Basic</h3>
              <button onClick={onClose} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-blue"><X size={18} /></button>
            </div>
            <p className="text-[13.5px] text-ink-text mt-0 mb-3">
              Mulai {fmtDate(endsAt)}, katalog tetap tanpa batas, tetapi hanya <strong>{limit} frame</strong> yang bisa dicoba secara virtual (VTO).
              {over ? ` Saat ini ada ${vtoFrames.length} frame ber-VTO, jadi ${vtoFrames.length - limit} frame akan dinonaktifkan try-on-nya.` : " Frame ber-VTO Anda masih dalam batas, tidak ada yang berubah."}
            </p>
            {over && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {[["auto", `Otomatis — ${limit} frame tertua`, "Dipilih berurutan dari yang pertama diunggah."], ["manual", "Pilih sendiri", `Tandai maksimal ${limit} frame yang tetap ber-VTO.`]].map(([k, t, d]) => (
                    <button key={k} type="button" onClick={() => setMode(k)} className={`text-left rounded-xl border p-3 transition-colors ${mode === k ? "border-blue-deep bg-surface-blue/60" : "border-[#DDE8F4] hover:bg-surface-blue/40"}`}>
                      <span className="block text-[13.5px] font-medium text-ink">{t}</span>
                      <span className="block text-[12px] text-ink-muted">{d}</span>
                    </button>
                  ))}
                </div>
                <AnimatePresence initial={false}>
                  {mode === "manual" && (
                    <motion.div initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="text-[12.5px] text-ink-muted m-0 mb-2">{sel.size} / {limit} dipilih</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto pr-1 mb-3">
                        {vtoFrames.map((f) => {
                          const on = sel.has(f.id);
                          return (
                            <motion.button key={f.id} type="button" whileTap={reduce ? undefined : { scale: 0.97 }} onClick={() => toggle(f.id)} disabled={!on && sel.size >= limit}
                              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] disabled:opacity-40 ${on ? "border-blue-deep bg-surface-blue/60" : "border-[#DDE8F4]"}`}>
                              <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${on ? "bg-blue-deep text-white" : "border border-[#C5D6EA]"}`}>{on && <Check size={12} />}</span>
                              <span className="truncate">{f.name}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
            <p className="text-[12.5px] text-ink-muted mt-0 mb-4">Fitur Pro tetap aktif sampai {fmtDate(endsAt)}. Anda bisa membatalkan penurunan kapan saja sebelum tanggal itu.</p>
            <div className="flex justify-end gap-2">
              <Btn variant="outline" size="sm" onClick={onClose}>Batal</Btn>
              <Btn size="sm" onClick={() => onConfirm(over && mode === "manual" ? [...sel] : null)}>Jadwalkan turun paket</Btn>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
