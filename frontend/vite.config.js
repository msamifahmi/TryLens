import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Content-Security-Policy hanya untuk build produksi (dev server memakai skrip inline HMR).
// Lewat <meta> supaya tidak bergantung pada pengaturan server Hostinger dan tidak memengaruhi /admin & /api.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net", // MediaPipe wasm
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' data: blob: https://cdn.jsdelivr.net https://storage.googleapis.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");
const cspPlugin = () => ({
  name: "trylens-csp",
  apply: "build",
  transformIndexHtml: (html) => html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
});

export default defineConfig({
  plugins: [react(), cspPlugin()],
  build: { target: "es2022" }, // main.jsx memakai top-level await
  server: {
    port: 5173,
    // Backend Node (npm run dev di backend-node): satu origin untuk browser → cookie sesi & CORS tidak perlu diatur.
    proxy: {
      "/api": { target: process.env.API_TARGET || "http://localhost:4000", changeOrigin: false },
      "/media": { target: process.env.API_TARGET || "http://localhost:4000", changeOrigin: false }
    }
  },
  preview: {
    proxy: {
      "/api": { target: process.env.API_TARGET || "http://localhost:4000" },
      "/media": { target: process.env.API_TARGET || "http://localhost:4000" }
    }
  }
});
