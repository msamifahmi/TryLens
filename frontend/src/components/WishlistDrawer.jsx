import { useNavigate } from "react-router-dom";
import { PRODUCTS, formatRp } from "../data/mockData.js";
import { useWishlist } from "../store/useWishlist.js";
import ProductImage from "./ProductImage.jsx";

export default function WishlistDrawer({ open, onClose, onTryOn, showToast }) {
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const navigate = useNavigate();

  const wished = PRODUCTS.filter((p) => items[p.id]);

  function openDetail(id) {
    onClose();
    navigate(`/produk/${id}`);
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-ink/40 z-[70] transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 bottom-0 w-[380px] max-w-[92vw] bg-white z-[71] shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Wishlist"
        aria-hidden={!open}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[16.5px] font-bold m-0">Wishlist Kamu</h3>
          <button onClick={onClose} aria-label="Tutup wishlist" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {wished.length === 0 ? (
            <div className="py-16 px-5 text-center text-ink-muted text-sm">
              Belum ada frame di wishlist kamu.
              <br />
              Tap ikon hati pada produk untuk menyimpannya.
            </div>
          ) : (
            wished.map((p) => (
              <div key={p.id} className="flex gap-3 py-3 border-b border-border last:border-none">
                <button
                  onClick={() => openDetail(p.id)}
                  className="w-16 h-16 rounded-[10px] bg-[#F8FAFC] flex-shrink-0 flex items-center justify-center p-2"
                  aria-label={`Lihat detail ${p.name}`}
                >
                  <ProductImage productId={p.id} variant="main" style={p.style} colorKey={p.colorKey} className="w-full h-full" alt={p.name} />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => openDetail(p.id)} className="text-left">
                    <p className="text-[13.5px] font-semibold m-0 mb-0.5 hover:text-blue">{p.name}</p>
                  </button>
                  <p className="text-[11.5px] text-ink-muted m-0 mb-1.5">{p.merchant} · {p.city}</p>
                  <p className="text-[13.5px] font-extrabold text-blue-deep m-0 mb-2">{formatRp(p.price)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => onTryOn(p)} className="text-xs font-bold rounded-[7px] px-2.5 py-1.5 bg-blue text-white hover:bg-blue-deep">
                      Coba Sekarang
                    </button>
                    <button
                      onClick={() => remove(p.id, showToast)}
                      className="text-xs font-bold rounded-[7px] px-2.5 py-1.5 border border-border text-ink-muted hover:text-error hover:border-error"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
