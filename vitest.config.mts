import { defineConfig } from "vitest/config";

// Node environment, renderToStaticMarkup: the kit is tested the way the apps
// test it. No alias: every import inside the library is relative.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
