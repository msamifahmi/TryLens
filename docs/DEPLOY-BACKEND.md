# Menjalankan katalog di produksi — hosting Single (PHP + SQLite), tanpa Node.js

Hosting **Single** Hostinger hanya PHP/HTML. Karena itu katalog berjalan lewat **`frontend/public/api/index.php`** (PHP + SQLite). Berkas ini ikut ter-deploy bersama situs (cabang `deploy` → `public_html/api/`), satu domain: tidak perlu subdomain, CORS, atau variabel `API_ORIGIN`.
Kontraknya sama dengan backend Node, jadi halaman `/admin`, CLI `tl.mjs`, dan prompt Hermes persis sama. (Backend Node tetap ada untuk VPS/paket Node.js kelak.)

Yang ada di sisi PHP: katalog TryLens (produk + toko), admin, unggah foto/model. Yang **tidak** ada: akun/langganan/pembayaran Mitra — area Mitra tetap mode demo seperti sekarang.

## Langkah sekali (±10 menit, lewat hPanel → File Manager)
1. **Cek PHP**: hPanel → Website → PHP Configuration → pastikan PHP ≥ 8.1 dan ekstensi **pdo_sqlite** / **sqlite3** tercentang. (Tidak ada? aktifkan; kalau tidak bisa, kabari aku — alternatifnya MySQL.)
2. **Buat folder data DI LUAR public_html**: di File Manager, satu tingkat di atas `public_html` (folder domain try-lens.id), buat folder `trylens-data`.
3. **Buat token admin** (acak, ≥ 24 karakter), mis. di terminal lokal: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
4. **Buat berkas `trylens-data/config.php`** isinya:
   ```php
   <?php return ['adminToken' => 'TOKEN-ACAK-ANDA'];
   ```
5. Merge PR → tunggu workflow hijau → hPanel → Git → cabang `deploy` → **Deploy**.
6. Cek: `https://try-lens.id/api/health` → `{"ok":true,…,"backend":"php-catalog"}`. Buka `https://try-lens.id/api/catalog` → 24 produk (katalog awal terisi otomatis saat pertama diakses).
7. Buka `https://try-lens.id/admin`, masukkan token → edit harga/nama, unggah foto & model.

## Hermes
`export TRYLENS_API=https://try-lens.id` dan `TRYLENS_ADMIN_TOKEN=<token>`, lalu `node tl.mjs …` (lihat `docs/HERMES.md`).

## Cadangan & keamanan
- Data = `trylens-data/trylens.db` + `trylens-data/uploads/` (di luar public_html, tidak ikut ter-deploy/terhapus saat Deploy). Unduh berkala lewat File Manager, atau tombol **Unduh cadangan** di /admin.
- Token = kunci penuh katalog: jangan masuk repo/chat. Ganti dengan mengedit `config.php`. Percobaan salah dibatasi 10× / 10 menit per IP.
- Jangan taruh `config.php`/`trylens.db` di dalam `public_html` (bisa diunduh orang).

## Bila bermasalah
- `/api/health` mengembalikan halaman biasa (HTML): aturan `.htaccess` belum aktif → pastikan `public_html/.htaccess` hasil deploy memuat baris `RewriteRule ^(api/…` dan `mod_rewrite` aktif.
- Admin 401 padahal token benar: hosting membuang header Authorization. Sudah ada cadangan header `X-Admin-Token` (dipakai otomatis oleh /admin dan CLI); bila tetap gagal, kabari aku.
- "Folder data tidak bisa dibuat": buat manual `trylens-data` (langkah 2) dan pastikan bisa ditulis.
- Aku belum bisa menguji langsung di Hostinger — langkah 6 adalah uji pertamanya.
