# CHANGELOG — TryLens

Catatan progres per update. Entri terbaru di paling atas. Jalur file relatif terhadap root `trylens-project/`.

Status: **MVP Implementation — kepatuhan PRD Homepage** (Header, Hero Carousel, Merchant Slider, Recommendation Feed dengan Category Tabs, Wishlist) + **Dashboard Mitra** (Update 7–8) + **Konsultasi lewat WhatsApp optik** (Update 9, menggantikan kotak masuk konsultasi Update 8).

---

## Update 9 — 2026-09-21 — Konsultasi langsung lewat WhatsApp optik (tanpa pengajuan lewat TryLens)

**Keputusan produk:** konsumen tidak perlu mengajukan konsultasi lewat TryLens. Bila ingin berkonsultasi, konsumen langsung diarahkan ke nomor WhatsApp masing-masing optik. Akibatnya formulir permintaan di sisi konsumen **dan** kotak masuk permintaan di dashboard Mitra ikut dihapus (tanpa pengajuan, kotak masuk itu tidak akan pernah terisi).

Zip ini **kumulatif** (berisi semua file Update 7–9): ekstrak dan timpa.

### Wajib setelah ekstrak
1. **Hapus manual 4 file** yang sudah tidak dipakai (zip tidak bisa menghapus file; bila tertinggal tidak menyebabkan error karena tidak ada lagi yang mengimpornya):
   - `frontend/src/pages/partner/RequestsPage.jsx`
   - `frontend/src/pages/partner/RequestDetailPage.jsx`
   - `frontend/src/components/partner/requests.jsx`
   - `frontend/src/data/consultMock.js`
2. **Tidak perlu `npm install` ulang dan tidak perlu reset database** (tidak ada dependensi baru; SQL hanya berubah di komentar).
3. Data konsultasi lama di browser (`trylens-consult`) dimigrasi otomatis: kotak masuk demo dibuang, frame yang dilihat dan hasil scan wajah dipertahankan.

### Diubah — sisi konsumen
| File | Perubahan |
|---|---|
| `frontend/src/pages/ConsultPage.jsx` | Ditulis ulang. **Dihapus:** formulir (nama, WhatsApp, jenis permintaan, pesan), tombol "Kirim Permintaan", layar "Permintaan terkirim", kode konsultasi `TL-xxxxx`. **Sekarang:** Langkah 1 scan wajah (opsional, tidak berubah) → Langkah 2 **Chat optik lewat WhatsApp**: pilih optik → kartu nomor WhatsApp optik (mis. `0812 3450 0001`) → tombol hijau **"Chat {optik} via WhatsApp"** yang membuka `wa.me/{nomor optik}` dengan pesan pembuka siap kirim (hasil scan wajah + frame yang dilihat dari optik itu). Hasil scan bisa dimatikan lewat centang; chip frame bisa dihapus. Tanpa optik terpilih tombol nonaktif ("Pilih optik dulu"); bila optik tidak punya nomor tombol nonaktif dengan keterangan. Catatan privasi diganti: TryLens tidak menyimpan nomor maupun percakapan. Titik masuk tidak berubah: `?toko=` dan `?frame=` tetap memilih optik otomatis. |
| `frontend/src/store/useConsult.js` | Hanya menyimpan `viewed` (frame dilihat) dan `face` (hasil scan). **Dihapus:** `items` (kotak masuk), `submit`, `setStatus`, `normalizeWa`. Versi penyimpanan 1 → 2 dengan `migrate` + `partialize`. |
| `frontend/src/pages/TryOnPage.jsx`, `ProductDetailPage.jsx` | Hanya komentar kode (frame yang dilihat kini "ikut disebut di pesan WhatsApp"). Tombol "Scan bentuk wajah & konsultasi dengan optik" tetap, menuju `/konsultasi`. |

### Diubah — sisi Mitra
| File | Perubahan |
|---|---|
| `frontend/src/pages/partner/DashboardPage.jsx` | Kartu **Permintaan Konsultasi** dihapus. Kolom kanan kini hanya kartu Paket Anda. KPI "Hubungi Toko" (klik WhatsApp) tetap. |
| `frontend/src/layouts/PartnerLayout.jsx` | Lonceng tidak lagi menampilkan permintaan baru: tanpa titik merah, isi "Belum ada notifikasi." (tempat notifikasi lain di masa depan, mis. tagihan). |
| `frontend/src/App.jsx` | Rute `/partner/requests` dan `/partner/requests/:id` dihapus. Alamat lama otomatis kembali ke dashboard. |
| `frontend/src/pages/partner/SettingsTabs.jsx` | Baris notifikasi "Permintaan pelanggan baru" dihapus (TryLens tidak lagi tahu kapan pelanggan menghubungi lewat WhatsApp). Kunci `newLead` di state dibiarkan agar data demo tidak perlu di-reset. |
| `frontend/src/components/partner/StoreForm.jsx` | Petunjuk kolom WhatsApp: nomor ini dipakai tombol "Hubungi Toko" **dan konsultasi pelanggan (langsung ke nomor ini)**. |
| `frontend/src/data/partnerMock.js` | Teks fitur paket Basic: "Permintaan konsultasi + hasil scan wajah pelanggan" → "Konsultasi pelanggan langsung ke WhatsApp toko (bisa disertai hasil scan wajah)". |

### Dihapus
`pages/partner/RequestsPage.jsx`, `pages/partner/RequestDetailPage.jsx`, `components/partner/requests.jsx` (kartu, halaman, dan detail permintaan), `data/consultMock.js` (jenis permintaan, status, data demo).

### Database (`backend-php/database/`) — hanya komentar
- `schema.sql` dan `dashboard_queries.sql`: tabel `consultations` + `consultation_frames` dan query 6–6f ditandai **tidak dipakai sejak Update 9**. Tabel **sengaja tidak dihapus** supaya database Update 8 yang sudah dibuat tidak perlu di-reset; aman di-`DROP` bila memang tidak akan dipakai (`consultation_frames` dulu, baru `consultations`). `seed.sql` tidak diubah.
- Klik tombol WhatsApp saat API dibuat: catat sebagai `analytics_events.event_type = 'contact_click'` (sudah ada di skema). Nilai enum `consult_submit` tidak terpakai lagi.

### Pengujian
- `vite build` lolos untuk seluruh `App.jsx` (tidak ada impor yang mengarah ke file yang dihapus).
- 15 uji otomatis (jsdom) lolos; uji yang sama gagal 14 dari 15 pada kode Update 8, jadi benar-benar mendeteksi perubahan ini. Isinya: tidak ada formulir/kirim; link `wa.me` memakai nomor optik yang dipilih; pesan memuat hasil scan dan frame (hanya milik optik terpilih); centang dan hapus chip memengaruhi pesan; optik tanpa nomor; migrasi penyimpanan v1 → v2; dashboard tanpa kartu permintaan; lonceng; rute lama; pengaturan notifikasi; tidak ada kelas warna `zinc/slate/gray/amber/black`.
- Tampilan `/konsultasi` diperiksa lewat screenshot desktop dan HP (Chrome headless).
- **Batas pengujian:** `mockData.js`, `ConnectMerchantModal.jsx`, dan berkas beranda lain tidak ada di zip, jadi uji memakai *stub* dengan bentuk data yang sama (`MERCHANTS[].whatsapp`, `PRODUCTS[].merchantId`). Warna di screenshot memakai token tebakan, bukan `tailwind.config.js` asli. Cek sekali di `npm run dev`: `/konsultasi`, `/konsultasi?toko=m1`, `/konsultasi?frame=f0`, dan `/partner`.

### Catatan / batas
- Konsultasi sekarang **sepenuhnya bergantung pada nomor `whatsapp` tiap optik** (`mockData.js`, `merchants.json`, `stores.whatsapp`). Nomor demo (`62812345000xx`) harus diganti nomor asli sebelum dipakai.
- Toggle Pengaturan Toko → "Tombol Hubungi Toko" belum memengaruhi `/konsultasi` (halaman itu membaca data merchant publik, bukan pengaturan Mitra). Sambungkan saat API dibuat.
- Mitra tidak lagi punya riwayat/status konsultasi di TryLens; hitungan "Hubungi Toko" di dashboard dan analitik menjadi satu-satunya jejak (masih data mock).
- `ConnectMerchantModal.jsx` (tombol "Cocok! Hubungkan ke …" dan Checkout di halaman produk/try-on) tidak ada di zip, jadi **tidak diperiksa**; bila di dalamnya ada alur "ajukan lewat TryLens", perlu disesuaikan dengan keputusan yang sama.

---

## Update 8 — 2026-09-21 — Warna dashboard sesuai palet, model harga (bulanan/tahunan + iklan mingguan), konsultasi konsumen ↔ Mitra dengan scan wajah AR

Zip ini **kumulatif**: berisi semua file Update 7 dan 8 (banyak file Update 7 ikut berubah), jadi cukup ekstrak dan timpa.

### Wajib setelah ekstrak
1. `cd frontend && npm install` — dependensi baru **`@mediapipe/tasks-vision`** (pemindai wajah; dimuat malas, hanya saat pemindai dibuka) selain `lucide-react` dari Update 7.
2. Database: jalankan ulang `schema.sql` dan `seed.sql` (skema berubah; **hapus database `trylens` lama dulu** — `DROP DATABASE trylens;`).
3. Data demo di browser (localStorage) otomatis di-reset satu kali karena struktur data berubah (`trylens-partner` v2).

### 1. Warna dashboard sesuai palet
Penyebab ketidakkonsistenan: dashboard Update 7 meniru referensi secara harfiah (hitam/putih/abu-abu Tailwind `zinc`), padahal palet TryLens sudah ada di `tailwind.config.js` (`blue` #427AB5, `blue-deep` #406AAF, `accent-yellow` #F7DD7D, `accent-cream` #FFE8BE, `surface-blue`, `ink`). Tata letak tetap mengikuti referensi; **warna kini memakai token palet**:
- Aksi utama, menu aktif, toggle, grafik, meter → `blue-deep`. Latar halaman → `surface-blue`, kartu → tint biru muda.
- Kuning `accent-yellow` khusus untuk Pro/Upgrade (chip header, mahkota, tombol upgrade); krem untuk pemberitahuan. Hijau/merah hanya untuk status.
- Halaman login memakai gradien `blue-deep → blue` (sebelumnya slate/biru gelap bawaan komponen paste).
- Kontras teks dicek (WCAG): teks putih di `blue-deep` 5,4:1; `ink` di kuning 13:1; teks samar `ink-muted` ≥ 4,6:1.
- Uji otomatis baru: 23 halaman (3.250 elemen) tidak boleh memuat kelas `zinc/slate/gray/amber/black`.

### 2. Model langganan & iklan
| Item | Harga |
|---|---|
| Basic | Rp299.000/bulan · Rp2.990.000/tahun (hemat 2 bulan = Rp598.000) |
| Pro | Rp799.000/bulan · Rp7.990.000/tahun (hemat 2 bulan = Rp1.598.000) |
| Slot Iklan Banner | mulai Rp500.000/minggu (Halaman Mitra Rp500.000; Beranda **Rp900.000 = placeholder**) |
| Highlighted Brand | Rp350.000/minggu per slot (6 slot; slot 2 dan 5 dianggap terisi — mock) |
| Sponsored Frame | Rp200.000–800.000/minggu **per frame** (Kategori 200rb, Pencarian **450rb = placeholder**, Beranda 800rb) |

- Pilihan Bulanan/Tahunan di pemilih paket (onboarding dan Langganan → Upgrade Plan). Upgrade tanpa prorata (paket lama diganti hari itu juga); tahunan → bulanan baru bisa setelah periode berakhir.
- Iklan **bukan bagian langganan**: dipesan per minggu (1–8) di menu Promosi → Checkout → aktif. Banner lewat status "Menunggu review". Invoice dan Billing memuat langganan dan iklan.
- **Asumsi yang perlu dikonfirmasi:** Highlighted Brand dan Sponsored Frame hanya bisa dipesan paket **Pro** (mengikuti daftar terkunci di spesifikasi awal); banner terbuka untuk Basic dan Pro. Ubah di `PLANS[..].features` (`partnerMock.js`) bila keputusannya berbeda.
- Kuota banner per paket dihapus (diganti pembelian per minggu). Batas frame tetap: Basic 50, Pro tanpa batas.

### 3. Konsultasi konsumen ↔ Mitra (dua arah), scan wajah AR
> **Sudah diganti di Update 9:** formulir permintaan dan kotak masuk Mitra di bawah ini dihapus; konsultasi kini langsung lewat WhatsApp optik. Scan wajah AR dan pencatatan frame yang dilihat tetap dipakai.

Prinsip: **try-on tidak pernah butuh akun**; identitas minimum (nama panggilan + WhatsApp) baru diminta saat konsumen minta dibantu.
| File | Fungsi |
|---|---|
| `frontend/src/pages/ConsultPage.jsx` | `/konsultasi` (tanpa login): scan wajah (opsional) + form permintaan (optik, nama, WhatsApp, jenis, pesan, frame yang dilihat). Setelah terkirim: kode `TL-xxxxx` + tombol WhatsApp dengan pesan berisi hasil scan. |
| `frontend/src/components/consult/FaceScanner.jsx`, `landmarker.js` | Kamera → **MediaPipe Face Landmarker** → rasio wajah → bentuk wajah (Oval, Bulat, Persegi, Hati, Lonjong) + perkiraan lebar wajah (dari jarak pupil). Diproses di perangkat; tidak ada foto/video yang disimpan atau dikirim. Bila kamera/model gagal: pilihan manual, ditandai "manual" (bukan hasil AR). |
| `frontend/src/data/faceShape.js` | Aturan klasifikasi, gaya frame yang disarankan per bentuk wajah. |
| `frontend/src/store/useConsult.js`, `data/consultMock.js` | Kotak masuk konsultasi bersama (mock, localStorage) + frame yang dilihat + hasil scan terakhir. |
| `frontend/src/components/consult/FaceSummary.jsx` | Ringkasan hasil analisis (dipakai di sisi konsumen dan Mitra). |
| `frontend/src/pages/partner/RequestsPage.jsx`, `RequestDetailPage.jsx`, `components/partner/requests.jsx` | Sisi Mitra: kartu **Permintaan Konsultasi** di dashboard (badge Guest, jenis, hasil scan), halaman `/partner/requests` (filter Konsultasi / Ketersediaan / Pertanyaan Produk / Minat Membeli), detail `/partner/requests/:id` (analisis wajah, frame dilihat, pertanyaan, **rekomendasi dari katalog toko**, tombol WhatsApp yang menandai "Dihubungi"). |
Titik masuk konsumen: tombol **Konsultasi** di header, tombol di halaman Try-On dan detail produk. Frame yang dilihat/dicoba dicatat otomatis (tanpa login).

### Diubah
`App.jsx` (rute `/konsultasi`, `/partner/requests`), `MainNav.jsx` (tombol Konsultasi), `TryOnPage.jsx`, `ProductDetailPage.jsx` (catat frame dilihat + ajakan konsultasi), `package.json`/`package-lock.json`, dan seluruh berkas dashboard Mitra (warna, harga, iklan).

### Database (`backend-php/database/`)
- `plans`: `price_monthly_idr` + `price_yearly_idr` (kolom `max_active_banners` dihapus). `subscriptions.billing_interval`.
- Baru: `ad_orders` (pesanan iklan mingguan; CHECK total = harga × minggu × jumlah, durasi 1–8 minggu, tanggal akhir konsisten), `consultations` + `consultation_frames` (pengganti `leads`; hasil scan berupa label/rasio, tanpa foto), `invoices` kini untuk langganan **atau** iklan (`kind`).
- `highlighted_brands`: satu slot aktif = satu toko (UNIQUE pada kolom turunan). `banner_ads`/`sponsored_frames` terhubung ke `ad_orders`.
- Semua constraint diuji (ditolak sesuai harapan). `dashboard_queries.sql` diperbarui (konsultasi, rekomendasi lewat `FIND_IN_SET`, slot kosong, aktivasi langganan dan iklan).

### Catatan penting / batas
- **Pemindai kamera belum bisa diuji di lingkungan pengembangan ini** (tanpa kamera/browser). Yang teruji: rumus klasifikasi (data landmark sintetis), jalur manual, seluruh alur kirim–terima konsultasi. Uji di HP/laptop Anda; pertama kali memuat WASM (jsDelivr) dan model (~4 MB, Google Storage) sehingga butuh internet.
- **Ambang klasifikasi bentuk wajah adalah aturan heuristik, belum dikalibrasi** dengan data wajah nyata; hasil diberi label "estimasi". Lebar wajah (mm) memakai jarak pupil 63 mm sebagai skala, akurasi ±10%.
- Mock: semua frame satu toko bergaya sama (mis. Optik Kusuma semuanya aviator), sehingga rekomendasi katalog sering kosong di data demo.
- Belum dibuat: endpoint PHP (auth, langganan, iklan, konsultasi), chat di dalam TryLens, akun konsumen (level "Customer" baru disiapkan di skema/UI).
- Harga di sisi klien hanya untuk tampilan; saat API dibuat, hitung ulang di server.

## Update 7 — 2026-09-21 — Dashboard Mitra (Partner), alur login → langganan → setup toko, skema database SQL

Fitur baru: area **Mitra** (`/partner/*`). Alurnya: Beranda → **ikon user di header** → Partner Login → autentikasi →
(belum berlangganan: Onboarding → Pilih Paket → Checkout → Payment Success → Setup Toko) atau (sudah berlangganan) → Dashboard.

### Wajib setelah ekstrak
1. `cd frontend && npm install` — ada dependensi baru **`lucide-react`** (dipakai komponen login dan seluruh dashboard).
2. Opsional, untuk database: `mysql -u root -p < backend-php/database/schema.sql` lalu `mysql -u root -p trylens < backend-php/database/seed.sql`.

### Akun demo (password semua: `Partner123!`)
| Email | Kondisi |
|---|---|
| `basic@optikkusuma.id` | Paket Basic, toko Optik Kusuma → langsung ke dashboard |
| `pro@lensakita.id` | Paket Pro, toko Lensa Kita → langsung ke dashboard |
| `baru@optikbaru.id` | Belum berlangganan → menjalani alur onboarding penuh |

### Baru — halaman & alur
| File | Fungsi |
|---|---|
| `frontend/src/components/ui/sign-in-page.jsx` | Komponen `LoginPage` dua panel (dari task paste), mode `login` / `register`. |
| `frontend/src/components/PartnerAccountButton.jsx` | Ikon user di header beranda: belum masuk → `/partner/login`; sudah masuk → menu (dashboard / lanjutkan setup / keluar). |
| `frontend/src/pages/partner/PartnerLoginPage.jsx`, `PartnerRegisterPage.jsx` | `/partner/login`, `/partner/register` (login memuat panel akun demo). |
| `frontend/src/pages/partner/OnboardingPage.jsx` | Langkah 1 — pilih paket Basic / Pro. |
| `frontend/src/pages/partner/CheckoutPage.jsx` | Langkah 2 — metode pembayaran + ringkasan (pembayaran **simulasi**). |
| `frontend/src/pages/partner/PaymentSuccessPage.jsx` | Langkah 3 — invoice & tagihan berikutnya. |
| `frontend/src/pages/partner/StoreSetupPage.jsx` | Langkah 4 — setup toko (memakai `StoreForm`). |
| `frontend/src/components/partner/Gate.jsx` | Penjaga rute: tahap akun `guest → onboarding → setup → dashboard`, mengarahkan ke halaman yang benar. |
| `frontend/src/components/partner/PartnerFlowShell.jsx` | Kerangka halaman onboarding + indikator langkah + logo Partner. |

### Baru — dashboard (gaya mengikuti referensi: monokrom, kartu KPI, grafik garis dengan tooltip, kartu permintaan)
| File | Fungsi |
|---|---|
| `frontend/src/layouts/PartnerLayout.jsx` | Header: logo, menu pil (Dashboard · Toko · Virtual Try-On · Analitik · Promosi · Langganan), chip paket, lonceng, gear (Settings), menu akun. |
| `frontend/src/pages/partner/DashboardPage.jsx` | KPI (Kunjungan Toko, Sesi Try-On, Klik Frame, Hubungi Toko) dengan periode Hari ini / Minggu ini / Bulan ini, grafik Ikhtisar Kunjungan, Promosi Aktif, Permintaan Terbaru (Tanggapi / Abaikan), kartu Paket Anda. |
| `frontend/src/pages/partner/SectionPage.jsx` | Peta menu → sub-menu → halaman (`/partner/:section/:tab`). |
| `frontend/src/pages/partner/StoreTabs.jsx` | Store Profile, Products / Frames (CRUD + kuota), Collections, Store Preview. |
| `frontend/src/pages/partner/VtoTabs.jsx` | Frame Library, Try-On Analytics, VTO Settings. |
| `frontend/src/pages/partner/AnalyticsTabs.jsx` | Overview (semua paket); Store Visitors, Product Performance, Try-On Performance (**Pro**). |
| `frontend/src/pages/partner/PromotionTabs.jsx` | Banner Ads (kuota per paket); Highlighted Brand dan Sponsored Frame (**Pro**, maks. 3 frame). |
| `frontend/src/pages/partner/SubscriptionTabs.jsx` | Current Plan, Billing (riwayat invoice), Upgrade Plan. |
| `frontend/src/pages/partner/SettingsTabs.jsx` | Account (+ ganti password), Store Settings, Notifications. |
| `frontend/src/components/partner/ui.jsx`, `PlanCard.jsx`, `LineChart.jsx`, `StoreForm.jsx` | Primitif UI, kartu paket + `ProLock` + `PlanPicker`, grafik SVG, formulir profil toko. |
| `frontend/src/data/partnerMock.js`, `frontend/src/store/usePartner.js` | Data mock + state (Zustand, disimpan di localStorage `trylens-partner`). |

### Basic vs Pro di UI
- Kartu **PAKET ANDA**: Basic menampilkan harga, tagihan berikutnya, tombol Kelola Langganan, daftar terkunci "Tersedia di Pro" (Analitik Lanjutan, Featured Store, Sponsored Frame) dan ajakan "Buka Analitik Lanjutan dengan Pro → Upgrade ke Pro". Pro menampilkan semua fitur aktif.
- Fitur Pro di Basic tidak disembunyikan: kontennya diburamkan (tidak bisa difokus/diklik) dengan kartu ajakan upgrade. Menu Pro diberi ikon mahkota.
- Kuota: Basic maks. 50 frame dan 1 banner aktif; Pro tanpa batas frame dan 5 banner.
- **Harga tidak hanya muncul saat daftar:** upgrade/downgrade selalu bisa diakses lewat chip "Basic · Upgrade" di header, kartu paket, overlay fitur terkunci, dan Langganan → Upgrade Plan. Upgrade masuk Checkout, downgrade dijadwalkan ke akhir periode.

### Baru — database (folder baru `backend-php/database/`)
| File | Fungsi |
|---|---|
| `schema.sql` | 21 tabel + 2 view (MySQL 8 / MariaDB 10.5+). Peta tabel → menu dashboard ada di komentar kepala file. Aturan yang ditegakkan di database: satu langganan aktif per user, `compare_at_price >= price`, `ends_on >= starts_on`. |
| `seed.sql` | Paket, 3 akun demo, 6 toko, 24 frame, koleksi, promosi, leads, statistik 60 hari (dihasilkan dari data mock agar konsisten). |
| `dashboard_queries.sql` | Query acuan untuk endpoint API dashboard (KPI, grafik bulanan, frame teratas, kuota, aktivasi langganan). |

### Catatan penting
- **Frontend berjalan dengan data mock (localStorage), belum memanggil database.** Endpoint PHP untuk auth, langganan, dan CRUD belum dibuat; struktur data mock sudah mengikuti tabel SQL sehingga tinggal diganti pemanggilan API. Password di mode mock disimpan apa adanya; di database wajib memakai `password_hash()` (seed sudah berisi hash bcrypt).
- **Harga Pro Rp599.000 adalah angka sementara.** Ubah di `partnerMock.js` (`PLANS.pro.price`) dan tabel `plans`.
- **TypeScript / shadcn:** project ini JavaScript (tanpa `tsconfig`, tanpa alias `@/`, tanpa `shadcn init`), jadi komponen `sign-in-page.tsx` dikonversi ke `.jsx` dan diletakkan di `frontend/src/components/ui/` sesuai instruksi task. Gambar CDN diganti ilustrasi lokal, tombol Google/GitHub dihapus (belum ada OAuth), teks diterjemahkan. Bila kelak project dimigrasi ke TypeScript + shadcn: `npm i -D typescript @types/react @types/react-dom`, tambahkan `tsconfig.json` dengan alias `@/* → src/*` (dan `resolve.alias` di `vite.config.js`), lalu `npx shadcn@latest init`. Folder `components/ui` penting karena shadcn CLI memasang komponen ke sana dan impor `@/components/ui/...` bergantung pada lokasi tersebut.
- Folder baru: `components/ui/`, `components/partner/`, `pages/partner/`, `backend-php/database/`. Struktur folder lama tidak diubah.
- Fitur Pro-only saat ini hanya dikunci di UI; saat API dibuat, wajib dicek ulang di server lewat `v_store_entitlements`.

## Update 6 — 2026-09-20 — Koreksi Flash Sale beranda: 3 kolom, 1 baris, geser ke samping

Koreksi atas Update 5 (sebelumnya salah dibaca sebagai 3 baris).

### Diubah
| File | Perubahan |
|---|---|
| `frontend/src/pages/HomePage.jsx` | Flash Sale beranda: `rows={1}` (sebelumnya `rows={3}`). |
| `frontend/src/components/FlashSaleSection.jsx` | Layout `"slider"` sekarang lebar kolomnya menyesuaikan layar: **3 kartu per layar** di desktop (`lg`), 2 di tablet (`md`), 1 kartu + sedikit kartu berikutnya di HP. Default `rows` menjadi 1. Tombol panah menggeser satu "halaman" (±3 kartu), snap merapikan posisinya. Semua 12 produk flash tetap bisa dijangkau dengan geser ke samping. |

---

## Update 5 — 2026-09-20 — Beranda: hapus "Jelajahi Berdasarkan Gaya", Flash Sale model geser 3 baris

### Diubah
| File | Perubahan |
|---|---|
| `frontend/src/pages/HomePage.jsx` | Section "Jelajahi Berdasarkan Gaya" (`QuickCategorySection`) dihapus dari beranda (import dan pemakaian). Urutan beranda sekarang: Hero → Flash Sale → Toko Optik Pilihan → Koleksi Frame Terbaru. Flash Sale memakai `layout="slider"` `rows={3}` `limit={12}`. |
| `frontend/src/components/FlashSaleSection.jsx` | Layout baru `"slider"`: kartu tersusun 3 baris dan **digeser ke samping** (scroll horizontal, snap per kolom, scrollbar disembunyikan), tidak lagi menumpuk ke bawah. Tombol panah kiri/kanan (desktop) dengan status disabled di ujung. Prop baru `layout` dan `rows`. Layout `"grid"` tetap dipakai di `/toko/:id` dan `/mitra`. |

### Catatan
- File `frontend/src/components/QuickCategorySection.jsx` dan data `QUICK_CATEGORIES` di `mockData.js` sekarang tidak dipakai; **tidak dihapus** (zip update hanya menimpa/menambah file). Hapus manual bila memang tidak diperlukan.
- Entri "Berdasarkan Gaya" di menu Jelajahi (`ExploreMenu.jsx`) tidak diubah.

---

## Update 4 — 2026-09-20 — Beranda: hero lebih kecil + Flash Sale, menu Jelajahi (mega menu)

### Baru
| File | Fungsi |
|---|---|
| `frontend/src/components/ExploreMenu.jsx` | Mega menu "Jelajahi" bergaya Tokopedia: muncul saat **hover** (juga bisa klik/keyboard), panel selebar layar di bawah header, latar halaman digelapkan. Kiri: 7 kategori (Semua Frame, Frame Pria, Frame Wanita, Frame Anak, Berdasarkan Gaya, Promo & Flash Sale, Toko Optik). Kanan: judul + ikon dan grup link kategori yang di-hover. Link gaya hanya menampilkan gaya yang benar-benar ada per kategori (dengan jumlah), jadi tidak ada link ke hasil kosong. Menutup dengan Escape, klik di luar, atau kursor keluar. Hanya tampil di layar ≥ md (seperti tombol Jelajahi sebelumnya). |

### Diubah
| File | Perubahan |
|---|---|
| `frontend/src/components/HeroCarousel.jsx` | Hero diperkecil: rasio 21:9 → 3:1 (desktop), 4:5 → 5:6 (HP); judul, teks, tombol, dan ilustrasi ikut dikecilkan. |
| `frontend/src/pages/HomePage.jsx` | Section Flash Sale tepat di bawah hero (6 kartu, 3 kolom di desktop, "Lihat semua" menuju tab Promo). |
| `frontend/src/components/FlashSaleSection.jsx` | Prop baru: `id` (anchor scroll), `columns` (2/3), `onSeeAll`. |
| `frontend/src/components/MainNav.jsx` | Tombol "Jelajahi" statis diganti `ExploreMenu`; menerima `onJumpToFeed` dan `onJumpToFlash`. |
| `frontend/src/layouts/Layout.jsx` | Tambah `jumpToFlash()`; meneruskan handler ke `MainNav`. |
| `frontend/src/store/useFilter.js` | State baru `activeStyle`, aksi `setView(cat, style)` dan `clearStyle()`. `setCategory` sekarang juga membersihkan filter gaya. |
| `frontend/src/components/RecommendationSection.jsx` | Feed menerapkan filter gaya; chip "Gaya: … ✕" untuk menghapusnya. |
| `frontend/src/data/mockData.js` | Ekspor `STYLE_LABELS` (aviator, round, square, cateye, rect = Minimalist, browline). |

---

## Update 3 — 2026-09-20 — Banner diperkecil + section Flash Sale

**Tujuan:** banner iklan di awal halaman terlalu besar; dikecilkan ±separuh, lalu ditambah section Flash Sale tepat di bawahnya.

### Baru
| File | Fungsi |
|---|---|
| `frontend/src/components/FlashSaleSection.jsx` | Section Flash Sale: judul + hitung mundur (sampai 23:59:59 hari ini, waktu lokal perangkat) + kartu horizontal ringkas (gambar, badge diskon, harga flash, harga coret, bar "Terjual %"). Maks. 4 kartu, 2 kolom di desktop, 1 kolom di HP. Tidak dirender bila tidak ada item. |

### Diubah
| File | Perubahan |
|---|---|
| `frontend/src/components/PromoAdBanners.jsx` | Banner dikecilkan: tinggi minimal 80px, ±80–90px dengan teks 2 baris (sebelumnya minimal 160px), satu baris ikon + teks + tombol CTA. Ilustrasi disembunyikan di layar < 640px agar teks lega. Berlaku di `/mitra` dan `/toko/:id`. |
| `frontend/src/pages/MerchantPage.jsx` | Flash Sale ditaruh tepat di bawah banner, berisi frame flash milik toko tersebut. |
| `frontend/src/pages/MitraPage.jsx` | Flash Sale lintas mitra (4 teratas menurut % terjual) di bawah banner, dengan nama toko di tiap kartu. |
| `frontend/src/data/mockData.js` | Produk punya `flash` dan `flashSold`. Tiap merchant punya 2 frame flash (12 produk flash total). Produk flash otomatis berdiskon (`oldPrice` = harga × 1,5, badge -33%), sehingga harga konsisten di kartu, detail, dan wishlist. Akibatnya jumlah produk di tab "Promo" bertambah. |
| `backend-php/data/products.json` | Disinkronkan dengan `mockData.js` (termasuk `isNew`, `order`, `flash`, `flashSold`). |

---

## Update 2 — 2026-09-20 — Akun sosmed & e-commerce dipindah ke header profil toko

**Tujuan:** banner Promo dan Katalog Terbaru langsung terlihat di layar pertama halaman detail toko, tanpa scroll.

### Diubah
| File | Perubahan |
|---|---|
| `frontend/src/pages/MerchantPage.jsx` | Section "Temukan ... di Online" dihapus sebagai blok terpisah. Linknya masuk ke header profil toko, di sisi **kanan**, dipisah **garis tipis** (vertikal di desktop, horizontal di HP). Banner Promo dan Katalog Terbaru sekarang tepat di bawah header. Padding header dikecilkan (`p-5 md:p-6`). Blok link hanya dirender bila merchant punya minimal satu link (`hasLinks`). |
| `frontend/src/components/SocialCommerceSection.jsx` | Tambah prop `variant`: `"card"` (default, kartu besar, tetap dipakai di `/mitra`) dan `"inline"` (ringkas tanpa kartu: chip Instagram, X, Tokopedia, Shopee). |

### Tidak berubah
- Halaman `/mitra` tetap memakai `variant="card"` untuk kanal resmi TryLens.
- Data (`mockData.js`, `merchants.json`) tidak berubah.

---

## Update 1 — 2026-09-20 — Fitur Mitra & Detail Toko

### Baru
| File | Fungsi |
|---|---|
| `frontend/src/pages/MitraPage.jsx` | Halaman `/mitra`: banner iklan, filter (wilayah, Rating 4.8+, Sedang promo), sort (rating, frame terbanyak, nama), grid merchant, section kanal resmi TryLens |
| `frontend/src/components/SocialCommerceSection.jsx` | Satu section: Media Sosial (Instagram, X) + E-commerce (Tokopedia, Shopee) |
| `frontend/src/components/PromoAdBanners.jsx` | Banner iklan bergaya hero: Promo Frame Terbaru dan Katalog Terbaru |
| `frontend/src/components/FilterSortBar.jsx` | Bar filter + sort yang dipakai ulang |
| `frontend/src/components/MerchantCard.jsx` | Kartu merchant untuk grid `/mitra` |
| `frontend/src/components/icons/SocialIcons.jsx` | Ikon Instagram, X, tas belanja, panah eksternal |

### Diubah
| File | Perubahan |
|---|---|
| `frontend/src/pages/MerchantPage.jsx` | Iklan per toko, filter (kategori, Sedang promo, Baru), sort (relevan, terbaru, harga, diskon, nama), reset filter saat pindah toko, breadcrumb ke `/mitra` |
| `frontend/src/components/MainNav.jsx` | **Tombol back** di header semua halaman selain beranda (fallback ke beranda bila tidak ada riwayat); di HP menggantikan logo |
| `frontend/src/App.jsx` | Route `/mitra` |
| `frontend/src/layouts/Layout.jsx` | Scroll ke atas saat pindah halaman; tab Toko Optik menuju `/mitra` |
| `frontend/src/components/CategoryNav.jsx` | Tab Toko Optik menyala di `/mitra` dan `/toko/*` |
| `frontend/src/components/Logo.jsx` | Logo menjadi `<Link to="/">` (sebelumnya `href="#"`) |
| `frontend/src/components/MerchantSection.jsx` | "Lihat semua toko" menuju `/mitra` |
| `frontend/src/data/mockData.js` | Merchant: `province`, `links`; ekspor `OFFICIAL_LINKS`; produk: `isNew`, `order` |
| `backend-php/data/merchants.json` | Data merchant disamakan dengan `mockData.js` (`merchants.php` tidak diubah) |

---

## Update 0 — sebelum sesi ini (dari handover)

- Ikon hati wishlist diganti ke path yang lebih halus dan diseragamkan di header, kartu produk, tombol wishlist mengambang, halaman detail, dan halaman try-on.
- Susunan notifikasi/wishlist/avatar di header: `gap-2 md:gap-3`, `ml-auto`, dan `flex-shrink-0` per item.

---

## Catatan terbuka

- URL Instagram, X, Tokopedia, Shopee di `mockData.js` dan `merchants.json` masih **placeholder**; ganti dengan akun asli.
- `backend-node/data/merchants.json` dan `backend-node/data/products.json` belum disamakan dengan versi PHP; salin isinya bila backend Node dipakai.
- Waktu berakhir Flash Sale masih mock (akhir hari ini). Ganti dengan field `endsAt` dari backend saat API siap.
- Filter dan sort belum ada di feed beranda (`RecommendationSection.jsx`); `FilterSortBar` bisa dipakai ulang di sana.
- Menu Jelajahi belum ada di tampilan HP (tombolnya memang disembunyikan di bawah breakpoint `md`); perlu rancangan tersendiri (mis. drawer).
- Tampilan visual belum diperiksa di browser (baru lolos `vite build` dan uji jsdom): cek ukuran hero di HP, posisi panel Jelajahi, dan latar gelapnya.
