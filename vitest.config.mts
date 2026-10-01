import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Node environment, renderToStaticMarkup: the kit is tested the way the apps
// test it. No alias: every import inside the library is relative. A test file
// may opt into a DOM (`// @vitest-environment happy-dom`: tests/shell-behaviour);
// its sandboxed app fixtures live in the OS temp folder, which Vite's file
// server must then be allowed to read.
export default defineConfig({
  server: { fs: { allow: [path.dirname(fileURLToPath(import.meta.url)), os.tmpdir()] } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
