# TypeScript SDK starter

For each TypeScript SDK repo (spec 0005, names from spec 0007 REP-3): `sdk-js` (`@orvano/client`), `sdk-js-server`
(`@orvano/server`), and `sdk-nextjs` (`@orvano/next`). Each keeps its package under `packages/`.

Copy these into the repo root:

- `package.json`: merge the scripts and dev tools into yours. Each published package's own `package.json` sets
  `"license": "Apache-2.0"` and `"files": ["dist", "NOTICE"]`, with a copy of `NOTICE` beside it (spec 0009 LIC-6). Versions match the core repo's TL-4 pins; move them
  together (the Dependabot `toolchain` group, DPB-2).
- `pnpm-workspace.yaml`, `tsconfig.base.json` (TYP-1; each package's `tsconfig.json` extends it)
- `vite.config.ts`, `.oxlintrc.json`: Oxfmt, Oxlint, and the staged map (FMT-1, LNT-1, HOK-2)
- `eslint.config.ts`: typescript-eslint strict type checked plus the spec 0005 restrictions (RTM-2, RTM-4, RTM-6,
  KEY-5, NXT-5, SDK-4, SDK-6, the Replaces list). `packages/*/src/env.ts` is NXT-5's one home.
- `.size-limit.json`: SIZ-1's budgets through esbuild. Add one entry per service.
- `.vite-hooks/pre-commit` (commit it with the executable bit) and `tooling/scripts/prepare.mjs` (HOK-1)
- `.node-version` from the core repo (`24.22.0`)

CI: `sdk-typescript.yml` (KIT-1) runs `pnpm check`, the build, publint and are-the-types-wrong, tests, size, and audit.
