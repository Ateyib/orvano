// Spec 0008 FMT-2: paths Oxfmt, Oxlint, and ESLint never touch. typos.toml repeats this list (it can't import it).
export const ignorePatterns = [
  // lockfiles
  "**/pnpm-lock.yaml",
  "**/packages.lock.json",
  // generated files
  "console/src/routeTree.gen.ts",
  "**/schema.gen.ts",
  "console/src/locales/**",
  // build output
  "**/dist/**",
  "**/bin/**",
  "**/obj/**",
  "**/.vitest/**",
  "**/.tanstack/**",
  "**/coverage/**",
  "docs/.agent-cache/**",
  // template files, checked by their own repos once copied (KIT-2)
  "tooling/starters/**",
  // the Contributor Covenant text, kept identical to upstream (spec 0010 COC-1)
  "CODE_OF_CONDUCT.md",
  // vendored skills, kept identical to upstream
  ".claude/skills/**",
  ".agents/skills/**",
  "skills-lock.json",
];
