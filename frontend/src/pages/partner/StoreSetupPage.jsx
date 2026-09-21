import { useNavigate } from "react-router-dom";
import PartnerFlowShell from "../../components/partner/PartnerFlowShell.jsx";
import StoreForm from "../../components/partner/StoreForm.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";

/** Langkah 4 — Setup Toko (wajib sebelum masuk dashboard). */
export default function StoreSetupPage() {
  const acc = useAccount();
  const saveStore = usePartner((s) => s.saveStore);
  const navigate = useNavigate();

  return (
    <PartnerFlowShell
      step={3}
      title="Setup toko Anda"
      subtitle={`Terakhir, ${acc.name.split(" ")[0]} — lengkapi profil toko yang akan tampil di TryLens.`}
      width="max-w-[760px]"
    >
      <StoreForm
        submitLabel="Selesai & Buka Dashboard"
        submitClassName="w-full"
        onSubmit={(values) => {
          saveStore(values);
          navigate("/partner", { replace: true });
        }}
      />
    </PartnerFlowShell>
  );
}
