// Klien API sederhana untuk memanggil backend-node atau backend-php.
// Frontend memakai data mock (../data/mockData.js) secara default supaya
// bisa langsung dijalankan tanpa backend. Ganti pemakaian di komponen
// dengan fungsi-fungsi berikut kalau backend sudah berjalan.

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
  }
  return res.json();
}

// Catatan: backend PHP memakai ekstensi .php pada tiap endpoint
// (contoh: /products.php?category=Pria), sedangkan backend Node
// memakai path REST biasa (/products?category=Pria). Sesuaikan
// VITE_API_BASE + path di bawah ini kalau berpindah backend.

export function getProducts(category) {
  const query = category && category !== "Semua" ? `?category=${encodeURIComponent(category)}` : "";
  return request(`/products${query}`);
}

export function getProductById(id) {
  return request(`/products/${id}`);
}

export function getMerchants() {
  return request("/merchants");
}

export function getCategories() {
  return request("/categories");
}

export function getWishlist(userId = "guest") {
  return request(`/wishlist/${userId}`);
}

export function saveWishlist(userId = "guest", items) {
  return request(`/wishlist/${userId}`, {
    method: "POST",
    body: JSON.stringify({ items })
  });
}
