// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Load non-VITE_ env vars into process.env so server routes (email send,
// webhooks) can read secrets like SUPABASE_SERVICE_ROLE_KEY. These are NEVER
// exposed to the client bundle.
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(
          import.meta.dirname,
          "node_modules/entities/lib/decode.js",
        ),
        "entities/lib/encode.js": path.resolve(
          import.meta.dirname,
          "node_modules/entities/lib/encode.js",
        ),
        entities: path.resolve(import.meta.dirname, "node_modules/entities"),
      },
    },
    optimizeDeps: {
      // Vite can briefly serve stale optimized dependency URLs after a
      // re-optimization pass; ignore them so the client reload can recover
      // instead of surfacing 504 "Outdated Optimize Dep" as a blank preview.
      ignoreOutdatedRequests: true,
    },
  },
});
