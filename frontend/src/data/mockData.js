// Mock data lokal untuk mode demo (tanpa backend).
// Jika VITE_API_BASE aktif dan backend berjalan, data ini hanya dipakai sebagai fallback.

export const FRAME_COLORS = {
  brown: { frame: "#8B5E34", lens: "#D9C7AE" },
  black: { frame: "#26282B", lens: "#C8D3DE" },
  gold: { frame: "#C9A24B", lens: "#E9E1C9" },
  tort: { frame: "#7A5233", lens: "#E7D9B8" },
  clear: { frame: "#B9C2CC", lens: "#EAF2FA" },
  blue: { frame: "#427AB5", lens: "#D8E8F7" },
  navy: { frame: "#33455E", lens: "#D6E1EC" },
  red: { frame: "#A6473C", lens: "#F1DAD6" }
};

// Catatan: URL sosial media & e-commerce di bawah ini masih placeholder.
// Ganti dengan akun asli tiap merchant. Kosongkan (hapus key-nya) kalau
// merchant tidak punya akun di platform tersebut — tombolnya otomatis hilang.
export const MERCHANTS = [
  { id: "m1", name: "Optik Kusuma", city: "Surakarta, Jawa Tengah", province: "Jawa Tengah", count: "120+ frame", rating: "4.9", initials: "OK", color: "#427AB5", whatsapp: "6281234500001", phone: "0812-3450-0001",
    links: { instagram: "https://instagram.com/optikkusuma", x: "https://x.com/optikkusuma", tokopedia: "https://tokopedia.com/optikkusuma", shopee: "https://shopee.co.id/optikkusuma" } },
  { id: "m2", name: "Optik Sehat", city: "Yogyakarta", province: "DI Yogyakarta", count: "85+ frame", rating: "4.7", initials: "OS", color: "#406AAF", whatsapp: "6281234500002", phone: "0812-3450-0002",
    links: { instagram: "https://instagram.com/optiksehat", tokopedia: "https://tokopedia.com/optiksehat", shopee: "https://shopee.co.id/optiksehat" } },
  { id: "m3", name: "Vision Optic", city: "Solo, Jawa Tengah", province: "Jawa Tengah", count: "64+ frame", rating: "4.8", initials: "VO", color: "#5B8FC2", whatsapp: "6281234500003", phone: "0812-3450-0003",
    links: { instagram: "https://instagram.com/visionoptic.solo", x: "https://x.com/visionopticsolo", shopee: "https://shopee.co.id/visionoptic" } },
  { id: "m4", name: "Optik Maju", city: "Semarang, Jawa Tengah", province: "Jawa Tengah", count: "96+ frame", rating: "4.6", initials: "OM", color: "#35608F", whatsapp: "6281234500004", phone: "0812-3450-0004",
    links: { instagram: "https://instagram.com/optikmaju", tokopedia: "https://tokopedia.com/optikmaju" } },
  { id: "m5", name: "Optik Prima", city: "Malang, Jawa Timur", province: "Jawa Timur", count: "73+ frame", rating: "4.8", initials: "OP", color: "#5C7FA6", whatsapp: "6281234500005", phone: "0812-3450-0005",
    links: { instagram: "https://instagram.com/optikprima", x: "https://x.com/optikprima", tokopedia: "https://tokopedia.com/optikprima", shopee: "https://shopee.co.id/optikprima" } },
  { id: "m6", name: "Lensa Kita", city: "Bandung, Jawa Barat", province: "Jawa Barat", count: "110+ frame", rating: "4.9", initials: "LK", color: "#3E6A9C", whatsapp: "6281234500006", phone: "0812-3450-0006",
    links: { instagram: "https://instagram.com/lensakita.id", x: "https://x.com/lensakitaid", tokopedia: "https://tokopedia.com/lensakita", shopee: "https://shopee.co.id/lensakita" } }
];

// Kanal resmi TryLens — dipakai di halaman Mitra. Ganti dengan akun asli.
export const OFFICIAL_LINKS = {
  instagram: "https://instagram.com/trylens.id",
  x: "https://x.com/trylens_id",
  tokopedia: "https://tokopedia.com/trylens",
  shopee: "https://shopee.co.id/trylens"
};

export const QUICK_CATEGORIES = [
  { name: "Frame Pria", count: "120+ pilihan", style: "square", color: "black" },
  { name: "Frame Wanita", count: "143+ pilihan", style: "cateye", color: "tort" },
  { name: "Frame Anak", count: "58+ pilihan", style: "round", color: "blue" },
  { name: "Aviator", count: "64+ pilihan", style: "aviator", color: "gold" },
  { name: "Round", count: "77+ pilihan", style: "round", color: "clear" },
  { name: "Square", count: "91+ pilihan", style: "square", color: "brown" },
  { name: "Cat Eye", count: "49+ pilihan", style: "cateye", color: "red" },
  { name: "Minimalist", count: "66+ pilihan", style: "rect", color: "navy" }
];

const NAMES = [
  "Aviator Classic", "Round Metal", "Square Essential", "Tortoise Classic", "Minimal Clear Frame",
  "Retro Oval", "Kids Flex", "Modern Square", "Cat Eye Elegan", "Browline Heritage",
  "Aviator Slim", "Round Vintage", "Square Bold", "Rimless Light", "Oval Comfort",
  "Wayfarer Studio", "Half Rim Classic", "Cat Eye Statement", "Kids Round Play", "Square Titanium",
  "Aviator Gold Line", "Round Acetate", "Rect Business", "Oversized Cat Eye"
];
const COLOR_LABELS = { brown: "Brown", black: "Black", gold: "Gold", tort: "Tortoise", clear: "Clear", blue: "Blue", navy: "Navy", red: "Red" };
const FRAME_STYLES = ["aviator", "round", "square", "cateye", "rect", "browline"];
const CATS = ["Pria", "Wanita", "Anak", "Pria", "Wanita", "Anak", "Pria", "Wanita"];

function seededRand(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildProducts() {
  const colorKeys = Object.keys(FRAME_COLORS);
  const products = [];
  for (let i = 0; i < NAMES.length; i++) {
    const style = FRAME_STYLES[i % FRAME_STYLES.length];
    const colorKey = colorKeys[i % colorKeys.length];
    const merchant = MERCHANTS[i % MERCHANTS.length];
    const basePrice = 189000 + Math.floor(seededRand(i + 1) * 18) * 10000;
    // Flash sale: 2 frame per merchant (produk urutan ke-2 dan ke-4 tiap merchant).
    // Produk flash selalu berdiskon, jadi harganya konsisten di kartu, detail, dan wishlist.
    const flash = Math.floor(i / MERCHANTS.length) % 2 === 1;
    const hasDiscount = i % 3 === 0 || flash;
    const oldPrice = hasDiscount ? Math.round((basePrice * (flash ? 1.5 : 1.4)) / 1000) * 1000 : null;
    const cat = i % 12 === 6 ? "Anak" : CATS[i % CATS.length];
    const isNew = i % 5 === 1;
    products.push({
      id: "f" + i,
      name: `${NAMES[i]} ${COLOR_LABELS[colorKey]}`,
      style,
      colorKey,
      price: basePrice,
      oldPrice,
      merchant: merchant.name,
      merchantId: merchant.id,
      city: merchant.city.split(",")[0],
      cat,
      isNew,
      order: i, // makin besar = makin baru masuk katalog
      flash,
      flashSold: flash ? 35 + Math.floor(seededRand(i + 50) * 60) : 0, // % stok terjual (mock)
      badge: hasDiscount ? `-${Math.round((1 - basePrice / oldPrice) * 100)}%` : isNew ? "BARU" : null
    });
  }
  return products;
}

export const PRODUCTS = buildProducts();

export function formatRp(n) {
  return "Rp" + n.toLocaleString("id-ID");
}
