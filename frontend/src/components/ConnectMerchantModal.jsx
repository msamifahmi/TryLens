import { Link } from "react-router-dom";
import { formatRp } from "../data/mockData.js";

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.5 3.5A11 11 0 003.3 17.4L2 22l4.7-1.2A11 11 0 1020.5 3.5zM12 20a8 8 0 01-4.1-1.1l-.3-.2-2.8.7.7-2.7-.2-.3A8 8 0 1112 20zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.5.2 1 .1 1.4-.1.4-.2 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.6c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1L6.6 10.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function StoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9l1-5h14l1 5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M5 9v10h14V9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function ConnectMerchantModal({ open, onClose, merchant, product, qty = 1 }) {
  if (!open || !merchant || !product) return null;

  const totalPrice = product.price * qty;
  const message = [
    `Halo ${merchant.name}, saya mau checkout frame ini dari TryLens:`,
    ``,
    `${product.name}`,
    `Jumlah: ${qty}`,
    `Harga: ${formatRp(totalPrice)}`,
    ``,
    `Apakah frame ini masih tersedia?`
  ].join("\n");

  const waLink = `https://wa.me/${merchant.whatsapp}?text=${encodeURIComponent(message)}`;
  const telLink = `tel:${merchant.phone.replace(/[^0-9+]/g, "")}`;

  return (
    <>
      <div className="fixed inset-0 bg-ink/45 z-[80]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-modal-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-[min(420px,92vw)] bg-white rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-ink-muted mb-1">Checkout dihubungkan ke mitra</p>
            <h3 id="connect-modal-title" className="text-lg font-bold text-ink m-0">Hubungkan ke {merchant.name}</h3>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-blue flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex items-center gap-3 bg-surface-blue rounded-xl p-3 mb-5">
          <div
            className="w-11 h-11 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-extrabold text-sm"
            style={{ background: merchant.color }}
          >
            {merchant.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-text m-0 truncate">{product.name}</p>
            <p className="text-xs text-ink-muted m-0">{qty} × {formatRp(product.price)} = <span className="font-semibold text-blue-deep">{formatRp(totalPrice)}</span></p>
          </div>
        </div>

        <p className="text-xs text-ink-muted mb-3">
          TryLens tidak memproses pembayaran langsung — transaksi diselesaikan bersama mitra toko optik.
          Pilih salah satu cara di bawah untuk melanjutkan:
        </p>

        <div className="flex flex-col gap-2.5">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:brightness-95"
          >
            <WhatsAppIcon /> Chat via WhatsApp
          </a>
          <a
            href={telLink}
            className="flex items-center justify-center gap-2 h-12 rounded-xl border-[1.5px] border-blue text-blue font-bold text-sm hover:bg-surface-blue"
          >
            <PhoneIcon /> Telepon {merchant.phone}
          </a>
          <Link
            to={`/toko/${merchant.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 h-12 rounded-xl border-[1.5px] border-border text-ink-text font-bold text-sm hover:bg-surface-blue"
          >
            <StoreIcon /> Lihat Katalog Toko
          </Link>
        </div>
      </div>
    </>
  );
}
