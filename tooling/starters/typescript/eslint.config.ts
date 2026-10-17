import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import oxlint from 'eslint-plugin-oxlint'

// Spec 0008 LNT-2, LNT-3 for a TypeScript SDK repo: typescript-eslint strict type checked plus the spec 0005
// restrictions. Each message starts with its rule ID and says where to go instead. An allowed home is a `files`
// override that drops only its own restriction, never an inline disable.

const src = ['packages/*/src/**/*.ts']

// Package names, anchored (a bare glob would also match scoped names that end the same way).
const packages = (names: string[]): string =>
  `^(${names.map((name) => name.replaceAll('/', '\\/').replaceAll('*', '[^/]+')).join('|')})(\\/.*)?$`

const nodeBuiltins = ['node:*', 'fs', 'path', 'os', 'crypto', 'http', 'https', 'stream', 'buffer', 'url', 'util']

const importPatterns = [
  {
    regex: packages(nodeBuiltins),
    message: 'RTM-2: use only the web platform APIs every target has (fetch, Request, AbortController, ...).',
  },
  {
    regex: packages(['axios', 'ky', 'cross-fetch', 'node-fetch', 'abort-controller', 'abortcontroller-polyfill']),
    message: 'SDK-4: no HTTP or polyfill dependency; call config.fetch.',
  },
  {
    regex: packages(['msw', 'nock', 'jsdom', 'jest', '@jest/*']),
    message: 'SQA-1: test with Vitest against a stub fetch passed in config, never by patching globals.',
  },
  {
    regex: packages(['react', 'react-dom']),
    message: 'SHP-9: no React hooks or providers in the SDK packages.',
  },
  { regex: packages(['next/router']), message: 'NXT-2: App Router only; no Pages Router helpers.' },
]

const globals = [
  { name: 'process', message: 'NXT-5: read environment variables only in src/env.ts.' },
  { name: 'Buffer', message: 'RTM-2: use TextEncoder and Uint8Array, which every target has.' },
  { name: 'require', message: 'RTM-2: ESM imports only (NPM-1).' },
  { name: '__dirname', message: 'RTM-2: no Node globals in src/.' },
  { name: 'setImmediate', message: 'RTM-2: use setTimeout, which every target has.' },
]

const syntax = [
  {
    selector: "CallExpression[callee.name='fetch'], CallExpression[callee.property.name='fetch']:not([callee.object.name='config'])",
    message: 'RTM-2: send requests through config.fetch, so apps and tests can pass their own.',
  },
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message: 'NXT-5: read environment variables only in src/env.ts.',
  },
  {
    selector: "ImportExpression[source.type!='Literal']",
    message: 'KEY-5: no dynamic import() of a computed path (strict CSP).',
  },
  {
    selector: "CallExpression[callee.name='eval'], NewExpression[callee.name='Function'], CallExpression[callee.name='Function']",
    message: 'KEY-5: no eval or new Function (strict CSP).',
  },
  {
    selector: "NewExpression[callee.name='URL'], CallExpression[callee.object.name='URL'][callee.property.name=/^(parse|canParse)$/]",
    message: 'RTM-6: check the client url with the https or loopback pattern in createClient, not URL.',
  },
  {
    selector: "Program > VariableDeclaration[kind='let'], Program > ExportNamedDeclaration > VariableDeclaration[kind='let']",
    message: 'SDK-6: no module level mutable state; keep it on the client instance.',
  },
  {
    selector: "MemberExpression[object.name='console']",
    message: 'RTM-4: the SDKs write nothing to the console.',
  },
]

/** The restriction rules, leaving out the restriction whose message starts with `allowed`. */
const restrictions = (allowed?: string) => ({
  'no-restricted-imports': ['error', { patterns: importPatterns.filter((entry) => !entry.message.startsWith(`${allowed}:`)) }],
  'no-restricted-globals': ['error', ...globals.filter((entry) => !entry.message.startsWith(`${allowed}:`))],
  'no-restricted-syntax': ['error', ...syntax.filter((entry) => !entry.message.startsWith(`${allowed}:`))],
})

export default defineConfig(
  { ignores: ['**/dist/**', '**/coverage/**', '**/*.gen.ts', 'etc/**', 'fixtures/**'] },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
  },
  { files: src, rules: restrictions() },
  // NXT-5's one home.
  { files: ['packages/*/src/env.ts'], rules: restrictions('NXT-5') },
  // LNT-2: last, so no rule runs in both linters.
  ...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
)
