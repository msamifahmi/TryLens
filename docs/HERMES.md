# Hermes: mengelola produk TryLens (basis data, tanpa git)

Produk disimpan di **SQLite di server API** (tabel `products` & `merchants`), bukan JSON di repo. Hermes tidak perlu git, PR, atau deploy frontend: ia memanggil API admin, lalu produk tampil di situs dalam ±30 detik.

## Setup sekali
1. Server API sudah berjalan (lihat `docs/DEPLOY-BACKEND.md`) dengan `ADMIN_TOKEN` terisi.
2. Di mesin Hermes (Node ≥ 20): salin satu berkas `backend-node/scripts/tl.mjs` (tanpa dependensi).
3. Set environment:
   ```
   export TRYLENS_API=https://api.try-lens.id
   export TRYLENS_ADMIN_TOKEN=<ADMIN_TOKEN>
   ```

## Perintah
```
node tl.mjs merchants                      # daftar toko & id (m1…m6)
node tl.mjs list [--merchant m1]
node tl.mjs add --name "Aurora Round" --price 249000 --old-price 329000 \
    --style round --color gold --merchant m1 --cat Wanita --stock 12 \
    --desc "Frame round emas" --tokopedia https://tokopedia.com/toko/aurora \
    --lens 52 --bridge 18 --temple 140 \
    --photo main.jpg --photo side.jpg --model model.glb
node tl.mjs set f24 --price 259000 --stock 5        # ubah apa saja; --hide / --publish
node tl.mjs photo f24 0 ./main.jpg                  # ganti foto slot 0–3
node tl.mjs model f24 ./model.glb                   # model 3D (Coba Virtual otomatis aktif)
node tl.mjs rm f24
node tl.mjs export > cadangan.json
```
Pilihan: style = aviator|round|square|cateye|rect|browline · color = brown|black|gold|tort|clear|blue|navy|red · cat = Pria|Wanita|Anak.
ID otomatis (f24, f25, …). Foto harus JPEG ≤ 5 MB; `.glb` ≤ 12 MB. Server menolak data yang tidak valid dengan pesan jelas.

## Kamu (pemilik): edit manual
Buka `https://api.try-lens.id/admin`, masukkan ADMIN_TOKEN. Ubah nama/harga/stok langsung di tabel (tersimpan otomatis), klik **Detail** untuk tautan beli, ukuran, deskripsi, foto, model; **Unduh cadangan** untuk ekspor JSON.

## Prompt siap tempel untuk Hermes
> Kamu mengelola katalog TryLens lewat `node tl.mjs` (env TRYLENS_API dan TRYLENS_ADMIN_TOKEN sudah di-set). Jangan pakai git dan jangan menulis JSON katalog. Untuk produk baru jalankan `node tl.mjs add …` dengan foto JPEG (--photo, utama dulu) dan model (--model) bila ada; cek hasil dengan `node tl.mjs list`. Untuk perubahan harga/nama/stok pakai `node tl.mjs set <id> …`. Jika server menolak data, baca pesan galatnya, perbaiki, ulangi. Laporkan id dan ringkasan tiap produk yang dibuat/diubah. Jangan menghapus (`rm`) tanpa izin eksplisit.

Catatan: foto f2–f29 yang sebelumnya didorong ke cabang `deploy` tidak dipakai lagi; unggah ulang lewat `photo`.
