# Folder Foto Produk

Taruh foto ASLI frame kamu di sini, bukan gambar dummy. Struktur folder:

```
public/products/
├── f0/
│   ├── main.jpg     ← foto utama (tampil di kartu produk & halaman detail)
│   ├── side.jpg     ← foto tampak samping (opsional)
│   ├── detail.jpg   ← foto close-up detail (opsional)
│   └── close.jpg    ← foto lain (opsional)
├── f1/
│   └── main.jpg
└── ...
```

`f0`, `f1`, dst. adalah `id` produk — lihat `src/data/mockData.js` atau
respons API `/api/products` untuk daftar id lengkap (ada 24 produk, f0–f23).

Kalau file `main.jpg` untuk suatu produk belum ada, halaman otomatis
menampilkan ilustrasi kacamata (SVG) sebagai gantinya — tidak akan ada
gambar rusak/kotak abu-abu. Begitu kamu upload foto asli dengan nama file
yang benar, tampilan langsung berganti ke foto tersebut tanpa perlu ubah
kode sama sekali.

Rekomendasi: foto dengan latar polos/putih, rasio 1:1, minimal 800x800px,
supaya konsisten dengan desain kartu produk.
