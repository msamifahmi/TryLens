// Pembungkus DOM untuk ar/hairline.js: mengambil bingkai video (diperkecil ke ≤640 px) ±6×/detik dan mendeteksi garis rambut.
// Hasil dihaluskan (rata-rata bergerak berbobot kepercayaan) supaya titik "Dahi" tidak melompat tiap frame.
import { detectHairline } from "../../ar/hairline.js";

const MAX_W = 640;
const EVERY_MS = 160;

export class HairProbe {
  constructor() {
    this.cv = document.createElement("canvas");
    this.cx = this.cv.getContext("2d", { willReadFrequently: true });
    this.t = -1e9;
    this.ema = null; // { extraR, conf }
    this.last = null; // hasil mentah terakhir
    this.history = []; // extraR terukur (conf ≥ 0,5) untuk ringkasan akhir
  }
  reset() { this.t = -1e9; this.ema = null; this.last = null; this.history = []; }

  /** Dipanggil tiap frame; bekerja hanya tiap EVERY_MS. Mengembalikan hasil terhaluskan { ok, covered, extraR, conf } atau null. */
  sample(video, lm, now) {
    if (now - this.t < EVERY_MS) return this.view();
    this.t = now;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh || !lm) return this.view();
    const s = Math.min(1, MAX_W / vw), w = Math.round(vw * s), h = Math.round(vh * s);
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    let r = null;
    try {
      this.cx.drawImage(video, 0, 0, w, h);
      const d = this.cx.getImageData(0, 0, w, h);
      r = detectHairline({ data: d.data, w, h }, lm);
    } catch {
      r = null;
    }
    this.last = r;
    if (r?.ok && !r.covered && r.conf >= 0.5) {
      this.history.push(r.extraR);
      if (this.history.length > 60) this.history.shift();
      this.ema = this.ema ? { extraR: this.ema.extraR + 0.25 * (r.extraR - this.ema.extraR), conf: this.ema.conf + 0.25 * (r.conf - this.ema.conf) } : { extraR: r.extraR, conf: r.conf };
    } else if (r?.covered) this.ema = null;
    else if (this.ema) this.ema = { ...this.ema, conf: this.ema.conf * 0.9 }; // gagal sesaat: kepercayaan turun perlahan, titik tidak langsung hilang
    return this.view();
  }

  view() {
    if (this.last?.covered) return { ok: true, covered: true, conf: 0.2, extraR: 0 };
    return this.ema ? { ok: true, covered: false, conf: this.ema.conf, extraR: this.ema.extraR } : null;
  }

  /** Median riwayat terukur → dipakai di hasil akhir scan; null bila terlalu sedikit pengukuran. */
  summary() {
    if (this.history.length < 8) return null;
    const s = [...this.history].sort((a, b) => a - b);
    return { extraR: s[s.length >> 1], conf: Math.min(1, 0.4 + this.history.length / 60 * 0.5) };
  }
}
