# TryLens — Virtual Try-On Marketplace

Struktur proyek full-stack untuk TryLens, marketplace kacamata dengan fitur
coba virtual, dibangun dengan **React + Tailwind CSS** di frontend dan dua
pilihan backend: **Node.js/Express** dan **PHP**, agar bisa dijalankan di
lingkungan hosting mana pun.

```
trylens-project/
├── frontend/          React + Vite + Tailwind CSS (UI marketplace)
├── backend-node/      REST API dengan Node.js + Express
└── backend-php/       REST API alternatif dengan PHP native (tanpa framework)
```

## 1. Frontend (React + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173`. Secara default frontend memanggil API di
`http://localhost:4000/api` (Node) — ubah `VITE_API_BASE` di file `.env`
kalau ingin memakai backend PHP (`http://localhost:8000/api`).

Build produksi:

```bash
npm run build
```

## 2. Backend Node.js (Express)

```bash
cd backend-node
npm install
npm run dev
```

Server berjalan di `http://localhost:4000`. Endpoint tersedia:

| Method | Endpoint              | Keterangan                         |
|--------|-----------------------|-------------------------------------|
| GET    | /api/products         | Daftar frame (bisa difilter `?category=` dan/atau `?merchantId=`) |
| GET    | /api/products/:id     | Detail satu frame                   |
| GET    | /api/merchants        | Daftar toko optik partner           |
| GET    | /api/merchants/:id    | Detail satu toko optik              |
| GET    | /api/categories       | Daftar kategori/gaya frame          |
| POST   | /api/wishlist/:userId | Simpan wishlist user (JSON file)    |
| GET    | /api/wishlist/:userId | Ambil wishlist user                 |

### Backend sungguhan (akun, frame, unggahan, katalog publik)

```bash
cd backend-node && npm install
npm run seed          # akun demo (basic@optikkusuma.id, pro@lensakita.id, baru@optikbaru.id · Partner123!)
npm run dev           # http://localhost:4000
cd ../frontend && npm run dev   # Vite meneruskan /api & /media ke backend → satu origin, cookie sesi jalan
```
Tanpa backend, front-end otomatis memakai mode demo (localStorage). Dengan backend: password di-hash (scrypt), sesi di cookie HttpOnly, frame & berkas Mitra tersimpan di SQLite (`backend-node/data/`) dan `backend-node/uploads/`, dan frame terbit tampil di katalog publik, Coba Virtual dan 360°.

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | /api/auth/register · /login · /logout · /password | Akun & sesi (butuh header `X-TryLens: 1`) |
| GET | /api/auth/me | Akun sesi ini (atau `null`) |
| GET/PATCH | /api/partner/me | Data akun (hanya bidang yang boleh diubah klien) |
| PUT/DELETE | /api/partner/frames/:id | Buat/ubah/hapus frame (validasi + kuota paket) |
| PUT/DELETE | /api/partner/frames/:id/assets/{photo-0..3\|model} | Unggah JPEG / GLB (badan mentah, divalidasi) |
| GET | /media/:id/{main,side,detail,close}.jpg · model.glb | Berkas unggahan |
| GET | /api/catalog | Frame terbit Mitra + toko + daftar id yang harus disembunyikan |
| POST | /api/billing/checkout | Hitung pesanan di server (harga klien diabaikan) |
| POST | /api/billing/orders/:id/pay | Bayar uji (hanya `PAYMENT_PROVIDER=sandbox`) |
| POST | /api/billing/webhook | Konfirmasi gateway: header `X-Signature` = HMAC-SHA256(secret, badan mentah) |

Konfigurasi: `backend-node/.env.example`. Uji: `cd backend-node && npm test` (21 uji integrasi). Produksi: `NODE_ENV=production`, `PAYMENT_PROVIDER=webhook`, `PAYMENT_WEBHOOK_SECRET` diisi, jalankan di belakang HTTPS/reverse proxy yang menyatukan `/`, `/api`, `/media` dalam satu origin. **Backend PHP belum diselaraskan dengan fitur ini** (masih katalog baca-saja).

### VTO: node wajah paralel + magnet, dan ML (Python)

Lihat CHANGELOG Update 17-C. Ringkas: `ar/faceNodes.js` (node pupil/hidung/pelipis, jalur cepat per frame), `ar/magnet.js` (pelacak gain-adaptif + ekstrapolasi latensi), `PoseEngine.predict()` (render antar deteksi), kalibrasi ulang cepat, dan `ml/train_node_corrector.py` (latih offline di data berlabel → `frontend/src/data/nodeCorrector.json` → inferensi di browser). `npm run test:magnet` di `frontend/`.

## 3. Backend PHP (alternatif, tanpa framework)

Butuh PHP 8+ terpasang.

```bash
cd backend-php
php -S localhost:8000
```

Endpoint sama persis dengan versi Node, dalam bentuk file PHP murni:

- `GET  /api/products.php` (filter opsional: `?category=` dan/atau `?merchantId=`)
- `GET  /api/products.php?id=f3`
- `GET  /api/merchants.php` (atau `?id=m1` untuk satu toko)
- `GET  /api/categories.php`
- `POST /api/wishlist.php?user=guest`
- `GET  /api/wishlist.php?user=guest`

Cocok untuk deployment di shared hosting cPanel yang hanya mendukung PHP.

## 4. Halaman Try-On, Detail Produk & Katalog Toko

Setiap frame punya halaman detail di `/produk/:id` dan halaman coba
virtual di `/try-on/:id?merchantId=`, setiap merchant punya halaman
katalog di `/toko/:id`.

**Halaman Coba Virtual (`/try-on/:id`)** — inilah rute inti yang
diamanatkan PRD dan sebelumnya belum ada. Klik tombol **"Coba Sekarang"**
di mana pun (kartu produk, halaman detail, drawer wishlist) sekarang
membuka halaman ini, bukan cuma toast. Isinya:
- Video kamera langsung (`getUserMedia`), dengan overlay ilustrasi frame
- Permintaan izin kamera + catatan privasi ("kamera hanya aktif selama
  sesi ini, tidak direkam/disimpan")
- Fallback kalau kamera ditolak/tidak didukung (tampilkan foto produk +
  tombol coba lagi / lihat detail)
- Strip thumbnail untuk **ganti frame lain dari toko yang sama tanpa
  keluar dari sesi kamera**
- Tombol akhir "Cocok! Hubungkan ke {Mitra}" → buka modal WhatsApp/telepon
  toko yang sama seperti di halaman detail produk

> ⚠️ **Batasan jujur soal AI/AR:** overlay frame saat ini diposisikan
> tetap di tengah video sebagai simulasi visual — ini BUKAN face-tracking
> sungguhan yang mengikuti gerak/bentuk wajah, dan halaman ini tidak
> mengklaim "AI mendeteksi wajahmu". Untuk itu betulan (sesuai pitch deck),
> langkah nyatanya: pasang model face-landmark seperti **MediaPipe Face
> Landmarker** (`@mediapipe/tasks-vision`) atau TensorFlow.js
> `face-landmarks-detection`, lalu hitung posisi/lebar/rotasi overlay dari
> titik mata kiri-kanan tiap frame video. Ini butuh pekerjaan ML + testing
> akurasi tersendiri di luar scope UI yang sudah dibangun — catatan teknis
> lengkap ada di komentar akhir file `src/pages/TryOnPage.jsx`.

**Halaman detail produk** — judul besar, pilihan warna, deskripsi, harga +
jumlah, tombol "Coba Sekarang", tombol **"Checkout — Hubungkan ke Mitra"**,
galeri foto + thumbnail. Cara masuk:
- Klik gambar atau nama frame di kartu produk manapun
- Pilih hasil pencarian frame di search bar
- Klik item di drawer wishlist

### Checkout terhubung ke mitra (bukan payment gateway)

TryLens adalah marketplace penghubung, bukan penjual langsung — jadi
tombol **"Checkout — Hubungkan ke Mitra"** di halaman detail produk tidak
memproses pembayaran sendiri. Begitu diklik, muncul modal dengan tiga cara
menghubungi toko optik pemilik frame tersebut:

1. **Chat via WhatsApp** — membuka `wa.me` dengan pesan otomatis berisi
   nama frame, jumlah, dan total harga
2. **Telepon toko** — membuka dialer HP (`tel:`) dengan nomor toko
3. **Lihat Katalog Toko** — menuju halaman `/toko/:id` merchant tersebut

Nomor WhatsApp & telepon tiap toko ada di `src/data/mockData.js`
(`MERCHANTS[].whatsapp` dan `.phone`) — **saat ini masih nomor contoh**,
ganti dengan nomor asli tiap mitra optik sebelum dipakai produksi.

**Halaman katalog toko** — header toko (logo, kota, rating, jumlah produk)
diikuti grid semua frame dari merchant itu. Cara masuk:
- Klik kartu merchant mana pun (atau tombol "Lihat Katalog") di bagian
  "Toko Optik Pilihan"
- Pilih hasil pencarian toko di search bar

### Menggunakan foto produk ASLI (bukan ilustrasi)

Secara default setiap frame ditampilkan sebagai ilustrasi SVG orisinal
(supaya proyek langsung jalan tanpa aset tambahan). Begitu kamu punya foto
produk asli, taruh di:

```
frontend/public/products/<id-produk>/main.jpg
frontend/public/products/<id-produk>/side.jpg
frontend/public/products/<id-produk>/detail.jpg
frontend/public/products/<id-produk>/close.jpg
```

`<id-produk>` mengikuti id di `src/data/mockData.js` (`f0`, `f1`, dst).
Komponen `ProductImage` otomatis mendeteksi apakah file foto sudah ada —
kalau ada, foto asli itu yang tampil di kartu produk, galeri detail, dan
drawer wishlist; kalau belum ada, otomatis fallback ke ilustrasi tanpa
gambar rusak. Tidak perlu ubah kode apa pun.

> Catatan: saya tidak menyertakan foto produk sungguhan di paket ini karena
> tidak punya sumber foto berlisensi/bebas hak cipta untuk 24 model frame
> demo ini. Silakan pakai foto katalog TryLens kamu sendiri — lihat
> `frontend/public/products/README.md` untuk detail penamaan file.

### Model 3D (.glb) untuk Coba Virtual — spesifikasi aset

Taruh file di `frontend/public/products/<id-produk>/model.glb`. Berkas mentah (.rar/.obj/.fbx) simpan di `assets-mentah/`, jangan di `public/`.

Setiap model harus memuat **node bernama baku** dan **metadata ukuran asli**:

```
GLB
├── GlassesRoot          (induk semua mesh; transform identitas; metadata ada di sini)
├── Bridge               titik BELAKANG jembatan (yang menyentuh hidung), x = 0
├── LeftLensCenter       pusat lensa kiri PEMAKAI  → sumbu +X
├── RightLensCenter      pusat lensa kanan PEMAKAI → sumbu −X
├── LeftTemple           engsel gagang kiri
└── RightTemple          engsel gagang kanan
GlassesRoot.extras.trylens = { frameWidthMm, lensWidthMm, lensHeightMm, bridgeWidthMm, templeLengthMm, realWorldScale }
```

Sumbu: **+X = kiri pemakai, +Y = atas, +Z = depan (menghadap kamera)**. `realWorldScale` = mm per satuan model (10 = model dalam cm, 1 = mm).
Material lensa harus bernama mengandung `glass`/`lens` agar bisa diukur otomatis.

- `npm run glb:rig -- masuk.glb keluar.glb` — menambah node + metadata ke model biasa dengan **mengukur geometrinya** (lensa dari material, gagang dari mesh yang terletak di belakang, jembatan dari titik belakang bingkai). Opsi: `--lens=<regex material>`, `--temple-gap=<cm>`.
- `npm run glb:check` — memeriksa semua `public/products/*/model.glb`: node lengkap, kiri/kanan simetris, Bridge di tengah, metadata cocok dengan geometri (toleransi 3 mm), rentang ukuran wajar. Model lama tanpa rig dilaporkan sebagai "cadangan".
- **Periksa hasil `glb:rig` di Blender** (node-node itu hanya sebaik deteksinya); koreksi node secara manual bila perlu lalu jalankan `glb:check`.

Yang mengambil spesifikasi ini: `src/ar/rigSpec.js` (konversi satuan) dan `src/ar/rigSpecThree.js` (membaca scene hasil GLTFLoader).
Model tanpa rig tetap tampil, tetapi dengan penempatan perkiraan (titik tetap + koreksi jembatan hidung) dan tanpa laporan kecocokan.

**Pipeline fitting (`src/ar/eyeFit.js`)**

```
Wajah: Left Eye · Right Eye (pusat iris 468/473) · Nose Bridge (168·6·197) · Face Orientation (matriks pose) · Metric Scale (iris 11,7 mm)
   ↓  median 45 frame, metrik (cm), sudah di-un-rotate
Transformasi rigid (tanpa scale ke wajah):
   x,y  = titik tengah LeftLensCenter/RightLensCenter ↔ titik tengah pupil
   roll = garis pupil (dibatasi ±4°)
   z    = Bridge tidak masuk punggung hidung (+0,5 mm celah), batas bawah jarak lensa–pupil 12 mm, batas atas 28 mm
   ↓
GLB dipasang berukuran ASLI (skala = realWorldScale/10)
```

Karena frame kaku, kedua pusat lensa hanya bisa tepat di kedua pupil bila jarak pusat lensa = PD. Selisihnya dihitung dan dilaporkan per mata ("Pusat lensa vs pupil"), bukan disembunyikan.

### Presisi AR & rekomendasi

- `frontend/src/ar/` — mesin presisi (One Euro, kalibrasi iris, un-rotate, gerbang kualitas, `eyeFit.js` kunci-pupil). Fungsi murni, diuji dengan `npm run test:ar`; aset GLB dengan `npm run test:glb`.
- `frontend/src/rec/recommend.js` — algoritma rekomendasi (bobot di `WEIGHTS`, kalibrasi lebar di `FIT`). Uji: `npm run test:rec`.
- Lebar frame tiap produk diambil dari `product.frameMm` bila ada; bila tidak, diperkirakan dari gaya. Isi `frameMm` di data produk asli agar rekomendasi lebar akurat.

### Mengukur akurasi try-on (disarankan sebelum klaim angka)

Tidak ada angka "95%" yang terukur di project ini. Cara membuatnya jujur:

1. Kumpulkan 15–20 orang. Ukur dengan penggaris/jangka: lebar wajah (tulang pipi), PD (pakai alat optik), lebar frame f0 (146 mm).
2. Buka `/try-on/f0`, tunggu "Ukuran asli terkalibrasi", catat lebar wajah dan PD yang tampil di panel "Kecocokan di wajahmu".
3. Untuk kunci-pupil: foto close-up wajah pengguna dengan frame asli (kamera sejajar mata), bandingkan posisi pusat lensa asli terhadap pupil dengan yang tampil di layar; ukur juga jarak lensa ke mata (laporan "Jarak lensa ke mata") dengan penggaris.
4. Hitung galat rata-rata |terukur − tampil|. Target realistis kamera biasa: PD ±3–4 mm, lebar wajah ±5 mm. Setel `widthClass` (`data/faceShape.js`) dan `FIT` (`rec/recommend.js`) dari data ini.
5. Untuk kecocokan visual: minta orang menilai skala 1–5 "frame terlihat menempel di hidung & sejajar mata" di beberapa pose.

## 5. Teknologi yang dipakai

- **React 18** — komponen UI (Header, Hero Carousel, Product Grid, dst.)
- **Tailwind CSS** — styling berbasis utility class, memakai token warna TryLens
- **Zustand** — state management ringan untuk wishlist & filter
- **React Router** — navigasi antar halaman (beranda ↔ detail produk)
- **Vite** — dev server & build tool frontend
- **Node.js + Express** — REST API utama
- **PHP native** — REST API alternatif untuk hosting sederhana
- **JSON file storage** — data produk/merchant & wishlist (tanpa database, mudah diganti ke MySQL/PostgreSQL nanti)

## 6. Palet warna TryLens

| Token          | Hex       |
|----------------|-----------|
| Primary Blue   | `#427AB5` |
| Deep Blue      | `#406AAF` |
| Accent Yellow  | `#F7DD7D` |
| Soft Cream     | `#FFE8BE` |
| Success        | `#2E9B62` |
| Error          | `#D92D20` |

## 7. Langkah selanjutnya

- Ganti penyimpanan JSON dengan database (MySQL/PostgreSQL) bila sudah siap produksi.
- Tambahkan autentikasi user (mis. JWT) untuk wishlist per akun.
- Hubungkan tombol "Coba Sekarang" ke modul virtual try-on (kamera/AR) yang sesungguhnya.
