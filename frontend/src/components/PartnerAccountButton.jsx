import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LiquidMenu from "./ui/LiquidMenu.jsx";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../store/usePartner.js";

const STAGE_LABEL = {
  dashboard: "Dashboard",
  onboarding: "Berlangganan",
  setup: "Setup Toko"
};

/**
 * Tombol akun di header beranda = pintu masuk Mitra, dengan menu "liquid morph".
 * Belum masuk → Masuk / Daftar Mitra. Sudah masuk → dashboard (atau lanjutkan setup) / keluar.
 */
export default function PartnerAccountButton() {
  const account = useAccount();
  const logout = usePartner((s) => s.logout);
  const navigate = useNavigate();

  if (!account) {
    return (
      <LiquidMenu
        label="Masuk sebagai Mitra"
        icon={<User size={18} strokeWidth={2.2} />}
        barH={38}
        openW={240}
        ariaLabel="Masuk sebagai Mitra"
        items={[
          { label: "Masuk Mitra", onClick: () => navigate("/partner/login") },
          { label: "Daftar Mitra", onClick: () => navigate("/partner/register") }
        ]}
      />
    );
  }

  const stage = stageOf(account);
  return (
    <LiquidMenu
      label={account.name}
      icon={account.name[0].toUpperCase()}
      barH={38}
      openW={250}
      ariaLabel="Menu akun Mitra"
      items={[
        { label: STAGE_LABEL[stage], onClick: () => navigate(STAGE_PATH[stage]) },
        { label: "Keluar", onClick: () => logout() }
      ]}
    />
  );
}
