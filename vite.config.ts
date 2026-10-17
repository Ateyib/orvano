import { readFileSync } from "node:fs";
import { defineConfig } from "vite-plus";
import { ignorePatterns } from "./tooling/config/ignore-patterns.ts";

// Spec 0008 TL-3: the repo wide fmt, lint, and staged config. The console's own vite.config.ts stays its build
// config. Every Oxlint rule lives in .oxlintrc.json, so eslint-plugin-oxlint reads the same file (VER-5).
const oxlintConfig = JSON.parse(
  readFileSync(new URL("./.oxlintrc.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

const code = "js,mjs,cjs,jsx,ts,mts,cts,tsx";
const data = "json,jsonc,json5,yaml,yml,toml,md,css,html";

export default defineConfig({
  // FMT-1: Oxfmt defaults, no style options.
  fmt: { ignorePatterns },
  lint: {
    ...oxlintConfig,
    // Lint fixtures break rules on purpose (LNT-3).
    ignorePatterns: [...ignorePatterns, "tooling/lint-fixtures/**"],
    // TYC-1: tsc on TypeScript 6 type checks, so vp check only formats and lints.
    options: { typeAware: false, typeCheck: false },
  },
  // HOK-2: staged files only. ESLint, tsc, full dotnet format, builds, and tests are left to CI.
  staged: {
    [`*.{${code}}`]: [
      "vp fmt --no-error-on-unmatched-pattern",
      "vp lint --fix --no-error-on-unmatched-pattern",
    ],
    [`*.{${data}}`]: "vp fmt --no-error-on-unmatched-pattern",
    "*.cs": "node tooling/scripts/format-cs.mjs",
  },
});
