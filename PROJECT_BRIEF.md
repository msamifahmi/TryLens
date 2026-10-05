# TryLens — Brief Proyek (untuk AI/kolaborator baru)

Dokumen ini menjelaskan APA proyeknya, UNTUK SIAPA, BAGAIMANA cara kerjanya, dan MAU DIBAWA KE MANA. Untuk detail teknis dan status per update, lihat `HANDOFF.md`, `CHANGELOG.md`, `README.md`.

## 1. Apa itu TryLens
Platform **virtual try-on kacamata** sekaligus **marketplace** yang menghubungkan pengguna dengan **toko optik mitra**. Pengguna mencoba frame kacamata langsung lewat kamera (wajah dilacak, model 3D frame dipasang di wajah secara real-time), lalu membeli lewat toko mitra.

Pendiri: Ameeyyyyy (mahasiswa Sistem Informasi UMS). Ini proyek startup sekaligus proyek yang terus dikembangkan secara iteratif.

## 2. Masalah yang diselesaikan
- Orang ragu membeli kacamata online karena tidak tahu cocok atau tidak di wajahnya.
- Toko optik kecil/menengah sulit tampil online dan tidak punya teknologi try-on sendiri.
TryLens memberi pengguna try-on instan, dan memberi toko optik etalase online + try-on + analitik tanpa membangun sendiri.

## 3. Tiga sisi produk
1. **Pengguna (konsumen)** — menjelajah frame, filter, halaman toko, halaman produk, try-on lewat kamera (juga mode tangkapan layar/360° untuk melihat dari berbagai sudut), lalu menekan "Hubungkan"/beli.
2. **Mitra (toko optik)** — dashboard untuk mengelola toko: profil toko (termasuk foto profil), frame/produk (foto, deskripsi, harga, stok, model 3D `.glb`, link e-commerce), koleksi, preview toko, analitik, promosi/iklan, langganan.
3. **Platform (TryLens)** — mengelola katalog gabungan, langganan Mitra, iklan; tidak memproses pembayaran barang.

## 4. Alur utama
1. Mitra mendaftar → memilih paket langganan (Basic/Pro) → membayar (saat ini sandbox) → setup toko → menambah frame.
2. Frame yang "tayang" masuk katalog publik (hanya bila langganan aktif dan toko selesai disiapkan).
3. Pengguna melihat frame → mencoba lewat kamera → menekan **Hubungkan**: pilihan "Beli lewat e-commerce" (Tokopedia/Shopee/Lazada/TikTok Shop/website toko, sesuai link yang diisi Mitra), WhatsApp, telepon, atau lihat katalog toko.
4. **Transaksi barang terjadi di luar TryLens** (di e-commerce atau langsung dengan toko). TryLens mendapat nilai dari langganan Mitra dan produk iklan (Highlighted brand, banner, sponsored placement).

## 5. Teknologi inti
- **Frontend**: React 18, Vite, Tailwind, zustand, three.js, MediaPipe Face Landmarker (478 landmark).
- **Backend**: Node/Express + SQLite (sesi cookie HttpOnly, password scrypt, upload tervalidasi, harga dihitung server, pembayaran sandbox + webhook ber-HMAC). Folder `backend-php/` adalah versi lama dan tidak sinkron.
- **Dua mode frontend**: *mode server* (backend hidup) dan *mode demo* (tanpa backend, data di browser). Keduanya harus tetap berfungsi.
- **ML opsional**: `ml/` melatih koreksi posisi node wajah (hanya model berstatus `real` yang dipakai).

## 6. Algoritma VTO "magnet" (bagian paling teknis)
Frame dipasang di wajah memakai beberapa **node wajah** (pupil kiri/kanan, tulang hidung atas/tengah/bawah, pelipis kiri/kanan). Posisi tiap node bisa dihitung independen; hasilnya digabung (weighted median) menjadi posisi dan skala frame, dengan filter α-β untuk menghaluskan gerak. Node yang tidak sehat (mis. satu mata dipejamkan, alis tertutup rambut, wajah menoleh jauh) dikeluarkan sementara supaya frame tidak melompat atau berubah ukuran. Jika node sehat <3, sistem jatuh kembali ke matriks transformasi MediaPipe. Skala frame diperbarui pelan (rate limit) dan relock hanya terjadi bila kondisi stabil.
**Catatan jujur**: sejauh ini diuji dengan data sintetis saja; validasi dengan wajah nyata belum dilakukan. Itu prioritas penting.

## 7. Aturan desain/keputusan yang sudah dibuat (jangan dilanggar tanpa alasan)
- Harga dan aturan langganan dihitung **di server**; klien tidak dipercaya.
- Link e-commerce: hanya https dan hanya host resmi tiap platform; aturan di `frontend/src/lib/ecommerce.js` dan `backend-node/src/ecommerce.js` harus identik (ada tes parity).
- Produk statis bawaan (mockData) tetap menjadi dasar; frame Mitra digabung ke dalamnya lewat `lib/catalog.js`.
- UI berbahasa Indonesia, gaya biru (token Tailwind kustom), komponen dashboard Mitra di `components/partner/`.
- Setiap perubahan: jalankan `npm test` (frontend & backend) dan `vite build`, lalu catat di `CHANGELOG.md`.

## 8. Yang sudah ada vs. yang belum
**Sudah**: katalog + filter, halaman produk/toko, try-on kamera, dashboard Mitra lengkap, backend nyata, link beli e-commerce, foto profil toko, analitik kaya (data simulasi), promosi/iklan, langganan sandbox.
**Belum / ide berikutnya**:
- Validasi VTO dengan wajah nyata dan penyetelan latensi.
- Pelacakan event sungguhan (view, try-on, klik beli) agar analitik tidak simulasi.
- Payment gateway sungguhan.
- Akun konsumen, wishlist tersimpan, ulasan.
- Panel admin platform.
- Alat rigging model 3D untuk Mitra (agar Mitra mudah mengunggah `.glb` yang benar).
- Code-splitting (bundle utama >1 MB), dropdown navbar publik.

## 9. Cara bekerja dengan pemiliknya
- Balas dalam Bahasa Indonesia, penjelasan teknis rinci dan menyeluruh.
- Ia menyampaikan permintaan sebagai daftar perubahan sekaligus per "Update"; kerjakan semuanya, uji, lalu serahkan zip proyek yang sudah berisi perubahan.
- Jujur soal batasan (apa yang belum teruji, apa yang masih simulasi).
