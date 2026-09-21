import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, EmptyState, Segmented } from "../../components/partner/ui.jsx";
import { RequestCard, useRequests } from "../../components/partner/requests.jsx";
import { CONSULT_CATEGORIES } from "../../data/consultMock.js";
import { useAccount } from "../../store/usePartner.js";

/** /partner/requests — semua permintaan konsultasi, difilter per jenis dan status. */
export default function RequestsPage() {
  const acc = useAccount();
  const { mine, setStatus } = useRequests();
  const [cat, setCat] = useState("all");
  const [status, setStatusFilter] = useState("new");

  const byStatus = mine.filter((i) => status === "all" || (status === "new" ? i.status === "new" : i.status !== "new"));
  const list = byStatus.filter((i) => cat === "all" || i.category === cat);
  const count = (key) => byStatus.filter((i) => key === "all" || i.category === key).length;

  return (
    <div>
      <Link to="/partner" className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-3"><ArrowLeft size={14} /> Dashboard</Link>
      <div className="mb-4">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight m-0">Permintaan Konsultasi</h1>
        <p className="text-[13px] text-ink-muted m-0">Dari pelanggan TryLens — sebagian besar tanpa akun (Guest), lengkap dengan hasil scan wajah bila disertakan.</p>
      </div>
      <Card>
        <CardHeader
          title="Kotak masuk"
          subtitle={`${mine.length} permintaan`}
          right={<Segmented ariaLabel="Status" value={status} onChange={setStatusFilter} options={[{ key: "new", label: "Baru" }, { key: "done", label: "Sudah ditangani" }, { key: "all", label: "Semua" }]} />}
        />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-4" role="tablist" aria-label="Jenis permintaan">
          {[["all", "Semua"], ...Object.entries(CONSULT_CATEGORIES).map(([k, c]) => [k, c.label])].map(([key, label]) => (
            <button key={key} role="tab" aria-selected={cat === key} onClick={() => setCat(key)}
              className={`h-9 px-4 rounded-full text-[13px] font-medium whitespace-nowrap border transition-colors ${cat === key ? "bg-blue-deep text-white border-blue-deep" : "bg-white text-ink-text border-[#DDE8F4] hover:border-blue-deep"}`}>
              {label} <span className={cat === key ? "text-white/80" : "text-ink-muted"}>{count(key)}</span>
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <EmptyState title="Tidak ada permintaan" text="Permintaan baru dari konsumen akan muncul di sini." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {list.map((i, idx) => (
              <RequestCard key={i.id} item={i} storeName={acc.store.name} primary={idx === 0 && i.status === "new"} onContact={(id) => setStatus(id, "contacted")} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
