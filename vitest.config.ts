import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // A run that finds no tests is a failure, never a silent pass.
    passWithNoTests: false,
    restoreMocks: true,
  },
});
