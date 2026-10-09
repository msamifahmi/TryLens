import { OneEuroVec, OneEuroQuat } from "./oneEuro.js";
import {
  FOV_DEG, BRIDGE_IDX, bridgeDelta, canonCentroid, decomposeMatrix, estimateScale, measureFrontal, median, poseAngles, reconstructFrontal
} from "./faceMetrics.js";
import { assessQuality } from "./quality.js";
import { MagnetQuat, MagnetVec, MAGNET_POS, MAGNET_ROT } from "./magnet.js";
import { NODE_LEN, centroidWorld, nodeLocals, nodeOrigin } from "./faceNodes.js";
import { featuresOf, makeCorrector } from "./nodeCorrector.js";
import { StableTracker, matToQuat } from "./stable.js";
import { quatToMat } from "./rigid.js";
import { EYE_LEN, describeFit, eyeTargets, packEyeTargets, placeOnEyes, unpackEyeTargets } from "./eyeFit.js";

// Penghalusan (satuan: cm/s untuk posisi, rad/s untuk rotasi). Naikkan beta bila terasa tertinggal,
// turunkan minCutoff bila masih bergetar saat diam.
const POS = { minCutoff: 0.8, beta: 0.3, dCutoff: 1 };
const ROT = { minCutoff: 1.2, beta: 4, dCutoff: 1 };
const BUF = 45; // jumlah frame untuk median kalibrasi
const MIN_CALIB = 12; // frame valid minimum sebelum skala dipakai
const RELOCK = { frac: 0.08, frames: 10, spread: 0.03, cooldown: 90 }; // ukuran berubah >8% selama 10 frame yang STABIL (sebaran <3%), dan ≥90 frame sejak kalibrasi ulang terakhir
const K_STEP = 0.006; // laju maksimum perubahan ukuran per frame (0,6%) — mencegah ukuran "berdenyut"; 2% sesaat setelah kalibrasi ulang
const PAIR_SPREAD = 0.06; // taksiran skala antar-pasangan landmark harus sepakat (<6%); selisih besar = ada landmark tertutup (rambut, tangan)
const CU_GATE = 0.12; // cm: batas selisih offset titik-asal yang masih dianggap konsisten
const NODE_OUTLIER = 1.5; // satuan matriks (cm): suara node yang menyimpang jauh dari matriks pose diabaikan
const K_RANGE = [0.8, 1.25];
const EYE_DEV = 0.15; // cm: pupil menyimpang >1,5 mm dari median kalibrasi → bukan frame kalibrasi
const ANCHOR_W = [0, 0.8, 0.6]; // bobot koreksi titik tempel (x,y,z) — z (kedalaman) kurang pasti
const ANCHOR_CLAMP = 0.7; // cm

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const push = (buf, v) => {
  buf.push(v);
  if (buf.length > BUF) buf.shift();
};

/**
 * Mesin presisi AR. Masukan: hasil FaceLandmarker (landmark, matriks pose, blendshape).
 * Keluaran per frame: pose kepala yang sudah dihaluskan dan dikoreksi ke ukuran asli, status kalibrasi,
 * kualitas frame, dan ukuran wajah dalam mm.
 *
 * Yang dilakukan (bukan model baru, tapi pemrosesan di atas jaringan saraf MediaPipe):
 *  - One Euro Filter pada posisi & rotasi (anti-getar tanpa lag).
 *  - Kalibrasi skala pengguna dari diameter iris (11,7 mm) dengan median bergulir.
 *  - Fitting berbasis pupil: pusat lensa model (LeftLensCenter/RightLensCenter) dikunci ke pupil, kedalaman dari hidung.
 *  - Gerbang kualitas: pose, kedipan, cahaya, jarak, kecepatan gerak.
 */
export class PoseEngine {
  constructor(canon, { mode = "tryon", tracker = "magnet", corrector = null, faces = null } = {}) {
    this.faces = faces;
    this.corrector = makeCorrector(corrector);
    this.canon = canon;
    this.mode = mode;
    this.tracker = tracker;
    this.c0 = canonCentroid(canon);
    this.model = null; // spesifikasi aset aktif (ar/rigSpec.js) atau null = model tanpa rig
    this.userScale = 1;
    this.pos = tracker === "magnet" ? new MagnetVec(3, MAGNET_POS) : new OneEuroVec(3, POS);
    this.rot = tracker === "magnet" ? new MagnetQuat(MAGNET_ROT) : new OneEuroQuat(ROT);
    this.stab = tracker === "stable" ? new StableTracker(canon, faces || [], {}) : null;
    this.reset();
  }

  reset() {
    this.stab?.reset();
    this.pos.reset();
    this.rot.reset();
    this.kBuf = [];
    this.dyBuf = [];
    this.dzBuf = [];
    this.pdBuf = [];
    this.mmBuf = [];
    this.tBuf = Array.from({ length: EYE_LEN }, () => []);
    this.nodeBuf = Array.from({ length: NODE_LEN }, () => []);
    this.recent = [];
    this.cuBuf = [[], [], []];
    this.cuRej = 0;
    this.eyeRej = 0;
    this.nodeMed = null;
    this.cuMed = null;
    this.justRelocked = false;
    this.kRun = 0;
    this.mCal = null;
    this.since = RELOCK.cooldown + 1; // kalibrasi ulang pertama boleh langsung; jeda berlaku sesudah kalibrasi ulang
    this.kFast = 0;
    this.nodeInfo = null;
    this.nodeSpread = null;
    this.fitSm = null;
    this.kSm = 1;
    this.wasCalibrated = false;
    this.miss = 0;
    this.tracked = false;
  }

  /** Kedalaman centroid wajah (bukan titik asal kepala) — skala dunia yang konsisten untuk posisi node. */
  depthC(T, R) {
    const c = this.c0;
    return Math.max(10, -(T[2] + R[2][0] * c[0] + R[2][1] * c[1] + R[2][2] * c[2]));
  }

  pushCalib(pk) {
    push(this.kBuf, pk.k);
    push(this.dyBuf, pk.d[1]);
    push(this.dzBuf, pk.d[2]);
    pk.eye.forEach((v, i) => push(this.tBuf[i], v));
    pk.nodes.forEach((v, i) => push(this.nodeBuf[i], v));
    // Offset titik-asal hanya diperbarui oleh frame yang sepakat dengan median; selisih sesaat antara matriks pose dan
    // landmark (lag/goyang solver) justru sinyal yang dikoreksi node, jangan sampai ikut "dipelajari".
    const dcu = this.cuMed ? Math.hypot(pk.cu[0] - this.cuMed[0], pk.cu[1] - this.cuMed[1]) : 0;
    if (dcu < CU_GATE || this.cuRej >= BUF) {
      if (dcu >= CU_GATE) this.cuBuf = [[], [], []];
      this.cuRej = 0;
      pk.cu.forEach((v, i) => push(this.cuBuf[i], v));
    } else this.cuRej++;
    if (pk.ms) {
      push(this.pdBuf, pk.ms.pd);
      push(this.mmBuf, pk.ms.mm);
    }
    if (this.kBuf.length >= MIN_CALIB) {
      this.nodeMed = this.nodeBuf.map(median);
      this.cuMed = this.cuBuf.map(median);
    }
  }

  /** Buang riwayat kalibrasi; mulai ulang dari frame-frame terbaru (dilipat dua supaya langsung dianggap terkalibrasi). */
  relock() {
    const rec = this.recent.slice();
    this.kBuf = []; this.dyBuf = []; this.dzBuf = []; this.pdBuf = []; this.mmBuf = [];
    this.tBuf = Array.from({ length: EYE_LEN }, () => []);
    this.nodeBuf = Array.from({ length: NODE_LEN }, () => []);
    this.cuBuf = [[], [], []];
    this.nodeMed = null;
    for (let r = 0; r < 2; r++) rec.forEach((pk) => this.pushCalib(pk));
    this.kRun = 0;
    this.fitSm = null;
    this.justRelocked = true;
    this.since = 0;
    this.kFast = 20;
    this.relocks = (this.relocks || 0) + 1;
  }

  /** Model aktif: hasil specFromNodes (cm) atau null (model lama tanpa rig → penempatan cadangan). */
  setModel(spec) {
    this.model = spec;
    this.fitSm = null;
  }

  /** Slider ukuran pengguna (1 = ukuran asli). Penempatan dihitung ulang supaya pupil tetap di pusat lensa. */
  setUserScale(s) {
    if (s !== this.userScale) this.fitSm = null;
    this.userScale = s;
  }

  /** Kunci pusat lensa ke pupil, kedalaman dari hidung, lalu laporan kecocokan. */
  computeFit(k) {
    const spec = this.model;
    if (!spec || this.tBuf[0].length < MIN_CALIB) return null;
    const tg = unpackEyeTargets(this.tBuf.map(median)); // cm sejati, berpusat di centroid landmark
    if (this.corrector && this.pdBuf.length && this.mmBuf.length) {
      // Koreksi bias kedalaman hasil pelatihan offline (Python → JSON). Tidak aktif tanpa model "real".
      const [dzP, dzR] = this.corrector.predict(featuresOf(tg, median(this.pdBuf), median(this.mmBuf)));
      tg.pR[2] += dzP; tg.pL[2] += dzP;
      tg.ridge = tg.ridge.map(([y, z]) => [y, z + dzR]);
    }
    const r = placeOnEyes({ spec, tg, k, c0: this.c0, userScale: this.userScale });
    const f0 = this.fitSm;
    const A = 0.5;
    const f = (this.fitSm = f0
      ? { p: r.position.map((v, i) => f0.p[i] + A * (v - f0.p[i])), roll: f0.roll + A * (r.roll - f0.roll) }
      : { p: r.position, roll: r.roll });
    const faceMm = this.mmBuf.length ? median(this.mmBuf) : null;
    return {
      fit: { position: f.p, roll: f.roll, contact: r.contact, rollClamped: r.rollClamped, noseBlocked: r.noseBlocked },
      report: describeFit({ frameMm: spec.frameWidthMm * this.userScale, faceMm, fit: r, estimated: !!spec.estimated })
    };
  }

  /** Atur latensi tampil (detik) yang dikompensasi dengan ekstrapolasi. */
  setLatency(sec) {
    const v = clamp(sec, 0, 0.08);
    if (this.pos.o) this.pos.o.lead = v;
    if (this.rot.o) this.rot.o.lead = v;
  }

  /**
   * Pose untuk waktu render `nowMs` (dipanggil tiap rAF, di antara dua deteksi). Tanpa ini model "diam" sampai
   * deteksi berikutnya lalu melompat — terlihat sebagai tersendat/lag. null bila belum ada pelacakan.
   */
  predict(nowMs) {
    if (this.tracker === "stable") {
      if (!this.tracked || !this.stab?.ready) return null;
      const since = clamp((nowMs - this.lastNow) / 1000, 0, 0.08);
      const at = this.stab.at(this.stab.o.lead + since);
      return this.stabPose(at.A, at.q);
    }
    if (this.tracker !== "magnet" || !this.tracked || !this.pos.x || !this.rot.q) return null;
    const since = clamp((nowMs - this.lastNow) / 1000, 0, 0.08);
    return { position: this.pos.at(this.pos.o.lead + since), quaternion: this.rot.at(this.rot.o.lead + since) };
  }

  /** Pose kepala dunia (titik asal kepala) dari pivot A dan quaternion q: T = A − k·R·a. */
  stabPose(A, q) {
    const R = quatToMat(q), a = this.stab.a, k = this.stab.k;
    const position = [0, 1, 2].map((r) => A[r] - k * (R[r][0] * a[0] + R[r][1] * a[1] + R[r][2] * a[2]));
    return { position, quaternion: q };
  }

  resetTracking() {
    this.stab?.reset();
    this.pos.reset();
    this.rot.reset();
    this.tracked = false;
  }

  update(res, W, H, nowMs, luma = null) {
    const lm = res?.faceLandmarks?.[0];
    const mat = res?.facialTransformationMatrixes?.[0];
    if (!lm || (!mat && this.tracker !== "stable")) {
      if (++this.miss > 6 && this.tracked) this.resetTracking();
      return this.snapshot(null);
    }
    this.miss = 0;
    const t = nowMs / 1000;
    this.lastNow = nowMs;
    let T, R, q, sm = null;
    const fpx = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
    if (this.tracker === "stable") {
      // Pose dari PnP robust ±250 landmark kaku (stable.js); matriks MediaPipe hanya tebakan awal.
      const st = this.stab;
      st.fpx = fpx;
      st.setScale(this.kSm);
      let prior = null;
      if (mat) { const d = decomposeMatrix(mat.data); prior = { R: d.R, T: d.t }; }
      else if (!st.R) {
        const spanPx = Math.hypot((lm[454].x - lm[234].x) * W, (lm[454].y - lm[234].y) * H) || 1;
        const D = (fpx * 14.5 * this.kSm) / spanPx;
        prior = { R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], T: [(lm[6].x - 0.5) * W * D / fpx / this.kSm, -(lm[6].y - 0.5) * H * D / fpx / this.kSm, -D / this.kSm] };
      }
      sm = st.measure(lm, W, H, fpx, prior);
      if (!sm.ok) {
        st.filter(sm, t, 50);
        if (++this.miss > 6 && this.tracked) this.resetTracking();
        return this.snapshot(null);
      }
      const k0 = st.k, a = st.a;
      R = sm.R;
      T = [0, 1, 2].map((r) => (sm.A[r] - k0 * (R[r][0] * a[0] + R[r][1] * a[1] + R[r][2] * a[2])) / k0);
      q = matToQuat(R);
    } else ({ t: T, R, q } = decomposeMatrix(mat.data));
    const angles = poseAngles(R);

    const cats = res.faceBlendshapes?.[0]?.categories;
    const bs = (name) => cats?.find((c) => c.categoryName === name)?.score ?? 0;
    const blinkL = bs("eyeBlinkLeft"), blinkR = bs("eyeBlinkRight"); // kiri/kanan subjek = pupil 473 / 468
    const blink = Math.max(blinkL, blinkR) > 0.3; // kedipan ATAU satu mata dipejamkan → bukan frame kalibrasi
    this.since++;

    const px = (a, b) => Math.hypot((lm[a].x - lm[b].x) * W, (lm[a].y - lm[b].y) * H);
    const span = px(234, 454) / W;
    const irisPx = lm.length >= 478 ? (px(469, 471) + px(470, 472) + px(474, 476) + px(475, 477)) / 4 : 99;
    const nose = lm[1];
    const quality = assessQuality({
      angles, span, irisPx, center: [nose.x, nose.y], luma, speed: this.rot.speed, mode: this.mode
    });

    // Rekonstruksi 3D → skala sebenarnya dari iris. Hanya frame yang layak dipakai untuk kalibrasi.
    let frame = null;
    if (lm.length >= 478) {
      const D0 = Math.max(10, -T[2]);
      const F = reconstructFrontal(lm, W, H, R, D0);
      const est = estimateScale(F, this.canon);
      const calibOK =
        est && !blink && (this.tracker !== "stable" || this.stab.clean) && est.iris.asym < 0.25 && irisPx >= 8 &&
        (Math.max(...est.pairs) - Math.min(...est.pairs)) / median(est.pairs) < PAIR_SPREAD &&
        Math.abs(angles.yaw) < 30 && Math.abs(angles.pitch) < 22 && Math.abs(angles.roll) < 25 &&
        est.k > 0.7 && est.k < 1.4;
      if (calibOK) {
        this.mCal = this.mCal ? this.mCal * 0.9 + est.m * 0.1 : est.m;
        const f = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
        const cw = centroidWorld(lm, W, H, this.depthC(T, R), f);
        const dv = [cw[0] - T[0], cw[1] - T[1], cw[2] - T[2]];
        const pack = {
          k: est.k,
          d: bridgeDelta(F, this.canon, est.m, est.k),
          eye: packEyeTargets(eyeTargets(F, est.m)),
          nodes: nodeLocals(F, est.m),
          cu: [0, 1, 2].map((a) => R[0][a] * dv[0] + R[1][a] * dv[1] + R[2][a] * dv[2]), // offset centroid dari titik asal, ruang kepala
          ms: measureFrontal(F, est.m)
        };
        // Frame yang pupilnya menyimpang dari median kalibrasi (kelopak menutup, lirikan, mata terhalang) tidak ikut kalibrasi.
        let skipCal = false;
        if (this.tracker === "stable" && this.kBuf.length >= MIN_CALIB) {
          const med = this.tBuf.slice(0, 6).map(median);
          const dev = Math.max(...pack.eye.slice(0, 6).map((v, j) => Math.abs(v - med[j])));
          if (dev > EYE_DEV && this.eyeRej < 60) { this.eyeRej++; skipCal = true; } else this.eyeRej = 0;
        }
        if (!skipCal) {
        // Kalibrasi ulang cepat: ukuran wajah menyimpang konsisten dari median → buang riwayat lama.
        this.recent.push(pack);
        if (this.recent.length > RELOCK.frames) this.recent.shift();
        if (this.kBuf.length >= MIN_CALIB && this.recent.length === RELOCK.frames) {
          const kb = median(this.kBuf), ks = this.recent.map((r) => r.k), kr = median(ks);
          const stable = (Math.max(...ks) - Math.min(...ks)) / kr < RELOCK.spread; // sebaran besar = landmark goyah, bukan wajah lain
          this.kRun = stable && Math.abs(kr - kb) / kb > RELOCK.frac ? this.kRun + 1 : 0;
          if (this.kRun >= RELOCK.frames && this.since > RELOCK.cooldown) this.relock();
        }
        this.pushCalib(pack);
        }
        if (pack.ms) frame = pack.ms;
      }
    }

    const calibrated = this.kBuf.length >= MIN_CALIB;
    const kTarget = calibrated ? clamp(median(this.kBuf), K_RANGE[0], K_RANGE[1]) : 1;
    // Saat kalibrasi pertama selesai, langsung pakai nilainya (UI menahan model sampai saat itu); setelahnya diperhalus.
    if (!this.tracked || (calibrated && !this.wasCalibrated)) this.kSm = kTarget;
    else {
      const lim = (this.kFast > 0 ? 0.02 : K_STEP) * this.kSm;
      this.kSm += clamp(0.25 * (kTarget - this.kSm), -lim, lim);
    }
    if (this.kFast > 0) this.kFast--;
    this.justRelocked = false;
    this.wasCalibrated = calibrated;
    const k = this.kSm;

    // Posisi sebenarnya = translasi matriks × k (sepanjang sinar kamera, jadi proyeksi di layar tidak berubah).
    // Jalur cepat: tiap node wajah memilih posisi kepala x,y langsung dari landmark frame ini (pupil paling berat).
    let tx = T[0], ty = T[1];
    this.nodeSpread = null;
    this.nodeInfo = null;
    if (this.tracker === "magnet" && this.nodeMed && this.mCal && lm.length >= 478 && Math.abs(angles.yaw) < 45) {
      const f = H / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
      // Node yang tidak punya pasangan dikeluarkan: mata dipejamkan (iris tak valid), pelipis saat menoleh (sisi jauh
      // tertutup kepala/rambut), dan node apa pun yang offset lokalnya menyimpang dari kalibrasi.
      const skip = new Set();
      if (blinkL > 0.25) skip.add("pupilL");
      if (blinkR > 0.25) skip.add("pupilR");
      // Pelipis memudar mulus (bukan putus) antara |yaw| 14° → 24°: node masuk/keluar mendadak menggeser hasil voting.
      const fade = clamp((24 - Math.abs(angles.yaw)) / 10, 0, 1);
      const wscale = { templeL: fade, templeR: fade };
      if (fade <= 0) { skip.add("templeL"); skip.add("templeR"); }
      const Fm = reconstructFrontal(lm, W, H, R, Math.max(10, -T[2]));
      const r = nodeOrigin({ lm, W, H, R, D0: this.depthC(T, R), f, locals: this.nodeMed, inst: nodeLocals(Fm, this.mCal), k: this.kSm, c0: this.cuMed, skip, wscale });
      this.nodeInfo = { used: r.used, dropped: r.dropped };
      if (r.origin && Math.hypot(r.origin[0] - T[0], r.origin[1] - T[1]) < NODE_OUTLIER) {
        tx = r.origin[0];
        ty = r.origin[1];
        this.nodeSpread = r.spread;
      }
    }
    if (this.tracker === "stable") {
      this.stab.setScale(k);
      this.stab.filter(sm, t, -sm.A[2]);
      const sp = this.stabPose(...(() => { const a = this.stab.at(this.stab.o.lead); return [a.A, a.q]; })());
      this.tracked = true;
      return this.snapshot({ p: sp.position, q: sp.quaternion, k, angles, quality, calibrated, frame });
    }
    const p = this.pos.filter([tx * k, ty * k, T[2] * k], t);
    const qf = this.rot.filter(q, t);
    this.tracked = true;
    return this.snapshot({ p, q: qf, k, angles, quality, calibrated, frame });
  }

  snapshot(s) {
    const n = this.kBuf.length;
    const common = {
      calibrated: n >= MIN_CALIB,
      calibProgress: Math.min(1, n / MIN_CALIB),
      pdMm: this.pdBuf.length ? median(this.pdBuf) : null,
      faceMm: this.mmBuf.length ? median(this.mmBuf) : null
    };
    if (!s) return { tracked: false, ...common, quality: null, scale: this.kSm, anchorDelta: [0, 0, 0] };
    const dy = this.dyBuf.length >= MIN_CALIB ? clamp(median(this.dyBuf) * ANCHOR_W[1], -ANCHOR_CLAMP, ANCHOR_CLAMP) : 0;
    const dz = this.dzBuf.length >= MIN_CALIB ? clamp(median(this.dzBuf) * ANCHOR_W[2], -ANCHOR_CLAMP, ANCHOR_CLAMP) : 0;
    const pf = this.computeFit(s.k);
    if (this.stab && pf?.fit) this.stab.setPivot(pf.fit.position, s.k);
    return {
      tracked: true,
      fit: pf?.fit ?? null,
      report: pf?.report ?? null,
      position: s.p,
      quaternion: s.q,
      scale: s.k,
      anchorDelta: [0, dy, dz],
      angles: s.angles,
      quality: s.quality,
      frame: s.frame,
      rotSpeed: this.rot.speed,
      magnet: { tracker: this.tracker, spread: this.nodeSpread, nodes: this.nodeInfo, gain: this.pos.gain ?? null, relocks: this.relocks || 0 },
      ...common
    };
  }
}
export { BRIDGE_IDX };
