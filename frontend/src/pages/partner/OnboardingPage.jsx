import { useNavigate } from "react-router-dom";
import PartnerFlowShell from "../../components/partner/PartnerFlowShell.jsx";
import { PlanPicker } from "../../components/partner/PlanCard.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";

/** Langkah 1 — Partner Onboarding: pilih paket (akun belum punya langganan). */
export default function OnboardingPage() {
  const acc = useAccount();
  const startCheckout = usePartner((s) => s.startCheckout);
  const navigate = useNavigate();

  return (
    <PartnerFlowShell
      step={0}
      title={`Halo ${acc.name.split(" ")[0]}, pilih paket untuk toko Anda`}
      subtitle="Pilih tagihan bulanan atau tahunan (hemat 2 bulan). Bisa upgrade kapan saja dari menu Langganan."
    >
      <PlanPicker
        current={null}
        onSelect={(plan, interval) => {
          startCheckout({ kind: "subscription", plan, interval, upgrade: false });
          navigate("/partner/checkout");
        }}
      />
    </PartnerFlowShell>
  );
}
