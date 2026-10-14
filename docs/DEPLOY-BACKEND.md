# Menjalankan backend (Node + SQLite) di produksi

Frontend tetap statis di try-lens.id (cabang `deploy`). Backend berjalan terpisah di **api.try-lens.id** dan dibaca frontend lewat `VITE_API_ORIGIN`.

## Syarat hosting
Butuh Node.js ≥ 20 yang berjalan terus + disk yang persisten. Di Hostinger ini ada di paket yang menyediakan **Node.js Web App** (mis. Business/Cloud) atau **VPS**; paket shared dasar umumnya tidak. Cek hPanel dulu. `better-sqlite3` memakai modul native; di VPS pastikan `build-essential` + python3 terpasang.

## Langkah (VPS / Node.js app)
1. Subdomain `api.try-lens.id` → server, HTTPS aktif.
2. `git clone` repo, `cd backend-node && npm ci --omit=dev`.
3. Buat `.env` (lihat `.env.example`):
   ```
   NODE_ENV=production
   PORT=4000
   DB_PATH=/var/trylens/trylens.db         # DI LUAR folder repo agar tidak hilang saat update
   UPLOADS_DIR=/var/trylens/uploads
   CORS_ORIGINS=https://try-lens.id,https://www.try-lens.id
   ADMIN_TOKEN=<acak ≥24 karakter>
   ```
4. Isi katalog awal sekali: `npm run import-catalog` (6 toko + 24 produk bawaan; jangan `npm run seed`, itu akun demo).
5. Jalankan: `node --env-file=.env server.js` (pakai pm2/systemd agar hidup terus).
6. GitHub → Settings → Secrets and variables → Actions → **Variables** → `API_ORIGIN = https://api.try-lens.id`, lalu merge/ulang build agar frontend memakainya, lalu Deploy di hPanel.
7. Cek: `https://api.try-lens.id/api/health` → `{"ok":true}`, `https://api.try-lens.id/admin` → halaman admin, `https://try-lens.id/version.txt`.

## Cadangan
Data = satu berkas SQLite + folder uploads. Salin berkala (`sqlite3 trylens.db ".backup cadangan.db"` + rsync `uploads/`), atau unduh ekspor JSON dari /admin.

## Keamanan
`ADMIN_TOKEN` setara kunci penuh katalog: jangan masuk repo/chat; ganti bila bocor (ubah `.env`, restart). Percobaan salah dibatasi 10× per 10 menit per IP.
