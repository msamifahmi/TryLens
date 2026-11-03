import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, RotateCcw, ScanFace, ShieldCheck, X } from "lucide-react";
import { FACE_SHAPES, manualResult, summarizeSamples } from "../../data/faceShape.js";
import { createLandmarker, faceConnections } from "./landmarker.js";
import { createFlipDetector } from "./flipDetector.js";
import { HairProbe } from "./hairProbe.js";
import { drawFace, earPoints, foreheadAnchor } from "./faceOverlay.js";
import { PoseEngine } from "../../ar/PoseEngine.js";
import { LumaProbe, SCAN_LEVELS } from "../../ar/quality.js";
import { buildMirrorMap, fuseFlip } from "../../ar/ensemble.js";
import canonical from "../../data/canonicalFace.json";

const NEED_SAMPLES = 45; // lebih banyak sampel → rata-rata terpangkas lebih mantap (±3 detik)
const MIN_PARTIAL = 18; // bila macet di toleransi terlonggar, hasil dari ≥18 sampel tetap diberikan (kepercayaan rendah)
const SAMPLE_GAP_MS = 70; // jeda antar sampel agar tersebar ±2 detik, bukan 30 frame identik
const STALL_MS = 6000; // tanpa kemajuan selama ini → toleransi naik satu tingkat (agar tidak macet di 24%)
const REL_MIN = [0.45, 0.3, 0.2]; // keandalan frame minimum per tingkat toleransi
const canonArr = Float64Array.from(canonical.v);
let mirrorMap = null;
const getMirror = () => (mirrorMap ||= buildMirrorMap(canonArr));

const CHECK_LABELS = { light: "Cahaya", distance: "Jarak", centered: "Di tengah", straight: "Lurus", steady: "Diam", eyes: "Mata" };

/**
 * Pemindai bentuk wajah (AR). Kamera → MediaPipe Face Landmarker (478 titik) → rasio wajah → bentuk wajah.
 *  • Ensemble cermin: jaringan dijalankan juga pada bingkai tercermin lalu digabung; selisihnya dipakai menaksir ketepatan.
 *  • Toleransi bertingkat: bila progres macet beberapa detik, batas sudut/kecepatan dilonggarkan satu tingkat (hasil ditandai kurang pasti).
 *  • Dahi = garis rambut dari deteksi warna; telinga = perkiraan yang dijangkarkan ke titik tepi wajah (model tidak punya titik telinga).
 * Setelah hasil keluar kamera TETAP aktif: mesh + titik jangkar digambar langsung di wajah sampai pengguna mematikannya.
 * Bila kamera/model tidak tersedia, pengguna bisa memilih bentuk wajah manual (ditandai "manual", bukan hasil AI).
 * Video diproses di perangkat; tidak direkam dan tidak diunggah.
 */
export default function FaceScanner({ onResult }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | scanning | live | error
  const [hint, setHint] = useState("");
  const [progress, setProgress] = useState(0);
  const [fps, setFps] = useState(0);
  const [level, setLevel] = useState(0);
  const [checks, setChecks] = useState(null);
  const [ensemble, setEnsemble] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [showMesh, setShowMesh] = useState(false); // setelah 100% mesh & anchor disembunyikan (bisa ditampilkan lagi)
  const showMeshRef = useRef(false);
  showMeshRef.current = showMesh;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const flipRef = useRef(null);
  const rafRef = useRef(0);
  const alive = useRef(true);
  const mode = useRef("scan"); // scan = mengumpulkan sampel; live = hanya menampilkan mesh
  const samples = useRef([]);
  const control = useRef({ level: 0, progressAt: 0, reset: false }); // dibaca loop tanpa render ulang
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  function cleanup() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    flipRef.current?.close?.();
    flipRef.current = null;
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

  function resetScan() {
    samples.current = [];
    mode.current = "scan";
    control.current = { level: 0, progressAt: performance.now(), reset: true };
    setProgress(0);
    setLevel(0);
    setStalled(false);
    setChecks(null);
  }

  function rescan() {
    resetScan();
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
      resetScan();
      setPhase("scanning");
      setHint("Hadapkan wajah lurus ke kamera…");
      // Detektor kedua (cermin) dimuat di latar belakang: scan langsung jalan, ensemble menyala begitu siap.
      createFlipDetector().then((d) => {
        if (!d) return;
        if (!alive.current || !streamRef.current) return d.close();
        flipRef.current = d;
        setEnsemble(true);
      });

      const engine = new PoseEngine(canonArr, { mode: "scan" }); // gerbang kualitas bertingkat (quality.js SCAN_LEVELS)
      const luma = new LumaProbe();
      const hair = new HairProbe();
      const mirror = getMirror();
      let lastT = -1;
      let lastSample = 0;
      let lastEars = [];
      let frames = 0;
      let fpsT = performance.now();
      let checksKey = "";
      let flipTurn = false;
      let stallShown = false;
      const finish = (lm) => {
        if (mode.current !== "scan") return;
        const result = summarizeSamples(samples.current, { level: control.current.level, hair: hair.summary() });
        mode.current = "live"; // kamera tetap menyala; mesh & anchor disembunyikan setelah 100%
        lastEars = [];
        setShowMesh(false);
        setPhase("live");
        setStalled(false);
        setHint(lm ? "Wajah terdeteksi" : "Wajah belum terdeteksi");
        onResultRef.current(result);
      };
      const tick = () => {
        if (!alive.current || !landmarkerRef.current) return;
        if (video.readyState >= 2 && video.videoWidth && video.currentTime !== lastT) {
          lastT = video.currentTime;
          const now = performance.now();
          const ctl = control.current;
          if (ctl.reset) { ctl.reset = false; engine.reset(); engine.scanLevel = 0; hair.reset(); stallShown = false; }
          const vw = video.videoWidth, vh = video.videoHeight;
          const res = landmarkerRef.current.detectForVideo(video, now);
          let lm = res?.faceLandmarks?.[0] || null;

          // Ensemble cermin: dua deteksi → rata-rata titik + selisih sebagai ukuran ketidakpastian. Bila deteksi kedua lambat, dipakai selang-seling.
          let unc = null;
          const flip = flipRef.current;
          if (lm && flip && mode.current === "scan" && (flip.ms < 38 || (flipTurn = !flipTurn))) {
            const fz = fuseFlip(lm, flip.detect(video), vw, vh, mirror);
            if (fz.ok) { lm = fz.lm; unc = fz.unc; }
          }
          const res2 = lm && lm !== res.faceLandmarks[0] ? { ...res, faceLandmarks: [lm] } : res;
          const out = engine.update(res2, vw, vh, now, luma.sample(video));
          const scanning = mode.current === "scan";

          if (canvasRef.current) {
            const drawIt = scanning || showMeshRef.current;
            let fore = null;
            if (drawIt && lm) {
              lastEars = earPoints(lm, out, vw, vh);
              fore = foreheadAnchor(lm, vw, vh, hair.sample(video, lm, now));
            }
            drawFace(canvasRef.current, video, drawIt ? lm : null, conn, now, drawIt ? lastEars : [], fore);
          }
          frames++;
          if (now - fpsT >= 1000) { setFps(Math.round((frames * 1000) / (now - fpsT))); frames = 0; fpsT = now; }

          if (scanning) {
            const q = out.quality;
            let text;
            if (!out.tracked) text = "Wajah belum terdeteksi. Pastikan cahaya cukup dan wajah di dalam bingkai.";
            else if (!q.ok) text = q.issues[0];
            else if (!out.frame) text = "Buka mata lebar dan tatap kamera (lensa), jangan melirik ke layar.";
            else text = "Tahan posisi sebentar…";
            setHint(text);
            const ck = out.tracked ? { ...q.checks, eyes: q.ok ? !!out.frame : true } : null;
            const key = JSON.stringify(ck);
            if (key !== checksKey) { checksKey = key; setChecks(ck); }

            const relMin = REL_MIN[ctl.level];
            const clean = !unc || unc.rel < 0.025; // dua deteksi jaringan terlalu berbeda → frame diragukan
            if (out.tracked && q.ok && out.frame && (out.frame.rel ?? 1) >= relMin && clean && now - lastSample >= SAMPLE_GAP_MS) {
              lastSample = now;
              const cheekPx = Math.hypot((lm[454].x - lm[234].x) * vw, (lm[454].y - lm[234].y) * vh) || 1;
              samples.current.push({ ...out.frame, ttaMm: unc ? unc.keyPx * (out.frame.mm / cheekPx) : null, meshRel: unc ? unc.rel : null });
              ctl.progressAt = now;
              setProgress(Math.min(100, Math.round((samples.current.length / NEED_SAMPLES) * 100)));
              if (stallShown) { stallShown = false; setStalled(false); }
            }

            // Anti-macet: tak ada kemajuan → longgarkan toleransi; di tingkat terlonggar, hasil sebagian tetap diberikan.
            if (now - ctl.progressAt > STALL_MS && out.tracked) {
              if (ctl.level < SCAN_LEVELS.length - 1) {
                ctl.level++;
                ctl.progressAt = now;
                engine.scanLevel = ctl.level;
                setLevel(ctl.level);
              } else if (!stallShown) {
                stallShown = true;
                setStalled(true);
              } else if (now - ctl.progressAt > STALL_MS * 1.6 && samples.current.length >= MIN_PARTIAL) {
                finish(lm); // toleransi sudah terlonggar & tetap macet: beri hasil dari sampel yang ada (kepercayaan rendah)
              }
            }
            if (samples.current.length >= NEED_SAMPLES) finish(lm);
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
            {phase === "scanning" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="tl-breathe w-[46%] aspect-[3/4] rounded-[50%] border-[3px] border-accent-yellow/90" />
              </div>
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 text-white text-[11px] font-semibold px-2.5 py-1">
              <span className={`w-2 h-2 rounded-full ${phase === "live" ? "bg-emerald-400" : "bg-accent-yellow"} tl-blink`} /> {phase === "live" ? "LIVE · selesai" : "MEMINDAI"}{phase === "scanning" || showMesh ? " · 478 titik" : ""} · {fps} fps
            </div>
            {phase === "scanning" && ensemble && (
              <div className="absolute top-2 right-2 rounded-full bg-black/55 text-white text-[10.5px] font-semibold px-2.5 py-1">Deteksi ganda aktif</div>
            )}
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
      {phase === "scanning" && checks && (
        <ul className="flex flex-wrap justify-center gap-1.5 list-none p-0 m-0 mb-2" aria-label="Syarat scan">
          {Object.entries(CHECK_LABELS).map(([k, label]) => (
            <li key={k} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${checks[k] === false ? "bg-error/10 text-error" : "bg-surface-blue text-blue-deep"}`}>
              {checks[k] === false ? <X size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />} {label}
            </li>
          ))}
        </ul>
      )}
      {phase === "scanning" && level > 0 && (
        <p className="text-[12px] text-ink-muted text-center m-0 mb-2">
          Toleransi dilonggarkan (tingkat {level + 1}/{SCAN_LEVELS.length}) agar scan tidak macet — hasil ditandai kurang pasti. Cahaya depan yang merata dan kamera sejajar mata membantu.
        </p>
      )}
      {phase === "live" && (
        <div className="flex justify-center gap-2 mb-2 flex-wrap">
          <button onClick={rescan} className="h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-ink-text hover:border-blue flex items-center gap-1.5"><RotateCcw size={14} /> Scan ulang</button>
          <button onClick={() => setShowMesh((v) => !v)} aria-pressed={showMesh} className="h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-ink-text hover:border-blue flex items-center gap-1.5"><ScanFace size={14} /> {showMesh ? "Sembunyikan mesh" : "Tampilkan mesh"}</button>
          <button onClick={stopCamera} className="h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-ink-text hover:border-blue flex items-center gap-1.5"><CameraOff size={14} /> Matikan kamera</button>
        </div>
      )}
      {phase === "scanning" && <button onClick={stopCamera} className="block mx-auto text-xs text-ink-muted hover:text-ink mb-2 min-h-11 px-3">Batalkan</button>}
      {phase === "idle" && samples.current.length >= NEED_SAMPLES && (
        <button onClick={start} className="mx-auto mb-2 h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-ink-text hover:border-blue flex items-center gap-1.5"><Camera size={14} /> Nyalakan kamera lagi</button>
      )}
      <p className="flex items-start gap-1.5 text-[11.5px] text-ink-muted m-0 mb-4">
        <ShieldCheck size={14} className="flex-shrink-0 mt-px" />
        Video diproses di perangkat Anda, tidak direkam dan tidak diunggah. Ke optik hanya dikirim hasilnya (bentuk & proporsi), bukan foto. Mesh digambar dari model MediaPipe Face Landmarker. Model tidak punya titik telinga: penanda telinga ditaksir dari titik tepi wajah dan arah kepala, dan garis rambut dideteksi dari warna kulit—hasilnya perkiraan, bukan ukuran medis.
      </p>

      {(!busy || stalled) && phase !== "live" && (
        <div>
          <p className="text-[12.5px] font-semibold text-ink-text m-0 mb-2">{stalled ? "Scan sulit terbaca? Pilih bentuk wajah secara manual:" : "Tidak bisa memakai kamera? Pilih bentuk wajah secara manual:"}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FACE_SHAPES).map(([key, s]) => (
              <button key={key} onClick={() => { if (stalled) stopCamera(); onResult(manualResult(key)); }}
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
