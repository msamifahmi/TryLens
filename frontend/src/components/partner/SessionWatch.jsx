import { useEffect, useState } from "react";
import { usePartner } from "../../store/usePartner.js";
import { WARN_BEFORE_MS, expiresAt, msLeft } from "../../lib/partnerSession.js";

/**
 * Dipasang di dalam area Mitra yang sudah login (lewat Gate).
 * - interaksi pengguna → catat aktivitas (maks 1x / 15 detik)
 * - tiap 5 detik cek sesi; habis → keluar otomatis (Gate lalu mengarahkan ke halaman masuk)
 * - 1 menit sebelum habis → tampilkan peringatan dengan tombol "Tetap masuk"
 * Tab lain / tab yang tidur: pengecekan juga dilakukan saat tab aktif kembali.
 */
export default function SessionWatch() {
  const session = usePartner((s) => s.session);
  const server = usePartner((s) => s.server);
  const [left, setLeft] = useState(null);

  useEffect(() => {
    if (server) return undefined;
    let last = 0;
    const bump = () => {
      const t = Date.now();
      if (t - last < 15000) return;
      last = t;
      usePartner.getState().touch();
    };
    const check = () => {
      const st = usePartner.getState();
      if (st.enforceSession()) return;
      const l = msLeft(st.session);
      setLeft(l > 0 && l <= WARN_BEFORE_MS ? l : null);
    };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"];
    // Peringatan aktif: aktivitas biasa tidak boleh memperpanjang diam-diam; hanya tombol "Tetap masuk".
    const onAct = () => { if (msLeft(usePartner.getState().session) > WARN_BEFORE_MS) bump(); };
    evs.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    const iv = setInterval(check, 5000);
    const vis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", vis);
    // Tab lain keluar / memperbarui sesi → ikuti.
    const sync = (e) => { if (e.key === "trylens-partner") usePartner.persist.rehydrate(); };
    window.addEventListener("storage", sync);
    check();
    return () => {
      evs.forEach((e) => window.removeEventListener(e, onAct));
      clearInterval(iv);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("storage", sync);
    };
  }, [server, session?.email]);

  if (server || left == null || !expiresAt(session)) return null;
  const sec = Math.ceil(left / 1000);
  return (
    <div role="alertdialog" aria-live="assertive" aria-label="Sesi akan berakhir" className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-[60] rounded-2xl bg-white border border-amber-300 shadow-xl p-4">
      <p className="m-0 text-sm font-semibold text-ink">Sesi akan berakhir dalam {sec} detik</p>
      <p className="m-0 mt-1 text-xs text-ink-muted">Demi keamanan, Anda otomatis keluar bila tidak ada aktivitas.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => { usePartner.getState().touch(); setLeft(null); }} className="flex-1 rounded-lg bg-blue-deep text-white text-sm font-medium py-2">Tetap masuk</button>
        <button type="button" onClick={() => usePartner.getState().logout()} className="rounded-lg border border-[#DDE8F4] text-sm px-3 py-2">Keluar</button>
      </div>
    </div>
  );
}
