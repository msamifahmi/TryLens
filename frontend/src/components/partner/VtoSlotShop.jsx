import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Sparkles } from "lucide-react";
import { Btn } from "./ui.jsx";
import { usePartner } from "../../store/usePartner.js";
import { PLANS, VTO_SLOT, fmtRp, vtoLimitOf, vtoSlotPrice } from "../../data/partnerMock.js";

/**
 * Beli slot Virtual Try-On tambahan (sekali bayar, permanen selama langganan aktif).
 * Rp30.000/slot; setiap kelipatan 5 slot otomatis memakai harga promo Rp145.000.
 */
export default function VtoSlotShop({ acc, backTo = "/partner/vto/library", compact = false }) {
  const startCheckout = usePartner((s) => s.startCheckout);
  const navigate = useNavigate();
  const [qty, setQty] = useState(VTO_SLOT.packQty);
  const plan = PLANS[acc.subscription.plan];
  const extra = acc.vtoExtraSlots || 0;
  const total = vtoSlotPrice(qty);
  const normal = qty * VTO_SLOT.unit;
  const set = (n) => setQty(Math.min(VTO_SLOT.maxPerOrder, Math.max(1, Math.round(n) || 1)));
  const buy = () => {
    startCheckout({ kind: "vtoSlots", qty, total, label: `Slot Virtual Try-On tambahan × ${qty}`, backTo });
    navigate("/partner/checkout");
  };
  return (
    <div className={`rounded-xl border border-[#DDE8F4] bg-white ${compact ? "p-3.5" : "p-4"}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-[14px] font-semibold text-ink m-0">Tambah slot Virtual Try-On</p>
          <p className="text-[12.5px] text-ink-muted m-0 mt-0.5">
            Kuota sekarang {vtoLimitOf(acc)} frame (paket {plan.name} {plan.limits.vto}{extra ? ` + ${extra} slot tambahan` : ""}). Sekali bayar, berlaku selama langganan aktif.
          </p>
          <p className="text-[12.5px] text-ink-text m-0 mt-1.5 flex items-center gap-1.5">
            <Sparkles size={13} className="text-blue-deep" aria-hidden="true" /> {fmtRp(VTO_SLOT.unit)}/slot · <b className="font-semibold">Promo 5 slot {fmtRp(VTO_SLOT.packPrice)}</b>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => set(qty - 1)} aria-label="Kurangi slot" className="w-11 h-11 rounded-lg border border-[#DDE8F4] flex items-center justify-center hover:bg-surface-blue"><Minus size={16} /></button>
          <label className="sr-only" htmlFor="vto-slot-qty">Jumlah slot</label>
          <input id="vto-slot-qty" type="number" inputMode="numeric" min={1} max={VTO_SLOT.maxPerOrder} value={qty} onChange={(e) => set(e.target.value)} className="w-16 h-11 text-center rounded-lg border border-[#DDE8F4] text-[15px] font-semibold" />
          <button type="button" onClick={() => set(qty + 1)} aria-label="Tambah slot" className="w-11 h-11 rounded-lg border border-[#DDE8F4] flex items-center justify-center hover:bg-surface-blue"><Plus size={16} /></button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap mt-3 pt-3 border-t border-[#EEF3F9]">
        <p className="text-[13px] text-ink-text m-0">
          {qty} slot = <b className="text-[15px] text-ink">{fmtRp(total)}</b>
          {total < normal && <span className="text-ink-muted"> (hemat {fmtRp(normal - total)})</span>}
          {qty % VTO_SLOT.packQty !== 0 && qty > VTO_SLOT.packQty - 2 && <span className="block text-[12px] text-ink-muted">Ambil kelipatan 5 untuk harga promo.</span>}
        </p>
        <Btn size="sm" onClick={buy}>Beli {qty} slot</Btn>
      </div>
    </div>
  );
}
