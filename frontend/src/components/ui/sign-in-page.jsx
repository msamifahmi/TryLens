import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FrameIcon from "../icons/FrameIcon.jsx";

/**
 * Halaman masuk/daftar Mitra — dua panel (visual kiri, form kanan).
 * Diadaptasi dari komponen sign-in-page (21st.dev): TypeScript → JSX (project ini
 * JS), gambar CDN → ilustrasi lokal, teks → Bahasa Indonesia, tombol social login
 * dihapus (belum ada backend OAuth), ditambah mode "register".
 *
 * Props:
 *  mode      : "login" | "register"
 *  onSubmit  : (values) => string | null | Promise — kembalikan pesan error, atau null bila sukses
 *  children  : konten tambahan di bawah form (mis. panel akun demo)
 *  fill      : { email, password } — mengisi form dari luar (akun demo); ubah `nonce` untuk memicu
 */
export function LoginPage({ mode = "login", onSubmit, children, fill }) {
  const navigate = useNavigate();
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", rememberMe: false, agree: false });

  // Isi otomatis dari akun demo (state diturunkan saat prop `fill` berubah).
  const [lastFill, setLastFill] = useState(null);
  if (fill && fill !== lastFill) {
    setLastFill(fill);
    setFormData((prev) => ({ ...prev, email: fill.email, password: fill.password }));
    setError("");
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (isRegister && formData.password.length < 8) return setError("Password minimal 8 karakter.");
    if (isRegister && !formData.agree) return setError("Setujui syarat & ketentuan untuk melanjutkan.");
    setLoading(true);
    const message = await onSubmit(formData);
    setLoading(false);
    if (message) setError(message);
  };

  const inputCls =
    "w-full px-4 py-3 border border-[#C5D6EA] rounded-xl focus:ring-2 focus:ring-blue-deep/40 outline-none";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-deep via-blue to-[#2F5286] flex">
      {/* Panel kiri — visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        <div className="absolute top-6 left-6 z-10">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/25 transition-all"
            aria-label="Kembali ke beranda TryLens"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full bg-accent-yellow/25 blur-3xl" />

        <div className="relative z-[1] px-14 max-w-[560px] text-white">
          <div className="w-full max-w-[380px] mb-10 relative h-[180px]">
            <FrameIcon style="aviator" colorKey="gold" className="absolute top-0 left-0 w-[70%] -rotate-6 drop-shadow-2xl" />
            <FrameIcon style="round" colorKey="clear" className="absolute bottom-0 right-0 w-[70%] rotate-3 drop-shadow-2xl" />
          </div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent-yellow mb-3">TRYLENS PARTNER</p>
          <h2 className="text-[34px] leading-tight font-extrabold tracking-tight mb-4">
            Kelola toko optik Anda, dari etalase sampai try-on virtual.
          </h2>
          <ul className="list-none m-0 p-0 flex flex-col gap-2.5 text-[14.5px] text-white/90">
            <li>• Etalase frame dan profil toko yang tampil di TryLens</li>
            <li>• Virtual Try-On untuk setiap frame</li>
            <li>• Analitik pengunjung dan permintaan pelanggan</li>
          </ul>
        </div>
      </div>

      {/* Panel kanan — form */}
      <div className="flex-1 flex items-center justify-center bg-white relative">
        <button
          onClick={() => navigate("/")}
          className="lg:hidden absolute top-4 left-4 w-10 h-10 rounded-full bg-surface-blue flex items-center justify-center hover:bg-surface-blue"
          aria-label="Kembali ke beranda TryLens"
        >
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>

        <div className="w-full max-w-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-ink mb-2">{isRegister ? "Daftar sebagai Mitra" : "Masuk Mitra"}</h1>
            <p className="text-ink-text">
              {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
              <button
                type="button"
                onClick={() => navigate(isRegister ? "/partner/login" : "/partner/register")}
                className="text-blue-deep hover:text-blue font-medium"
              >
                {isRegister ? "Masuk" : "Daftar"}
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate={false}>
            {isRegister && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-ink-text mb-2">Nama Lengkap</label>
                <input id="name" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nama pemilik / penanggung jawab" className={inputCls} required autoComplete="name" />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-text mb-2">Alamat Email</label>
              <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="nama@tokooptik.id" className={inputCls} required autoComplete="email" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-text mb-2">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={isRegister ? "Minimal 8 karakter" : "Password"}
                  className={`${inputCls} pr-12`}
                  required
                  autoComplete={isRegister ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-blue rounded-full"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5 text-ink-muted" /> : <Eye className="w-5 h-5 text-ink-muted" />}
                </button>
              </div>
            </div>

            {isRegister ? (
              <label className="flex items-start space-x-2 text-sm text-ink-text">
                <input type="checkbox" name="agree" checked={formData.agree} onChange={handleInputChange} className="w-4 h-4 mt-0.5 text-blue-deep border-[#C5D6EA] rounded" />
                <span>Saya setuju dengan syarat & ketentuan mitra TryLens.</span>
              </label>
            ) : (
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-ink-text">
                  <input type="checkbox" name="rememberMe" checked={formData.rememberMe} onChange={handleInputChange} className="w-4 h-4 text-blue-deep border-[#C5D6EA] rounded" />
                  <span>Ingat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => setNotice("Reset password otomatis belum tersedia. Hubungi support@trylens.id.")}
                  className="text-sm text-blue-deep hover:text-blue font-medium"
                >
                  Lupa password?
                </button>
              </div>
            )}

            {notice && <p className="text-sm text-ink-text bg-surface-blue/60 border border-[#DDE8F4] rounded-xl px-4 py-3 m-0">{notice}</p>}
            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 m-0">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-deep text-white py-3 px-4 rounded-xl font-semibold hover:brightness-90 transition-colors disabled:opacity-60"
            >
              {loading ? "Memproses…" : isRegister ? "Buat Akun Mitra" : "Masuk"}
            </button>
          </form>

          {children}
        </div>
      </div>
    </div>
  );
}
