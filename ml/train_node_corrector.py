#!/usr/bin/env python3
"""
Melatih "node corrector": regresi ridge kecil yang memperbaiki bias sumbu KEDALAMAN (z) dari dua node wajah
yang paling tidak pasti pada kamera RGB tunggal — z pupil dan z punggung hidung — dari fitur geometri wajah.

Mengapa Python di sini dan bukan di browser?
  Python tidak bisa berjalan per-frame di browser. Perannya: LATIH sekali (offline, di data berlabel),
  EKSPOR bobot ke JSON, lalu `frontend/src/ar/nodeCorrector.js` menjalankan inferensinya (perkalian matriks kecil,
  <0,01 ms) di dalam PoseEngine. Alur: data berlabel -> train_node_corrector.py -> nodeCorrector.json -> browser.

Data berlabel (CSV, satu baris per orang/pose) — label HARUS dari sumber yang lebih akurat dari kamera RGB,
mis. pemindai 3D / TrueDepth / pengukuran optometris:
  fitur (dari PoseEngine, `engine.corrFeatures`):
    pd_mm, face_mm, ridge_top_dy, ridge_top_dz, ridge_mid_dz, ridge_low_dz, brow_dy      (cm untuk *_dy / *_dz)
  label (selisih kebenaran - taksiran kamera, cm):
    y_pupil_dz, y_ridge_dz

Pemakaian:
  python3 ml/train_node_corrector.py --csv data_berlabel.csv --out frontend/src/data/nodeCorrector.json
  python3 ml/train_node_corrector.py --demo     # data SINTETIS: hanya membuktikan alur & paritas JS<->Python

PENTING: model dari --demo ditandai `kind: "synthetic"` dan TIDAK dipakai PoseEngine (diabaikan otomatis).
"""
import argparse, csv, json, sys
import numpy as np

FEATURES = ["pd_mm", "face_mm", "ridge_top_dy", "ridge_top_dz", "ridge_mid_dz", "ridge_low_dz", "brow_dy"]
TARGETS = ["y_pupil_dz", "y_ridge_dz"]


def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        sys.exit("CSV kosong")
    X = np.array([[float(r[k]) for k in FEATURES] for r in rows])
    Y = np.array([[float(r[k]) for k in TARGETS] for r in rows])
    return X, Y


def demo_data(n=400, seed=1):
    """Data sintetis: bias z bergantung linear pada geometri + noise. Hanya untuk menguji alur."""
    rng = np.random.default_rng(seed)
    X = np.column_stack([
        rng.normal(63, 3.5, n), rng.normal(140, 7, n), rng.normal(1.1, .2, n),
        rng.normal(-.6, .25, n), rng.normal(-.2, .2, n), rng.normal(.3, .2, n), rng.normal(1.6, .3, n),
    ])
    Y = np.column_stack([
        0.04 * (X[:, 0] - 63) / 3.5 - 0.10 * X[:, 3] + rng.normal(0, .03, n),
        0.05 * (X[:, 1] - 140) / 7 + 0.12 * X[:, 4] + rng.normal(0, .03, n),
    ])
    return X, Y


def ridge_fit(X, Y, lam):
    mu, sd = X.mean(0), X.std(0) + 1e-9
    Z = (X - mu) / sd
    ym = Y.mean(0)
    A = Z.T @ Z + lam * np.eye(Z.shape[1])
    W = np.linalg.solve(A, Z.T @ (Y - ym))
    return mu, sd, W, ym


def predict(model, X):
    mu, sd, W, b = model
    return ((X - mu) / sd) @ W + b


def cross_validate(X, Y, lam, k=5, seed=0):
    idx = np.random.default_rng(seed).permutation(len(X))
    folds = np.array_split(idx, k)
    err = []
    for i in range(k):
        te = folds[i]
        tr = np.concatenate([folds[j] for j in range(k) if j != i])
        m = ridge_fit(X[tr], Y[tr], lam)
        err.append(predict(m, X[te]) - Y[te])
    e = np.vstack(err)
    return np.sqrt((e ** 2).mean(0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv")
    ap.add_argument("--demo", action="store_true")
    ap.add_argument("--out", default="frontend/src/data/nodeCorrector.json")
    ap.add_argument("--min-rows", type=int, default=150, help="data nyata kurang dari ini ditolak (terlalu sedikit untuk 7 fitur)")
    a = ap.parse_args()
    if a.demo == bool(a.csv):
        ap.error("pilih salah satu: --csv FILE atau --demo")
    X, Y = demo_data() if a.demo else load_csv(a.csv)
    if not a.demo and len(X) < a.min_rows:
        sys.exit(f"Hanya {len(X)} baris; minimal {a.min_rows}. Model tidak dilatih (akan overfit).")

    lams = [0.1, 1, 3, 10, 30, 100]
    scores = {lam: cross_validate(X, Y, lam) for lam in lams}
    lam = min(lams, key=lambda l: scores[l].sum())
    baseline = np.sqrt(((Y - 0) ** 2).mean(0))  # tanpa koreksi: galat = label itu sendiri
    cv = scores[lam]
    mu, sd, W, b = ridge_fit(X, Y, lam)
    model = {
        "version": 1,
        "kind": "synthetic" if a.demo else "real",
        "features": FEATURES,
        "targets": TARGETS,
        "mean": mu.tolist(), "std": sd.tolist(), "W": W.tolist(), "b": b.tolist(),
        "clamp_cm": 0.5,  # koreksi dibatasi supaya model salah tidak merusak penempatan
        "metrics": {"n": int(len(X)), "lambda": lam, "cv_rmse_cm": cv.tolist(), "baseline_rmse_cm": baseline.tolist()},
        # vektor emas untuk uji paritas JS <-> Python
        "golden": {"x": X[0].tolist(), "y": predict((mu, sd, W, b), X[:1])[0].tolist()},
    }
    json.dump(model, open(a.out, "w"), indent=1)
    print(f"{model['kind']}: n={len(X)} lambda={lam}")
    print("RMSE tanpa koreksi (cm):", np.round(baseline, 3), "-> CV 5-lipat:", np.round(cv, 3))
    improved = bool((cv < baseline * 0.9).all())
    print("Model memperbaiki >10% pada kedua target:", improved)
    if not a.demo and not improved:
        print("PERINGATAN: koreksi tidak terbukti membantu pada validasi silang; jangan diaktifkan.")
    print("Ditulis:", a.out)


if __name__ == "__main__":
    main()
