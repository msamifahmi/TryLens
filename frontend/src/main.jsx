import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { usePartner } from "./store/usePartner.js";
import { loadCatalog } from "./lib/catalog.js";
import "./index.css";

// 1) Cari backend (maks. 1,5 dtk; tanpa backend → mode demo seperti sebelumnya).
// 2) Gabungkan frame Mitra ke katalog publik SEBELUM App dimuat: banyak halaman menghitung dari PRODUCTS saat modul dimuat.
await usePartner.getState().init();
await loadCatalog();
const { default: App } = await import("./App.jsx");

const splash = document.getElementById("tl-splash");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Sembunyikan preloader dengan fade; tampil minimal ±1,2 dtk supaya animasinya terbaca dan tidak berkedip.
if (splash) {
  const wait = Math.max(0, 1200 - performance.now());
  setTimeout(() => {
    splash.classList.add("is-out");
    setTimeout(() => splash.remove(), 600);
  }, wait);
}
