# CHANGELOG — TryLens

Catatan progres per update. Entri terbaru di paling atas. Jalur file relatif terhadap root `trylens-project/`.

Status: **MVP Implementation — kepatuhan PRD Homepage** (Header, Hero Carousel, Merchant Slider, Recommendation Feed dengan Category Tabs, Wishlist).

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
- Tampilan visual belum diperiksa di browser (baru lolos `vite build` dan uji jsdom).
