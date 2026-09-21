import { Navigate, useNavigate } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import PartnerFlowShell from "../../components/partner/PartnerFlowShell.jsx";
import { Btn, Tile } from "../../components/partner/ui.jsx";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../../store/usePartner.js";
import { PLANS, fmtDate, fmtRp } from "../../data/partnerMock.js";

/** Langkah 3 — Payment Success. */
export default function PaymentSuccessPage() {
  const acc = useAccount();
  const lastInvoiceId = usePartner((s) => s.lastInvoiceId);
  const navigate = useNavigate();
  const invoice = acc.invoices.find((i) => i.id === lastInvoiceId);

  if (!invoice) return <Navigate to={STAGE_PATH[stageOf(acc)]} replace />;

  const needsSetup = stageOf(acc) === "setup";
  const rows = [
    ["No. invoice", invoice.id],
    ["Paket", `${PLANS[invoice.plan].name} (bulanan)`],
    ["Metode", invoice.method],
    ["Total dibayar", fmtRp(invoice.amount)],
    ["Tagihan berikutnya", fmtDate(acc.subscription.nextBillingAt)]
  ];

  return (
    <PartnerFlowShell step={2} title="Pembayaran berhasil" subtitle="Langganan Anda sudah aktif." width="max-w-[560px]">
      <Tile className="p-6">
        <div className="flex justify-center mb-5">
          <CircleCheck size={56} className="text-emerald-600" strokeWidth={1.6} />
        </div>
        <dl className="m-0 mb-6">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5 border-b border-zinc-100 last:border-0 text-[13.5px]">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="m-0 font-medium text-zinc-900 text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <Btn size="lg" className="w-full" onClick={() => {
            usePartner.setState({ lastInvoiceId: null });
            navigate(needsSetup ? "/partner/setup" : "/partner", { replace: true });
          }}>
          {needsSetup ? "Lanjut Setup Toko" : "Ke Dashboard"}
        </Btn>
      </Tile>
    </PartnerFlowShell>
  );
}
