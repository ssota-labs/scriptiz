import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
// `root` must be this directory; `vite` is often run with cwd=package root (`packages/mcp-tools`).
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@scriptiz/mcp-tools/ui": path.resolve(__dirname, "../src/ui/index.ts"),
    },
  },
});
