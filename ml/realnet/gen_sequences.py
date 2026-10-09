#!/usr/bin/env python3
"""
Bangkitkan urutan landmark wajah dari JARINGAN SARAF MEDIAPIPE ASLI (face_landmark + iris_landmark, TFLite)
untuk menguji pelacak kacamata TANPA kamera.

Bagaimana:
  1. Satu foto wajah nyata ditaruh di kanvas 960x540 (seperti bingkai webcam).
  2. Tiap frame foto digeser/diputar/diskalakan dengan transformasi YANG DIKETAHUI (kebenaran dasar), diberi derau sensor
     + kompresi JPEG, lalu dijalankan melalui jaringan landmark asli, meniru pelacakan ROI MediaPipe (ROI frame berikutnya
     dihitung dari landmark frame sebelumnya, jadi derau jaringan ikut berputar balik seperti di aplikasi sungguhan).
  3. Hasil (478 landmark/frame, koordinat ternormalisasi seperti keluaran Face Landmarker) disimpan sebagai float32 + JSON.
Skenario: diam, mengangguk+miring, geser pelan, lompat, mata kiri dipejamkan (diinpaint), poni menutup alis.

Keterbatasan (jujur): gerak hanya DALAM BIDANG gambar (geser/putar-roll/skala), tidak ada yoo/pitch sungguhan; derau
sensor disimulasikan (Gaussian + JPEG), bukan dari kamera nyata. Tetapi derau JARINGAN-nya asli.

Pemakaian:  python3 -I gen_sequences.py --models DIR --image FOTO.jpg --out DIR
  DIR models berisi face_landmark.tflite & iris_landmark.tflite (lihat fetch_models.sh).
"""
import argparse, json, math, os, sys
import numpy as np, cv2
from ai_edge_litert.interpreter import Interpreter

W, H, FPS, N = 960, 540, 30, 330

def load_model(path):
    it = Interpreter(model_path=path, num_threads=4)
    it.allocate_tensors()
    return it, it.get_input_details()[0]["index"], [d["index"] for d in it.get_output_details()], it.get_output_details()

class Net:
    def __init__(self, mdir):
        self.face = load_model(os.path.join(mdir, "face_landmark.tflite"))
        self.iris = load_model(os.path.join(mdir, "iris_landmark.tflite"))

    @staticmethod
    def crop(img, c, size, theta, out):
        """Potong persegi `size` px berpusat di c, diputar theta (rad, searah sumbu-x gambar), jadi out x out."""
        s = size / out
        ct, st = math.cos(theta), math.sin(theta)
        # crop (u,v) -> image: c + R(theta) @ ((u,v) - out/2) * s
        M = np.array([[ct * s, -st * s, c[0] - (ct * s * out / 2) + (st * s * out / 2)],
                      [st * s,  ct * s, c[1] - (st * s * out / 2) - (ct * s * out / 2)]], np.float64)
        patch = cv2.warpAffine(img, M, (out, out), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        return patch, M

    @staticmethod
    def to_img(M_inv_forward, pts):
        """Petakan titik crop (N,2) -> gambar. M adalah transformasi crop->gambar (2x3)."""
        return pts @ M_inv_forward[:, :2].T + M_inv_forward[:, 2]

    def run_face(self, img, c, size, theta):
        patch, _ = self.crop(img, c, size, theta, 192)
        # `crop` memakai WARP_INVERSE_MAP: M memetakan out->image. Kita butuh M itu untuk memetakan balik.
        ct, st = math.cos(theta), math.sin(theta); s = size / 192
        A = np.array([[ct * s, -st * s], [st * s, ct * s]])
        b = np.array(c) - A @ np.array([96.0, 96.0])
        it, inp, outs, od = self.face
        x = (patch.astype(np.float32) / 255.0)[None]
        it.set_tensor(inp, x); it.invoke()
        lm = it.get_tensor(od[0]["index"]).reshape(468, 3)
        xy = lm[:, :2] @ A.T + b
        z = lm[:, 2] * s
        return np.concatenate([xy, z[:, None]], 1)

    def run_iris(self, img, corners, flip):
        (ax, ay), (bx, by) = corners  # sudut mata kiri-ke-kanan di gambar
        c = ((ax + bx) / 2, (ay + by) / 2)
        theta = math.atan2(by - ay, bx - ax)
        size = 2.3 * max(abs(bx - ax), abs(by - ay), 1.0)
        patch, _ = self.crop(img, c, size, theta, 64)
        if flip: patch = patch[:, ::-1]
        ct, st = math.cos(theta), math.sin(theta); s = size / 64
        A = np.array([[ct * s, -st * s], [st * s, ct * s]]); b = np.array(c) - A @ np.array([32.0, 32.0])
        it, inp, outs, od = self.iris
        it.set_tensor(inp, (patch.astype(np.float32) / 255.0)[None]); it.invoke()
        iris = it.get_tensor(od[1]["index"]).reshape(5, 3).copy()
        if flip: iris[:, 0] = 64 - iris[:, 0]
        xy = iris[:, :2] @ A.T + b
        return np.concatenate([xy, (iris[:, 2] * s)[:, None]], 1)

    def landmarks(self, img, roi):
        c, size, theta = roi
        face = self.run_face(img, c, size, theta)
        # iris: mata kanan subjek = kiri di gambar (33 luar,133 dalam); mata kiri subjek = kanan di gambar (362 dalam,263 luar)
        r = self.run_iris(img, (face[33, :2], face[133, :2]), flip=False)
        l = self.run_iris(img, (face[362, :2], face[263, :2]), flip=True)
        return np.concatenate([face, r, l], 0)  # 468 + 5 + 5

def roi_from(lm):
    xy = lm[:468, :2]
    mn, mx = xy.min(0), xy.max(0)
    c = (mn + mx) / 2
    size = 1.5 * max(mx[0] - mn[0], mx[1] - mn[1])
    theta = math.atan2(lm[263, 1] - lm[33, 1], lm[263, 0] - lm[33, 0])
    return (tuple(c), size, theta)

EYE_L = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]

def base_canvas(path):
    im = cv2.imread(path)
    h0, w0 = im.shape[:2]
    # potong 16:9 dari bagian atas foto (kepala + bahu), lalu skala ke kanvas
    ch = int(w0 * 9 / 16)
    im = im[0:ch, 0:w0]
    return cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA)

def transform(img, t, c0):
    s, th, dx, dy = t
    ct, st = math.cos(th) * s, math.sin(th) * s
    M = np.array([[ct, -st, c0[0] - (ct * c0[0] - st * c0[1]) + dx], [st, ct, c0[1] - (st * c0[0] + ct * c0[1]) + dy]], np.float64)
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE), M

def sensor(img, rng, sigma=3.0):
    f = img.astype(np.float32)
    f *= 1.0 + rng.normal(0, 0.004)  # kedip pencahayaan
    f += rng.normal(0, sigma, f.shape).astype(np.float32)
    f = np.clip(f, 0, 255).astype(np.uint8)
    ok, enc = cv2.imencode(".jpg", f, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return cv2.imdecode(enc, cv2.IMREAD_COLOR)

def wink(img, B):
    """Mata kiri subjek dipejamkan: area mata diinpaint dengan kulit sekitarnya."""
    pts = B[EYE_L, :2].astype(np.int32)
    mask = np.zeros(img.shape[:2], np.uint8)
    cv2.fillPoly(mask, [cv2.convexHull(pts)], 255)
    mask = cv2.dilate(mask, np.ones((7, 7), np.uint8))
    out = cv2.inpaint(img, mask, 5, cv2.INPAINT_TELEA)
    # garis bulu mata tipis
    cv2.polylines(out, [B[[263, 249, 390, 373, 374, 380, 381, 382, 362]][:, :2].astype(np.int32)], False, (40, 40, 45), 2)
    return out

def fringe(img, B, rng):
    """Poni/rambut menutup alis dan dahi bawah."""
    L = B[[46, 53, 52, 65, 55, 70, 63, 105, 66, 107]][:, :2]
    R = B[[276, 283, 282, 295, 285, 300, 293, 334, 296, 336]][:, :2]
    ys = np.concatenate([L[:, 1], R[:, 1]]); xs = np.concatenate([L[:, 0], R[:, 0]])
    x0, x1 = xs.min() - 15, xs.max() + 15
    ybrow = ys.max() + 6
    ytop = B[10, 1] + 25
    poly = np.array([[x0, ytop], [x1, ytop], [x1, ybrow - 8], [(x0 + x1) / 2, ybrow + 6], [x0, ybrow - 8]], np.int32)
    out = img.copy()
    layer = out.copy()
    cv2.fillPoly(layer, [poly], (22, 24, 30))
    tex = rng.normal(0, 14, layer.shape).astype(np.float32)
    layer = np.clip(layer.astype(np.float32) + tex, 0, 255).astype(np.uint8)
    m = np.zeros(img.shape[:2], np.uint8); cv2.fillPoly(m, [poly], 255)
    m = cv2.GaussianBlur(m, (9, 9), 0)[..., None] / 255.0
    return (out * (1 - m) + layer * m).astype(np.uint8)

def scenarios():
    """Semua skenario diam 3,5 detik pertama (kalibrasi + pengukuran offset), lalu peristiwa."""
    t = np.arange(N) / FPS
    z = np.zeros(N)
    T0 = 3.5
    sm = lambda u: u * u * (3 - 2 * u)
    sc = {}
    sc["still"] = dict(s=1 + z, th=z, dx=z, dy=z)
    on = np.clip((t - T0) / 0.5, 0, 1) * np.clip((N / FPS - 1 - t) / 0.5, 0, 1)
    nod = lambda a: dict(th=np.deg2rad(5 * a) * np.sin(2 * np.pi * 0.9 * (t - T0)) * on, dx=8 * a * np.sin(2 * np.pi * 0.6 * (t - T0)) * on, dy=18 * a * np.sin(2 * np.pi * 1.2 * (t - T0)) * on)
    sc["nod"] = dict(s=1 + z, **nod(1))
    ramp = np.clip((t - T0) / 3, 0, 1); back = np.clip((t - T0 - 4) / 2.5, 0, 1)
    sc["drift"] = dict(s=1 + 0.10 * (sm(ramp) - sm(back)), th=z, dx=60 * (sm(ramp) - sm(back)), dy=-25 * (sm(ramp) - sm(back)))
    j = np.clip((t - T0 - 0.5) / 0.1, 0, 1)
    sc["jump"] = dict(s=1 + z, th=z, dx=45 * j, dy=-30 * j)
    sc["wink"] = dict(s=1 + z, th=z, dx=z, dy=z, wink=(135, 215))
    sc["fringe"] = dict(s=1 + z, th=z, dx=z, dy=z, fringe=(135, 215))
    sc["wink_nod"] = dict(s=1 + z, **nod(0.7), wink=(135, 215))
    return sc

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", required=True); ap.add_argument("--image", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--only", default=""); ap.add_argument("--sigma", type=float, default=3.0)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    net = Net(a.models)
    base = base_canvas(a.image)
    # ROI awal: iterasi beberapa kali dari tebakan kasar sampai stabil
    roi = ((W * 0.54, H * 0.42), 440.0, 0.0)
    rng = np.random.default_rng(7)
    for _ in range(6):
        B = net.landmarks(base, roi); roi = roi_from(B)
    # Landmark dasar = rata-rata 24 deteksi dengan derau berbeda (kebenaran dasar relatif; derau jaringan merata ke nol)
    acc = []
    for i in range(24):
        B = net.landmarks(sensor(base, rng, a.sigma), roi); roi = roi_from(B); acc.append(B)
    B0 = np.mean(acc, 0)
    c0 = B0[:468, :2].mean(0)
    print("base face width px:", float(np.hypot(*(B0[454, :2] - B0[234, :2]))), "c0", c0)
    scs = scenarios()
    for name, sc in scs.items():
        if a.only and name not in a.only.split(","): continue
        rng = np.random.default_rng(11)
        roi = roi_from(B0)
        out = np.zeros((N, 478, 3), np.float32)
        gt = []
        for i in range(N):
            t = (float(sc["s"][i]), float(sc["th"][i]), float(sc["dx"][i]), float(sc["dy"][i]))
            img = base
            Bt = B0.copy()
            # (Bt hanya dipakai untuk posisi area wink/poni pada frame ini)
            frame, M = transform(base, t, c0)
            Bt[:, :2] = B0[:, :2] @ M[:, :2].T + M[:, 2]
            wk = sc.get("wink"); fr = sc.get("fringe")
            if wk and wk[0] <= i < wk[1]:
                u = min(1, (i - wk[0]) / 3, (wk[1] - i) / 3)
                frame = cv2.addWeighted(frame, 1 - u, wink(frame, Bt), u, 0)
            if fr and fr[0] <= i < fr[1]:
                u = min(1, (i - fr[0]) / 5, (fr[1] - i) / 5)
                frame = cv2.addWeighted(frame, 1 - u, fringe(frame, Bt, rng), u, 0)
            frame = sensor(frame, rng, a.sigma)
            L = net.landmarks(frame, roi)
            roi = roi_from(L)
            out[i, :, 0] = L[:, 0] / W; out[i, :, 1] = L[:, 1] / H; out[i, :, 2] = L[:, 2] / W
            gt.append(t)
        out.tofile(os.path.join(a.out, f"{name}.f32"))
        json.dump(dict(name=name, W=W, H=H, fps=FPS, N=N, c0=list(map(float, c0)), gt=gt, base=(B0 / [W, H, W]).astype(float).tolist() if False else None,
                       baseFile=f"{name}.base.f32"), open(os.path.join(a.out, f"{name}.json"), "w"))
        (B0 / np.array([W, H, W])).astype(np.float32).tofile(os.path.join(a.out, f"{name}.base.f32"))
        print("ok", name, flush=True)

if __name__ == "__main__":
    main()
