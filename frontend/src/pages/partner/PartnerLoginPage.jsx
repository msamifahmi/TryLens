import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LoginPage } from "../../components/ui/sign-in-page.jsx";
import { usePartner, useAccount, stageOf, STAGE_PATH } from "../../store/usePartner.js";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../../data/partnerMock.js";

/** Halaman /partner/login — titik masuk Mitra dari ikon user di header beranda. */
export default function PartnerLoginPage() {
  const login = usePartner((s) => s.login);
  const account = useAccount();
  const [fill, setFill] = useState(null);

  // Sudah masuk → langsung ke tahap yang sesuai (onboarding / setup / dashboard).
  if (account) return <Navigate to={STAGE_PATH[stageOf(account)]} replace />;

  const onSubmit = ({ email, password }) => {
    const res = login(email, password);
    return res.ok ? null : res.error;
  };

  return (
    <LoginPage mode="login" onSubmit={onSubmit} fill={fill}>
      <div className="mt-8 rounded-xl border border-dashed border-[#C5D6EA] bg-surface-blue/60 p-4">
        <p className="text-xs font-semibold text-ink-text m-0 mb-1">Akun demo (mode uji)</p>
        <p className="text-xs text-ink-muted m-0 mb-3">
          Password semua akun: <code className="bg-white px-1 rounded border border-[#DDE8F4]">{DEMO_PASSWORD}</code>
        </p>
        <div className="flex flex-col gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => setFill({ email: a.email, password: DEMO_PASSWORD })}
              className="text-left text-[13px] px-3 py-2 rounded-lg bg-white border border-[#DDE8F4] hover:border-blue-deep"
            >
              <span className="font-medium text-ink">{a.email}</span>
              <span className="block text-xs text-ink-muted">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </LoginPage>
  );
}
