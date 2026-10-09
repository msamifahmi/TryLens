import { PLANS } from "./partnerMock.js";

const rp = (n) => `Rp${n.toLocaleString("id-ID")}`;

/**
 * Isi halaman info (footer). Blok: p (paragraf), h (subjudul), list, steps [{t,d}], faq [{q,a}], cards [{t,d}], plans, cta {label,to}.
 * Seluruh klaim mengikuti fitur yang benar-benar ada di aplikasi.
 */
export const INFO_PAGES = {
  tentang: {
    title: "Tentang TryLens",
    lead: "Marketplace kacamata dengan coba virtual, yang menghubungkan kamu dengan toko optik lokal di seluruh Indonesia.",
    blocks: [
      { type: "h", text: "Kenapa TryLens ada" },
      { type: "p", text: "Memilih kacamata biasanya berarti datang ke toko, mencoba satu per satu, lalu bingung apakah ukurannya benar-benar cocok. Di sisi lain, toko optik lokal kesulitan tampil di dunia digital. TryLens mempertemukan keduanya: kamu mencoba frame langsung di wajah lewat kamera, toko mendapat calon pembeli yang sudah yakin." },
      { type: "h", text: "Cara kami bekerja" },
      { type: "cards", items: [
        { t: "Coba virtual 1:1", d: "Frame tampil berukuran asli di wajahmu. Ukuran diambil dari data toko (lensa, jembatan, gagang), atau disesuaikan otomatis dengan lebar wajah bila belum diisi." },
        { t: "Toko lokal, bukan gudang", d: "TryLens tidak menjual frame langsung. Pembelian diselesaikan bersama toko optik mitra, lewat WhatsApp atau tautan e-commerce toko." },
        { t: "Privasi dulu", d: "Kamera hanya aktif selama sesi coba. Video tidak direkam dan tidak disimpan." }
      ] },
      { type: "cta", label: "Mulai coba frame", to: "/" }
    ]
  },
  "cara-kerja": {
    title: "Cara Kerja",
    lead: "Dari memilih frame sampai menghubungi toko, semuanya dalam satu alur.",
    blocks: [
      { type: "steps", items: [
        { t: "Pilih frame", d: "Jelajahi frame dari berbagai toko optik. Filter berdasarkan gaya, kategori, harga, atau toko." },
        { t: "Coba di wajahmu", d: "Tekan Coba Sekarang, izinkan kamera, dan frame langsung terpasang di wajahmu mengikuti gerak kepala." },
        { t: "Cek kecocokan", d: "Lihat laporan kecocokan: lebar frame dibanding wajahmu, posisi lensa terhadap pupil, dan jarak ke alis." },
        { t: "Ganti frame tanpa ulang", d: "Pindah ke frame lain dari toko yang sama tanpa mematikan kamera." },
        { t: "Hubungi toko", d: "Tekan Hubungkan ke toko untuk berkonsultasi lewat WhatsApp (bisa disertai hasil scan bentuk wajah), atau beli lewat tautan e-commerce toko bila tersedia." }
      ] },
      { type: "cta", label: "Lihat panduan Virtual Try-On", to: "/virtual-try-on" }
    ]
  },
  "virtual-try-on": {
    title: "Virtual Try-On",
    lead: "Coba kacamata langsung di wajahmu, dengan ukuran sebenarnya.",
    blocks: [
      { type: "h", text: "Supaya hasilnya pas" },
      { type: "list", items: [
        "Hadapkan wajah ke sumber cahaya. Hindari lampu tepat di belakang kepala.",
        "Singkirkan poni dari alis dan mata.",
        "Tatap kamera 1–2 detik di awal agar ukuran wajahmu terkalibrasi, lalu menoleh pelan.",
        "Jaga jarak sekitar 40–60 cm dari kamera."
      ] },
      { type: "h", text: "Ukuran asli (1:1)" },
      { type: "p", text: "Setiap toko bisa mengisi ukuran frame: lebar lensa, tinggi lensa, lebar jembatan, panjang gagang, dan lebar total. Bila diisi, frame tampil berukuran sebenarnya. Bila belum, ukuran otomatis disesuaikan dengan lebar wajahmu dan ditandai sebagai perkiraan." },
      { type: "h", text: "Privasi" },
      { type: "p", text: "Kamera hanya dipakai selama sesi coba di browsermu. Gambar tidak direkam, tidak disimpan, dan tidak dikirim ke server." },
      { type: "h", text: "Kalau tidak berjalan baik" },
      { type: "list", items: [
        "Izin kamera ditolak: buka pengaturan situs di browser dan izinkan kamera, lalu muat ulang.",
        "Frame bergeser: perbaiki cahaya dan jarak, lalu tatap kamera sebentar.",
        "Browser tidak mendukung kamera: coba Chrome atau Safari terbaru."
      ] },
      { type: "cta", label: "Coba sekarang", to: "/" }
    ]
  },
  karier: {
    title: "Karier",
    lead: "TryLens masih tim kecil. Saat ini belum ada lowongan terbuka, tetapi kami senang berkenalan.",
    blocks: [
      { type: "p", text: "Kami tertarik pada orang yang suka membangun produk web yang rapi: front-end (React, three.js), back-end (Node), computer vision, desain produk, dan kemitraan dengan toko optik." },
      { type: "p", text: "Kirim perkenalan singkat, tautan portofolio atau GitHub, dan bidang yang kamu minati. Kami simpan dan hubungi saat ada kebutuhan yang cocok." },
      { type: "cta", label: "Kirim minat lewat Kontak", to: "/kontak?topik=karier" }
    ]
  },
  "cara-belanja": {
    title: "Cara Belanja",
    lead: "TryLens membantu memilih dan mencoba. Pembayaran dan pengiriman dilakukan bersama toko optik.",
    blocks: [
      { type: "steps", items: [
        { t: "Temukan frame", d: "Cari lewat kolom pencarian atau jelajahi menurut kategori dan toko." },
        { t: "Coba virtual", d: "Buka Coba Sekarang untuk melihat frame di wajahmu dan cek kecocokannya." },
        { t: "Simpan ke wishlist", d: "Tekan ikon hati untuk menyimpan beberapa pilihan dan membandingkannya nanti." },
        { t: "Konsultasi dengan toko", d: "Tekan Hubungkan ke toko. Pesan WhatsApp otomatis berisi frame yang kamu coba, dan bisa disertai hasil scan wajah." },
        { t: "Selesaikan pembelian", d: "Bayar dan atur pengiriman atau ambil di toko sesuai kesepakatan dengan toko. Untuk lensa resep, toko akan memandu pemeriksaan dan ukuran." }
      ] },
      { type: "p", text: "Catatan: TryLens tidak menjual frame langsung dan tidak memproses pembayaran pembelian frame. Harga, stok, garansi, dan lensa resep mengikuti kebijakan masing-masing toko." }
    ]
  },
  faq: {
    title: "Pertanyaan yang Sering Diajukan",
    lead: "Jawaban singkat untuk hal yang paling sering ditanyakan.",
    blocks: [
      { type: "faq", items: [
        { q: "Apakah TryLens menjual kacamata?", a: "Tidak. TryLens adalah marketplace yang mempertemukanmu dengan toko optik. Pembelian diselesaikan bersama toko." },
        { q: "Apakah kamera saya direkam?", a: "Tidak. Kamera hanya aktif selama sesi coba dan gambar tidak direkam atau disimpan." },
        { q: "Seakurat apa ukuran frame di layar?", a: "Bila toko mengisi ukuran asli, frame tampil 1:1 berdasarkan ukuran wajahmu yang terkalibrasi dari kamera. Bila belum, ukuran disesuaikan otomatis dengan lebar wajah dan hanya perkiraan. Akurasi tergantung cahaya dan kualitas kamera." },
        { q: "Kenapa frame bergeser atau bergetar?", a: "Biasanya karena cahaya kurang, poni menutup alis, atau wajah terlalu jauh. Coba perbaiki ketiganya dan tatap kamera sebentar." },
        { q: "Bisa mencoba frame lain tanpa menyalakan kamera lagi?", a: "Bisa. Pilih frame dari toko yang sama di bawah kamera dan frame langsung berganti." },
        { q: "Bagaimana kalau frame belum punya model 3D?", a: "Frame tetap bisa dicoba dengan ilustrasi 2D yang mengikuti posisi mata, atau dengan model perkiraan. Hasilnya kurang presisi dibanding model 3D." },
        { q: "Bagaimana cara membeli?", a: "Lewat tombol Hubungkan ke toko (WhatsApp) atau tautan e-commerce yang disediakan toko." },
        { q: "Apakah bisa untuk lensa resep?", a: "Itu ditangani toko. Konsultasikan resepmu langsung dengan toko optik yang kamu pilih." },
        { q: "Saya pemilik toko optik. Bagaimana bergabung?", a: "Buka halaman Daftar Merchant. Panduan lengkapnya ada di Panduan Merchant." }
      ] }
    ]
  },
  bantuan: {
    title: "Pusat Bantuan",
    lead: "Pilih topik yang paling dekat dengan masalahmu.",
    blocks: [
      { type: "cards", items: [
        { t: "Kamera tidak menyala", d: "Izinkan kamera di pengaturan situs browser, tutup aplikasi lain yang memakai kamera, lalu muat ulang halaman.", to: "/virtual-try-on" },
        { t: "Frame tidak pas di wajah", d: "Perbaiki cahaya, singkirkan poni, dan tatap kamera 1–2 detik. Lihat laporan kecocokan di samping kamera.", to: "/virtual-try-on" },
        { t: "Cara membeli", d: "Alur dari mencoba sampai menghubungi toko.", to: "/cara-belanja" },
        { t: "Pertanyaan umum", d: "Privasi, ukuran, dan cara kerja.", to: "/faq" },
        { t: "Panduan untuk toko optik", d: "Daftar, unggah frame, model 3D, ukuran, dan paket.", to: "/panduan-merchant" },
        { t: "Masih butuh bantuan?", d: "Hubungi tim kami.", to: "/kontak" }
      ] }
    ]
  },
  "panduan-merchant": {
    title: "Panduan Merchant",
    lead: "Dari mendaftar sampai frame tokomu bisa dicoba pelanggan.",
    blocks: [
      { type: "steps", items: [
        { t: "Daftar dan pilih paket", d: "Buat akun Mitra, pilih Basic atau Pro, lalu selesaikan pembayaran langganan." },
        { t: "Lengkapi profil toko", d: "Isi nama, kota, kontak WhatsApp, tautan toko, dan foto profil. Toko tampil di katalog setelah profil selesai." },
        { t: "Tambah frame", d: "Isi nama, gaya, warna, kategori, harga, stok, deskripsi, dan tautan e-commerce (Tokopedia, Shopee, Lazada, TikTok Shop, atau website toko). Katalog tidak dibatasi jumlahnya." },
        { t: "Isi ukuran asli frame", d: "Isi lebar lensa, tinggi lensa, jembatan, panjang gagang, dan lebar total (mm). Dengan ukuran ini frame tampil 1:1 di coba virtual. Bila dikosongkan, ukuran disesuaikan otomatis dengan wajah pengguna." },
        { t: "Unggah foto dan model 3D", d: "Foto JPEG maksimal 5 MB. Untuk coba virtual yang presisi, unggah model .glb dengan node standar TryLens (lihat Spesifikasi aset). Frame tanpa model tetap tampil dengan ilustrasi 2D." },
        { t: "Aktifkan Virtual Try-On", d: "Atur frame mana yang bisa dicoba di menu Frame Library. Ada batas jumlah frame ber-VTO per paket." }
      ] },
      { type: "h", text: "Paket" },
      { type: "plans" },
      { type: "h", text: "Bila turun paket dari Pro ke Basic" },
      { type: "p", text: "Frame di katalog tidak berkurang. Hanya 20 frame yang tetap ber-VTO. Kamu bisa memilih otomatis (20 frame tertua) atau memilih sendiri frame mana yang tetap aktif. Penurunan berlaku saat periode langganan berakhir." },
      { type: "h", text: "Spesifikasi model 3D" },
      { type: "list", items: [
        "Format .glb, berpusat di jembatan hidung, menghadap +Z.",
        "Node bernama: GlassesRoot, Bridge, LeftLensCenter, RightLensCenter, LeftTemple, RightTemple.",
        "Metadata ukuran di GlassesRoot.extras.trylens. Form unggah memeriksa model dan memberi tahu bila ada yang kurang."
      ] },
      { type: "cta", label: "Daftar sebagai Mitra", to: "/partner/register" }
    ]
  },
  kontak: {
    title: "Kontak",
    lead: "Pertanyaan, kerja sama, atau kendala? Tulis ke kami.",
    blocks: [{ type: "contact" }]
  }
};

export const PLAN_ROWS = () =>
  Object.values(PLANS).map((p) => ({
    name: p.name,
    price: `${rp(p.priceMonth)}/bulan · ${rp(p.priceYear)}/tahun`,
    perks: p.perks
  }));
