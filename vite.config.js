import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;
const isTauriDev = process.env.TAURI_PLATFORM || process.env.TAURI_DEV_HOST || process.argv.includes('--tauri');

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: isTauriDev || host ? 1420 : 3000, // Puerto 1420 para Tauri, 3000 para desarrollo normal
    strictPort: isTauriDev, // Puerto estricto solo en modo Tauri
    host: host || (isTauriDev ? 'localhost' : false),
    // Headers requeridos para WebContainers (aplicados siempre)
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
