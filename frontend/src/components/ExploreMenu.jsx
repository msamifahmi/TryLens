import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MERCHANTS, PRODUCTS, STYLE_LABELS } from "../data/mockData.js";
import { useFilter } from "../store/useFilter.js";
import FrameIcon from "./icons/FrameIcon.jsx";

/* ---------- data menu (dihitung sekali dari data produk & merchant) ---------- */

function countBy(list, keyFn) {
  return list.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

// Hanya gaya yang benar-benar ada di kategori itu, supaya tidak ada link ke hasil kosong.
function styleItems(cat) {
  const pool = cat ? PRODUCTS.filter((p) => p.cat === cat) : PRODUCTS;
  return Object.entries(countBy(pool, (p) => p.style)).map(([style, count]) => ({
    label: STYLE_LABELS[style] || style,
    count,
    action: { type: "feed", cat: cat || "Semua", style }
  }));
}

function categoryEntry(cat, label, icon) {
  const total = PRODUCTS.filter((p) => p.cat === cat).length;
  return {
    id: cat.toLowerCase(),
    label,
    icon,
    main: { type: "feed", cat, style: null },
    groups: [
      { heading: "Gaya", items: styleItems(cat) },
      { heading: "Lainnya", items: [{ label: `Semua ${label}`, count: total, action: { type: "feed", cat, style: null } }] }
    ]
  };
}

const PROVINCES = [...new Set(MERCHANTS.map((m) => m.province))];
const PROMO_COUNT = PRODUCTS.filter((p) => !!p.oldPrice).length;
const FLASH_COUNT = PRODUCTS.filter((p) => p.flash).length;

const ENTRIES = [
  {
    id: "semua",
    label: "Semua Frame",
    icon: { style: "browline", color: "navy" },
    main: { type: "feed", cat: "Semua", style: null },
    groups: [
      {
        heading: "Kategori",
        items: [
          { label: "Frame Pria", count: PRODUCTS.filter((p) => p.cat === "Pria").length, action: { type: "feed", cat: "Pria", style: null } },
          { label: "Frame Wanita", count: PRODUCTS.filter((p) => p.cat === "Wanita").length, action: { type: "feed", cat: "Wanita", style: null } },
          { label: "Frame Anak", count: PRODUCTS.filter((p) => p.cat === "Anak").length, action: { type: "feed", cat: "Anak", style: null } }
        ]
      },
      { heading: "Lainnya", items: [{ label: "Lihat semua frame", count: PRODUCTS.length, action: { type: "feed", cat: "Semua", style: null } }] }
    ]
  },
  categoryEntry("Pria", "Frame Pria", { style: "square", color: "black" }),
  categoryEntry("Wanita", "Frame Wanita", { style: "cateye", color: "tort" }),
  categoryEntry("Anak", "Frame Anak", { style: "round", color: "blue" }),
  {
    id: "gaya",
    label: "Berdasarkan Gaya",
    icon: { style: "aviator", color: "gold" },
    main: { type: "feed", cat: "Semua", style: null },
    groups: [{ heading: "Bentuk frame", items: styleItems(null) }]
  },
  {
    id: "promo",
    label: "Promo & Flash Sale",
    icon: { style: "rect", color: "brown" },
    main: { type: "flash" },
    groups: [
      {
        heading: "Penawaran",
        items: [
          { label: "Flash Sale", count: FLASH_COUNT, action: { type: "flash" } },
          { label: "Semua Promo", count: PROMO_COUNT, action: { type: "feed", cat: "Promo", style: null } }
        ]
      }
    ]
  },
  {
    id: "toko",
    label: "Toko Optik",
    icon: { store: true },
    main: { type: "mitra" },
    groups: [
      ...PROVINCES.map((prov) => ({
        heading: prov,
        items: MERCHANTS.filter((m) => m.province === prov).map((m) => ({
          label: m.name,
          count: null,
          action: { type: "merchant", id: m.id }
        }))
      })),
      { heading: "Lainnya", items: [{ label: "Lihat semua mitra", count: null, action: { type: "mitra" } }] }
    ]
  }
];

/* ---------- tampilan ---------- */

function StoreIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-blue">
      <path d="M4 9l1-5h14l1 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 9v10h14V9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EntryIcon({ icon }) {
  if (icon.store) return <StoreIcon />;
  return <FrameIcon style={icon.style} colorKey={icon.color} className="w-12 h-6" />;
}

const OPEN_DELAY = 60; // ms — hindari menu berkedip saat kursor lewat
const CLOSE_DELAY = 140;

/**
 * Mega menu "Jelajahi": muncul saat hover (atau klik / keyboard).
 * Kiri: daftar kategori. Kanan: isi kategori yang sedang di-hover. Latar halaman digelapkan.
 */
export default function ExploreMenu({ onJumpToFeed, onJumpToFlash }) {
  const navigate = useNavigate();
  const setView = useFilter((s) => s.setView);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(ENTRIES[0].id);
  const wrapRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);

  const active = ENTRIES.find((e) => e.id === activeId) || ENTRIES[0];

  function clearTimers() {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }
  function scheduleOpen() {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  }
  function scheduleClose() {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }
  function closeNow() {
    clearTimers();
    setOpen(false);
  }

  useEffect(() => clearTimers, []);

  // Tutup saat klik di luar (untuk layar sentuh) atau tekan Escape.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) closeNow();
    }
    function onKey(e) {
      if (e.key === "Escape") closeNow();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(action) {
    closeNow();
    switch (action.type) {
      case "feed":
        setView(action.cat, action.style);
        onJumpToFeed?.();
        break;
      case "flash":
        onJumpToFlash?.();
        break;
      case "merchant":
        navigate(`/toko/${action.id}`);
        break;
      case "mitra":
        navigate("/mitra");
        break;
      default:
        break;
    }
  }

  return (
    <div
      ref={wrapRef}
      className="hidden md:flex self-stretch items-center flex-shrink-0"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        className={`h-full flex items-center gap-1 text-sm font-semibold px-1 ${open ? "text-blue" : "text-ink-text"}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="explore-panel"
        onClick={() => {
          clearTimers();
          setOpen(true);
        }}
      >
        Jelajahi
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {/* Latar gelap di bawah header (tidak menangkap klik supaya kursor keluar = menu menutup). */}
          <div className="absolute left-0 right-0 top-full h-screen bg-ink/45 z-40 pointer-events-none" aria-hidden="true" />

          {/* Panel dipasang relatif terhadap <header> (sticky) sehingga selebar layar. */}
          <div
            id="explore-panel"
            className="absolute left-0 right-0 top-full z-50 bg-white border-t border-border shadow-xl h-[min(72vh,480px)] flex"
          >
            <ul className="list-none m-0 py-3 pl-5 pr-3 w-[300px] flex-shrink-0 overflow-y-auto border-r border-border" aria-label="Kategori">
              {ENTRIES.map((e) => (
                <li key={e.id}>
                  <button
                    onMouseEnter={() => setActiveId(e.id)}
                    onFocus={() => setActiveId(e.id)}
                    onClick={() => run(e.main)}
                    aria-current={e.id === activeId}
                    className={`w-full text-left px-3.5 py-3 rounded-lg text-[14px] font-bold text-ink transition-colors ${
                      e.id === activeId ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    {e.label}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex-1 min-w-0 overflow-y-auto px-8 py-6" key={active.id}>
              <div className="flex items-center gap-3 mb-5">
                <EntryIcon icon={active.icon} />
                <h3 className="text-[26px] font-extrabold text-ink tracking-tight m-0">{active.label}</h3>
              </div>
              <div className="flex flex-col gap-5">
                {active.groups.map((g) => (
                  <div key={g.heading}>
                    <p className="text-[14px] font-bold text-ink m-0 mb-2">{g.heading}</p>
                    <ul className="list-none m-0 p-0 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-1">
                      {g.items.map((it) => (
                        <li key={it.label}>
                          <button
                            onClick={() => run(it.action)}
                            className="text-[14px] text-ink-text hover:text-blue hover:underline text-left py-1"
                          >
                            {it.label}
                            {it.count != null && <span className="text-ink-muted"> ({it.count})</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
