import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RotateCcw, ScanFace, ShieldCheck } from "lucide-react";
import { FACE_SHAPES, manualResult, summarizeSamples } from "../../data/faceShape.js";
import { createLandmarker, faceConnections } from "./landmarker.js";
import { drawFace } from "./faceOverlay.js";
import { PoseEngine } from "../../ar/PoseEngine.js";
import { LumaProbe } from "../../ar/quality.js";
import canonical from "../../data/canonicalFace.json";

const NEED_SAMPLES = 30;
const SAMPLE_GAP_MS = 70; // jeda antar sampel agar tersebar ±2 detik, bukan 30 frame identik
const canonArr = Float64Array.from(canonical.v);

/**
 * Pemindai bentuk wajah (AR). Kamera → MediaPipe Face Landmarker (478 titik) → rasio wajah → bentuk wajah.
 * Setelah hasil keluar kamera TETAP aktif: mesh + titik jangkar digambar langsung di wajah sampai pengguna mematikannya.
 * Bila kamera/model tidak tersedia, pengguna bisa memilih bentuk wajah manual (ditandai "manual", bukan hasil AI).
 * Video diproses di perangkat; tidak direkam dan tidak diunggah.
 */
export default function FaceScanner({ onResult }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | scanning | live | error
  const [hint, setHint] = useState("");
  const [progress, setProgress] = useState(0);
  const [fps, setFps] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const alive = useRef(true);
  const mode = useRef("scan"); // scan = mengumpulkan sampel; live = hanya menampilkan mesh
  const samples = useRef([]);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  function cleanup() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
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

  function rescan() {
    samples.current = [];
    mode.current = "scan";
    setProgress(0);
    setHint("Hadapkan wajah lurus ke kamera…");
    setPhase("scanning");
  }

  function stopCamera() {
    cleanup();
    setPhase("idle");
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) return fail("Perangkat atau browser ini tidak mendukung kamera.");
    setPhase("loading");
    setHint("Menyiapkan kamera dan model pemindai… (pertama kali butuh koneksi internet)");
    setProgress(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      const [landmarker, conn] = await Promise.all([createLandmarker({ matrices: true, blendshapes: true }), faceConnections()]);
      if (!alive.current) { landmarker.close?.(); return cleanup(); }
      landmarkerRef.current = landmarker;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      samples.current = [];
      mode.current = "scan";
      setPhase("scanning");
      setHint("Hadapkan wajah lurus ke kamera…");

      const engine = new PoseEngine(canonArr, { mode: "scan" }); // gerbang ketat: lurus, diam, terang, mata terbuka
      const luma = new LumaProbe();
      let lastT = -1;
      let lastSample = 0;
      let frames = 0;
      let fpsT = performance.now();
      const tick = () => {
        if (!alive.current || !landmarkerRef.current) return;
        if (video.readyState >= 2 && video.videoWidth && video.currentTime !== lastT) {
          lastT = video.currentTime;
          const now = performance.now();
          const res = landmarkerRef.current.detectForVideo(video, now);
          const lm = res?.faceLandmarks?.[0] || null;
          if (canvasRef.current) drawFace(canvasRef.current, video, lm, conn, now);
          frames++;
          if (now - fpsT >= 1000) { setFps(Math.round((frames * 1000) / (now - fpsT))); frames = 0; fpsT = now; }

          if (mode.current === "scan") {
            const out = engine.update(res, video.videoWidth, video.videoHeight, now, luma.sample(video));
            if (!out.tracked) setHint("Wajah belum terdeteksi. Pastikan cahaya cukup.");
            else if (!out.quality.ok) setHint(out.quality.issues[0]);
            else if (!out.frame) setHint("Buka mata lebar dan tatap kamera.");
            else {
              setHint("Tahan posisi sebentar…");
              if (now - lastSample >= SAMPLE_GAP_MS) {
                lastSample = now;
                samples.current.push(out.frame);
                setProgress(Math.min(100, Math.round((samples.current.length / NEED_SAMPLES) * 100)));
              }
            }
            if (samples.current.length >= NEED_SAMPLES) {
              const result = summarizeSamples(samples.current);
              mode.current = "live"; // kamera tetap menyala; hanya berhenti mengumpulkan sampel
              setPhase("live");
              setHint(lm ? "Wajah terdeteksi" : "Wajah belum terdeteksi");
              onResultRef.current(result);
            }
          } else {
            setHint(lm ? "Wajah terdeteksi" : "Wajah tidak terlihat");
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
  const camOn = phase === "scanning" || phase === "live";

  return (
    <div>
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-ink mb-3">
        <video ref={videoRef} playsInline muted className={`w-full h-full object-cover scale-x-[-1] ${camOn ? "" : "hidden"}`} />
        <canvas ref={canvasRef} aria-hidden="true" className={`absolute inset-0 w-full h-full pointer-events-none ${camOn ? "" : "hidden"}`} />
        {camOn && (
          <>
            {phase === "scanning" && <div className="tl-breathe absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[46%] aspect-[3/4] rounded-[50%] border-[3px] border-accent-yellow/90 pointer-events-none" />}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 text-white text-[11px] font-semibold px-2.5 py-1">
              <span className={`w-2 h-2 rounded-full ${phase === "live" ? "bg-emerald-400" : "bg-accent-yellow"} tl-blink`} /> {phase === "live" ? "LIVE" : "MEMINDAI"} · 478 titik · {fps} fps
            </div>
            {phase === "scanning" && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/25">
                <div className="h-full bg-accent-yellow transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </>
        )}
        {!camOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-3">
            <span className="tl-float w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-accent-yellow"><ScanFace size={28} /></span>
            <p className="text-white font-semibold m-0 max-w-[340px]">
              {phase === "loading" ? hint : phase === "error" ? hint : "Scan bentuk wajah dengan kamera untuk rekomendasi frame yang lebih tepat."}
            </p>
            {!busy && (
              <button onClick={start} className="tl-breathe h-11 px-6 rounded-full bg-accent-yellow text-ink font-bold text-sm hover:brightness-95">
                {phase === "error" ? "Coba Lagi" : "Mulai Scan Wajah"}
              </button>
            )}
          </div>
        )}
      </div>
      {camOn && <p role="status" className="text-[13px] text-ink-text text-center m-0 mb-2">{hint}{phase === "scanning" ? ` (${progress}%)` : ""}</p>}
      {phase === "live" && (
        <div className="flex justify-center gap-2 mb-2">
          <button onClick={rescan} className="h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-ink-text hover:border-blue flex items-center gap-1.5"><RotateCcw size={14} /> Scan ulang</button>
          <button onClick={stopCamera} className="h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-ink-text hover:border-blue flex items-center gap-1.5"><CameraOff size={14} /> Matikan kamera</button>
        </div>
      )}
      {phase === "scanning" && <button onClick={stopCamera} className="block mx-auto text-xs text-ink-muted hover:text-ink mb-2 min-h-11 px-3">Batalkan</button>}
      {phase === "idle" && samples.current.length >= NEED_SAMPLES && (
        <button onClick={start} className="mx-auto mb-2 h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-ink-text hover:border-blue flex items-center gap-1.5"><Camera size={14} /> Nyalakan kamera lagi</button>
      )}
      <p className="flex items-start gap-1.5 text-[11.5px] text-ink-muted m-0 mb-4">
        <ShieldCheck size={14} className="flex-shrink-0 mt-px" />
        Video diproses di perangkat Anda, tidak direkam dan tidak diunggah. Ke optik hanya dikirim hasilnya (bentuk & proporsi), bukan foto. Mesh digambar dari model MediaPipe Face Landmarker; hasilnya perkiraan, bukan ukuran medis.
      </p>

      {!busy && phase !== "live" && (
        <div>
          <p className="text-[12.5px] font-semibold text-ink-text m-0 mb-2">Tidak bisa memakai kamera? Pilih bentuk wajah secara manual:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FACE_SHAPES).map(([key, s]) => (
              <button key={key} onClick={() => onResult(manualResult(key))}
                className="h-11 px-4 rounded-full border border-[#C5D6EA] bg-white text-[13px] font-medium text-ink-text hover:border-blue-deep hover:text-blue-deep">
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
