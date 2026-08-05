import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * Separate from vite.config.ts on purpose.
 *
 * The app config wraps @lovable.dev/vite-tanstack-config, which installs the
 * TanStack Start SSR plugin, nitro and the route-tree generator. Those need a
 * real server build and fight with the jsdom test environment, so the gate
 * tests get a plain React + jsdom pipeline and only the `@` alias in common.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Gate tests must stay under the 2s budget, so a hang fails loudly instead
    // of stalling a commit.
    testTimeout: 5000,
    restoreMocks: true,
  },
});
