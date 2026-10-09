# HANDOFF — TryLens (untuk sesi Claude baru)

Baca file ini dulu, lalu `CHANGELOG.md` (riwayat per update) dan `README.md` (cara menjalankan).

## Konteks
- Pemilik: Ameeyyyyy, mahasiswa Sistem Informasi UMS, pendiri TryLens (virtual try-on kacamata + marketplace yang menghubungkan pengguna ke toko optik mitra).
- Bahasa: balas dalam Bahasa Indonesia. Suka penjelasan teknis yang rinci dan menyeluruh.
- Stack: React 18 + Vite 5 + Tailwind + zustand (`frontend/`), Node/Express + better-sqlite3 (`backend-node/`), PHP lama (`backend-php/`, TIDAK sinkron), trainer ML Python (`ml/`).

## Menjalankan
- Frontend: `cd frontend && npm i && npm run dev` (proxy `/api` dan `/media` ke :4000). Tes: `npm test`.
- Backend: `cd backend-node && npm i && cp .env.example .env && npm run seed && npm start`. Tes: `npm test` (24 uji).
- Tanpa backend, frontend jalan di mode demo (IndexedDB/localStorage). Akun demo: lihat `DEMO_ACCOUNTS` di `frontend/src/data/partnerMock.js`, password `Partner123!`.

## Peta kode penting
- VTO "magnet": `frontend/src/ar/` (`magnet.js`, `faceNodes.js`, `PoseEngine.js`, `TryOnStage.jsx`); tes sintetis di `frontend/scripts/`.
- Katalog gabungan statis+server: `frontend/src/lib/catalog.js`; media: `lib/mediaDb.js`; link e-commerce: `lib/ecommerce.js` (HARUS identik dengan `backend-node/src/ecommerce.js`, ada tes parity).
- Dashboard Mitra: `frontend/src/pages/partner/` (`StoreTabs.jsx`, `AnalyticsTabs.jsx`), store `store/usePartner.js` (mode server vs demo, antrean sinkron).
- Backend: `backend-node/src/routes/{auth,partner,billing,catalog}.js`, `service.js`, `db.js`.

## Status (sampai Update 19)

Update 19: pelacak VTO default "stable" (lihat CHANGELOG), kuota VTO Basic 20 / Pro tanpa batas dengan alur turun paket, isi ruang bawah kamera, animasi global.

Selesai: backend sungguhan (sesi cookie, scrypt, upload tervalidasi, harga server-side, pembayaran sandbox+webhook), magnet VTO stabil, link e-commerce per produk, deskripsi produk, foto profil toko, popup Store Preview, analitik kaya + insight.

## Batasan jujur (jangan diklaim lain)
- Akurasi VTO hanya diuji dengan data SINTETIS; belum divalidasi dengan wajah nyata (unduhan model MediaPipe diblokir di sandbox). `?tracker=oneEuro` untuk A/B; `engine.setLatency()` menyetel kompensasi latensi.
- Data perilaku pengunjung di Analitik masih SIMULASI (belum ada pelacakan event). Insight kualitas katalog memakai frame nyata.
- Tidak ada payment gateway sungguhan; backend PHP tidak sejalan.
- Frame buatan Mitra hanya tampil di halaman publik bila backend jalan.

## Berikutnya (belum dikerjakan)
Pelacakan event nyata untuk analitik (view/try-on/klik beli), akun konsumen + ulasan, panel admin, dropdown navbar publik, code-splitting (bundle App >1 MB), alat rigging untuk Mitra, uji VTO dengan wajah nyata.

## Git
Perubahan Update 18 ada di branch lokal `update-18` (belum ter-push; repo asal github.com/msamifahmi/TryLens). Setelah akun baru menautkan GitHub, push branch itu.
