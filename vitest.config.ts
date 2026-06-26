import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["__tests__/**/*.test.ts"],
  },
});
