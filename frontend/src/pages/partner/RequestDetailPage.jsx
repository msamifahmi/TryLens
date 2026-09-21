import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import FrameIcon from "../../components/icons/FrameIcon.jsx";
import FaceSummary from "../../components/consult/FaceSummary.jsx";
import { Badge, Btn, Card, Tile } from "../../components/partner/ui.jsx";
import { productsOf, replyLink, useRequests } from "../../components/partner/requests.jsx";
import { CONSULT_CATEGORIES, CONSULT_STATUS } from "../../data/consultMock.js";
import { STYLE_LABELS, formatRp } from "../../data/mockData.js";
import { useAccount } from "../../store/usePartner.js";

const fmtDateTime = (iso) => new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** /partner/requests/:id — profil konsultasi: analisis wajah, frame yang dilihat, pertanyaan, dan rekomendasi dari katalog toko. */
export default function RequestDetailPage() {
  const { id } = useParams();
  const acc = useAccount();
  const { mine, setStatus } = useRequests();
  const item = mine.find((i) => i.id === id);
  if (!item) return <Navigate to="/partner/requests" replace />;

  const st = CONSULT_STATUS[item.status];
  const viewed = productsOf(item.frameIds);
  // Rekomendasi: frame tayang di katalog toko ini yang gayanya cocok dengan hasil scan.
  const suggestions = item.face ? acc.frames.filter((f) => f.published && item.face.styles.includes(f.style)).slice(0, 4) : [];

  return (
    <div className="max-w-[860px]">
      <Link to="/partner/requests" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-3"><ArrowLeft size={14} /> Kembali ke Permintaan</Link>

      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-muted m-0 mb-1">KONSULTASI #{item.code}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[24px] font-bold text-ink tracking-tight m-0">{item.name}</h1>
              <Badge tone="gray">{item.identity === "guest" ? "Guest" : "Customer"}</Badge>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <p className="text-[12.5px] text-ink-muted m-0 mt-1">{fmtDateTime(item.createdAt)} · {CONSULT_CATEGORIES[item.category].label}</p>
          </div>
          <Btn as="a" href={replyLink(item, acc.store.name, suggestions)} target="_blank" rel="noopener noreferrer" size="lg" onClick={() => item.status === "new" && setStatus(item.id, "contacted")}>
            <MessageCircle size={17} /> Hubungi via WhatsApp
          </Btn>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <h2 className="text-[13px] font-bold tracking-wider text-ink-muted m-0 mb-3">PERTANYAAN</h2>
          <p className="text-[15px] text-ink m-0 leading-relaxed">“{item.message}”</p>
        </Card>
        <Card>
          <h2 className="text-[13px] font-bold tracking-wider text-ink-muted m-0 mb-3">ANALISIS WAJAH</h2>
          {item.face ? <FaceSummary face={item.face} /> : <p className="text-[13px] text-ink-muted m-0">Pelanggan tidak menyertakan hasil scan wajah.</p>}
        </Card>
      </div>

      <Card className="mb-4">
        <h2 className="text-[13px] font-bold tracking-wider text-ink-muted m-0 mb-3">FRAME YANG DILIHAT PELANGGAN</h2>
        {viewed.length === 0 ? (
          <p className="text-[13px] text-ink-muted m-0">Tidak ada frame yang tercatat.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {viewed.map((p) => (
              <Tile key={p.id} className="p-3">
                <div className="bg-surface-blue/60 rounded-lg p-3 mb-2"><FrameIcon style={p.style} colorKey={p.colorKey} className="w-full" /></div>
                <p className="text-[13px] font-medium text-ink m-0 truncate">{p.name}</p>
                <p className="text-[12px] text-ink-muted m-0">{formatRp(p.price)}</p>
              </Tile>
            ))}
          </div>
        )}
      </Card>

      {item.face && (
        <Card className="mb-4">
          <h2 className="text-[13px] font-bold tracking-wider text-ink-muted m-0 mb-1">REKOMENDASI DARI KATALOG ANDA</h2>
          <p className="text-[12.5px] text-ink-muted m-0 mb-3">Frame tayang di toko Anda dengan gaya yang cocok untuk wajah {item.face.shape === "oval" ? "oval" : "pelanggan"} ({item.face.styles.map((s) => STYLE_LABELS[s] || s).join(", ")}). Ikut disebut di pesan WhatsApp.</p>
          {suggestions.length === 0 ? (
            <p className="text-[13px] text-ink-muted m-0">Belum ada frame bergaya tersebut di katalog Anda.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {suggestions.map((f) => (
                <Tile key={f.id} className="p-3">
                  <div className="bg-surface-blue/60 rounded-lg p-3 mb-2"><FrameIcon style={f.style} colorKey={f.colorKey} className="w-full" /></div>
                  <p className="text-[13px] font-medium text-ink m-0 truncate">{f.name}</p>
                  <p className="text-[12px] text-ink-muted m-0">{STYLE_LABELS[f.style]}</p>
                </Tile>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {item.status !== "closed" && <Btn variant="outline" onClick={() => setStatus(item.id, "closed")}>Tandai selesai</Btn>}
        {item.status !== "ignored" && <Btn variant="danger" onClick={() => setStatus(item.id, "ignored")}>Abaikan</Btn>}
        {item.status !== "new" && <Btn variant="ghost" onClick={() => setStatus(item.id, "new")}>Kembalikan ke Baru</Btn>}
      </div>
    </div>
  );
}
