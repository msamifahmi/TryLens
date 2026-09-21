import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import FaceSummary from "../consult/FaceSummary.jsx";
import { Badge, Btn, Tile } from "./ui.jsx";
import { CONSULT_CATEGORIES, CONSULT_STATUS } from "../../data/consultMock.js";
import { useConsult } from "../../store/useConsult.js";
import { useAccount } from "../../store/usePartner.js";
import { PRODUCTS } from "../../data/mockData.js";
import { FACE_SHAPES } from "../../data/faceShape.js";

/** Permintaan konsultasi untuk toko Mitra yang sedang masuk (terbaru di atas). */
export function useRequests() {
  const acc = useAccount();
  const items = useConsult((s) => s.items);
  const setStatus = useConsult((s) => s.setStatus);
  const merchantId = acc?.store?.merchantId;
  const mine = useMemo(() => items.filter((i) => i.merchantId === merchantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [items, merchantId]);
  return { mine, setStatus, newCount: mine.filter((i) => i.status === "new").length };
}

export function timeAgo(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} jam lalu`;
  return `${Math.floor(min / 1440)} hari lalu`;
}

/** Balasan WhatsApp dari Mitra ke pelanggan (berisi rekomendasi dari katalog toko bila ada hasil scan). */
export function replyLink(item, storeName, suggestions = []) {
  const lines = [`Halo ${item.name}, kami ${storeName}. Terima kasih sudah berkonsultasi lewat TryLens (kode ${item.code}).`];
  if (item.face) lines.push("", `Dari hasil scan wajah Anda (${FACE_SHAPES[item.face.shape].label}), beberapa frame yang cocok di toko kami: ${suggestions.length ? suggestions.map((f) => f.name).join(", ") : "kami siapkan pilihannya"}.`);
  lines.push("", "Ada yang bisa kami bantu lebih lanjut?");
  return `https://wa.me/${item.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export const productsOf = (ids) => ids.map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);

/** Kartu permintaan (dashboard dan halaman Permintaan). */
export function RequestCard({ item, storeName, primary = false, onContact }) {
  const st = CONSULT_STATUS[item.status];
  return (
    <Tile className="p-3.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[14px] font-semibold text-ink m-0">{item.name}</p>
          <Badge tone="gray">{item.identity === "guest" ? "Guest" : "Customer"}</Badge>
          {item.status !== "new" && <Badge tone={st.tone}>{st.label}</Badge>}
        </div>
        <span className="text-[12px] text-ink-muted whitespace-nowrap">{timeAgo(item.createdAt)}</span>
      </div>
      <p className="text-[12px] text-ink-muted m-0 mb-1">{CONSULT_CATEGORIES[item.category].label}{item.frameIds.length ? ` · ${item.frameIds.length} frame dilihat` : ""}</p>
      <p className="text-[12.5px] text-ink-text m-0 mb-2 leading-snug line-clamp-2">“{item.message}”</p>
      {item.face && <FaceSummary face={item.face} compact className="mb-2.5 rounded-lg bg-surface-blue px-2.5 py-1.5" />}
      <div className="grid grid-cols-2 gap-2">
        <Btn as={Link} to={`/partner/requests/${item.id}`} size="sm" variant="outline">Lihat Detail</Btn>
        <Btn as="a" href={replyLink(item, storeName, [])} target="_blank" rel="noopener noreferrer" size="sm" variant={primary ? "primary" : "outline"} onClick={() => onContact(item.id)}>
          <MessageCircle size={14} /> WhatsApp
        </Btn>
      </div>
    </Tile>
  );
}
