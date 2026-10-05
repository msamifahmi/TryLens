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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
