import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Single-file-ish embed for MCP `resources/read` (inline step via scripts/embed-inlined.mjs). */
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@scriptiz/mcp-tools/ui": path.resolve(__dirname, "../src/ui/index.ts"),
    },
  },
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, "embed.html"),
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
