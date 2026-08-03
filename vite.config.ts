// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Development helpers: proxy API requests to the local Laravel backend to avoid CORS
  // and enable tsconfig path resolution natively in Vite.
  vite: {
    server: {
      proxy: {
        // Proxy any /api requests to the backend (adjust host/port if your backend differs)
        // Requests like `/api/v1/auth/login` will be forwarded to http://127.0.0.1:8000/api/v1/auth/login
        "/api": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      tsconfigPaths: true,
    },
  },
});
