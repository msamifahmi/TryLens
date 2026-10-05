// Notifikasi Mitra diturunkan dari data akun (stok, foto, model 3D, tagihan, iklan) — bukan daftar tetap — sehingga
// tiap item selalu punya tindakan yang nyata. id stabil → status "dibaca" disimpan di akun (acc.notifRead).
const DAY = 86400000;
const toDay = (iso) => Math.floor(new Date(iso).getTime() / DAY);
const sev = { warn: 0, info: 1, ok: 2 };

/** acc: akun Mitra; today: "YYYY-MM-DD". Mengembalikan maks. 8 notifikasi, terpenting dulu. */
export function buildNotifications(acc, today) {
  if (!acc) return [];
  const out = [];
  const t = toDay(today);
  const frames = acc.frames || [];

  const sub = acc.subscription;
  if (sub?.status === "active" && sub.currentPeriodEnd) {
    const left = toDay(sub.currentPeriodEnd) - t;
    if (left >= 0 && left <= 14) {
      out.push(
        sub.cancelAtPeriodEnd
          ? { id: `billing:end:${sub.currentPeriodEnd}`, kind: "billing", tone: "warn", title: `Paket berakhir ${left} hari lagi`, text: "Langganan tidak diperpanjang. Aktifkan lagi agar toko tetap tayang.", action: { label: "Perpanjang", to: "/partner/subscription/current" } }
          : { id: `billing:next:${sub.currentPeriodEnd}`, kind: "billing", tone: "info", title: `Tagihan berikutnya ${left} hari lagi`, text: "Periksa metode pembayaran dan rincian tagihan.", action: { label: "Lihat tagihan", to: "/partner/subscription/billing" } }
      );
    }
  }

  for (const o of acc.adOrders || []) {
    if (o.status === "paid" && o.endsOn) {
      const left = toDay(o.endsOn) - t;
      if (left >= 0 && left <= 3) out.push({ id: `ad:${o.id}`, kind: "promo", tone: "info", title: `Iklan berakhir ${left === 0 ? "hari ini" : `${left} hari lagi`}`, text: o.label, action: { label: "Pasang lagi", to: "/partner/promotion/banners" } });
    }
  }

  for (const f of frames) {
    if (f.stock <= 5) out.push({ id: `stock:${f.id}:${f.stock}`, kind: "stock", tone: "warn", title: `Stok ${f.name} tinggal ${f.stock}`, text: "Perbarui stok agar pelanggan tidak kecewa.", action: { label: "Perbarui stok", to: "/partner/store/products" } });
  }
  for (const f of frames) {
    if (f.published && !f.media?.photos) out.push({ id: `photo:${f.id}`, kind: "media", tone: "info", title: `${f.name} belum punya foto`, text: "Frame dengan foto asli lebih sering diklik.", action: { label: "Unggah foto", to: "/partner/store/products" } });
  }
  for (const f of frames) {
    if (f.vto && !f.media?.glb) out.push({ id: `model:${f.id}`, kind: "model", tone: "info", title: `Tambahkan model 3D untuk ${f.name}`, text: "Dengan .glb, pelanggan bisa mencoba virtual dan melihat 360°.", action: { label: "Unggah model", to: "/partner/store/products" } });
    else if (f.media?.glb && f.media.glb.rig !== "ok") out.push({ id: `rig:${f.id}`, kind: "model", tone: "warn", title: `Rig model ${f.name} belum sesuai`, text: "Lensa belum bisa dikunci ke pupil. Jalankan glb:rig lalu unggah ulang.", action: { label: "Cek model", to: "/partner/store/products" } });
  }

  return out.sort((a, b) => sev[a.tone] - sev[b.tone]).slice(0, 8);
}

export const unreadOf = (list, read = []) => list.filter((n) => !read.includes(n.id));
