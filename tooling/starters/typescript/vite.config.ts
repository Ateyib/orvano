import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite-plus'

// Spec 0008 TL-3 for a TypeScript SDK repo: fmt, lint, and staged in one root config. Every Oxlint rule lives in
// .oxlintrc.json, so eslint-plugin-oxlint reads the same file.
const oxlintConfig = JSON.parse(readFileSync(new URL('./.oxlintrc.json', import.meta.url), 'utf8')) as Record<
  string,
  unknown
>

const ignorePatterns = ['**/pnpm-lock.yaml', '**/dist/**', '**/coverage/**', '**/*.gen.ts', 'etc/**']
const code = 'js,mjs,cjs,ts,mts,cts,tsx'
const data = 'json,jsonc,yaml,yml,toml,md,css,html'

export default defineConfig({
  fmt: { ignorePatterns },
  lint: { ...oxlintConfig, ignorePatterns, options: { typeAware: false, typeCheck: false } },
  staged: {
    [`*.{${code}}`]: ['vp fmt --no-error-on-unmatched-pattern', 'vp lint --fix --no-error-on-unmatched-pattern'],
    [`*.{${data}}`]: 'vp fmt --no-error-on-unmatched-pattern',
  },
})
