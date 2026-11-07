import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Next.js resolves "server-only" itself; Vitest needs a stand-in.
      "server-only": path.resolve(__dirname, "tests/unit/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // A run that finds no tests is a failure, never a silent pass.
    passWithNoTests: false,
    restoreMocks: true,
  },
});
