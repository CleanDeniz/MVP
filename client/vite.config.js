import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  // Указываем, что билд пойдет в server/client_build
  build: {
    outDir: path.resolve(__dirname, "../server/client_build"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
