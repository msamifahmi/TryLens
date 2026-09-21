import { Navigate } from "react-router-dom";
import { useAccount, stageOf, STAGE_PATH } from "../../store/usePartner.js";

/**
 * Penjaga rute alur Mitra. `allow` = tahap akun yang boleh membuka halaman ini.
 * Tahap: guest (belum masuk) → onboarding (belum berlangganan) → setup (toko belum diatur) → dashboard.
 * Di luar itu, pengguna diarahkan ke halaman tahap yang benar.
 */
export default function Gate({ allow, children }) {
  const stage = stageOf(useAccount());
  if (!allow.includes(stage)) return <Navigate to={STAGE_PATH[stage]} replace />;
  return children;
}
