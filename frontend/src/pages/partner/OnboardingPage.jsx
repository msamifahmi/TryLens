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
      subtitle="Tagihan bulanan, bisa upgrade atau berhenti kapan saja dari menu Langganan."
    >
      <PlanPicker
        current={null}
        onSelect={(plan) => {
          startCheckout(plan);
          navigate("/partner/checkout");
        }}
      />
    </PartnerFlowShell>
  );
}
