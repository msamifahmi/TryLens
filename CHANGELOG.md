# CHANGELOG — TryLens

Catatan progres per update. Entri terbaru di paling atas. Jalur file relatif terhadap root `trylens-project/`.

Status: **MVP Implementation — kepatuhan PRD Homepage** (Header, Hero Carousel, Merchant Slider, Recommendation Feed dengan Category Tabs, Wishlist) + **Dashboard Mitra** (Update 7).

---

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
