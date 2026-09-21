import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, RotateCcw, Trash2, X } from "lucide-react";
import { MERCHANTS, PRODUCTS, STYLE_LABELS } from "../data/mockData.js";
import { FACE_SHAPES, FACE_WIDTHS } from "../data/faceShape.js";
import { useConsult } from "../store/useConsult.js";
import FaceScanner from "../components/consult/FaceScanner.jsx";
import FaceSummary from "../components/consult/FaceSummary.jsx";

const field = "w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-ink-text outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

/** 6281234500001 → 0812 3450 0001 (hanya untuk tampilan). */
function formatWa(wa) {
  const d = String(wa || "").replace(/\D/g, "");
  if (!d) return "";
  const local = d.startsWith("62") ? `0${d.slice(2)}` : d;
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3");
}

/** Pesan pembuka WhatsApp ke optik: hasil scan (bila disertakan) dan frame yang dilihat sudah tercantum. */
function buildWaMessage({ merchant, face, frames }) {
  const lines = [`Halo ${merchant.name}, saya pengunjung TryLens dan ingin berkonsultasi soal frame kacamata.`];
  if (face) {
    lines.push("", "Hasil scan TryLens:", `• Bentuk wajah: ${FACE_SHAPES[face.shape].label}${face.source === "manual" ? " (dipilih manual)" : ""}`, `• Perkiraan lebar wajah: ${FACE_WIDTHS[face.width]}`, `• Gaya yang disarankan: ${face.styles.map((s) => STYLE_LABELS[s] || s).join(", ")}`);
  }
  if (frames.length) lines.push("", `Frame yang saya lihat: ${frames.map((f) => f.name).join(", ")}`);
  lines.push("", "Mohon dibantu ya, terima kasih.");
  return lines.join("\n");
}

/**
 * /konsultasi — konsumen TANPA akun: scan wajah (opsional), pilih optik, lalu lanjut ke WhatsApp optik tersebut.
 * Tidak ada formulir dan tidak ada pengiriman lewat TryLens; percakapan terjadi langsung antara konsumen dan optik.
 */
export default function ConsultPage() {
  const [sp] = useSearchParams();
  const { face, setFace, clearFace, viewed, markViewed, removeViewed } = useConsult();
  const frameParam = sp.get("frame");
  const initialMerchant = sp.get("toko") || PRODUCTS.find((p) => p.id === frameParam)?.merchantId || "";

  const [merchantId, setMerchantId] = useState(initialMerchant);
  const [includeFace, setIncludeFace] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (frameParam && PRODUCTS.some((p) => p.id === frameParam)) markViewed(frameParam);
  }, [frameParam, markViewed]);

  const merchant = MERCHANTS.find((m) => m.id === merchantId);
  const frames = useMemo(
    () => viewed.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p) => p && (!merchantId || p.merchantId === merchantId)),
    [viewed, merchantId]
  );

  const waHref = merchant?.whatsapp
    ? `https://wa.me/${merchant.whatsapp}?text=${encodeURIComponent(buildWaMessage({ merchant, face: includeFace ? face : null, frames }))}`
    : null;

  return (
    <div className="max-w-[1040px] mx-auto px-5 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight m-0 mb-2">Konsultasi dengan Optik</h1>
        <p className="text-sm text-ink-muted max-w-xl mx-auto m-0">
          Konsultasi langsung lewat WhatsApp optik pilihan Anda, tanpa akun dan tanpa formulir. Scan bentuk wajah dulu bila mau, supaya optik bisa langsung menyarankan frame yang pas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ===== 1. Scan wajah ===== */}
        <section className="rounded-2xl border border-border bg-white p-5" aria-labelledby="scan-title">
          <p className="text-xs font-bold tracking-wider text-blue-deep m-0 mb-1">LANGKAH 1 · OPSIONAL</p>
          <h2 id="scan-title" className="text-lg font-bold text-ink m-0 mb-4">Scan bentuk wajah (AR)</h2>
          {face && !scanning ? (
            <div>
              <FaceSummary face={face} className="mb-4" />
              <div className="flex gap-2">
                <button onClick={() => setScanning(true)} className="h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-ink-text hover:border-blue flex items-center gap-1.5"><RotateCcw size={14} /> Scan ulang</button>
                <button onClick={clearFace} className="h-10 px-4 rounded-xl text-[13px] font-semibold text-error hover:bg-red-50 flex items-center gap-1.5"><Trash2 size={14} /> Hapus hasil</button>
              </div>
            </div>
          ) : (
            <FaceScanner onResult={(r) => { setFace(r); setScanning(false); }} />
          )}
        </section>

        {/* ===== 2. Lanjut ke WhatsApp optik ===== */}
        <section className="rounded-2xl border border-border bg-white p-5" aria-labelledby="wa-title">
          <p className="text-xs font-bold tracking-wider text-blue-deep m-0 mb-1">LANGKAH 2</p>
          <h2 id="wa-title" className="text-lg font-bold text-ink m-0 mb-4">Chat optik lewat WhatsApp</h2>

          <label className="block text-[13px] font-medium text-ink-text mb-1.5" htmlFor="c-merchant">Optik</label>
          <select id="c-merchant" className={`${field} mb-4`} value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
            <option value="">Pilih optik…</option>
            {MERCHANTS.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.city}</option>)}
          </select>

          {merchant && (
            <div className="rounded-xl bg-surface-blue px-4 py-3 mb-4" data-testid="merchant-wa">
              <p className="text-sm font-semibold text-ink m-0">{merchant.name}</p>
              <p className="text-[12.5px] text-ink-muted m-0">
                {merchant.city} · {merchant.whatsapp ? <>WhatsApp <span className="font-medium text-ink-text">{formatWa(merchant.whatsapp)}</span></> : "nomor WhatsApp belum tersedia"}
              </p>
            </div>
          )}

          {frames.length > 0 && (
            <div className="mb-4">
              <p className="text-[13px] font-medium text-ink-text m-0 mb-1.5">Frame yang Anda lihat (ikut disebut di pesan)</p>
              <div className="flex flex-wrap gap-1.5">
                {frames.map((f) => (
                  <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-surface-blue text-ink-text text-[12px] pl-3 pr-1.5 py-1">
                    {f.name}
                    <button type="button" onClick={() => removeViewed(f.id)} aria-label={`Hapus ${f.name}`} className="w-5 h-5 rounded-full hover:bg-white flex items-center justify-center"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {face && (
            <label className="flex items-start gap-2 text-[13px] text-ink-text mb-4 cursor-pointer">
              <input type="checkbox" checked={includeFace} onChange={(e) => setIncludeFace(e.target.checked)} className="w-4 h-4 mt-0.5 accent-blue-deep" />
              <span>Sertakan hasil scan wajah (<FaceSummary face={face} compact className="inline" />) di pesan agar optik bisa merekomendasikan frame.</span>
            </label>
          )}

          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="h-12 rounded-xl bg-[#25D366] text-white font-bold text-[15px] flex items-center justify-center gap-2 hover:brightness-95">
              <MessageCircle size={18} /> Chat {merchant.name} via WhatsApp
            </a>
          ) : (
            <button type="button" disabled className="w-full h-12 rounded-xl bg-[#25D366] text-white font-bold text-[15px] flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
              <MessageCircle size={18} /> {merchant ? "WhatsApp optik belum tersedia" : "Pilih optik dulu"}
            </button>
          )}
          <p className="text-[11.5px] text-ink-muted text-center mt-3 mb-0">
            Anda akan diarahkan ke WhatsApp dan berbicara langsung dengan optik. TryLens tidak menyimpan nomor maupun percakapan Anda.
          </p>
        </section>
      </div>
    </div>
  );
}
