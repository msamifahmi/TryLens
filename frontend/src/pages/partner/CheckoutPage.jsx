import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CreditCard, Landmark, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import PartnerFlowShell from "../../components/partner/PartnerFlowShell.jsx";
import { Btn, Tile } from "../../components/partner/ui.jsx";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../../store/usePartner.js";
import { INTERVALS, addMonths, fmtDate, fmtRp, planLabel, planPrice, yearlySaving } from "../../data/partnerMock.js";

const METHODS = [
  { id: "QRIS", label: "QRIS", desc: "Semua e-wallet & mobile banking", icon: QrCode },
  { id: "VA BCA", label: "Virtual Account BCA", desc: "Transfer lewat ATM / m-banking", icon: Landmark },
  { id: "VA Mandiri", label: "Virtual Account Mandiri", desc: "Transfer lewat ATM / Livin'", icon: Landmark },
  { id: "E-wallet", label: "GoPay / OVO / DANA", desc: "Bayar lewat aplikasi e-wallet", icon: Smartphone },
  { id: "Kartu", label: "Kartu Kredit / Debit", desc: "Visa, Mastercard, JCB", icon: CreditCard }
];

/** Langkah 2 — Checkout untuk langganan ATAU pesanan iklan (pembayaran disimulasikan). */
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

  const isAd = checkout.kind === "ad";
  const total = isAd ? checkout.total : planPrice(checkout.plan, checkout.interval);
  const title = isAd ? checkout.label : planLabel(checkout.plan, checkout.interval);

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
    if (isAd) navigate(checkout.backTo || "/partner/promotion/banners");
    else navigate(checkout.upgrade ? "/partner/subscription/upgrade" : "/partner/onboarding");
  }

  return (
    <PartnerFlowShell step={1} title="Checkout" subtitle={isAd ? "Selesaikan pembayaran untuk mengaktifkan iklan Anda." : "Pilih metode pembayaran untuk mengaktifkan langganan."} width="max-w-[900px]">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_330px] gap-5 items-start">
        <Tile className="p-5">
          <h2 className="text-[15px] font-semibold text-ink m-0 mb-3">Metode pembayaran</h2>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Metode pembayaran">
            {METHODS.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setMethod(m.id)}
                className={`flex items-center gap-3 text-left rounded-xl border px-4 py-3 transition-colors ${method === m.id ? "border-blue-deep bg-surface-blue" : "border-[#DDE8F4] hover:border-blue"}`}
              >
                <span className="w-9 h-9 rounded-lg border border-[#DDE8F4] bg-white flex items-center justify-center text-blue-deep"><m.icon size={17} /></span>
                <span className="flex-1">
                  <span className="block text-[13.5px] font-semibold text-ink">{m.label}</span>
                  <span className="block text-[12px] text-ink-muted">{m.desc}</span>
                </span>
                <span className={`w-4 h-4 rounded-full border-2 ${method === m.id ? "border-blue-deep bg-blue-deep ring-2 ring-white ring-inset" : "border-[#C5D6EA]"}`} />
              </button>
            ))}
          </div>
        </Tile>

        <Tile className="p-5 md:sticky md:top-6">
          <h2 className="text-[15px] font-semibold text-ink m-0 mb-3">Ringkasan pesanan</h2>
          <div className="flex justify-between gap-3 text-[13.5px] mb-1">
            <span className="text-ink-text">{title}</span>
            <span className="font-medium text-ink whitespace-nowrap">{fmtRp(total)}</span>
          </div>
          {isAd ? (
            <p className="text-[12px] text-ink-muted m-0 mb-3">
              {checkout.weeks} minggu × {fmtRp(checkout.unit)}
              {checkout.qty > 1 ? ` × ${checkout.qty} frame` : ""} · mulai {fmtDate(checkout.startsOn)}
              {checkout.adType === "banner" && ". Banner ditinjau tim TryLens (maks. 1×24 jam) sebelum tayang."}
            </p>
          ) : (
            <p className="text-[12px] text-ink-muted m-0 mb-3">
              {checkout.interval === "year" ? `Setara ${fmtRp(Math.round(total / 12))}/bulan — hemat ${fmtRp(yearlySaving(checkout.plan))} dibanding bulanan. ` : ""}
              Harga sudah termasuk pajak.
            </p>
          )}
          <hr className="border-0 border-t border-[#DDE8F4] my-3" />
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[13.5px] font-semibold text-ink">Total hari ini</span>
            <span className="text-[20px] font-extrabold text-ink">{fmtRp(total)}</span>
          </div>
          <p className="text-[12px] text-ink-muted m-0 mb-4">
            {isAd
              ? "Sekali bayar untuk periode tayang di atas; tidak diperpanjang otomatis."
              : `Perpanjangan otomatis berikutnya ${fmtDate(addMonths(new Date().toISOString(), INTERVALS[checkout.interval].months))}.${checkout.upgrade ? " Paket lama digantikan mulai hari ini (tanpa prorata)." : ""}`}
          </p>
          <Btn size="lg" className="w-full" onClick={pay} disabled={paying}>
            {paying ? "Memproses pembayaran…" : `Bayar ${fmtRp(total)}`}
          </Btn>
          <button onClick={back} disabled={paying} className="w-full text-center text-[13px] text-ink-muted hover:text-ink mt-3">
            {isAd ? "Ubah pesanan" : "Ubah paket"}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-ink-muted mt-4 mb-0">
            <ShieldCheck size={13} /> Mode simulasi — tidak ada uang yang dipotong
          </p>
        </Tile>
      </div>
    </PartnerFlowShell>
  );
}
