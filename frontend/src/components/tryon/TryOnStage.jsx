import { assetUrl } from "../../lib/catalog.js";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import FrameIcon from "../icons/FrameIcon.jsx";
import ProductImage from "../ProductImage.jsx";
import { createLandmarker } from "../consult/landmarker.js";
import { PoseEngine } from "../../ar/PoseEngine.js";
import { LumaProbe } from "../../ar/quality.js";
import { estimateRigSpec, readRigSpec, TempleReach } from "../../ar/rigSpecThree.js";
import { CRANIUM } from "../../ar/modelFit.js";
import { estimateSpecFromBox } from "../../ar/rigSpec.js";
import { FOV_DEG } from "../../ar/faceMetrics.js";
import canonical from "../../data/canonicalFace.json";
import { getTryOnConfig } from "./glassesConfig.js";
import { applyRealSize, autoFitScale } from "../../ar/sizeSpec.js";
// Opsional: model hasil ml/train_node_corrector.py (frontend/src/data/nodeCorrector.json). Tanpa berkas itu = tanpa koreksi.
const CORRECTOR = Object.values(import.meta.glob("../../data/nodeCorrector.json", { eager: true }))[0]?.default ?? null;

const canonArr = Float64Array.from(canonical.v);
const FALLBACK_FRAMES = 45; // bila iris tak terbaca sebanyak ini frame, tampilkan model dengan skala bawaan
const storeKey = (id) => `trylens.tryon.adj.${id}`;
const DEFAULT_ADJ = { y: 0, z: 0, s: 1 };

function loadAdj(id) {
  try {
    return { ...DEFAULT_ADJ, ...JSON.parse(localStorage.getItem(storeKey(id)) || "{}") };
  } catch {
    return { ...DEFAULT_ADJ };
  }
}
function saveAdj(id, adj) {
  try {
    localStorage.setItem(storeKey(id), JSON.stringify(adj));
  } catch {
    /* mode privat / penyimpanan penuh: abaikan */
  }
}
function disposeTree(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => m.dispose?.());
  });
}

/**
 * Try-on presisi: video kamera + MediaPipe Face Landmarker + ar/PoseEngine + model .glb (three.js).
 *  - PoseEngine: One Euro Filter (anti-getar tanpa lag), kalibrasi ukuran wajah dari iris (11,7 mm) sehingga
 *    frame tampil berukuran asli, fitting berbasis pupil (pusat lensa model → pupil), dan gerbang kualitas.
 *  - Mesh wajah tak-terlihat sebagai penutup supaya gagang hilang di balik pipi/telinga.
 *  - Frame tanpa model.glb -> ilustrasi 2D mengikuti mata. Pelacak gagal dimuat -> pratinjau statis.
 * Video diproses di perangkat; tidak direkam dan tidak diunggah.
 */
export default function TryOnStage({ stream, product, onProfile, onReport }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlay2dRef = useRef(null);
  const ctx = useRef({});
  const live = useRef({ mode: "loading" });
  const fitRef = useRef({ cfg: getTryOnConfig(product.id), adj: DEFAULT_ADJ });
  const profileCb = useRef(onProfile);
  profileCb.current = onProfile;
  const reportCb = useRef(onReport);
  reportCb.current = onReport;

  const [ar, setAr] = useState(() => {
    const st = stream?.getVideoTracks?.()[0]?.getSettings?.();
    return st?.width && st?.height ? st.width / st.height : 3 / 4; // dari trek kamera: ukuran panggung tidak melompat saat metadata tiba
  });
  const stageRef = useRef(null);
  const [cover, setCover] = useState(null); // ukuran kotak video agar menutup panggung (object-fit: cover) tanpa mengubah ukuran panggung
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const [adjOpen, setAdjOpen] = useState(false);
  const [phase, setPhase] = useState("loading"); // loading | ready | static
  const [mode, setMode] = useState("loading"); // loading | 3d | 2d
  const [ui, setUi] = useState({ tracked: false, calibrated: false, progress: 0, issue: null, pd: null, k: 1 });
  const [adj, setAdj] = useState(() => loadAdj(product.id));
  const [rigged, setRigged] = useState(false);

  // 1) Kamera, renderer, pelacak wajah, mesin presisi, dan loop — dibuat sekali selama kamera menyala.
  useEffect(() => {
    let alive = true;
    let raf = 0;
    let vfc = 0;
    let landmarker = null;
    let lastT = -1;
    let trackedFrames = 0;
    let uiKey = "";
    let reportKey = "";
    let lastOut = null;

    const video = videoRef.current;
    video.srcObject = stream;
    const syncAr = () => {
      if (alive && video.videoWidth) setAr((prev) => { const n = video.videoWidth / video.videoHeight; return Math.abs(n - prev) < 0.01 ? prev : n; });
    };
    video.onloadedmetadata = syncAr;
    video.addEventListener("resize", syncAr); // HP diputar / kamera ganti resolusi
    video.play?.().catch(() => {});

    const engine = new PoseEngine(canonArr, { mode: "tryon", corrector: CORRECTOR, faces: canonical.f, tracker: ((t) => (t === "oneEuro" || t === "magnet" ? t : "stable"))(new URLSearchParams(location.search).get("tracker")) });
    const luma = new LumaProbe();

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    const camera = new THREE.PerspectiveCamera(FOV_DEG, 4 / 3, 1, 10000);

    const head = new THREE.Group(); // mengikuti pose kepala (skala = ukuran wajah pengguna vs model kanonik)
    head.visible = false;
    scene.add(head);

    // Penutup (occluder): mesh wajah kanonik, hanya menulis kedalaman, tidak menggambar warna.
    const occGeo = new THREE.BufferGeometry();
    occGeo.setAttribute("position", new THREE.Float32BufferAttribute(canonical.v, 3));
    occGeo.setIndex(canonical.f);
    const occluder = new THREE.Mesh(occGeo, new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
    occluder.renderOrder = -1;
    head.add(occluder);

    // Tempurung kepala (setengah elips di belakang masker): gagang sisi jauh tersembunyi saat menoleh, tidak melayang di belakang kepala.
    const craniumGeo = new THREE.SphereGeometry(1, 28, 18);
    const cp = craniumGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const cz = Math.min(cp.getZ(i), 0); // setengah belakang saja
      cp.setXYZ(i, CRANIUM.center[0] + cp.getX(i) * CRANIUM.radii[0], CRANIUM.center[1] + cp.getY(i) * CRANIUM.radii[1], CRANIUM.center[2] + cz * CRANIUM.radii[2]);
    }
    const cranium = new THREE.Mesh(craniumGeo, new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
    cranium.renderOrder = -1;
    head.add(cranium);

    const rig = new THREE.Group(); // tempat model kacamata (ukuran asli, cm)
    head.add(rig);

    // Terapkan penempatan ke rig. Model ber-rig: pusat lensa dikunci ke pupil (posisi + roll dari engine).
    // Model lama tanpa rig: penempatan cadangan (titik tetap + koreksi jembatan hidung).
    function applyRig() {
      const { cfg, adj: a } = fitRef.current;
      const k = lastOut?.scale || 1;
      const fit = lastOut?.fit;
      const spec = live.current.spec;
      if (spec && fit) {
        rig.position.set(fit.position[0], fit.position[1] + a.y / k, fit.position[2] + a.z / k);
        rig.rotation.set(0, 0, fit.roll);
        rig.scale.setScalar((spec.unit * cfg.scale * a.s * (live.current.auto || 1)) / k);
        live.current.reach?.fit(rig.position.z, rig.scale.x); // ujung gagang tepat di belakang telinga
        return;
      }
      const d = lastOut?.anchorDelta || [0, 0, 0];
      rig.position.set(cfg.anchor[0] + d[0], cfg.anchor[1] + d[1] + a.y, cfg.anchor[2] + d[2] + a.z);
      rig.rotation.set(0, 0, 0);
      rig.scale.setScalar((cfg.scale * a.s * (live.current.auto || 1)) / k); // head diskalakan k, jadi dibagi k -> frame tetap berukuran asli
    }
    ctx.current = { head, rig, applyRig, engine };

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function place2d(lm) {
      const el = overlay2dRef.current;
      if (!el) return;
      const W = video.videoWidth;
      const H = video.videoHeight;
      const a = lm[33];
      const b = lm[263];
      const dx = (b.x - a.x) * W;
      const dy = (b.y - a.y) * H;
      el.style.left = `${((a.x + b.x) / 2) * 100}%`;
      el.style.top = `${((a.y + b.y) / 2) * 100}%`;
      el.style.width = `${((Math.hypot(dx, dy) * 2.15) / W) * 100}%`;
      el.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(dy, dx)}rad)`;
      el.style.opacity = "1";
    }

    function detect() {
      if (!landmarker || video.readyState < 2 || !video.videoWidth) return;
      let res = null;
      const now = performance.now();
      try {
        res = landmarker.detectForVideo(video, now);
      } catch {
        res = null;
      }
      const out = engine.update(res, video.videoWidth, video.videoHeight, now, luma.sample(video));
      lastOut = out;

      if (out.tracked) {
        trackedFrames++;
        const showModel = out.calibrated || trackedFrames > FALLBACK_FRAMES;
        if (live.current.mode === "3d" && showModel) {
          head.position.set(out.position[0], out.position[1], out.position[2]);
          head.quaternion.set(out.quaternion[0], out.quaternion[1], out.quaternion[2], out.quaternion[3]);
          head.scale.setScalar(out.scale);
          applyRig();
          head.visible = true;
        } else if (live.current.mode === "3d") {
          head.visible = false;
        } else if (live.current.mode === "2d" && res?.faceLandmarks?.[0]) {
          place2d(res.faceLandmarks[0]);
        }
      } else {
        trackedFrames = 0;
        head.visible = false;
        if (overlay2dRef.current) overlay2dRef.current.style.opacity = "0";
      }

      // Perbarui UI hanya saat ada perubahan berarti (bukan tiap frame).
      const next = {
        tracked: out.tracked,
        calibrated: out.calibrated || trackedFrames > FALLBACK_FRAMES,
        progress: Math.round(out.calibProgress * 10) * 10,
        issue: out.tracked ? out.quality?.issues?.[0] ?? null : null,
        pd: out.pdMm ? Math.round(out.pdMm) : null,
        k: +out.scale.toFixed(2),
        locked: !!out.fit
      };
      const rkey = JSON.stringify(out.report || null);
      if (rkey !== reportKey) {
        reportKey = rkey;
        reportCb.current?.(out.report || null);
      }
      const key = JSON.stringify(next);
      if (key !== uiKey) {
        uiKey = key;
        setUi(next);
        if (out.calibrated && out.faceMm) profileCb.current?.({ mm: Math.round(out.faceMm), pd: next.pd, scale: next.k });
      }
      // Tanpa ukuran dari Mitra: sesuaikan lebar frame dengan wajah (perubahan kecil diabaikan agar tidak bergetar).
      if (!live.current.realSize && live.current.spec && out.calibrated && out.faceMm) {
        const want = autoFitScale(live.current.spec, out.faceMm, out.pdMm);
        if (Math.abs(want / (live.current.auto || 1) - 1) > 0.015) {
          live.current.auto = want;
          engine.setUserScale(fitRef.current.adj.s * want);
          applyRig();
        }
      }
    }

    // Sinkron dengan frame kamera (lebih hemat & lebih sedikit lag); cadangan: cek currentTime tiap rAF.
    const hasVFC = typeof video.requestVideoFrameCallback === "function";
    const onVideoFrame = () => {
      if (!alive) return;
      detect();
      vfc = video.requestVideoFrameCallback(onVideoFrame);
    };
    if (hasVFC) vfc = video.requestVideoFrameCallback(onVideoFrame);

    function tick() {
      raf = requestAnimationFrame(tick);
      if (!hasVFC && video.currentTime !== lastT) {
        lastT = video.currentTime;
        detect();
      }
      // Antara dua deteksi, ekstrapolasi pose ke waktu render (magnet) supaya kacamata tidak "menunggu" frame berikutnya.
      if (lastOut?.tracked && head.visible && live.current.mode === "3d") {
        const pr = engine.predict(performance.now());
        if (pr) {
          head.position.set(pr.position[0], pr.position[1], pr.position[2]);
          head.quaternion.set(pr.quaternion[0], pr.quaternion[1], pr.quaternion[2], pr.quaternion[3]);
        }
      }
      renderer.render(scene, camera);
    }
    tick();

    createLandmarker({ matrices: true, blendshapes: true })
      .then((l) => {
        if (!alive) return l.close?.();
        landmarker = l;
        setPhase("ready");
      })
      .catch(() => alive && setPhase("static"));

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (hasVFC) video.cancelVideoFrameCallback?.(vfc);
      ro.disconnect();
      landmarker?.close?.();
      disposeTree(head);
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      video.removeEventListener("resize", syncAr);
      video.srcObject = null;
      ctx.current = {};
    };
  }, [stream]);

  // 2) Muat model .glb tiap ganti produk (kamera, pelacak, dan kalibrasi tidak diulang).
  useEffect(() => {
    const { rig, engine } = ctx.current;
    if (!rig) return undefined;
    let cancelled = false;
    engine?.setModel(null);
    live.current.spec = null;
    live.current.reach = null;
    reportCb.current?.(null);
    live.current.mode = "loading";
    setMode("loading");
    setAdj(loadAdj(product.id));
    [...rig.children].forEach((o) => {
      rig.remove(o);
      disposeTree(o);
    });
    new GLTFLoader().load(
      assetUrl(product.id, "model.glb"),
      (gltf) => {
        if (cancelled) return disposeTree(gltf.scene);
        rig.add(gltf.scene);
        const real = readRigSpec(gltf.scene); // model ber-rig: dimensi & pusat lensa dari node
        const base = real || estimateRigSpec(gltf.scene); // tanpa rig: dimensi diperkirakan dari bentuk model → fitur tetap sama (kunci pupil + laporan)
        const spec = base && product.size ? applyRealSize(base, product.size) : base; // ukuran asli dari Mitra → skala 1:1
        live.current.estimated = !real && !!spec && !spec.realSize;
        live.current.realSize = !!spec?.realSize;
        live.current.auto = 1; // tanpa ukuran Mitra: diisi otomatis dari lebar wajah setelah kalibrasi
        live.current.spec = spec;
        if (spec) live.current.reach = new TempleReach(gltf.scene, (spec.templeL[2] + spec.templeR[2]) / 2 / spec.unit);
        engine?.setModel(spec);
        engine?.setUserScale(fitRef.current.adj.s);
        setRigged(!!spec && !spec.estimated);
        live.current.mode = "3d";
        setMode("3d");
      },
      undefined,
      () => {
        if (cancelled) return;
        live.current.mode = "2d"; // tidak ada model -> ilustrasi 2D
        // Laporan kecocokan tetap jalan: dimensi frame standar (≈14,2 cm) sebagai perkiraan.
        engine?.setModel(estimateSpecFromBox({ min: [-7.1, -2.2, -9], max: [7.1, 2.2, 0.8] }));
        setRigged(false);
        setMode("2d");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [product.id, stream]);

  // 3) Geseran pengguna / konfigurasi berubah -> terapkan langsung.
  useEffect(() => {
    fitRef.current = { cfg: getTryOnConfig(product.id), adj };
    ctx.current.engine?.setUserScale(adj.s * (live.current.auto || 1));
    ctx.current.applyRig?.();
  }, [adj, product.id, mode]);

  // Panggung punya ukuran TETAP (HP: 3:4; desktop: mengikuti kamera), video ditutup-penuh di dalamnya.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onMq = () => setNarrow(mq.matches);
    mq.addEventListener?.("change", onMq);
    const el = stageRef.current;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth, ch = el.clientHeight;
      if (cw && ch) setCover((c) => (c && c.cw === cw && c.ch === ch ? c : { cw, ch }));
    });
    ro.observe(el);
    return () => { mq.removeEventListener?.("change", onMq); ro.disconnect(); };
  }, []);

  function update(patch) {
    setAdj((a) => {
      const n = { ...a, ...patch };
      saveAdj(product.id, n);
      return n;
    });
  }

  const is3d = mode === "3d";
  const chip = "absolute top-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] bg-black/60 backdrop-blur-sm text-white text-[11.5px] font-semibold px-2.5 py-1 rounded-full";
  const calibrating = phase === "ready" && ui.tracked && !ui.calibrated;
  const stageAr = narrow ? 3 / 4 : ar;
  let vw = "100%", vh = "100%";
  if (cover) {
    const wide = ar >= cover.cw / cover.ch;
    vw = `${wide ? cover.ch * ar : cover.cw}px`;
    vh = `${wide ? cover.ch : cover.cw / ar}px`;
  }

  return (
    <div className="mb-2">
      <div
        ref={stageRef}
        className="relative mx-auto bg-ink rounded-2xl overflow-hidden"
        style={{ aspectRatio: stageAr, width: narrow ? "100%" : `min(100%, ${75 * stageAr}vh)`, maxHeight: narrow ? "78svh" : undefined }}
      >
        {/* Semua lapisan di-mirror bersama supaya terasa seperti cermin dan tetap sejajar. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-x-[-1]" style={{ width: vw, height: vh }}>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          {phase === "ready" && mode === "2d" && (
            <div ref={overlay2dRef} className="absolute pointer-events-none opacity-0 drop-shadow-lg" style={{ width: "30%" }}>
              <FrameIcon style={product.style} colorKey={product.colorKey} className="w-full h-auto" />
            </div>
          )}
        </div>

        {phase === "static" && (
          <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[46%] max-w-[260px] pointer-events-none drop-shadow-lg">
            <ProductImage productId={product.id} variant="main" style={product.style} colorKey={product.colorKey} className="w-full h-full" alt="" />
          </div>
        )}

        <span role="status" aria-live="polite" className={chip} hidden={phase === "ready" && ui.tracked && !calibrating && !ui.issue && mode !== "2d"}>
          {phase === "loading" && "Menyiapkan pelacak wajah…"}
          {phase === "static" && "Pelacak wajah gagal dimuat (butuh internet) — pratinjau statis"}
          {phase === "ready" && !ui.tracked && "Hadapkan wajahmu ke kamera"}
          {phase === "ready" && ui.tracked && ui.issue}
          {calibrating && !ui.issue && `Mengkalibrasi ukuran wajah… ${ui.progress}%`}
          {phase === "ready" && ui.tracked && !ui.issue && !calibrating && mode === "2d" && "Model 3D frame ini belum ada — memakai ilustrasi"}
        </span>

        {phase === "ready" && ui.tracked && ui.calibrated && is3d && (
          <span className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] bg-black/50 backdrop-blur-sm text-white/90 text-[10.5px] px-2.5 py-1 rounded-full truncate">
            Terkalibrasi{ui.pd ? ` · PD ≈ ${ui.pd} mm` : ""}
            <span className="max-md:hidden">{rigged ? (ui.locked ? " · lensa dikunci ke pupil" : "") : ui.locked ? " · lensa dikunci ke pupil (dimensi frame diperkirakan)" : " · model tanpa rig: penempatan perkiraan"}</span>
          </span>
        )}
      </div>

      {is3d && phase === "ready" && (
        <div className="mt-3 mx-auto max-w-[520px]">
          <button
            type="button"
            onClick={() => setAdjOpen((o) => !o)}
            aria-expanded={adjOpen}
            className="md:hidden tl-press mx-auto flex items-center gap-2 min-h-11 px-4 rounded-full border border-border bg-white text-[13px] font-semibold text-ink-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            {adjOpen ? "Tutup pengaturan posisi" : "Atur posisi manual"}
          </button>
          <div className={`${adjOpen ? "grid" : "hidden"} md:grid mt-3 md:mt-0 grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3 text-xs text-ink-muted`}>
            <Slider label="Naik / turun" min={-1.5} max={1.5} step={0.05} value={adj.y} onChange={(v) => update({ y: v })} />
            <Slider label="Mundur / maju" min={-1.5} max={1.5} step={0.05} value={adj.z} onChange={(v) => update({ z: v })} />
            <Slider label="Ukuran" min={0.8} max={1.25} step={0.01} value={adj.s} onChange={(v) => update({ s: v })} />
            <button
              onClick={() => {
                setAdj({ ...DEFAULT_ADJ });
                saveAdj(product.id, DEFAULT_ADJ);
              }}
              className="tl-press sm:col-span-3 justify-self-center min-h-10 px-4 text-xs font-semibold text-blue hover:text-blue-deep"
            >
              Atur ulang posisi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, onChange, ...rest }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-semibold text-ink-text">{label}</span>
      <input type="range" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="tl-range w-full" {...rest} />
    </label>
  );
}
