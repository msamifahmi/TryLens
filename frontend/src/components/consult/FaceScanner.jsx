import { useEffect, useRef, useState } from "react";
import { ScanFace, ShieldCheck } from "lucide-react";
import { FACE_SHAPES, manualResult, measureFace, summarizeSamples } from "../../data/faceShape.js";
import { createLandmarker } from "./landmarker.js";

const NEED_SAMPLES = 20;

/**
 * Pemindai bentuk wajah (AR). Kamera → MediaPipe Face Landmarker → rasio wajah → bentuk wajah.
 * Bila kamera/model tidak tersedia, pengguna bisa memilih bentuk wajah manual (ditandai "manual", bukan hasil AI).
 * Video diproses di perangkat; tidak direkam dan tidak diunggah.
 */
export default function FaceScanner({ onResult }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | scanning | error
  const [hint, setHint] = useState("");
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const alive = useRef(true);

  function cleanup() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cleanup();
    };
  }, []);

  function fail(text) {
    cleanup();
    if (alive.current) {
      setHint(text);
      setPhase("error");
    }
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) return fail("Perangkat atau browser ini tidak mendukung kamera.");
    setPhase("loading");
    setHint("Menyiapkan kamera dan model pemindai… (pertama kali butuh koneksi internet)");
    setProgress(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      const landmarker = await createLandmarker();
      if (!alive.current) return cleanup();
      landmarkerRef.current = landmarker;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setPhase("scanning");
      setHint("Hadapkan wajah lurus ke kamera…");

      const samples = [];
      const tick = () => {
        if (!alive.current || !landmarkerRef.current) return;
        if (video.readyState >= 2 && video.videoWidth) {
          const lm = landmarkerRef.current.detectForVideo(video, performance.now()).faceLandmarks?.[0];
          if (!lm) setHint("Wajah belum terdeteksi. Pastikan cahaya cukup.");
          else {
            const m = measureFace(lm, video.videoWidth, video.videoHeight);
            if (m && m.frontal > 0.8) {
              samples.push(m);
              setProgress(Math.min(100, Math.round((samples.length / NEED_SAMPLES) * 100)));
              setHint("Tahan posisi sebentar…");
            } else setHint("Hadapkan wajah lurus ke kamera (jangan menoleh).");
          }
          if (samples.length >= NEED_SAMPLES) {
            const result = summarizeSamples(samples);
            cleanup();
            setPhase("idle");
            onResult(result);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      fail(e?.name === "NotAllowedError" ? "Akses kamera tidak diizinkan." : "Pemindai wajah gagal dimuat. Periksa koneksi internet lalu coba lagi.");
    }
  }

  const busy = phase === "loading" || phase === "scanning";

  return (
    <div>
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-ink mb-3">
        <video ref={videoRef} playsInline muted className={`w-full h-full object-cover scale-x-[-1] ${phase === "scanning" ? "" : "hidden"}`} />
        {phase === "scanning" && (
          <>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] aspect-[3/4] rounded-[50%] border-[3px] border-accent-yellow/90 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/25">
              <div className="h-full bg-accent-yellow transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
        {phase !== "scanning" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3">
            <span className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-accent-yellow"><ScanFace size={28} /></span>
            <p className="text-white font-semibold m-0 max-w-[340px]">
              {phase === "loading" ? hint : phase === "error" ? hint : "Scan bentuk wajah dengan kamera untuk rekomendasi frame yang lebih tepat."}
            </p>
            {!busy && (
              <button onClick={start} className="h-11 px-6 rounded-full bg-accent-yellow text-ink font-bold text-sm hover:brightness-95">
                {phase === "error" ? "Coba Lagi" : "Mulai Scan Wajah"}
              </button>
            )}
          </div>
        )}
      </div>
      {phase === "scanning" && (
        <p role="status" className="text-[13px] text-ink-text text-center m-0 mb-2">{hint} ({progress}%)</p>
      )}
      {phase === "scanning" && (
        <button onClick={() => { cleanup(); setPhase("idle"); }} className="block mx-auto text-xs text-ink-muted hover:text-ink mb-2">Batalkan</button>
      )}
      <p className="flex items-start gap-1.5 text-[11.5px] text-ink-muted m-0 mb-4">
        <ShieldCheck size={14} className="flex-shrink-0 mt-px" />
        Video diproses di perangkat Anda, tidak direkam dan tidak diunggah. Ke optik hanya dikirim hasilnya (bentuk & proporsi), bukan foto.
      </p>

      {!busy && (
        <div>
          <p className="text-[12.5px] font-semibold text-ink-text m-0 mb-2">Tidak bisa memakai kamera? Pilih bentuk wajah secara manual:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FACE_SHAPES).map(([key, s]) => (
              <button
                key={key}
                onClick={() => onResult(manualResult(key))}
                className="h-9 px-4 rounded-full border border-[#C5D6EA] bg-white text-[13px] font-medium text-ink-text hover:border-blue-deep hover:text-blue-deep"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
