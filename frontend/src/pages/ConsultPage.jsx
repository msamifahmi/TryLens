import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, MessageCircle, RotateCcw, Trash2, X } from "lucide-react";
import { MERCHANTS, PRODUCTS } from "../data/mockData.js";
import { CONSULT_CATEGORIES } from "../data/consultMock.js";
import { FACE_SHAPES, FACE_WIDTHS } from "../data/faceShape.js";
import { STYLE_LABELS } from "../data/mockData.js";
import { normalizeWa, useConsult } from "../store/useConsult.js";
import FaceScanner from "../components/consult/FaceScanner.jsx";
import FaceSummary from "../components/consult/FaceSummary.jsx";

const field = "w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-ink-text outline-none focus:border-blue focus:ring-2 focus:ring-blue/20";

function buildWaMessage({ merchant, name, category, message, face, frames, code }) {
  const lines = [`Halo ${merchant.name}, saya ${name}.`, `Saya mencoba frame di TryLens dan ingin ${CONSULT_CATEGORIES[category].label.toLowerCase()}.`];
  if (face) {
    lines.push("", "Hasil scan TryLens:", `• Bentuk wajah: ${FACE_SHAPES[face.shape].label}${face.source === "manual" ? " (dipilih manual)" : ""}`, `• Perkiraan lebar wajah: ${FACE_WIDTHS[face.width]}`, `• Gaya yang disarankan: ${face.styles.map((s) => STYLE_LABELS[s] || s).join(", ")}`);
  }
  if (frames.length) lines.push("", `Frame yang saya lihat: ${frames.map((f) => f.name).join(", ")}`);
  if (message.trim()) lines.push("", `Pertanyaan: ${message.trim()}`);
  lines.push("", `Kode konsultasi: ${code}`);
  return lines.join("\n");
}

/**
 * /konsultasi — konsumen TANPA akun: scan wajah (opsional) lalu kirim permintaan ke optik dengan nama + WhatsApp.
 * Try-on biasa tidak pernah membutuhkan login; identitas baru diminta di sini, saat konsumen minta dibantu.
 */
export default function ConsultPage() {
  const [sp] = useSearchParams();
  const { face, setFace, clearFace, viewed, markViewed, removeViewed, submit } = useConsult();
  const frameParam = sp.get("frame");
  const initialMerchant = sp.get("toko") || PRODUCTS.find((p) => p.id === frameParam)?.merchantId || "";

  const [merchantId, setMerchantId] = useState(initialMerchant);
  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [category, setCategory] = useState(face ? "konsultasi" : "konsultasi");
  const [message, setMessage] = useState("");
  const [includeFace, setIncludeFace] = useState(true);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (frameParam && PRODUCTS.some((p) => p.id === frameParam)) markViewed(frameParam);
  }, [frameParam, markViewed]);

  const merchant = MERCHANTS.find((m) => m.id === merchantId);
  const frames = useMemo(
    () => viewed.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p) => p && (!merchantId || p.merchantId === merchantId)),
    [viewed, merchantId]
  );

  function onSubmit(e) {
    e.preventDefault();
    setError("");
    const waNorm = normalizeWa(wa);
    if (!merchant) return setError("Pilih optik yang ingin dihubungi.");
    if (name.trim().length < 2) return setError("Isi nama panggilan Anda.");
    if (!waNorm) return setError("Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890.");
    const item = submit({ merchantId, name, whatsapp: waNorm, category, message, frameIds: frames.map((f) => f.id), includeFace: includeFace && !!face });
    setSent({ item, merchant, frames, face: item.face });
  }

  if (sent) {
    const { item, merchant: m } = sent;
    const text = buildWaMessage({ merchant: m, name: item.name, category: item.category, message: item.message, face: sent.face, frames: sent.frames, code: item.code });
    return (
      <div className="max-w-[560px] mx-auto px-5 py-14 text-center">
        <CircleCheck size={56} className="text-success mx-auto mb-4" strokeWidth={1.6} />
        <h1 className="text-2xl font-extrabold text-ink tracking-tight m-0 mb-2">Permintaan terkirim ke {m.name}</h1>
        <p className="text-sm text-ink-muted m-0 mb-5">Permintaan Anda sudah masuk ke dashboard {m.name}. Agar lebih cepat dibalas, lanjutkan lewat WhatsApp — pesannya sudah kami siapkan lengkap dengan hasil scan Anda.</p>
        <p className="inline-block rounded-xl bg-surface-blue px-4 py-2 text-sm text-ink-text mb-6">Kode konsultasi: <span className="font-bold text-blue-deep">{item.code}</span></p>
        <div className="flex flex-col gap-2.5 max-w-[340px] mx-auto">
          <a href={`https://wa.me/${m.whatsapp}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="h-12 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-95">
            <MessageCircle size={18} /> Lanjutkan via WhatsApp
          </a>
          <Link to="/" className="h-12 rounded-xl border-[1.5px] border-border text-ink-text font-bold text-sm flex items-center justify-center hover:bg-surface-blue">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1040px] mx-auto px-5 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight m-0 mb-2">Konsultasi dengan Optik</h1>
        <p className="text-sm text-ink-muted max-w-xl mx-auto m-0">
          Coba frame tanpa akun. Saat butuh dibantu, scan bentuk wajah lalu kirim permintaan — cukup nama dan WhatsApp.
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

        {/* ===== 2. Kirim permintaan ===== */}
        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-white p-5" aria-labelledby="form-title">
          <p className="text-xs font-bold tracking-wider text-blue-deep m-0 mb-1">LANGKAH 2</p>
          <h2 id="form-title" className="text-lg font-bold text-ink m-0 mb-4">Kirim permintaan ke optik</h2>

          <label className="block text-[13px] font-medium text-ink-text mb-1.5" htmlFor="c-merchant">Optik</label>
          <select id="c-merchant" className={`${field} mb-4`} value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
            <option value="">Pilih optik…</option>
            {MERCHANTS.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.city}</option>)}
          </select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-medium text-ink-text mb-1.5" htmlFor="c-name">Nama panggilan</label>
              <input id="c-name" className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Mau kami panggil siapa?" autoComplete="given-name" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink-text mb-1.5" htmlFor="c-wa">WhatsApp</label>
              <input id="c-wa" className={field} value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" autoComplete="tel" />
            </div>
          </div>

          <p className="text-[13px] font-medium text-ink-text m-0 mb-1.5">Jenis permintaan</p>
          <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label="Jenis permintaan">
            {Object.entries(CONSULT_CATEGORIES).map(([key, c]) => (
              <button type="button" key={key} role="radio" aria-checked={category === key} onClick={() => setCategory(key)}
                className={`h-9 px-4 rounded-full text-[13px] font-medium border transition-colors ${category === key ? "bg-blue-deep text-white border-blue-deep" : "bg-white text-ink-text border-border hover:border-blue"}`}>
                {c.label}
              </button>
            ))}
          </div>

          <label className="block text-[13px] font-medium text-ink-text mb-1.5" htmlFor="c-msg">Pesan (opsional)</label>
          <textarea id="c-msg" className={`${field} h-24 py-2.5 resize-none mb-4`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={CONSULT_CATEGORIES[category].hint} />

          {frames.length > 0 && (
            <div className="mb-4">
              <p className="text-[13px] font-medium text-ink-text m-0 mb-1.5">Frame yang Anda lihat</p>
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
              <span>Sertakan hasil scan wajah (<FaceSummary face={face} compact className="inline" />) agar optik bisa merekomendasikan frame.</span>
            </label>
          )}

          {error && <p role="alert" className="text-[13px] text-error bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 m-0 mb-4">{error}</p>}
          <button type="submit" className="w-full h-12 rounded-xl bg-blue text-white font-bold text-[15px] hover:bg-blue-deep transition-colors">Kirim Permintaan</button>
          <p className="text-[11.5px] text-ink-muted text-center mt-3 mb-0">Tanpa akun dan tanpa email. Nomor WhatsApp hanya dibagikan ke optik yang Anda pilih.</p>
        </form>
      </div>
    </div>
  );
}
