import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams, useOutletContext } from "react-router-dom";
import { PRODUCTS, MERCHANTS } from "../data/mockData.js";
import { useWishlist } from "../store/useWishlist.js";
import ProductImage from "../components/ProductImage.jsx";
import ConnectMerchantModal from "../components/ConnectMerchantModal.jsx";
import { useConsult } from "../store/useConsult.js";

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
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const product = PRODUCTS.find((p) => p.id === activeId);
  const merchantId = searchParams.get("merchantId") || product?.merchantId;
  const merchant = MERCHANTS.find((m) => m.id === merchantId);

  const isWished = useWishlist((s) => (product ? s.isWished(product.id) : false));
  const toggle = useWishlist((s) => s.toggle);

  // Frame lain dari merchant yang sama supaya bisa dicoba tanpa keluar dari sesi kamera.
  const otherFrames = PRODUCTS.filter((p) => p.merchantId === merchantId && p.id !== product?.id).slice(0, 6);

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus("granted");
    } catch (err) {
      setCameraStatus("denied");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraStatus("idle");
  }

  function switchFrame(newId) {
    setActiveId(newId);
    navigate(`/try-on/${newId}${merchantId ? `?merchantId=${merchantId}` : ""}`, { replace: true });
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
    <div className="max-w-[1000px] mx-auto px-5 py-8">
      <p className="text-[13px] text-ink-muted mb-5">
        <Link to="/" className="hover:text-blue">TryLens</Link> /{" "}
        <Link to={`/produk/${product.id}`} className="hover:text-blue">{product.name}</Link> / Coba Virtual
      </p>

      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight mb-2">Coba Langsung di Wajahmu</h1>
        <p className="text-sm text-ink-muted max-w-lg mx-auto">
          Sedang mencoba <span className="font-semibold text-ink-text">{product.name}</span>
          {merchant && <> dari <span className="font-semibold text-ink-text">{merchant.name}</span></>}.
        </p>
      </div>

      {/* ===== CAMERA STAGE ===== */}
      <div className="relative aspect-[4/3] md:aspect-video bg-ink rounded-2xl overflow-hidden mb-2">
        {cameraStatus === "granted" && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            {/* Overlay frame di area wajah — posisi tetap di tengah sebagai pratinjau visual, */}
            {/* BUKAN hasil pelacakan wajah presisi. Lihat catatan teknis di bawah komponen ini. */}
            <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[46%] max-w-[260px] pointer-events-none drop-shadow-lg">
              <ProductImage productId={product.id} variant="main" style={product.style} colorKey={product.colorKey} className="w-full h-full" alt="" />
            </div>
            <span className="absolute top-3 left-3 bg-black/50 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
              Pratinjau — posisi frame belum mengikuti gerakan wajah
            </span>
          </>
        )}

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

      {cameraStatus === "granted" && (
        <button onClick={stopCamera} className="text-xs text-ink-muted hover:text-ink-text mb-6 mx-auto block">
          Matikan kamera
        </button>
      )}

      {/* ===== SWITCH FRAME TANPA KELUAR SESI ===== */}
      {otherFrames.length > 0 && (
        <div className="mb-8">
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

      {/* ===== BOTTOM ACTIONS ===== */}
      <div className="flex gap-3">
        <button
          onClick={() => toggle(product, showToast)}
          aria-pressed={isWished}
          className={`w-14 h-14 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
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
            className="flex-1 h-14 rounded-full bg-blue text-white font-bold text-[15px] hover:bg-blue-deep transition-colors"
          >
            Cocok! Hubungkan ke {merchant.name}
          </button>
        ) : (
          <Link
            to={`/produk/${product.id}`}
            className="flex-1 h-14 rounded-full bg-blue text-white font-bold text-[15px] hover:bg-blue-deep transition-colors flex items-center justify-center"
          >
            Lihat Detail Produk
          </Link>
        )}
      </div>
      <Link
        to={`/konsultasi?frame=${product.id}${merchantId ? `&toko=${merchantId}` : ""}`}
        className="mt-3 flex items-center justify-center gap-2 h-12 rounded-full border-[1.5px] border-blue text-blue-deep font-bold text-sm hover:bg-surface-blue"
      >
        Scan bentuk wajah &amp; konsultasi dengan optik
      </Link>
      <p className="text-[11.5px] text-ink-muted text-center mt-3">
        TryLens tidak menjual frame secara langsung — pembelian diselesaikan bersama toko optik mitra.
      </p>

      <ConnectMerchantModal open={connectOpen} onClose={() => setConnectOpen(false)} merchant={merchant} product={product} qty={1} />
    </div>
  );
}

/**
 * CATATAN TEKNIS — batas implementasi saat ini:
 *
 * Halaman ini menampilkan video kamera langsung (getUserMedia) dengan
 * ilustrasi frame yang diposisikan tetap di tengah sebagai simulasi visual.
 * Ini BUKAN face-tracking sungguhan — posisi frame tidak mengikuti gerakan
 * atau bentuk wajah pengguna secara real-time.
 *
 * Untuk try-on yang benar-benar melacak wajah (sesuai pitch deck: deteksi
 * bentuk wajah + rekomendasi AI), langkah selanjutnya yang realistis:
 *   1. Pasang library face landmark, mis. MediaPipe Face Landmarker
 *      (@mediapipe/tasks-vision) atau TensorFlow.js face-landmarks-detection.
 *   2. Ambil titik acuan mata kiri/kanan tiap frame video untuk menghitung
 *      posisi, lebar, dan rotasi overlay frame secara dinamis.
 *   3. (Opsional, untuk klaim "rekomendasi AI") turunkan rasio lebar wajah
 *      terhadap tinggi dari landmark untuk mengelompokkan bentuk wajah
 *      (oval/bulat/kotak), lalu cocokkan ke tag bentuk pada tiap produk.
 *
 * UPDATE 8: langkah 3 (bentuk wajah) sudah ada di /konsultasi memakai MediaPipe Face
 * Landmarker sungguhan (lihat components/consult/FaceScanner.jsx). Overlay frame di halaman
 * ini tetap BELUM mengikuti gerakan wajah.
 *
 * Sengaja tidak dipasang di iterasi ini karena butuh model ML + testing
 * akurasi tersendiri, dan salah menampilkan "AI mendeteksi wajahmu" tanpa
 * model asli akan menyesatkan pengguna.
 */
