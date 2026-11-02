# HANDOFF TryLens — per Senin 2 Nov 2026, 13:20 WIB

Tempel seluruh isi file ini sebagai pesan pertama di session baru.

## 1. Konteks & aturan kerja
- Pemilik: Ameeyyyyy (founder non-teknis, Bahasa Indonesia, mau penjelasan rinci langkah demi langkah). Repo: `/home/claude/trylens` (GitHub `msamifahmi/TryLens`), situs live `try-lens.id` di Hostinger shared hosting (PHP/HTML saja).
- **Hosting Hostinger habis 5 Nov 2026 — ingatkan perpanjang.**
- Aturan: **jangan merge PR** (user yang merge), **jangan pakai `pkill`**, commit diakhiri trailer:
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` dan `Claude-Session: <URL session aktif>`.
  PR dibuat lewat `gh api repos/msamifahmi/TryLens/pulls --method POST --input <file json>` (`gh pr create` diblokir); isi PR diakhiri "🤖 Generated with [Claude Code](https://claude.com/claude-code)" + URL session.
- Stack: React 18 + Vite 5 + Tailwind + zustand + framer-motion + three.js; MediaPipe tasks-vision (Face Landmarker, WASM dari jsDelivr, model dari Google Storage). Backend katalog: PHP+SQLite `frontend/public/api/index.php` (+ `admin.html` hasil `npm run gen-seed` dari `backend-node/public/admin.html` — **edit sumbernya di backend-node/public/, lalu jalankan gen-seed**), paritas Node di `backend-node`.
- Tes: `cd frontend && npm test` (11 skrip, termasuk `node scripts/test-ar.mjs` 19 uji), `cd backend-node && npm test` (termasuk `php-api.test.mjs`), build `cd frontend && npx vite build`. Cek browser: Playwright + `npx vite preview --port 18590 --strictPort` (jalankan dengan `(nohup ... &)`), skrip contoh ada di scratchpad (`shot39.cjs`, `hover.cjs`).
- Kamera sungguhan **tidak bisa** diuji di lingkungan cloud; semua klaim soal VTO/scan harus jujur soal itu.

## 2. Status git (diperbarui 2 Nov 13:35)
- `main` sudah memuat Update 39 (PR #19) dan Update 40 (PR #20, di-merge user).
- **Temuan penting:** commit "Flash Sale ikut palet brand + beranda dipisah dua kartu" (`e3f9550`) saya push ke branch `update-39` **setelah** PR #19 ter-merge, jadi **tidak pernah masuk main** — itulah sebabnya user melihat warna Flash Sale masih lama dan dua section belum terpisah. Sudah diselamatkan lewat cherry-pick ke branch `update-41-warna-flash-pisah-section` (**PR #21, menunggu merge user**). Pelajaran: sebelum push commit susulan, cek dulu apakah PR sudah merged (`gh api repos/msamifahmi/TryLens/pulls/<n> --jq .merged`); kalau sudah, buat branch + PR baru.
- Hover kartu produk (PR #20) sudah di main tapi perilakunya perlu dirapikan (lihat bagian 4, butir A).

## 3. Yang sudah selesai (ringkas)
- **Update 39 (merged):** beranda Toko Optik + Koleksi jadi dua kartu rapi; Flash Sale baru (tema brand biru–kuning default; tema lain Sunset/Ocean/Berry/Midnight); pengaturan Flash Sale di admin (`/admin` tab "Flash Sale", tabel `settings`, `GET/PUT /api/admin/flash-sale`, tayang di `/api/catalog` → `flashSale`; PHP + Node + tes); Mitra mendaftarkan frame (harga kilat + kuota) di dasbor Promosi → Flash Sale (mode demo/localStorage); semua 6 toko dummy punya akun (`admin@optiksehat.id`, `admin@visionoptic.id`, `admin@optikmaju.id`, `admin@optikprima.id`, plus `basic@optikkusuma.id`, `pro@lensakita.id`; password `Partner123!`), kotak demo login hanya menampilkan 2; scan wajah live dengan mesh MediaPipe; kompensasi latensi VTO; animasi tambahan (hormati reduced-motion).
- **Update 40 (PR #20, menunggu merge):** lingkaran panduan scan tidak bergeser lagi (bug animasi menimpa translate); mesh/anchor hilang setelah scan 100% (tombol "Tampilkan mesh"); penanda *perkiraan* telinga saat memindai; 45 sampel + rata-rata terpangkas + galat ± (mmErr/pdErr); VTO: landmark di luar bingkai tak ikut menentukan pose + saran "Wajah terpotong", ekstrapolasi lag ≤60 ms dan dikecilkan saat menoleh >25°; hover kartu produk menampilkan slide foto lalu model 360° (`ProductHoverPreview.jsx`, `Model360` punya prop `bare`/`onReady`).

## 4. TUGAS BERIKUTNYA (urut prioritas)
### A. Hover kartu produk — buat konsisten (permintaan user, belum dikerjakan)
Masalah: kadang tampil slide foto, kadang langsung 360°, kadang foto diam. Aturan yang diminta user:
1. Saat kursor masuk kartu: **selalu mulai dengan slide foto** (pindah-pindah foto tiap ±1 detik, dengan indikator titik). Jangan pernah langsung 360°.
2. Jika kursor **tetap di atas kartu > 5 detik** dan produk punya model → baru ganti ke tampilan 360° (fade); keluar dari kartu → semua dilepas (satu konteks WebGL).
3. Jika foto hanya 1 → tampilkan foto + tetap berpindah ke 360° setelah 5 detik; bila tidak ada model → tetap foto.
4. Perilaku sama untuk semua kartu (pastikan `useProductPhotos` selesai dulu; tampilkan foto utama sebagai fallback saat memuat, tanpa kedip kosong). Tidak boleh bergantung pada urutan unduh model.
5. Hanya perangkat hover (`(hover: hover) and (pointer: fine)`); di HP tidak aktif. Hormati `prefers-reduced-motion` (tanpa auto-slide; 360° tidak auto-putar).
File: `frontend/src/components/ProductHoverPreview.jsx` (+ `ProductCard.jsx`, `Model360.jsx` prop `bare`/`onReady`). Sekarang timer dwell hanya 300 ms dan 360° menimpa slide begitu model siap — itu sumber ketidakkonsistenan. Tambah state tahap: `slides` → (5000 ms) → `rotate`.

### B. Konsistensi palet & gaya desain (wajib di semua pekerjaan baru)
Palet brand: biru `#427AB5` (blue), biru tua `#406AAF` (blue-deep), kuning `#F7DD7D` (accent-yellow), krem `#FFE8BE`, permukaan `#EEF5FC`, teks `#111827/#1F2937/#6B7280`, error `#D92D20`, sukses `#2E9B62` (lihat `tailwind.config.js`). Pakai token Tailwind, bukan hex acak. Gaya: kartu putih `rounded-2xl border border-border shadow-sm`, judul section `text-[20px] md:text-[22px] font-extrabold` dengan bar aksen kecil (biru untuk Toko, kuning untuk Koleksi), tombol utama `tl-cta`, gerak lewat kelas `tl-*` di `index.css`, target sentuh ≥44px, kontras ≥4,5:1, hormati reduced-motion. Flash Sale default tema `brand` (gradien `#2F559A→#427AB5`, label diskon kuning). Audit sisa halaman yang masih memakai warna di luar palet (mis. merah/oranye lama di Flash Sale tema lain hanya boleh jadi pilihan admin, bukan bawaan).

### C. Verifikasi setelah PR #21 di-merge
- Buka try-lens.id (hard refresh): Flash Sale biru–kuning; "Toko Optik Pilihan" dan "Koleksi Frame Terbaru" dua kartu putih terpisah, tidak ada kartu melebar keluar layar (di desktop & 390px).
- Di `/admin` → Flash Sale → pilih "Brand TryLens" → simpan (pengaturan lama masih tema Sunset bila sudah pernah disimpan).

### D. Belum dikerjakan / belum terbukti (lanjutan dari sebelumnya)
1. **VTO tampak samping masih mungkin bergetar / frame masuk wajah.** Perbaikan di PR #20 belum terbukti dengan kamera nyata; uji sintetis (`test-ar.mjs`, "tracker stable: yaw 50°…") lolos juga pada kode lama, jadi tidak membuktikan apa pun. Eksperimen memperberat bobot sisi belakang (0,35→0,10) justru sedikit lebih buruk pada data sintetis → sudah dikembalikan. **Langkah berikut yang disarankan:** bangun tombol/URL rahasia "Rekam data uji" (`?debug=1`) yang menyimpan urutan landmark + matriks pose (angka saja, bukan video; minta persetujuan user dulu soal privasi) ke file JSON, user menoleh kiri/kanan lalu mengirim file; pakai `scripts/lib/realSeq.mjs` / `bench-realnet.mjs` untuk menyetel filter (`ar/stable.js`, `ar/outputFilter.js`, `ar/magnet.js`, `TempleReach`, occluder kepala di `TryOnStage.jsx`).
2. **Delay VTO saat bergerak** (keluhan user di update 39): kompensasi sudah ada tapi belum diverifikasi di HP/laptop nyata; `requestVideoFrameCallback.captureTime` tidak ada di semua browser (fallback lead 25 ms).
3. **Telinga tidak bisa dideteksi** model MediaPipe; hanya perkiraan dari pose. Jika user ingin deteksi telinga sungguhan butuh model lain (di luar lingkup shared hosting/browser ringan) — jelaskan jujur.
4. **Permintaan "library Python 99% akurat" tidak bisa dipenuhi**: Python tidak jalan di browser/Hostinger shared; MediaPipe JS memakai model sama; jangan menjanjikan angka akurasi. Hasil scan hanya perkiraan; `widthClass`/`classifyRatios` di `data/faceShape.js` belum dikalibrasi dengan ukuran manusia nyata (saran: ukur ±20 orang dengan penggaris).
5. **Flash Sale mode server:** pendaftaran frame oleh Mitra hanya jalan di mode demo (localStorage seperti banner Mitra); server PHP belum punya akun Mitra. Admin juga belum bisa mengatur flash per-produk (hanya pengaturan acara).
6. **Pertanyaan ke user yang belum dijawab:** perlu kotak pesan simulasi (lead inbox) di dasbor Mitra? Kebijakan privasi bilang TryLens tidak menyimpan percakapan, jadi belum dibuat.
7. Data demo Mitra di perangkat di-reseed (persist versi 3) — bila skema akun berubah lagi, naikkan versi `trylens-partner` di `store/usePartner.js` dan pastikan `migrate` benar.

## 5. Yang harus dilakukan user (non-kode)
- Merge PR #20, build (`cd frontend && npx vite build`) dan upload `dist` ke Hostinger.
- Set token admin (≥24 karakter) di `<parent DOCUMENT_ROOT>/trylens-data/config.php`; setelah deploy buka `/admin` → tab **Flash Sale** → pilih tema **"Brand TryLens"** dan simpan sekali (pengaturan tersimpan sebelumnya masih tema lama).
- Isi `CONTACT` di `frontend/src/data/siteInfo.js` (belum diisi).
- **Perpanjang hosting sebelum 5 Nov 2026.**
- Uji VTO/scan di HP & laptop sendiri, catat kondisi gagal (sudut, cahaya, jarak) atau kirim data rekaman bila fitur debug dibuat.

## 6. Peta file penting
- Scan: `components/consult/FaceScanner.jsx`, `faceOverlay.js` (mesh, anchor, `earPoints`), `landmarker.js`, `data/faceShape.js`, `pages/ConsultPage.jsx`, `FaceSummary.jsx`.
- VTO: `components/tryon/TryOnStage.jsx`, `ar/PoseEngine.js` (`predict`, `leadGain`, `setLatency`, `CLIP_IDX`), `ar/stable.js` (`solvePivot`), `ar/quality.js`, `ar/eyeFit.js`, `ar/modelFit.js`.
- Flash Sale: `lib/flashSale.js`, `components/FlashSaleSection.jsx`, `pages/partner/FlashSaleTab.jsx`, `data/partnerMock.js`, PHP `index.php` (`flash_*`), Node `src/catalogStore.js` (`flashGet/flashClean`) + `routes/admin.js`.
- Beranda: `pages/HomePage.jsx`, `MerchantSection.jsx`, `RecommendationSection.jsx`, `ProductCard.jsx`, `ProductHoverPreview.jsx`, `index.css` (keyframes `tl-*`).
- Changelog: `CHANGELOG.md` (entri terbaru "Update 40" di atas).
