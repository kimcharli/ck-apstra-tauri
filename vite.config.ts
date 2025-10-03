import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Path aliases for domain-driven architecture
  resolve: {
    alias: {
      "@domains": path.resolve(__dirname, "./src/domains"),
      "@excel": path.resolve(__dirname, "./src/domains/excel"),
      "@apstra": path.resolve(__dirname, "./src/domains/apstra"),
      "@conversion": path.resolve(__dirname, "./src/domains/conversion"),
      "@provisioning": path.resolve(__dirname, "./src/domains/provisioning"),
      "@shared": path.resolve(__dirname, "./src/domains/shared"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));