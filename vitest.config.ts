import { defineConfig } from "vitest/config";
import path from "node:path";

// "server-only" throws unconditionally outside a bundler that understands
// its package.json export condition (Next.js's webpack build does; plain
// Node running under Vitest doesn't) -- aliased to a no-op here so pure
// logic in lib files that happen to import a server-only module (groq.ts,
// embeddings.ts) can still be unit tested without pulling in a real API
// client or hitting network calls.
export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
