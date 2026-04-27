import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const scriptizAlias = (name: string) =>
  path.resolve(__dirname, `packages/${name}/src/index.ts`);

export default defineConfig({
  resolve: {
    alias: {
      "@scriptiz/core": scriptizAlias("core"),
      "@scriptiz/schemas": scriptizAlias("schemas"),
      "@scriptiz/ports": scriptizAlias("ports"),
      "@scriptiz/storage-filesystem": scriptizAlias("storage-filesystem"),
      "@scriptiz/queue-local": scriptizAlias("queue-local"),
      "@scriptiz/extractor-ytdlp": scriptizAlias("extractor-ytdlp"),
      "@scriptiz/mcp-tools": scriptizAlias("mcp-tools"),
      "@scriptiz/mcp-tools/ui": path.resolve(
        __dirname,
        "packages/mcp-tools/src/ui/index.ts",
      ),
      "@scriptiz/stt-openai": scriptizAlias("stt-openai"),
      "@scriptiz/stt-xai": scriptizAlias("stt-xai"),
    },
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "apps/**/src/**/*.test.ts",
      "packages/**/src/**/*.test.ts",
    ],
    exclude: ["node_modules", "dist", "**/node_modules/**"],
  },
});
