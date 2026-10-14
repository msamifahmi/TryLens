# Panduan: Hermes memposting produk ke TryLens

Aturan emas: **Hermes tidak pernah push ke `deploy` atau langsung ke `main`.** Cabang `deploy` ditimpa otomatis oleh GitHub Actions setiap `main` berubah; apa pun yang didorong ke sana hilang.
Jalurnya: berkas lokal → cabang fitur `produk/…` → Pull Request ke `main` → kamu merge → Actions membangun ulang `deploy` → hPanel Git "Deploy" → `try-lens.id`.

## Siapkan folder produk (lokal)
```
kacamata-aurora/
├── main.jpg      (wajib, rasio 1:1, ≥800px)
├── side.jpg  detail.jpg  close.jpg   (opsional)
└── model.glb     (opsional → Coba Virtual 3D)
```

## Langkah (sekali setup)
1. `git clone https://github.com/msamifahmi/TryLens.git && cd TryLens && git checkout main`
2. `cd frontend && npm install`
3. Pastikan `gh auth status` login (untuk membuka PR); tanpa `gh`, buka PR manual dari cabang yang dipush.

## Tiap produk baru
```
cd TryLens && git checkout main && git pull
cd frontend
npm run product:add -- --from ~/kacamata-aurora --name "Aurora Round" --price 249000 \
   --old-price 329000 --style round --color gold --merchant m1 --cat Wanita --push
```
Pilihan: style = aviator|round|square|cateye|rect|browline · color = brown|black|gold|tort|clear|blue|navy|red · cat = Pria|Wanita|Anak · merchant = m1–m6.
Skrip memberi id berikutnya (f24, f25, …), menyalin berkas, memperbarui `frontend/public/catalog.json`, commit, push cabang `produk/<id>-…`, dan membuka PR.

## Setelah itu (kamu)
1. Buka PR → cek Preview/Files changed → **Merge** ke `main`.
2. Tunggu workflow "Deploy" hijau (±2 menit).
3. hPanel → Git → repo → cabang `deploy` → **Deploy**.
4. Cek `https://try-lens.id/version.txt` (commit baru) lalu hard-refresh.

## Prompt siap tempel untuk Hermes
> Tugasmu memposting produk ke TryLens. Jangan pernah push ke `deploy`/`main`. Gunakan repo `msamifahmi/TryLens`: checkout `main`, pull, lalu di `frontend/` jalankan `npm run product:add -- --from <folder> --name "<nama>" --price <rupiah> --style <…> --color <…> --merchant <m1–m6> --cat <Pria|Wanita|Anak> --push`. Pastikan folder berisi main.jpg (wajib) dan model.glb bila ada. Laporkan URL PR. Jangan merge sendiri.

## Banyak produk sekaligus (mis. f24–f29) — satu PR, bukan enam
Jalankan skrip TANPA `--push` untuk tiap produk (hanya menulis berkas), lalu commit sekali:
```
cd TryLens && git fetch origin && git checkout -b produk/batch-f24-f29 origin/main
cd frontend
npm run product:add -- --id f24 --name "Aurora Round" --price 249000 --style round --color gold --merchant m1 --cat Wanita
npm run product:add -- --id f25 --name "..." --price ... --style ... --color ... --merchant m2 --cat Pria
# … ulangi sampai f29. Foto yang SUDAH ada di frontend/public/products/fNN/ otomatis dipakai (tanpa --from).
cd .. && git add frontend/public && git commit -m "Produk baru f24-f29" && git push -u origin produk/batch-f24-f29
gh api repos/msamifahmi/TryLens/pulls -f title="Produk baru f24-f29" -f head=produk/batch-f24-f29 -f base=main -f body="Produk baru"
```

## Jangan tulis catalog.json dengan tangan
- JSON tidak boleh berisi komentar (`// …`) atau koma di akhir — satu karakter salah dan SELURUH katalog tambahan diabaikan. Skrip `product:add` menulisnya dengan benar.
- Foto yang sudah terlanjur ada tidak perlu di-copy lagi: pakai `--id fNN` saja (tanpa `--from`).
- Foto di cabang `deploy` tidak ikut: pastikan berkasnya ada di cabang fitur (`git status` harus menunjukkan `frontend/public/products/fNN/`).
