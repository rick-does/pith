import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: process.env.VITE_CLEAN === "1",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8002",
      "/health": "http://127.0.0.1:8002",
    },
  },
});
