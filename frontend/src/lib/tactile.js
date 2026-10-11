// Umpan balik sentuh global: gelombang (ripple) dari titik sentuh pada elemen `.tl-ripple` / `.tl-cta`, dan getar haptic singkat
// pada tombol (Android; iOS Safari tidak mendukung navigator.vibrate, jadi di sana hanya efek visual).
// Dipasang sekali di main.jsx. Tidak mengubah layout: gelombang absolut di dalam elemen ber-overflow-hidden.

const RIPPLE_SEL = ".tl-ripple, .tl-cta";
const HAPTIC_SEL = 'button:not(:disabled), [role="button"], [role="tab"], [role="switch"], .tl-haptic';
const NO_HAPTIC = 'input, textarea, select, [data-no-haptic]';

export function initTactile() {
  if (typeof document === "undefined" || window.__tlTactile) return;
  window.__tlTactile = true;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  let lastBuzz = 0;

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button > 0 || !(e.target instanceof Element)) return;

      if (canVibrate && e.pointerType !== "mouse" && !e.target.closest(NO_HAPTIC) && e.target.closest(HAPTIC_SEL)) {
        const now = performance.now();
        if (now - lastBuzz > 60) { navigator.vibrate(7); lastBuzz = now; }
      }

      if (reduce?.matches) return;
      const host = e.target.closest(RIPPLE_SEL);
      if (!host || host.disabled || host.getAttribute("aria-disabled") === "true") return;
      const r = host.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const wave = document.createElement("span");
      wave.className = "tl-ripple-wave";
      wave.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:${size}px;height:${size}px`;
      host.appendChild(wave);
      wave.addEventListener("animationend", () => wave.remove(), { once: true });
    },
    { passive: true }
  );
}
