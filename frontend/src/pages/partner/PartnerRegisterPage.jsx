import { Navigate } from "react-router-dom";
import { LoginPage } from "../../components/ui/sign-in-page.jsx";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../../store/usePartner.js";

/** Halaman /partner/register — akun baru langsung diarahkan ke onboarding (pilih paket). */
export default function PartnerRegisterPage() {
  const register = usePartner((s) => s.register);
  const account = useAccount();

  if (account) return <Navigate to={STAGE_PATH[stageOf(account)]} replace />;

  const onSubmit = ({ name, email, password }) => {
    const res = register({ name, email, password });
    return res.ok ? null : res.error;
  };

  return <LoginPage mode="register" onSubmit={onSubmit} />;
}
