import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts",
      "apps/**/src/**/*.test.ts",
      "packages/**/src/**/*.test.ts",
    ],
    exclude: ["node_modules", "dist", "**/node_modules/**"],
  },
});
