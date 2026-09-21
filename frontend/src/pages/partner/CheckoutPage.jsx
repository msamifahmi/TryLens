import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CreditCard, Landmark, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import PartnerFlowShell from "../../components/partner/PartnerFlowShell.jsx";
import { Btn, Tile } from "../../components/partner/ui.jsx";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../../store/usePartner.js";
import { PLANS, addMonths, fmtDate, fmtRp } from "../../data/partnerMock.js";

const METHODS = [
  { id: "QRIS", label: "QRIS", desc: "Semua e-wallet & mobile banking", icon: QrCode },
  { id: "VA BCA", label: "Virtual Account BCA", desc: "Transfer lewat ATM / m-banking", icon: Landmark },
  { id: "VA Mandiri", label: "Virtual Account Mandiri", desc: "Transfer lewat ATM / Livin'", icon: Landmark },
  { id: "E-wallet", label: "GoPay / OVO / DANA", desc: "Bayar lewat aplikasi e-wallet", icon: Smartphone },
  { id: "Kartu", label: "Kartu Kredit / Debit", desc: "Visa, Mastercard, JCB", icon: CreditCard }
];

/** Langkah 2 — Checkout (pembayaran disimulasikan; gateway asli menyusul di backend). */
export default function CheckoutPage() {
  const acc = useAccount();
  const checkout = usePartner((s) => s.checkout);
  const cancelCheckout = usePartner((s) => s.cancelCheckout);
  const completePayment = usePartner((s) => s.completePayment);
  const navigate = useNavigate();
  const [method, setMethod] = useState("QRIS");
  const [paying, setPaying] = useState(false);
  const timer = useRef(null);
  const done = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!checkout) return done.current ? null : <Navigate to={STAGE_PATH[stageOf(acc)]} replace />;

  const plan = PLANS[checkout.plan];
  const upgrade = checkout.upgrade;

  function pay() {
    setPaying(true);
    timer.current = setTimeout(() => {
      done.current = true;
      completePayment(method);
      navigate("/partner/payment-success", { replace: true });
    }, 1100);
  }

  function back() {
    cancelCheckout();
    navigate(upgrade ? "/partner/subscription/upgrade" : "/partner/onboarding");
  }

  return (
    <PartnerFlowShell step={1} title="Checkout" subtitle="Pilih metode pembayaran untuk mengaktifkan langganan." width="max-w-[900px]">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5 items-start">
        <Tile className="p-5">
          <h2 className="text-[15px] font-semibold text-zinc-900 m-0 mb-3">Metode pembayaran</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Metode pembayaran">
            {METHODS.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center gap-3 text-left rounded-xl border px-4 py-3 transition-colors ${
                  method === m.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <span className="w-9 h-9 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-700">
                  <m.icon size={17} />
                </span>
                <span className="flex-1">
                  <span className="block text-[13.5px] font-semibold text-zinc-900">{m.label}</span>
                  <span className="block text-[12px] text-zinc-500">{m.desc}</span>
                </span>
                <span className={`w-4 h-4 rounded-full border-2 ${method === m.id ? "border-zinc-900 bg-zinc-900 ring-2 ring-white ring-inset" : "border-zinc-300"}`} />
              </button>
            ))}
          </div>
        </Tile>

        <Tile className="p-5 md:sticky md:top-6">
          <h2 className="text-[15px] font-semibold text-zinc-900 m-0 mb-3">Ringkasan pesanan</h2>
          <div className="flex justify-between text-[13.5px] mb-1">
            <span className="text-zinc-600">Paket {plan.name} (bulanan)</span>
            <span className="font-medium text-zinc-900">{fmtRp(plan.price)}</span>
          </div>
          <p className="text-[12px] text-zinc-500 m-0 mb-3">Harga sudah termasuk pajak.</p>
          <hr className="border-0 border-t border-zinc-200 my-3" />
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[13.5px] font-semibold text-zinc-900">Total hari ini</span>
            <span className="text-[20px] font-extrabold text-zinc-900">{fmtRp(plan.price)}</span>
          </div>
          <p className="text-[12px] text-zinc-500 m-0 mb-4">
            Perpanjangan otomatis berikutnya {fmtDate(addMonths(new Date().toISOString(), 1))}.
            {upgrade && " Paket lama digantikan mulai hari ini."}
          </p>
          <Btn size="lg" className="w-full" onClick={pay} disabled={paying}>
            {paying ? "Memproses pembayaran…" : `Bayar ${fmtRp(plan.price)}`}
          </Btn>
          <button onClick={back} disabled={paying} className="w-full text-center text-[13px] text-zinc-500 hover:text-zinc-900 mt-3">
            Ubah paket
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-zinc-400 mt-4 mb-0">
            <ShieldCheck size={13} /> Mode simulasi — tidak ada uang yang dipotong
          </p>
        </Tile>
      </div>
    </PartnerFlowShell>
  );
}
