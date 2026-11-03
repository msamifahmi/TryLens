// Detektor kedua untuk ensemble uji-balik (ar/ensemble.js): menjalankan Face Landmarker pada bingkai video yang DICERMINKAN.
// Instans terpisah (mode IMAGE) supaya pelacakan antar-frame instans utama tidak terganggu. Gagal dimuat → null, scan tetap
// jalan tanpa ensemble.
import { createLandmarker } from "./landmarker.js";

const MAX_W = 960;

export async function createFlipDetector() {
  let landmarker;
  try {
    landmarker = await createLandmarker({ mode: "IMAGE" });
  } catch {
    return null;
  }
  const cv = document.createElement("canvas");
  const cx = cv.getContext("2d");
  let ema = 25; // ms per deteksi (rata-rata bergerak)
  return {
    /** Landmark (478, ternormalisasi terhadap bingkai tercermin) atau null. */
    detect(video) {
      const vw = video.videoWidth, vh = video.videoHeight;
      if (!vw || !vh) return null;
      const s = Math.min(1, MAX_W / vw);
      const w = Math.round(vw * s), h = Math.round(vh * s);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const t0 = performance.now();
      cx.setTransform(-1, 0, 0, 1, w, 0);
      cx.drawImage(video, 0, 0, w, h);
      cx.setTransform(1, 0, 0, 1, 0, 0);
      let lm = null;
      try {
        lm = landmarker.detect(cv)?.faceLandmarks?.[0] || null;
      } catch {
        lm = null;
      }
      ema += 0.1 * (performance.now() - t0 - ema);
      return lm;
    },
    /** Rata-rata waktu deteksi (ms): bila terlalu lama pemanggil boleh melewati sebagian frame. */
    get ms() { return ema; },
    close() { try { landmarker.close?.(); } catch { /* sudah ditutup */ } }
  };
}
