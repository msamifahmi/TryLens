import { assetUrl } from "../lib/catalog.js";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Pause, Play, RotateCw } from "lucide-react";

// Cek apakah produk punya model .glb. Server dev/SPA mengembalikan index.html (200) untuk file yang tak ada,
// jadi isi file diperiksa: GLB selalu diawali "glTF".
const cache = new Map();
export function hasModel(productId) {
  if (!cache.has(productId)) {
    cache.set(
      productId,
      fetch(assetUrl(productId, "model.glb"), { headers: { Range: "bytes=0-3" } })
        .then(async (r) => r.ok && new TextDecoder().decode(new Uint8Array(await r.arrayBuffer()).slice(0, 4)) === "glTF")
        .catch(() => false)
    );
  }
  return cache.get(productId);
}
export function useHasModel(productId) {
  const [has, setHas] = useState(false);
  useEffect(() => {
    let alive = true;
    setHas(false);
    hasModel(productId).then((v) => alive && setHas(v));
    return () => { alive = false; };
  }, [productId]);
  return has;
}

const TAU = Math.PI * 2;

/**
 * Pratinjau 360° dari model .glb produk: seret untuk memutar (ada inersia), putar otomatis saat dibiarkan,
 * geser slider / tombol panah untuk memutar presisi. Render berhenti saat di luar layar atau tab tersembunyi.
 */
export default function Model360({ productId, alt = "Pratinjau 360 derajat", className = "" }) {
  const host = useRef(null);
  const canvasRef = useRef(null);
  const sliderRef = useRef(null);
  const api = useRef({});
  const [state, setState] = useState("loading"); // loading | ready | error
  const [auto, setAuto] = useState(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const autoRef = useRef(auto);
  autoRef.current = auto;

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 1000);
    const pivot = new THREE.Group();
    scene.add(pivot);

    let alive = true, visible = true, raf = 0, last = performance.now();
    let yaw = -0.6, pitch = 0.12, vel = 0, dragging = false, idleSince = performance.now(), px = 0, py = 0;
    let loaded = null;

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    new GLTFLoader().load(
      assetUrl(productId, "model.glb"),
      (gltf) => {
        if (!alive) return;
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
        gltf.scene.position.sub(c); // pusat model di sumbu putar
        pivot.add(gltf.scene);
        const r = size.length() / 2; // bola pembatas: model utuh di semua sudut putar
        const dist = (r / Math.sin((camera.fov * Math.PI) / 360)) * 0.88;
        camera.position.set(0, 0, dist);
        camera.near = dist / 50; camera.far = dist * 10; camera.updateProjectionMatrix();
        loaded = gltf.scene;
        setState("ready");
      },
      undefined,
      () => alive && setState("error")
    );

    const setYaw = (v) => { yaw = ((v % TAU) + TAU) % TAU; };
    api.current = {
      setDeg: (d) => { setYaw((d * Math.PI) / 180); idleSince = performance.now(); vel = 0; },
      nudge: (d) => { setYaw(yaw + (d * Math.PI) / 180); idleSince = performance.now(); vel = 0; }
    };

    const down = (e) => { dragging = true; px = e.clientX; py = e.clientY; vel = 0; canvas.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      setYaw(yaw + dx * 0.012);
      pitch = Math.max(-0.5, Math.min(0.7, pitch + dy * 0.006));
      vel = dx * 0.012 * 60; // rad/s untuk inersia
      idleSince = performance.now();
    };
    const up = () => { dragging = false; idleSince = performance.now(); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.05 });
    io.observe(canvas);

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden || !loaded) return;
      if (!dragging) {
        if (Math.abs(vel) > 0.01) { setYaw(yaw + vel * dt); vel *= Math.pow(0.04, dt); }
        else if (autoRef.current && now - idleSince > 1200) setYaw(yaw + 0.7 * dt);
      }
      pivot.rotation.set(pitch, yaw, 0);
      if (sliderRef.current && document.activeElement !== sliderRef.current) sliderRef.current.value = String(Math.round((yaw * 180) / Math.PI) % 360);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      pivot.traverse((o) => {
        o.geometry?.dispose?.();
        (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => m.dispose?.());
      });
      env.dispose(); pmrem.dispose(); renderer.dispose();
    };
  }, [productId]);

  const onKey = useCallback((e) => {
    if (e.key === "ArrowLeft") { api.current.nudge?.(-8); e.preventDefault(); }
    if (e.key === "ArrowRight") { api.current.nudge?.(8); e.preventDefault(); }
  }, []);

  return (
    <div ref={host} className={`relative w-full h-full select-none ${className}`}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`${alt}. Seret atau gunakan tombol panah kiri/kanan untuk memutar.`}
        onKeyDown={onKey}
        className="w-full h-full touch-pan-y cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-blue-deep/40 rounded-xl"
      />
      {state === "loading" && <div className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-muted">Memuat model 3D…</div>}
      {state === "error" && <div className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-muted">Model 3D tidak bisa dimuat.</div>}
      {state === "ready" && (
        <div className="absolute left-0 right-0 bottom-0 flex items-center gap-3 px-1 pt-2">
          <button type="button" onClick={() => setAuto(!auto)} aria-pressed={auto} aria-label={auto ? "Jeda putar otomatis" : "Putar otomatis"} className="w-8 h-8 rounded-full bg-white/90 border border-[#DDE8F4] flex items-center justify-center text-blue-deep hover:border-blue-deep flex-shrink-0">
            {auto ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <input ref={sliderRef} type="range" min="0" max="359" defaultValue="0" onChange={(e) => api.current.setDeg?.(+e.target.value)} aria-label="Putar 360 derajat" className="flex-1 accent-[#406aaf]" />
          <span className="hidden sm:flex items-center gap-1 text-[11.5px] font-semibold text-blue-deep flex-shrink-0"><RotateCw size={13} /> 360°</span>
        </div>
      )}
    </div>
  );
}
