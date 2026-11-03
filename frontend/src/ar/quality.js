// Penilaian kualitas frame: apakah layak dipakai untuk mengukur / mengkalibrasi?
export const LIMITS = {
  // iris = diameter iris minimum (piksel). Iris hanya ~12–25 px di 720p, jadi inilah penentu presisi skala.
  tryon: { yaw: 35, pitch: 16, roll: 25, still: Infinity, iris: 8 },
  // Scan: ukuran wajah dihitung dari titik yang sudah "diluruskan" memakai pose kepala, jadi sudut kecil tidak merusak hasil.
  // Batas lama (8°/10°/8°) terlalu ketat untuk webcam laptop (kamera di bawah/atas mata) sehingga progres macet di 20–30%.
  scan: { yaw: 14, pitch: 18, roll: 12, still: 2.2, iris: 9 }
};

/**
 * Tingkat toleransi scan. Dimulai dari 0; bila progres macet beberapa detik, pemindai naik satu tingkat (FaceScanner) agar
 * pengguna tidak terjebak. Semakin tinggi tingkat → semakin longgar → hasil ditandai kepercayaan lebih rendah.
 */
export const SCAN_LEVELS = [
  { yaw: 10, pitch: 14, roll: 9, still: 1.6, iris: 10, center: 0.2 },
  { yaw: 14, pitch: 18, roll: 12, still: 2.2, iris: 9, center: 0.26 },
  { yaw: 20, pitch: 24, roll: 18, still: 3.5, iris: 8, center: 0.32 }
];

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

/**
 * Kembalikan { ok, issues[], score 0–1, checks }. issues[0] = saran paling penting untuk ditampilkan.
 * checks = status tiap syarat (true = terpenuhi) agar UI bisa menampilkan daftar centang, bukan hanya satu kalimat.
 * level (hanya mode scan) = indeks SCAN_LEVELS.
 */
export function assessQuality({ angles, span, irisPx, center, luma, speed = 0, mode = "tryon", clipped = 0, level = 1 }) {
  const lim = mode === "scan" ? SCAN_LEVELS[Math.max(0, Math.min(SCAN_LEVELS.length - 1, level))] : LIMITS[mode];
  const cx = lim.center ?? 0.22;
  const issues = [];
  const checks = { light: true, distance: true, centered: true, straight: true, steady: true };
  const deg = (v) => Math.round(Math.abs(v));
  if (luma != null && luma < 55) { issues.push("Terlalu gelap — cari cahaya yang lebih terang."); checks.light = false; }
  if (luma != null && luma > 215) { issues.push("Terlalu silau — kurangi cahaya dari belakang atau samping."); checks.light = false; }
  if (irisPx < lim.iris) { issues.push("Terlalu jauh — dekatkan wajah ke kamera."); checks.distance = false; }
  else if (span > 0.7) { issues.push("Terlalu dekat — mundur sedikit."); checks.distance = false; }
  if (clipped > 0) { issues.push("Wajah terpotong di tepi layar — geser kamera atau mundur sedikit."); checks.centered = false; }
  if (Math.abs(center[0] - 0.5) > cx || Math.abs(center[1] - 0.5) > cx + 0.03) { issues.push("Posisikan wajah di tengah layar."); checks.centered = false; }
  if (Math.abs(angles.yaw) > lim.yaw) { issues.push(`Hadap lurus ke kamera — kepala menoleh ±${deg(angles.yaw)}° (batas ${lim.yaw}°).`); checks.straight = false; }
  if (Math.abs(angles.pitch) > lim.pitch) { issues.push(`Luruskan kepala (jangan menunduk atau mendongak) — condong ±${deg(angles.pitch)}° (batas ${lim.pitch}°).`); checks.straight = false; }
  if (Math.abs(angles.roll) > lim.roll) { issues.push(`Tegakkan kepala — miring ±${deg(angles.roll)}° (batas ${lim.roll}°).`); checks.straight = false; }
  if (speed > lim.still) { issues.push("Tahan posisi sebentar."); checks.steady = false; }
  const score = Math.max(0, 1 - issues.length * 0.34);
  return { ok: issues.length === 0, issues, score, checks };
}
