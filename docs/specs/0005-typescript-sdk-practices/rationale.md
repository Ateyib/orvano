# 0005. TypeScript SDK practices: rationale and research

Decision record for [index.md](index.md). `/develop` reads index.md; this file is for people and for `/architect` on a later update.

## Context

> ⚠️ Premise note: the scope gives Orvano one repo per SDK, so these three closely related npm packages live in three repos. `@orvano/nextjs` builds on the other two, and a contract change touches all three. That means the Next.js repo must test against packed tarballs of unreleased client and server builds, and one change lands as three coordinated PRs. That is workable (the Dart repos accept the same cost, spec 0004 PKG-3), but a single TypeScript repo holding the three packages would remove it. This spec works within the given layout and flags the question for feature 6, which names the SDK repos.

Orvano ships three TypeScript SDKs (given in `docs/scope/index.md`): a JavaScript client for apps, a Next.js SDK, and a JavaScript server SDK. Between them they run in more places than any other Orvano code: every major browser, React Native on Hermes (Meta's JavaScript engine for mobile, which lacks several web APIs), Node, Cloudflare Workers (workerd, which has no Node built ins by default), Deno, Bun, and both halves of a Next.js App Router app (server components, route handlers, server actions, and `proxy.ts` on the server; client components in the browser). A pattern that works in one of these often breaks another: a CommonJS build trips ESM only tools, a `URL` call misbehaves on Hermes, a module level client leaks one user's session to another on a Next.js server, and a server key imported into a client component ships to every visitor.

All three are generated from one API contract (feature 10) with hand written layers where a platform needs them, so whatever shape these practices fix becomes the shape the generator emits for every service. Feature 21 later keeps the Next.js session in cookies, and feature 56 generates table types the SDKs must accept (`rows.list<Todo>()` in the scope). The .NET SDK (spec 0002, LIB rules) and the Dart SDKs (spec 0004) already fixed errors, retries, timeouts, and paging, and the console (spec 0003) fixed a TypeScript toolchain (TypeScript 6.0, Node 24, pnpm, Vitest 5, Playwright). SDK users judge Orvano by all six SDKs behaving the same.

The JavaScript library toolchain moves fast. Since 2025: Node 20 reached end of life, `require()` of ESM became unflagged in Node 22.12, tsup's README began pointing to tsdown, TypeScript 7 shipped as a native compiler (while typescript-eslint still stops at 6.0), Next.js 16 renamed middleware to `proxy.ts` and moved it to the Node runtime, Metro began reading package `exports` by default, and Vitest reached 5 (while Cloudflare's Vitest pool still needs 4). Choosing from memory would lock in stale choices. Without a recorded standard, the first generated service would set the pattern by accident, and the three packages would drift apart in module format, error handling, and runtime support.

No SDK code exists yet. The workflow tier is GA and the build approach Tracer Bullet, so Slice 1 runs end to end through every SDK, and every later service copies what the first one does. The team is small, so the rules must be checked by tools, not memory.

## Options considered

The practices were chosen one area at a time with you (see *Research by practice area*). The options here are how the standard is enforced.

### Option 1: Document and enforce from the first line of code

Write the rules and canonical pattern, and turn on type checks, lint, package checks (publint, are-the-types-wrong), the API report, the size budget, and the runtime matrix in CI before the first service lands.

**Pros**: rules hold from the first commit; the generator is shaped by the checks from day one; nothing to migrate later.
**Cons**: more setup (Miniflare runner, Hermes profile, tarball fixtures, the Expo nightly) before the Slice 1 tracer bullet; strict checks slow quick experiments.

### Option 2: Document, build Slice 1, then enforce

Write the rules now, add the CI gates after Slice 1 lands, and fix what doesn't comply in one PR.

**Pros**: faster first release of each SDK; the gates are tuned on real code.
**Cons**: the generator's first output becomes the pattern every service copies; runtime breaks (Hermes, workerd) found late mean regenerating every service; three repos to migrate instead of one.

### Option 3: Document only

Write the rules, rely on review.

**Pros**: least setup.
**Cons**: runtime support claims that nothing tests are guesses; module format and type resolution breaks only show up in users' apps; review can't see bundle size or a missing `.d.ts` condition.

## Rationale

Option 1, because the SDKs are generated: a rule enforced after Slice 1 means regenerating every service, in three repos, and the bugs these rules prevent (a module format error, a missing web API on Hermes, a leaked server key) happen in users' apps, where Orvano can't see them. The GA tier and the "works from every SDK" clause in every service feature's **Done when** need a real runtime matrix, and only CI can run one. The extra setup is front loaded into the tracer bullet, where it costs least.

The practice choices lean on three forces. First, **runtime breadth**: React Native in v1 and Workers, Deno, and Bun on the server push every rule toward the small web platform API set every target has, zero dependencies, and ESM only. Second, **parity with the other SDKs**: retries, timeouts, error kinds, paging, and request options mirror specs 0002 and 0004 and the console's error kinds, so one conformance suite and one set of docs cover six SDKs. Third, **Next.js safety**: per request clients, no implicit caching, and build time import guards address the two failures that hurt users most (leaking a server key, leaking a session).

Where you chose against my recommendation: React Native support from v1 (I suggested keeping the door open without promising it). That choice is sound for a BaaS whose mobile users may prefer React Native over Flutter, and it is now reflected throughout: the banned API list (RTM-2), the `react-native` export condition (RN-1), a required storage adapter (RN-2), the Hermes test profile, and the nightly Expo app (SQA-4). The cost is listed in index.md's Consequences.

## Research by practice area

### Module format: ESM only

Node 20 reached end of life on 2026-04-30, and every supported Node line (22 maintenance, 24, and 26, which becomes LTS on 2026-10-28) loads ESM through `require()` unflagged from 22.12 on (basis: Node release schedule and modules docs). Metro reads `exports` by default from 0.82 (React Native 0.79), so React Native no longer needs a CommonJS `main` (basis: Metro package exports docs). A dual build would double the build and test matrix and bring back the dual package hazard (two copies of `OrvanoError`, two module states) for a gap `require(esm)` already closes. A script tag bundle was dropped because ESM CDNs serve the published package directly. The one real cost: CommonJS apps pinned below Node 22.12. The `esm-only` profile of are-the-types-wrong checks the result without failing on the old `node10` resolution mode.

### Build: tsdown in unbundle mode

tsup's README now says it is no longer actively maintained and points to tsdown (search result, not fetched). tsdown 0.23.1 is current, built on Rolldown (the same engine as the console's Vite 8) (basis: npm registry). Its `unbundle` option writes one file per source module, which keeps tree shaking at module granularity without trusting a bundler's chunking; `dts` uses oxc when `isolatedDeclarations` is on, and falls back to the TypeScript compiler otherwise; and `publint` and `attw` options run both package checks during the build (basis: tsdown docs for unbundle, dts, and lint). Plain `tsc` was the runner up: zero tool risk, but you'd hand roll the version define, the package checks, and any directive handling. tsdown is pre 1.0 (0.23.0 dropped tsup compatible options), so SDK-1 pins the minor. Directive handling: tsdown has no documented built in way to keep `'use client'`; community reports say it survives in unbundle mode and is dropped when modules merge. BLD-4 sidesteps this, since no module needs a directive while there's no React layer.

### Runtime targets

The server SDK targets Node 22.12+ (every supported LTS line; Node 22 is in maintenance until 2027-04-30), workerd, Deno 2, and Bun 1. Workerd is the strictest target, so passing there covers most edge runtimes, including Next.js route handlers on the edge runtime. The Vercel edge runtime wasn't added as its own target: Next.js 16 runs `proxy.ts` only on Node (basis: Next.js proxy docs and version 16 upgrade guide), and the workerd tests cover the same API subset. The client targets Baseline widely available browsers (the same bar as spec 0003 WEB-5), React Native 0.79+, and Node. The global `WebSocket` is available unflagged from Node 22 (no longer experimental from 22.4), so realtime needs no dependency (basis: Node globals docs).

Hermes: React Native's environment docs list only a small set of guaranteed globals (fetch among them). Support for `AbortSignal.timeout`, `AbortSignal.any`, a complete `URL` and `URLSearchParams`, `structuredClone`, `crypto.subtle`, and streamed response bodies couldn't be confirmed on 2026-10-15. RTM-2 bans them and the scaffold verifies each; the two small helpers (`buildUrl`, `linkSignals`) cost a few hundred bytes.

### API shape and tree shaking

Three shapes were weighed. Standalone functions (`listRows(client, ...)`, Firebase's modular style) tree shake per method but read unlike the other five SDKs and lose autocomplete discovery. One client object (`orvano.rows.list`, Supabase style) has the best discovery but ships every service in every bundle. Service objects over a client (`new Rows(client)`, Appwrite style) tree shake per service, which is the granularity that matters (an app imports a handful of services), and read like the .NET `client.Rows` and the Dart services. One params object per call (SHP-3) follows the contract's operation inputs one to one, and an optional field can be added without breaking callers, which matters for a generated SDK that adds inputs over time. Responses stay plain JSON with ISO 8601 strings (SHP-4), because React server components can pass only serializable values to client components, and because the SDK can't know which user columns are dates. The paging helper mirrors .NET LIB-5's `IAsyncEnumerable`.

### Typing

Authoring stays on TypeScript 6.0, matching spec 0003 WEB-2: TypeScript 7.0.2 is npm's latest (announced 2026-07-08), but typescript-eslint's peer range still ends below 6.1 (basis: npm registry, TypeScript 7 announcement; the typescript-eslint range from search results). Published types are tested on a two year window (today 5.7+) plus the latest 7.x, the policy DefinitelyTyped uses, because app teams upgrade TypeScript slowly and Next.js 16 itself accepts TypeScript 5.1 and later (basis: Next.js 16 upgrade guide). The schema type on the client (TYP-5) was chosen over a per call generic alone because a per call generic is an unchecked cast: a wrong type or table name compiles. Keeping the per call form for untyped clients preserves the scope's `rows.list<Todo>()` example and quick scripts. `exactOptionalPropertyTypes` is on in the SDK's own config and tested both ways in the consumer matrix, so the types are correct for apps that turn it on.

### Errors

Throwing a typed error matches spec 0002 LIB-6, spec 0004 EXC-1, native `async` and `await`, and what Next.js route handlers and server actions expect. `{ data, error }` results (Supabase style) are explicit but easy to ignore and unlike the other SDKs. The `kind` set is the console's (spec 0003 FLT-1), so docs and app code share one vocabulary. The brand check (ERR-T3) exists because `instanceof` fails when a bundler or package manager ends up with two copies of a package. `toJSON()` exists because Next.js hides thrown error messages in production, so actions return errors as state.

### Next.js

App Router only and Next.js 16+ only: backwards compatibility isn't owed before beta, and Next.js 16's `proxy.ts` (on Node) and Cache Components are what feature 21 builds on (basis: Next.js proxy docs, version 16 upgrade guide). Supporting 15 would need two session refresh paths (edge middleware versus Node proxy). Never caching implicitly (NXT-4) follows from the worst failure mode: a cached session client result served to another user. Reading cookies makes the session client dynamic, so Next refuses to run it inside a cached scope; admin and public reads can be cached by the app, on purpose. `server-only` and `client-only` turn a wrong import into a build error. The key guard export condition (KEY-1) covers non Next bundlers (Vite, Metro).

### React Native

Session storage is a required adapter on React Native (RN-2) so a session can't silently land in unencrypted storage; the docs show `expo-secure-store`, and the SDK keeps zero dependencies. Shipping an `@orvano/client/expo` adapter was the runner up: one line setup, but the SDK would then track Expo releases. The supported version window follows the two newest Expo SDKs (Expo SDK 57 on React Native 0.86 is current per search results; SDK 58 is in beta), with 0.79 as the hard floor for `exports` support.

### Testing

Unit tests fake HTTP through the `fetch` option (SQA-2) because MSW's interception doesn't run in workerd or Hermes, and one mocking style across every runtime is simpler; it also matches .NET LIB-12's hand written stub handler. The conformance suite runs against real containers, the same as specs 0002 and 0003. Cloudflare's `@cloudflare/vitest-pool-workers` 0.23.0 peers on Vitest 4.1 (basis: npm registry), while Vitest 5.0.5 is current (basis: npm registry) and the console is on 5, so the workerd run bundles the suite into a test worker under Miniflare instead (runner up: Vitest 4 in the SDK repos). The Hermes profile catches missing globals on every PR at Node speed; the nightly Expo app on an emulator proves the real engine without making every PR slow and flaky. The Next.js fixture tests the lowest and latest supported 16 minors because App Router behavior shifts between minors.

### Bundle size

10 KB gzip for `createClient` plus `Account` plus `Rows` (the Slice 1 core loop), and 4 KB per extra service. It's tight enough that the service object design and `sideEffects: false` must actually work, and loose enough for a real transport with retries and errors. A whole package budget was rejected because it doesn't prove tree shaking.

### Public API tracking

API Extractor's report is the TypeScript counterpart of .NET LIB-10's PublicApiAnalyzers: every public change shows in the PR diff, and undocumented exports fail. It runs on its own bundled TypeScript, so the scaffold must confirm it reads the tsdown output (APX-1).

### Calls made without a question

These were decided while writing, with the runner up:

- **Zero runtime dependencies** for client and server (SDK-4). Runner up: a tiny fetch wrapper library. Every target has `fetch`, and each dependency is supply chain risk and bundle weight.
- **Root entry only, no per service subpaths** (NPM-5). Runner up: `@orvano/client/rows` subpaths. Modern bundlers tree shake a root barrel over unbundled ESM with `sideEffects: false`, and SIZ-1 proves it; subpaths would double the API surface to maintain.
- **`module: nodenext`** (TYP-1). Runner up: `bundler`. Libraries should be valid for Node's own resolver; `.js` extensions keep the source honest.
- **`platform: 'neutral'` and `target: 'es2022'`** (BLD-1). Every target supports ES2022, and Metro transpiles further for Hermes.
- **Open string unions for server enums** (TYP-4). Runner up: closed unions. A newer server must not break an older SDK, the same principle as .NET JSN-2 and LIB-9.
- **Credential in the runtime's `WeakMap`** (KEY-3, SDK-6). Runner up: a `#` private field. Neither shows up in `console.log`, but the `WeakMap` also needs no Hermes support for private fields, and services hold their client in a plain TypeScript `private` field.
- **The `NEXT_PUBLIC_` key check** (KEY-4). A cheap guard against the most common Next.js secret leak.
- **No `'use client'` anywhere** (BLD-4). Without a React layer nothing needs it, which removes a known bundler pitfall.
- **`@orvano/nextjs` depends on client and server at a caret of the matching version** (SDK-4). Runner up: peer dependencies. Regular dependencies install with no extra step, and feature 52 releases the three in step.
- **Node 22, 24, and 26 for unit tests on every PR** (SQA-1). Unit runs are fast; conformance on other Node lines runs nightly.
- **size-limit as the size runner** (SIZ-1). It measures an import through a real bundler, which is what an app sees.
- **The runtime is shared through feature 10's templates** (CGN-2), matching spec 0004 PKG-3 so the TypeScript and Dart SDKs make the same tradeoff.

### Installed agent skills

You agreed to an Agent Skills and MCP search for the new tools. Installed on 2026-10-15: `tsdown` (`rolldown/tsdown`), `wrangler` and `workers-best-practices` (`cloudflare/skills`), `deno` (`denoland/skills`), `vercel-react-native-skills` (`vercel-labs/agent-skills`), `react-native-best-practices` (`callstackincubator/agent-skills`), and `expo-overview` and `expo-upgrade` (`expo/skills`). The official Next.js skills (`vercel/next.js`) couldn't be installed because the repo clone fails on Windows path length; that's a follow up. No official skill exists for API Extractor or size-limit (only little used community ones, skipped). MCP servers recorded for you to connect: `next-devtools-mcp` and the Cloudflare docs server; the Expo MCP server was declined. The `tsdown` skill confirmed the `esm-only` attw profile name and showed dual format defaults that SDK-0 overrides.

### Cross check, 2026-10-15

A read only review on a different model looked for decisions a builder would have to invent and for runtime breaks. You chose to apply every recommended fix. The main ones: the `browser` export condition also matches wrangler and Next's edge runtime, so the server's runtime conditions now come first (NPM-2, KEY-1); client and server packages can't share service objects, so Next.js code gets clients and services from the same entry and a wrong package client throws (NXT-1, SHP-2); the row typing now has a concrete type sketch (TYP-5); the shared runtime lives in `src/runtime/` under the drift check (CGN-2); and the transport sample now calls `fetch` safely, cancels bodies before retries, and keeps JSON and custom `fetch` errors out of retries (RTM-6, SHP-8). Smaller additions: `https` only URLs with `redirect: 'error'`, a status to kind fallback table, the `buildUrl` contract, `idempotencyKey` and `retry` per call, session plumbing (SHP-10), one API report per entry point, and more fixtures (edge route, wrangler bundle, both supported Expo SDKs, a `package.json` shape test).

### Landscape facts, checked 2026-10-15

Tags: confirmed on a fetched page (linked in References), or *search only* (seen in search results, not confirmed).

- Node 20: end of life 2026-04-30. Node 22: maintenance LTS, end of life 2027-04-30. Node 24: active LTS, moves to maintenance 2026-10-20, end of life 2028-04-30. Node 26: current, LTS from 2026-10-28.
- `require(esm)`: unflagged in 22.12 and 20.19; warning dropped in 22.13; documented as no longer experimental from 25.4.
- Global `WebSocket`: unflagged from 22.0, no longer experimental from 22.4.
- tsdown 0.23.1 on npm; `unbundle`, `dts` (oxc with `isolatedDeclarations`), `publint`, and `attw` options documented. tsup no longer actively maintained (*search only*).
- TypeScript 7.0.2 is npm's latest; 7.0 announced 2026-07-08. typescript-eslint doesn't support 7 yet (*search only*).
- Next.js 16.4.2 is npm's latest. `middleware.ts` is renamed `proxy.ts` in 16.0, and proxy runs on Node only. Next.js 16 needs Node 20.9+ and TypeScript 5.1+. `cacheComponents` is a top level config, `cacheLife` and `cacheTag` are stable; whether `'use cache'` itself is called stable wasn't confirmed.
- Metro reads `exports` by default from 0.82 (React Native 0.79), including a `react-native` condition.
- React Native 0.86 with Expo SDK 57 current (*search only*). Hermes support for the RTM-2 list unconfirmed.
- Vitest 5.0.5 is npm's latest. `@cloudflare/vitest-pool-workers` 0.23.0 peers on Vitest 4.1.

## References

**Project sources**:
- `docs/scope/index.md` and `docs/scope/foundations.md` (feature 4), `docs/scope/sdks.md` (features 10, 21, 52, 56, 60)
- Spec 0002, .NET backend practices (LIB-5, LIB-6, LIB-7, LIB-10, LIB-12, GEN-5, JSN-2, TST-5a)
- Spec 0003, React console practices (WEB-2, WEB-5, WEB-7, WEB-9, FLT-1, SEC-5, QA-6)
- Spec 0004, Dart and Flutter practices (PKG-3, NET-3, EXC-1)
- Installed skills: `tsdown`, `vitest`, `pnpm`, `wrangler`, `workers-best-practices`, `deno`, `vercel-react-native-skills`, `react-native-best-practices`, `expo-overview`, `expo-upgrade`, `playwright-cli`, `vercel-react-best-practices` (`.claude/skills/`; the `tsdown` skill's lint reference confirms the attw profiles)

**Practices and standards**:
- WinterTC (Ecma TC55) minimum common web platform API, the shared API subset for server runtimes
- Baseline widely available (web platform support bar)
- The dual package hazard (two copies of one package under ESM and CommonJS)
- DefinitelyTyped's two year TypeScript support window
- Exponential backoff with full jitter; honoring `Retry-After`
- Semantic versioning with a public API report

**Links** (web verified on 2026-10-15):
- Node.js release schedule: https://github.com/nodejs/release
- Node.js modules, `require(esm)`: https://nodejs.org/api/modules.html
- Node.js globals, `WebSocket`: https://nodejs.org/api/globals.html
- tsdown on npm: https://registry.npmjs.org/tsdown/latest
- tsdown unbundle: https://tsdown.dev/options/unbundle
- tsdown declaration files: https://tsdown.dev/options/dts
- tsdown package lint (publint, attw): https://tsdown.dev/options/lint
- TypeScript on npm: https://registry.npmjs.org/typescript/latest
- Announcing TypeScript 7.0: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Next.js on npm: https://registry.npmjs.org/next/latest
- Next.js `proxy.ts`: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js version 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Metro package exports: https://metrobundler.dev/docs/package-exports/
- React Native JavaScript environment: https://reactnative.dev/docs/javascript-environment
- Vitest on npm: https://registry.npmjs.org/vitest/latest
- Cloudflare Vitest pool on npm: https://registry.npmjs.org/@cloudflare/vitest-pool-workers/latest
