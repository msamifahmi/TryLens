import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
