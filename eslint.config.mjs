import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The peer set (spec §0, §3.1): the only bare modules library source may import.
// Anything else - an app alias, a domain module, a new package - means the
// library has started to know something it must not.
const PEERS = [
  "react",
  "react-dom",
  "next/link",
  "next/navigation",
  "clsx",
  "tailwind-merge",
  "class-variance-authority",
];
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: "gallery" } },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^@/",
              message:
                "The library knows no app: no @/ imports. Use a relative import inside ops-ui.",
            },
            {
              regex: `^(?!\\.{1,2}/)(?!@/)(?!(?:${PEERS.map(escape).join("|")})$)`,
              message: `Library source imports relative files or a peer only (${PEERS.join(", ")}).`,
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "gallery/.next/**",
    "gallery/test-results/**",
    "gallery/playwright-report/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "gallery/next-env.d.ts",
  ]),
]);

export default eslintConfig;
