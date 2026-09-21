import { useNavigate } from "react-router-dom";
import PlanCard, { PlanPicker } from "../../components/partner/PlanCard.jsx";
import { Badge, Btn, Card, CardHeader, Flash, Meter, Tile, Toggle, useFlash } from "../../components/partner/ui.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";
import { PLANS, fmtDate, fmtRp } from "../../data/partnerMock.js";

/* ------------------------------------------------------------ Current Plan */
export function CurrentPlanTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const sub = acc.subscription;
  const plan = PLANS[sub.plan];
  const live = acc.banners.filter((b) => ["active", "pending_review"].includes(b.status)).length;
  const setSub = (part) => patch((a) => ({ ...a, subscription: { ...a.subscription, ...part } }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-5 items-start">
      <PlanCard />
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Penggunaan paket" subtitle={`Kuota paket ${plan.name}`} />
          <div className="flex flex-col gap-4 max-w-[420px]">
            <Meter label="Frame" value={acc.frames.length} max={plan.limits.frames} />
            <Meter label="Banner aktif" value={live} max={plan.limits.banners} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Perpanjangan" subtitle="Atur apa yang terjadi saat periode berakhir." />
          <div className="rounded-xl border border-zinc-200/80 bg-white p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-zinc-900 m-0">Perpanjang otomatis</p>
              <p className="text-[12.5px] text-zinc-500 m-0">
                {sub.cancelAtPeriodEnd ? `Langganan berakhir ${fmtDate(sub.currentPeriodEnd)}.` : `Ditagih ${fmtRp(plan.price)} pada ${fmtDate(sub.nextBillingAt)}.`}
              </p>
            </div>
            <Toggle checked={!sub.cancelAtPeriodEnd} onChange={(v) => setSub({ cancelAtPeriodEnd: !v })} label="Perpanjang otomatis" />
          </div>
          {sub.pendingPlan && (
            <p className="text-[13px] text-zinc-700 mt-3 mb-0">
              Paket akan turun ke <strong>{PLANS[sub.pendingPlan].name}</strong> pada {fmtDate(sub.currentPeriodEnd)}.{" "}
              <button className="underline" onClick={() => setSub({ pendingPlan: null })}>Batalkan</button>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Billing */
export function BillingTab() {
  const acc = useAccount();
  const sub = acc.subscription;
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Tagihan berikutnya" />
        <Tile className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[12.5px] text-zinc-500 m-0">Paket {PLANS[sub.plan].name}</p>
            <p className="text-[20px] font-semibold text-zinc-900 m-0">{fmtRp(PLANS[sub.plan].price)}</p>
          </div>
          <p className="text-[13.5px] text-zinc-700 m-0">{sub.cancelAtPeriodEnd ? "Tidak diperpanjang" : `Jatuh tempo ${fmtDate(sub.nextBillingAt)}`}</p>
        </Tile>
      </Card>
      <Card>
        <CardHeader title="Riwayat invoice" subtitle={`${acc.invoices.length} invoice`} />
        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white">
          <table className="w-full text-[13px] border-collapse min-w-[560px]">
            <thead>
              <tr className="text-left text-zinc-500 text-[12px]">
                {["No. invoice", "Tanggal", "Paket", "Metode", "Jumlah", "Status"].map((h) => <th key={h} className="font-medium px-4 py-3 border-b border-zinc-100">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {acc.invoices.map((i) => (
                <tr key={i.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-zinc-900">{i.id}</td>
                  <td className="px-4 py-2.5">{fmtDate(i.date)}</td>
                  <td className="px-4 py-2.5">{PLANS[i.plan].name}</td>
                  <td className="px-4 py-2.5">{i.method}</td>
                  <td className="px-4 py-2.5">{fmtRp(i.amount)}</td>
                  <td className="px-4 py-2.5"><Badge tone={i.status === "paid" ? "green" : "amber"}>{i.status === "paid" ? "Lunas" : "Menunggu"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------- Upgrade Plan */
export function UpgradePlanTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const startCheckout = usePartner((s) => s.startCheckout);
  const navigate = useNavigate();
  const [msg, flash] = useFlash(4000);
  const sub = acc.subscription;

  function select(code) {
    if (code === "pro" && sub.plan === "basic") {
      startCheckout("pro", true);
      navigate("/partner/checkout");
    } else if (code === "basic" && sub.plan === "pro") {
      patch((a) => ({ ...a, subscription: { ...a.subscription, pendingPlan: "basic" } }));
      flash(`Paket turun ke Basic pada ${fmtDate(sub.currentPeriodEnd)}. Fitur Pro tetap aktif sampai saat itu.`);
    }
  }

  return (
    <div>
      <CardHeader title="Upgrade Plan" subtitle="Bandingkan paket dan ganti kapan saja." right={<Flash msg={msg} />} />
      <PlanPicker current={sub.plan} onSelect={select} />
    </div>
  );
}
