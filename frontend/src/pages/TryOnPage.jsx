import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useOutletContext } from "react-router-dom";
import { PRODUCTS, MERCHANTS } from "../data/mockData.js";
import { useWishlist } from "../store/useWishlist.js";
import ProductImage from "../components/ProductImage.jsx";
import ConnectMerchantModal from "../components/ConnectMerchantModal.jsx";
import { useConsult } from "../store/useConsult.js";
import { useRecommendations } from "../rec/useRecommendations.js";
import RecommendedStrip from "../components/RecommendedStrip.jsx";
import FitReport from "../components/tryon/FitReport.jsx";
import { formatRp } from "../data/mockData.js";

// three.js + MediaPipe cukup berat, jadi baru dimuat saat kamera dinyalakan.
const TryOnStage = lazy(() => import("../components/tryon/TryOnStage.jsx"));

/**
 * Status kamera:
 *   idle       -> belum minta izin
 *   requesting -> sedang menunggu izin browser
 *   granted    -> kamera aktif, video hidup
 *   denied     -> user menolak / browser blokir
 *   unsupported-> device/browser tidak punya kamera atau getUserMedia
 */
export default function TryOnPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext();

  const [activeId, setActiveId] = useState(id);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [connectOpen, setConnectOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [liveProfile, setLiveProfile] = useState(null); // ukuran wajah dari kalibrasi kamera sesi ini
  const [fitReport, setFitReport] = useState(null); // laporan kecocokan frame di wajah (titik jangkar)
  const streamRef = useRef(null);

  const product = PRODUCTS.find((p) => p.id === activeId);
  const merchantId = searchParams.get("merchantId") || product?.merchantId;
  const merchant = MERCHANTS.find((m) => m.id === merchantId);

  const isWished = useWishlist((s) => (product ? s.isWished(product.id) : false));
  const toggle = useWishlist((s) => s.toggle);

  // Frame lain dari merchant yang sama supaya bisa dicoba tanpa keluar dari sesi kamera.
  const otherFrames = PRODUCTS.filter((p) => p.merchantId === merchantId && p.id !== product?.id).slice(0, 6);

  // Rekomendasi: bentuk wajah (scan), lebar wajah (scan atau kalibrasi kamera), riwayat coba & wishlist.
  // "Toko serupa" = toko lain di provinsi yang sama dengan toko frame ini.
  const similarIds = MERCHANTS.filter((m) => merchant && m.id !== merchant.id && m.province === merchant.province).map((m) => m.id);
  const recs = useRecommendations({ currentId: product?.id, liveFaceMm: liveProfile?.mm ?? null, limit: 5, merchantIds: similarIds.length ? similarIds : null });

  useEffect(() => {
    setActiveId(id);
  }, [id]);

  // Catat frame yang dicoba (tanpa login) agar ikut disebut di pesan WhatsApp bila pengguna berkonsultasi.
  const markViewed = useConsult((s) => s.markViewed);
  useEffect(() => {
    if (activeId) markViewed(activeId);
  }, [activeId, markViewed]);

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus("unsupported");
      return;
    }
    setCameraStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      setStream(stream);
      setCameraStatus("granted");
    } catch (err) {
      setCameraStatus("denied");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setCameraStatus("idle");
  }

  function switchFrame(newId) {
    const mid = PRODUCTS.find((p) => p.id === newId)?.merchantId || merchantId; // rekomendasi bisa dari toko lain
    setActiveId(newId);
    navigate(`/try-on/${newId}${mid ? `?merchantId=${mid}` : ""}`, { replace: true });
  }

  if (!product) {
    return (
      <div className="max-w-[1280px] mx-auto px-5 py-24 text-center">
        <p className="text-lg font-semibold text-ink mb-2">Frame tidak ditemukan</p>
        <Link to="/" className="inline-flex h-11 px-6 items-center rounded-[10px] bg-blue text-white font-bold text-sm hover:bg-blue-deep">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-8">
      <p className="text-[13px] text-ink-muted mb-5">
        <Link to="/" className="hover:text-blue">TryLens</Link> /{" "}
        <Link to={`/produk/${product.id}`} className="hover:text-blue">{product.name}</Link> / Coba Virtual
      </p>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8 items-start">
        {/* ===== KIRI: KAMERA ===== */}
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight mb-1">Coba Langsung di Wajahmu</h1>
          <p className="text-sm text-ink-muted mb-5">
            Sedang mencoba <span className="font-semibold text-ink-text">{product.name}</span>
            {merchant && <> dari <span className="font-semibold text-ink-text">{merchant.name}</span></>}.
          </p>

        {/* ===== CAMERA STAGE ===== */}
        {cameraStatus === "granted" && stream ? (
          <Suspense
            fallback={
              <div className="aspect-[4/3] md:aspect-video bg-ink rounded-2xl mb-2 flex items-center justify-center text-white/70 text-sm">
                Menyiapkan pratinjau…
              </div>
            }
          >
            <TryOnStage stream={stream} product={product} onProfile={setLiveProfile} onReport={setFitReport} />
          </Suspense>
        ) : (
        <div className="relative aspect-[4/3] md:aspect-video bg-ink rounded-2xl overflow-hidden mb-2">
          {cameraStatus !== "granted" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-4">
              {(cameraStatus === "idle" || cameraStatus === "requesting") && (
                <>
                  <ProductImage productId={product.id} variant="main" style={product.style} colorKey={product.colorKey} className="w-28 h-28 opacity-90" alt={product.name} />
                  <div>
                    <p className="text-white font-semibold mb-1">Izinkan akses kamera untuk melihat bagaimana frame ini terlihat di wajahmu.</p>
                    <p className="text-white/60 text-xs flex items-center justify-center gap-1.5">
                      🔒 Kamera hanya aktif selama sesi ini — tidak direkam maupun disimpan.
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    disabled={cameraStatus === "requesting"}
                    className="h-12 px-7 rounded-full bg-white text-ink font-bold text-sm hover:bg-white/90 disabled:opacity-60"
                  >
                    {cameraStatus === "requesting" ? "Menunggu izin kamera…" : "Nyalakan Kamera"}
                  </button>
                </>
              )}
              {cameraStatus === "denied" && (
                <>
                  <ProductImage productId={product.id} variant="main" style={product.style} colorKey={product.colorKey} className="w-28 h-28 opacity-90" alt={product.name} />
                  <div>
                    <p className="text-white font-semibold mb-1">Akses kamera tidak diizinkan.</p>
                    <p className="text-white/60 text-xs">Kamu tetap bisa melihat foto produk di bawah, atau coba nyalakan kamera lagi.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <button onClick={startCamera} className="h-11 px-5 rounded-full bg-white text-ink font-bold text-sm hover:bg-white/90">
                      Coba Lagi
                    </button>
                    <Link to={`/produk/${product.id}`} className="h-11 px-5 rounded-full border border-white/40 text-white font-bold text-sm flex items-center hover:bg-white/10">
                      Lihat Foto Produk
                    </Link>
                  </div>
                </>
              )}
              {cameraStatus === "unsupported" && (
                <>
                  <ProductImage productId={product.id} variant="main" style={product.style} colorKey={product.colorKey} className="w-28 h-28 opacity-90" alt={product.name} />
                  <div>
                    <p className="text-white font-semibold mb-1">Perangkat/browser ini tidak mendukung akses kamera.</p>
                    <p className="text-white/60 text-xs">Coba buka lewat browser lain, atau lihat foto produknya di halaman detail.</p>
                  </div>
                  <Link to={`/produk/${product.id}`} className="h-11 px-5 rounded-full bg-white text-ink font-bold text-sm flex items-center hover:bg-white/90">
                    Lihat Foto Produk
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
        )}

          {cameraStatus === "granted" && (
            <button onClick={stopCamera} className="text-xs text-ink-muted hover:text-ink-text mb-6 mx-auto block">
              Matikan kamera
            </button>
          )}

          {/* ===== SWITCH FRAME TANPA KELUAR SESI ===== */}
          {otherFrames.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-semibold text-ink-text mb-3">Coba frame lain dari toko yang sama</p>
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                {[product, ...otherFrames].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => switchFrame(p.id)}
                    className={`flex-shrink-0 w-20 aspect-square rounded-xl border-2 bg-[#F8FAFC] flex items-center justify-center p-2.5 transition-colors ${
                      p.id === product.id ? "border-blue" : "border-transparent hover:border-border"
                    }`}
                    aria-label={`Coba ${p.name}`}
                  >
                    <ProductImage productId={p.id} variant="main" style={p.style} colorKey={p.colorKey} className="w-full h-full" alt={p.name} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== KANAN: CHECKOUT + KECOCOKAN + TOKO SERUPA (menempel saat layar lebar) ===== */}
        <aside className="lg:sticky lg:top-[84px] flex flex-col gap-4" aria-label="Checkout dan rekomendasi">
          <section className="bg-white border border-border rounded-2xl p-4">
            <div className="flex gap-3 items-center mb-3">
              <span className="w-16 h-16 flex-shrink-0 rounded-xl bg-[#F8FAFC] p-1.5">
                <ProductImage productId={product.id} variant="main" style={product.style} colorKey={product.colorKey} className="w-full h-full" alt="" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-ink-text m-0 line-clamp-2">{product.name}</p>
                <p className="m-0 flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-[16px] font-extrabold text-blue-deep">{formatRp(product.price)}</span>
                  {product.oldPrice && <span className="text-xs text-ink-muted line-through">{formatRp(product.oldPrice)}</span>}
                </p>
                {merchant && <p className="text-[12px] text-ink-muted m-0">{merchant.name} · {merchant.city}</p>}
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => toggle(product, showToast)}
                aria-pressed={isWished}
                className={`w-12 h-12 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isWished ? "border-error text-error bg-red-50" : "border-border text-ink-text hover:border-ink"
                }`}
                aria-label="Tambah ke wishlist"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isWished ? "currentColor" : "none"}>
                  <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </button>
              {merchant ? (
                <button
                  onClick={() => setConnectOpen(true)}
                  className="flex-1 min-h-12 py-2 px-4 rounded-full bg-blue text-white font-bold text-[13.5px] leading-tight hover:bg-blue-deep transition-colors"
                >
                  Cocok! Hubungkan ke {merchant.name}
                </button>
              ) : (
                <Link
                  to={`/produk/${product.id}`}
                  className="flex-1 h-12 rounded-full bg-blue text-white font-bold text-[14px] hover:bg-blue-deep transition-colors flex items-center justify-center"
                >
                  Lihat Detail Produk
                </Link>
              )}
            </div>
            <Link
              to={`/konsultasi?frame=${product.id}${merchantId ? `&toko=${merchantId}` : ""}`}
              className="mt-2.5 flex items-center justify-center gap-2 h-10 rounded-full border-[1.5px] border-blue text-blue-deep font-bold text-[13px] hover:bg-surface-blue"
            >
              Scan bentuk wajah &amp; konsultasi dengan optik
            </Link>
            <p className="text-[11px] text-ink-muted text-center m-0 mt-2.5">
              TryLens tidak menjual frame langsung — pembelian diselesaikan bersama toko optik mitra.
            </p>
          </section>

          <section className="bg-white border border-border rounded-2xl p-4" aria-label="Kecocokan frame di wajahmu">
            <h2 className="text-sm font-bold text-ink-text m-0 mb-3">Kecocokan di wajahmu</h2>
            <FitReport report={fitReport} />
          </section>

          <RecommendedStrip
            vertical
            result={recs}
            onPick={switchFrame}
            pickLabel="Coba"
            title="Dari toko serupa"
            subtitle={similarIds.length ? "Toko lain di wilayah yang sama, disusun dari wajah dan riwayat cobamu." : undefined}
          />
        </aside>
      </div>

      <ConnectMerchantModal open={connectOpen} onClose={() => setConnectOpen(false)} merchant={merchant} product={product} qty={1} />
    </div>
  );
}

/**
 * CATATAN TEKNIS
 *
 * Kamera dinyalakan di sini (getUserMedia); pelacakan dan render ada di
 * components/tryon/TryOnStage.jsx:
 *   - MediaPipe Face Landmarker memberi matriks pose kepala (posisi + rotasi 3D) tiap frame.
 *   - Model kacamata `public/products/<id>/model.glb` dirender three.js memakai matriks itu,
 *     jadi frame ikut bergerak, menjauh/mendekat, dan menoleh bersama kepala.
 *   - Mesh wajah tak-terlihat dipakai sebagai penutup, supaya gagang hilang di balik pipi/telinga.
 *   - Frame tanpa model.glb memakai ilustrasi 2D yang mengikuti posisi, lebar, dan kemiringan mata.
 * Penempatan bawaan ada di components/tryon/glassesConfig.js.
 *
 * Batas yang masih ada: akurasi sangat bergantung pada pencahayaan dan kualitas kamera;
 * belum ada bayangan frame di wajah; model .glb perlu dibuat dengan origin di jembatan hidung,
 * menghadap +Z, satuan cm (lihat public/products/README.md).
 */
