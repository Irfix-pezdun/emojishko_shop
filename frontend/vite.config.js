import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cloudflare Pages: Build command = npm run build, Output = dist, Root = frontend
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    host: true,
    port: 5173,
    proxy: {
      // локальная разработка: /api и /assets → backend
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/assets": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    assetsDir: "assets",
  },
});
