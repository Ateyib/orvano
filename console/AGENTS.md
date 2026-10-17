# Console

The React console, served by the server at `/console`. How screens behave is [spec 0001](../docs/specs/0001-console-ux-patterns/index.md); how the code is written is [spec 0003](../docs/specs/0003-react-console-practices/index.md); serving and the dev proxy are [spec 0007](../docs/specs/0007-stack-architecture/index.md) CSL-1 to CSL-3. Cite rule IDs in reviews.

## Commands

Run these from `console/`, or from the root as `pnpm --filter @orvano/console <script>`. pnpm is pinned in the root `package.json` (`packageManager`). If your corepack is too old to run pnpm 12, use `npx pnpm@12.12.1 <command>`.

- Install: `pnpm install` at the repo root (one workspace, one root lockfile; CI uses `--frozen-lockfile`)
- Format, lint, and type check: `pnpm check` at the root (`pnpm fix` applies the fixers). The console has no lint or format config of its own: Oxlint and Oxfmt read the root `vite.config.ts` and `.oxlintrc.json`, ESLint the root `eslint.config.ts`
- Dev server on `http://localhost:5173/console/`: `pnpm dev`. It proxies every path outside `/console` to the server on 5080, so run the server too.
- Build (typecheck, then Vite): `pnpm build`. Typecheck alone: `pnpm typecheck`
- Tests (Vitest browser mode in Chromium): `pnpm test`. Install the browser once with `pnpm exec playwright install chromium`
- After adding or changing strings: `pnpm extract` (updates `src/locales/*/messages.po`). `pnpm check` fails when the catalogs or `src/routeTree.gen.ts` are out of date
- Bundle size (BDL-1), after a build: `pnpm size`. Coverage: `pnpm test:coverage`

## Conventions

- The base path is `/console`, fixed at build time. `import.meta.env` is read only in `src/shared/config.ts`.
- Every user facing string goes through the Lingui macros. The macros and the React Compiler run in one Babel pass in `vite.config.ts`; the scaffold confirmed both transforms run (spec 0003 I18N-2).
- Route files in `src/routes/` hold only route options and point `component` at a component in `src/features/`. `src/routeTree.gen.ts` is generated: commit it, never edit it.
- pnpm waits 3 days before installing a new release, and blocks install scripts (root `pnpm-workspace.yaml`).
- The restriction rules (imports, globals, syntax from spec 0003) live in `tooling/config/console-restrictions.ts`, one rule set per folder. A rule's allowed home (for example `src/shared/config.ts` for WEB-8) is a region there, never an inline disable. Each rule ID has a fixture in `tooling/lint-fixtures/` that must fire (`pnpm check:lint-fixtures`).
- `vite.config.ts` splits React, TanStack, and Lingui into their own chunks so no file passes BDL-1's 80 KB gzip.

## Tests

- Render through `renderWithProviders(url)` in `src/test/render.tsx`, which runs the real route tree. Pass in app URLs (`/`, not `/console/`): memory history does not apply the router's base path.
- Lingui's `I18nProvider` renders nothing until a locale is active, so the helper activates `en` like `main.tsx` does.
- Vitest browser mode serves from `/`, so `BASE_URL` is `/` in tests, and `vitest.config.ts` drops the dev proxy (it would forward Vitest's own requests to the server).
- A failed browser test saves a screenshot under `.vitest/attachments/failure-screenshots/` (git ignored). Look there first when a test fails.

## Agent skills

Load only what the task needs. Spec 0003 wins where a skill disagrees (WEB-0).

- [vite](../.claude/skills/vite/): `antfu/skills`, Vite config and plugins
- [vitest](../.claude/skills/vitest/): `antfu/skills`, tests (browser mode only, not its jsdom setups)
- [pnpm](../.claude/skills/pnpm/): `antfu/skills`, package management
- [lingui-framework-setup](../.claude/skills/lingui-framework-setup/) and [lingui-best-practices](../.claude/skills/lingui-best-practices/): `lingui/skills`, translation setup and message writing
- [router-plugin](../.claude/skills/router-plugin/): shipped in `@tanstack/router-plugin`, route generation and code splitting
- [tanstack-router-best-practices](../.claude/skills/tanstack-router-best-practices/): `deckardger/tanstack-agent-skills`, routing, loaders, and search params (spec 0003 RTE and URL rules win)
- [playwright-cli](../.claude/skills/playwright-cli/): `microsoft/playwright-cli`, browser automation and E2E tests
- [accessibility](../.claude/skills/accessibility/): `addyosmani/web-quality-skills`, WCAG checks
- [vercel-react-best-practices](../.claude/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, React patterns (not its SWR, `next/dynamic`, or hand written `memo` advice)
- Declined (2026-10-16): a TanStack Query skill, and the community TanStack docs MCP

_Drafted by /sync from the introducing change, worth a quick human pass._
