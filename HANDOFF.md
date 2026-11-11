# HANDOFF TryLens — per Rabu 11 Nov 2026 (Update 45)

Tempel seluruh isi file ini sebagai pesan pertama di session baru.

## 1. Konteks & aturan kerja
- Pemilik: Ameeyyyyy (founder non-teknis, Bahasa Indonesia, mau penjelasan rinci langkah demi langkah). Repo: `/home/claude/trylens` (GitHub `msamifahmi/TryLens`), situs live `try-lens.id` di Hostinger shared hosting (PHP/HTML saja).
- **Hosting Hostinger habis 5 Nov 2026 — ingatkan perpanjang.**
- Aturan: **jangan merge PR** (user yang merge), **jangan pakai `pkill`**, commit diakhiri trailer:
  `Co-Authored-By: <nama model session aktif> <noreply@anthropic.com>` dan `Claude-Session: <URL session aktif>` (ikuti petunjuk atribusi dari sistem).
  PR dibuat lewat `gh api repos/msamifahmi/TryLens/pulls --method POST --input <file json>` (`gh pr create` diblokir); isi PR diakhiri "🤖 Generated with [Claude Code](https://claude.com/claude-code)" + URL session.
- Stack: React 18 + Vite 5 + Tailwind + zustand + framer-motion + three.js; MediaPipe tasks-vision (Face Landmarker, WASM dari jsDelivr, model dari Google Storage). Backend katalog: PHP+SQLite `frontend/public/api/index.php` (+ `admin.html` hasil `npm run gen-seed` dari `backend-node/public/admin.html` — **edit sumbernya di backend-node/public/, lalu jalankan gen-seed**), paritas Node di `backend-node`.
- Tes: `cd frontend && npm test` (11 skrip, termasuk `node scripts/test-ar.mjs` 19 uji), `cd backend-node && npm test` (termasuk `php-api.test.mjs`), build `cd frontend && npx vite build`. Cek browser: Playwright + `npx vite preview --port 18590 --strictPort` (jalankan dengan `(nohup ... &)`), skrip contoh ada di scratchpad (`shot39.cjs`, `hover.cjs`).
- Kamera sungguhan **tidak bisa** diuji di lingkungan cloud; semua klaim soal VTO/scan harus jujur soal itu.

## 2. Status git (11 Nov)
- `main` memuat sampai Update 42 (PR #22). Deploy otomatis: merge ke `main` → GitHub Actions (`.github/workflows/deploy.yml`) menjalankan `npm test` + build frontend → mendorong `frontend/dist` ke branch `deploy` → Hostinger menarik `deploy`. Cek versi tayang di `https://try-lens.id/version.txt`.
- **Update 43** (branch `update-43-admin-dinamis`, PR menunggu merge user): `/admin` dinamis — tab Ringkasan + statistik pengunjung nyata (`POST /api/event`, tabel `stats`), Flash Sale diatur admin (tabel `flash_items`, `/api/admin/flash-items`, `flashItems` di `/api/catalog`), Highlighted Brand per toko (`merchants.highlight_until`). PHP + Node + tes.
- Pelajaran tetap berlaku: sebelum push commit susulan, cek `gh api repos/msamifahmi/TryLens/pulls/<n> --jq .merged`; kalau sudah merged → branch + PR baru.

## 3. Yang sudah selesai (ringkas)
- Update 39–42: beranda dua kartu, Flash Sale brand, scan wajah live + anchor dahi/pipi/telinga, ensemble ML, VTO lebih tepat, hover kartu foto → 360° setelah 5 dtk (lihat CHANGELOG).
- Update 43: lihat CHANGELOG. Statistik hanya mulai terisi setelah versi ini tayang.

## 4. TUGAS BERIKUTNYA (urut prioritas)
### 0. Keputusan bisnis terbaru (Update 44)
- Paket: katalog tanpa batas; VTO Basic 5, Pro 15; slot tambahan Rp30.000/slot, promo 5 slot Rp145.000 — **sekali bayar, permanen** selama langganan aktif (`VTO_SLOT`, `vtoSlotPrice`, `vtoLimitOf` di `backend-node/src/pricing.js` = `frontend/src/data/partnerMock.js`).
- Flash Sale Mitra **langsung tayang** bila memenuhi aturan admin (tanpa antrean persetujuan); admin tetap bisa menonaktifkan.
- Flash Sale diisi awal sekali dari `seed.json` → `flash` (counter `flash_seeded`).

### A. Update 46 — Dasbor Mitra memakai server PHP (disetujui user)
- Setelah akun Mitra ada di server: kunci `GET /api/stats/merchant/:id` ke sesi Mitra pemilik toko (sekarang publik, hanya angka teragregasi). Analitik Mitra (`lib/storeStats.js`, `components/partner/StatCharts.jsx`) sudah memakai data nyata sejak Update 45.
Saat ini server PHP (`frontend/public/api/index.php`) tidak punya akun Mitra → area `/partner` selalu mode demo (localStorage, `store/usePartner.js`). Rencana:
1. Akun Mitra di PHP: tabel akun (password `password_hash`), sesi cookie HttpOnly + SameSite, batas percobaan login, `/api/auth/*` sesuai kontrak Node (`backend-node/src/routes/auth.js`) sehingga `usePartner.init()` otomatis memakai mode server.
2. Akun dikaitkan ke toko (`merchants.id`); frame Mitra = baris `products` toko itu (bukan tabel terpisah), unggah foto/GLB lewat validasi yang sama dengan admin.
3. Mitra mendaftarkan frame ke Flash Sale → baris `flash_items` (langsung tayang bila memenuhi aturan; kolom pemilik/asal agar admin bisa membedakan). Kini masih lokal di perangkat Mitra (`mergeOwnFlash` di `lib/flashSale.js`).
3b. Pembelian slot VTO (`kind: "vtoSlots"`) + kuota efektif di PHP, sama dengan Node `routes/billing.js`.
4. Banner/iklan Mitra → antrean persetujuan di tab Iklan admin (ganti tombol "Setujui (simulasi admin)" di `PromotionTabs.jsx`).
5. (Selesai di Update 45) Analitik Mitra membaca `stats`/`stats_hour` lewat `/api/stats/merchant/:id`.
6. Admin: tab/daftar akun Mitra (aktif/nonaktif, reset password).
Langganan & pembayaran tetap sandbox sampai ada payment gateway.

### B. Konsistensi palet & gaya desain (wajib di semua pekerjaan baru)
Palet brand: biru `#427AB5` (blue), biru tua `#406AAF` (blue-deep), kuning `#F7DD7D` (accent-yellow), krem `#FFE8BE`, permukaan `#EEF5FC`, teks `#111827/#1F2937/#6B7280`, error `#D92D20`, sukses `#2E9B62` (lihat `tailwind.config.js`). Pakai token Tailwind, bukan hex acak. Kartu putih `rounded-2xl border border-border shadow-sm`, tombol utama `tl-cta`, target sentuh ≥44px, kontras ≥4,5:1, hormati reduced-motion. Halaman `/admin` punya token CSS sendiri di `backend-node/public/admin.html` (edit di sana lalu `npm run gen-seed`).

### C. Belum terbukti / batasan yang harus dijujurkan
1. VTO/scan belum diuji dengan kamera nyata (lingkungan cloud tidak punya kamera). Saran: fitur "Rekam data uji" (`?debug=1`) yang menyimpan urutan landmark (angka, bukan video, dengan persetujuan) untuk menyetel `ar/stable.js`, `ar/outputFilter.js`, `ar/magnet.js`.
2. Telinga tidak bisa dideteksi MediaPipe (hanya perkiraan); garis rambut = heuristik warna; jangan menjanjikan angka akurasi.
3. `widthClass`/`classifyRatios` di `data/faceShape.js` belum dikalibrasi dengan ukuran manusia nyata.
4. Flash Sale: "Terjual" diisi manual oleh admin (transaksi di luar TryLens).

## 5. Yang harus dilakukan user (non-kode)
- **Hosting Hostinger tercatat habis 5 Nov 2026 — pastikan sudah diperpanjang.**
- Merge PR Update 43; setelah tayang buka `/admin` → Flash Sale → "Tambah frame" (selama daftar kosong, Flash Sale tidak tampil di situs live).
- Token admin (≥24 karakter) di `<parent DOCUMENT_ROOT>/trylens-data/config.php`.
- Isi `CONTACT` di `frontend/src/data/siteInfo.js` (belum diisi).
- Uji VTO/scan di HP & laptop sendiri, catat kondisi gagal.

## 6. Peta file penting
- Scan: `components/consult/FaceScanner.jsx`, `faceOverlay.js` (mesh, anchor, `earPoints`), `landmarker.js`, `data/faceShape.js`, `pages/ConsultPage.jsx`, `FaceSummary.jsx`.
- VTO: `components/tryon/TryOnStage.jsx`, `ar/PoseEngine.js` (`predict`, `leadGain`, `setLatency`, `CLIP_IDX`), `ar/stable.js` (`solvePivot`), `ar/quality.js`, `ar/eyeFit.js`, `ar/modelFit.js`.
- Statistik: `lib/track.js` (klien), PHP `record_event`/`admin_stats`, Node `routes/event.js` + `catalogStore.js` (`recordEvent`/`adminStats`).
- Flash Sale: `lib/flashSale.js` (`serverFlashItems`), PHP `flash_rows`/`flash_item_clean`, Node `flashRows`/`flashItemClean`,, `components/FlashSaleSection.jsx`, `pages/partner/FlashSaleTab.jsx`, `data/partnerMock.js`, PHP `index.php` (`flash_*`), Node `src/catalogStore.js` (`flashGet/flashClean`) + `routes/admin.js`.
- Beranda: `pages/HomePage.jsx`, `MerchantSection.jsx`, `RecommendationSection.jsx`, `ProductCard.jsx`, `ProductHoverPreview.jsx`, `index.css` (keyframes `tl-*`).
- Changelog: `CHANGELOG.md` (entri terbaru "Update 43" di atas).
