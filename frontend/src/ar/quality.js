// Penilaian kualitas frame: apakah layak dipakai untuk mengukur / mengkalibrasi?
export const LIMITS = {
  // iris = diameter iris minimum (piksel). Iris hanya ~12–25 px di 720p, jadi inilah penentu presisi skala.
  tryon: { yaw: 35, pitch: 25, roll: 25, still: Infinity, iris: 8 },
  scan: { yaw: 8, pitch: 10, roll: 8, still: 1.2, iris: 11 } // still = laju sudut maks (rad/s) agar tidak blur
};

/** Rata-rata kecerahan (0–255) area tengah video; dihitung tiap beberapa frame supaya murah. */
export class LumaProbe {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 32;
    this.canvas.height = 24;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.value = null;
    this.n = 0;
  }
  sample(video) {
    if (this.value !== null && ++this.n % 8) return this.value;
    try {
      this.ctx.drawImage(video, 0, 0, 32, 24);
      const d = this.ctx.getImageData(8, 6, 16, 12).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      this.value = s / (d.length / 4);
    } catch {
      /* video belum siap */
    }
    return this.value;
  }
}

/** Kembalikan { ok, issues[], score 0–1 }. issues[0] = saran paling penting untuk ditampilkan. */
export function assessQuality({ angles, span, irisPx, center, luma, speed = 0, mode = "tryon" }) {
  const lim = LIMITS[mode];
  const issues = [];
  if (luma != null && luma < 55) issues.push("Terlalu gelap — cari cahaya yang lebih terang.");
  if (luma != null && luma > 215) issues.push("Terlalu silau — kurangi cahaya dari belakang atau samping.");
  if (irisPx < lim.iris) issues.push("Terlalu jauh — dekatkan wajah ke kamera.");
  else if (span > 0.7) issues.push("Terlalu dekat — mundur sedikit.");
  if (Math.abs(center[0] - 0.5) > 0.22 || Math.abs(center[1] - 0.5) > 0.25) issues.push("Posisikan wajah di tengah layar.");
  if (Math.abs(angles.yaw) > lim.yaw) issues.push("Hadap lurus ke kamera (jangan menoleh).");
  if (Math.abs(angles.pitch) > lim.pitch) issues.push("Luruskan kepala (jangan menunduk atau mendongak).");
  if (Math.abs(angles.roll) > lim.roll) issues.push("Tegakkan kepala (jangan miring).");
  if (speed > lim.still) issues.push("Tahan posisi sebentar.");
  const score = Math.max(0, 1 - issues.length * 0.34);
  return { ok: issues.length === 0, issues, score };
}
