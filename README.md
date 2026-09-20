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
