# 0008. Coding standards and tooling: rationale

The decision record behind [index.md](index.md). `/develop` reads index.md; this file holds the why.

## Context

> ⚠️ Premise note: feature 7's Done when asks for CI that "runs clean" and for Vite+ to be confirmed on "this Windows machine". The repo has no GitHub remote yet, and the dev machine is now macOS. Both proofs need a pushed repo and a Windows runner, so this spec splits the proof: a local proof now (Rollout order step 9) and the CI and Windows proof once feature 58 pushes the repo (Rollout order step 11). The scope row's Done when should say the same, or feature 7 can never be marked done honestly.

Specs 0001 to 0007 set hundreds of rules, and each ends with an Enforcement table that says a rule is "checked by" a linter, an analyzer, a hook, or CI, and then defers the actual tools to feature 7. Until those tools exist, every rule is enforced only by memory and review, and the root `AGENTS.md` tells agents not to invent tooling. The scaffold (feature 6) already has partial pieces: `Directory.Build.props` with analyzers, warnings as errors under `CI`, and NuGetAudit; a near empty `server/.editorconfig`; a console with `tsc` and Vitest but no linter or formatter; no hooks, no `.github/`, no root `package.json`.

The forces: the repo mixes .NET 10 and a React/TypeScript console now, and the toolchain has to be reusable by five SDK repos later (Dart twice, TypeScript three times, .NET once). Orvano is open source, so contributors come on macOS, Linux, and Windows, and CI must be hardened (spec 0006 SUP rules) because a poisoned workflow is a supply chain attack on everyone who self hosts. The project has already chosen Vite+ for the JavaScript side (the scope row for feature 7), a toolchain that reached 1.0 only on 2026-09-28 and still has open Windows issues. The lint ecosystem is mid transition: ESLint 10 is current, but `eslint-plugin-jsx-a11y` hasn't declared support; TypeScript 7 is out, but `typescript-eslint` and the Lingui plugin don't support it yet, and Oxlint's type aware mode needs it.

If this isn't decided, each feature invents its own checks, the Enforcement tables stay fiction, and the SDK repos start with six different setups that drift apart from day one.

## Options considered

### Option 1: One Vite+ toolchain plus native .NET tooling, staged hooks, path aware CI behind one gate, shared SDK starters

Vite+ (Oxfmt, Oxlint, `vp run`, `vp hooks`, `vp staged`) handles every JS, TS, and repo file from a root pnpm workspace. A small ESLint 10 config adds the type aware and plugin rules Oxlint lacks. `tsc` on TypeScript 6 type checks. `dotnet format` and the SDK analyzers (plus BannedApiAnalyzers) handle C#. The pre commit hook formats and lints staged files only. CI is one workflow per area behind a `ci-gate`, and SDK repos call reusable workflows kept in this repo.

**Pros**:

- Matches the project's chosen toolchain and keeps the JS side to one install and one config home
- Fast hooks and lint (Rust tools), so people keep the hooks on
- One gate check for the code areas, and one shared setup the SDK repos reuse

**Cons**:

- Two JS linters until TypeScript 7 support lands in the plugins
- Bets on a one month old 1.0 with known Windows issues, so it needs a fallback rule (TL-5)
- More CI wiring up front (change detection, the gate, the starters job)

### Option 2: The classic stack: ESLint 9, Prettier, Husky with lint-staged, CSharpier

The most common setup today. ESLint 9 keeps `eslint-plugin-jsx-a11y` with full strict parity, Prettier formats everything, Husky and lint-staged run hooks, CSharpier formats C#.

**Pros**:

- The most documented and best known stack, with the full jsx-a11y strict preset
- No dependency on a young toolchain or its Windows issues

**Cons**:

- Goes against the project's Vite+ choice, and ESLint plus Prettier is several times slower than Oxlint plus Oxfmt on every hook and CI run
- Holds the repo on ESLint 9 until one stale plugin moves
- Four or five separate tools to install, configure, and keep in step

### Option 3: Lefthook plus standalone CLIs, no Vite+

Language agnostic Lefthook runs the hooks; the `oxlint` and `oxfmt` CLIs, Vite, Vitest, and tsdown are installed on their own. This is the TL-5 fallback, taken as the first choice.

**Pros**:

- No exposure to Vite+'s Windows issues, and Lefthook suits a mixed .NET and JS repo
- Same fast Oxc tools for lint and format

**Cons**:

- More tools and configs (one per tool instead of one `vite.config.ts`), and no `vp run` task caching
- Throws away the project's chosen toolchain over issues that may be fixed by the time SDKs exist

### Option 4: Document the rules, enforce in CI only, no hooks or shared starters

Write configs and CI jobs, but no git hooks and no starter kit. SDK repos copy what they need when they start.

**Pros**:

- The least to build now, and nothing touches a contributor's git setup

**Cons**:

- Mistakes only show after a push, which slows every loop
- Each SDK repo starts from its own copy, so the six setups drift, which is what this feature exists to stop

## Rationale

Option 1 wins because it is the only one that meets both hard forces at once: the project's chosen toolchain (Vite+) and the need for one setup the SDK repos can reuse without drift. Its main risk, Vite+'s youth on Windows, is real (issues #2866 and #2984 are open), so the spec makes it testable rather than trusted: Vite+ installs as a pinned local devDependency, which avoids the global installer and its Defender flagged shims entirely, and a Windows CI job decides go or no go (TL-5), with Option 3 ready as a one PR fallback. That keeps the bet cheap to undo.

The ESLint 10 choice follows from the plugin landscape. Every plugin the console needs supports ESLint 10 except `eslint-plugin-jsx-a11y`, untouched since 2024. Oxlint ships 36 jsx-a11y rules natively (VER-3 later confirmed they cover every active rule in the strict preset), so A11Y-6 moves to Oxlint and axe (A11Y-5) stays as the test time check, rather than holding the whole repo on ESLint 9. TypeScript stays on 6 because the type aware lint rules the specs require (typescript-eslint strict type checked) and the Lingui plugin don't support 7 yet; TYC-2 makes the move one planned PR. Restriction rules stay in ESLint core because Oxlint's support for import patterns and syntax selectors couldn't be confirmed, and these rules guard security and layering (SEC-2, QRY-1, WEB-8), where a silently ignored rule is worse than a slower one.

On the .NET side, `dotnet format` reads the `.editorconfig` that GEN-2 already makes the single place for rule settings, so no second formatter competes with it, and BannedApiAnalyzers is the mechanism specs 0002 and 0006 already named. The hook only does whitespace for C# (`--folder`, no build), because a full `dotnet format` loads the solution and would push the hook past ten seconds; CI runs the full check. CI per area with change detection keeps docs only PRs fast, and the `ci-gate` job solves the classic problem that path filtered workflows leave required checks pending. Reusable workflows stay in the core repo, not a new `orvanohq/.github` repo, because no SDK repo exists yet and a cross repo call to `orvanohq/orvano/.github/workflows/...@<sha>` works the same; the move later is one line per SDK.

Tooling the engineer chose beyond the practice specs (actionlint, zizmor, hadolint, typos) runs in CI only, so the local requirement stays at Node, pnpm, the .NET SDK, and Docker, which `AGENTS.md` already lists.

### Decisions made during writing (RECOMMEND items)

- **Hook ESLint scope**: ESLint stays out of the pre commit hook. Type aware ESLint builds a TypeScript program (several seconds even for one file). Runner up: ESLint on staged files only, rejected for speed.
- **C# in the hook**: `dotnet format whitespace --folder` only. Runner up: full `dotnet format --include`, rejected because it loads the solution (10 to 30 seconds).
- **Change detection**: `tooling/scripts/changes.mjs` running `git diff`, with an explicit base per event and a global path list that runs everything. Runner up: `dorny/paths-filter`, rejected to keep one fewer third party action with repo read access (SUP-6).
- **PR title check**: a shell regex with the title through `env:`. Runner up: `amannn/action-semantic-pull-request`, rejected for the same reason, and the regex is ten lines.
- **CodeQL**: a workflow file with `build-mode: none` and `security-extended`, required by branch protection directly (a job in `ci.yml` can't wait on another workflow). Runner up: repo default setup, rejected because it isn't pinned or reviewed in code.
- **Coverage display**: the job summary. Runner up: a PR comment, rejected because it needs `pull-requests: write`, which fork PRs can't safely get.
- **Runner labels**: pinned `ubuntu-24.04` and `windows-2025`. Runner up: `-latest`, rejected because image changes would land unreviewed.
- **Dependabot titles**: prefix `build`, scope `deps`, so its PRs pass GIT-2 without exceptions.
- **Dependabot cooldown**: 3 days, the same as pnpm's `minimumReleaseAge` (SEC-5), so Dependabot never proposes a version pnpm would refuse to install.
- **Starters proven by the first SDK repo** (after the cross check): no sample packages in this repo. Runner up: samples plus a `_starters.yml` job here, rejected for now because it means maintaining fake packages before any real SDK exists; it comes back once a second repo of a language needs keeping in step.
- **`vp config --no-agent`**: required, because Vite+ otherwise edits agent instruction files, which `/sync` owns.
- **Root package name**: `orvano-repo`, private, so it can never be published by mistake and doesn't collide with `@orvano/*` package names.
- **Branch names**: not checked by CI, because fork contributors' branches can't follow a maintainer convention.

- **C# in the hook**, revised after the cross check: a `format-cs.mjs` wrapper from the start (relative paths, chunks for Windows), rather than waiting to see whether raw paths work.
- **C# style baseline**: `dotnet new editorconfig` plus six rules raised to warning (FMT-6). Runner up: raise the whole baseline to warning, rejected because hundreds of suggestion level rules would flood the scaffold for little gain.
- **One ESLint config at the root**: matches TL-3's single home for Oxlint and Oxfmt. Runner up: one config per package, rejected because the restriction rules and plugin versions would be repeated in each.
- **Docker install scope**: `--filter @orvano/console...`, so the root lint tools never enter the image build and widen its supply chain.

### Cross check (2026-10-16)

A different model (Sonnet) read the first draft and found 46 issues. The load bearing ones were: the Dockerfile and `prepare` would break once the lockfile moved; `ci-gate` would pass if the `changes` job failed; the gate could not depend on the CodeQL and dependency review workflows; no diff base was set per event; the C# style rules were undecided, so `dotnet format --verify-no-changes` would check almost nothing; and several values had no source (test database, coverage tools, size budget script, Dependabot and lock files, title edge cases). You chose to apply all the recommended fixes. They are in TL-1, TL-3, TL-4 to TL-7, FMT-1 to FMT-6, LNT-1a to LNT-7, HOK-1, HOK-2, GIT-2, GIT-4, CI-1 to CI-9, DPB-2, DPB-3, and KIT-1 to KIT-3. Work that belongs to other features (image publishing, conformance suites, nightly device tests, OpenAPI lint) moved to Follow-up.

### Build results (2026-10-16)

`/develop` built feature 7 in three commits on `main` (`5790212` tooling, `4848e5a` format only, `96c1aa3` blame ignore), with `pnpm check` and `pnpm test` passing locally. Later commits added tests for the tooling scripts (`e648760`) and fixed the first CI run (`747b063`, `2732dec`, `f1de4a1`). The build differed from the first spec text in these places; the spec now matches the repo.

- **Versions (TL-4, TL-8)**: the landscape check named versions published inside pnpm's 3 day `minimumReleaseAge` (SEC-5), which pnpm refuses to install. The build pinned the newest mature ones: vite-plus 1.1.0, not 1.3.0 (it bundles Oxlint 1.87.0 and Oxfmt 0.72.0); eslint 10.12.0, not 10.13.0; `@tanstack/eslint-plugin-query` 5.104.2, not 5.104.3. The "at build time" cells were filled: `eslint-plugin-oxlint` 1.87.0, jiti 2.7.0, size-limit and `@size-limit/file` 14.2.0, `@vitest/coverage-v8` 5.0.4, BannedApiAnalyzers 5.6.0, CodeCoverage 18.12.0. Action pins follow the same wait (CodeQL action v4.38.3, zizmor-action v0.6.4 running zizmor 1.30.1). TL-8 makes the wait a rule for every pin, since pnpm enforces it only for npm. Runner up: pin the newest and add a pnpm exception per package, rejected because it would undo SEC-5 for exactly the tools that touch every file.
- **dotnet from `server/` (TL-6)**: `server/global.json` pins the SDK and selects the Microsoft.Testing.Platform runner, and dotnet looks for it only from the working directory upward. From the root, `dotnet test --solution server/Orvano.slnx` falls back to the old VSTest runner and fails. So scripts run `cd server && dotnet ... Orvano.slnx` (works in sh and `cmd.exe`), and `_server.yml` sets `working-directory: server`. Runner up: a second `global.json` at the root, rejected because it would be a second SDK pin to keep in step.
- **pnpm in CI (TL-1)**: setup-vp installs pnpm itself, reading `packageManager`, so CI needs no corepack step. The Dockerfile still uses corepack. Both read the one pin.
- **Docker and `prepare` (TL-7)**: pnpm runs the root `prepare` script even with `--filter`, so the image build copies `tooling/scripts/prepare.mjs` (a `.dockerignore` exception), where `ORVANO_SKIP_HOOKS=1` makes it exit at once.
- **Restrictions per region (LNT-3)**: ESLint flat config replaces a rule's options instead of merging them, so the planned "one override turns the rule off in the home" would also have dropped every other restriction under the same rule there. `tooling/config/console-restrictions.ts` generates each region's full rule set instead, and a home drops only its own restriction.
- **Chunks for BDL-1**: the console splits `react`, `tanstack`, and `lingui` into their own chunks so no file passes 80 KB gzip.
- **zizmor (CI-4)**: `.github/zizmor.yml` sets the Dependabot cooldown check to 3 days and turns off `self-repository`, since the local `./` workflow paths are on purpose. zizmor scans only `.github/`, so the starters stay out.
- **Scheduled run (CI-9)**: `scheduled.yml` calls only `ci.yml`, which under `workflow_call` already runs every area including Windows; calling `_windows.yml` too would run it twice.
- **After the first CI run (2026-10-17)**: the repo went to GitHub as `orvanohq/orvano` (private). CodeQL and dependency review need a public repo or Advanced Security, so they skip while it is private and turn on by themselves when feature 58 makes it public; CodeQL also needed `actions: read`. Dependabot had grouped `eslint-plugin-oxlint` into `npm-minor-and-patch`, which would bump it apart from vite-plus, so it is ignored and moves by hand; Node majors are ignored for `@types/node` and the `node` image tag, since both follow `.node-version`. `pnpm audit` found `GHSA-vfj7-8cjw-p6xm` (`braces`, build time only through `@lingui/cli`, no patched release), so it is ignored with a reason and an exit condition; CI-10 turns that pattern into a rule, so ignores never pile up without a way out. typos learned three real words (`SIZ`, `wrk`, `unparseable`). CI then went green, Windows included.
- **TL-5 decided (2026-10-17): keep Vite+.** The Windows job, with its hook proof, passed on the first green run (`747b063`). You chose to keep Vite+ then rather than wait for the weekly run, since that job is exactly the go or no go TL-5 named; the weekly run (CI-9) is still to be seen once, and the one PR fallback stays written in case Windows breaks later.

Verify at build:

| Check | Result                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| VER-1 | Pass. `vp hooks` and `vp staged` work from the root, and staged `.cs` paths reach `format-cs.mjs`.                                               |
| VER-2 | Pass. The root `fmt` and `lint` blocks apply to `console/`; no per package copy needed.                                                          |
| VER-3 | Pass. Oxlint 1.87 implements all 36 jsx-a11y rules, covering every active rule in the plugin's strict preset; only deprecated rules are missing. |
| VER-4 | Pass. 20 staged files in 1.4 seconds.                                                                                                            |
| VER-5 | Pass. The `lint` block spreads `.oxlintrc.json` (read with `readFileSync`), and `eslint-plugin-oxlint` reads the same file.                      |
| VER-6 | Pass. Lingui 6 has `lingui check sync --clean`.                                                                                                  |

### Landscape check (2026-10-16)

Run once during the design conversation by a read only researcher, cached at `docs/.agent-cache/research/coding-standards-tooling.md`. Several versions below were still inside pnpm's 3 day release wait at build time, so the build pinned older ones (see _Build results_).

- **Vite+**: 1.3.0 is current, and 1.0 was tagged 2026-09-28. `vp check` is format plus lint plus type check (type aware only with `typeAware` and `typeCheck` on). `vp staged` bundles lint-staged 17 and needs Node 24.11 or later and Git 2.32 or later. `vp hooks` uses a `.vite-hooks` dispatcher through `core.hooksPath`. Not confirmed: whether a root `package.json` is required (it is created anyway, TL-1), and whether staged commands run non JS tools (VER-1). CI uses `voidzero-dev/setup-vp` 1.21.2, and its `v1` tag is frozen, so pin by SHA.
- **Vite+ on Windows**: open issues #2866 (Defender flags shims), #2984 (installer leaves PATH unset), #1599, #3080, #1374. #2690 (pnpm 12 `.bin` lookup) was closed 2026-09-17, and whether the fix works isn't confirmed.
- **Oxlint 1.88.0**: built in `react` (hooks rules; React Compiler rules experimental), `jsx-a11y` (about 36 rules), `import`, `vitest`, `promise`. It has `no-restricted-imports` and `no-restricted-globals`; pattern support and `no-restricted-syntax` aren't confirmed. Type aware mode (tsgolint) targets TypeScript 7. `eslint-plugin-oxlint` 1.88.0 turns off overlapping ESLint rules.
- **Oxfmt 0.73.0**: formats JS, TS, JSON, YAML, TOML, HTML, CSS, Markdown, and more, and aims for Prettier output.
- **ESLint 10.13.0 peers**: typescript-eslint 8.71.2 (ESLint 10 yes, TypeScript below 6.1), react-hooks 7.1.1 (yes), lingui 0.16.0 (yes, TS 5 or 6), TanStack Query 5.104.3 (yes, TS up to 7), TanStack Router 1.162.0 (yes), jsx-a11y 6.10.2 (ESLint 9 at most, last changed 2024-10).
- **TypeScript**: 7.0.2 is npm `latest` (2026-07-08).
- **Actions linters**: actionlint 1.7.12; zizmor 1.31.1, whose official `zizmorcore/zizmor-action` (0.7.1) is marked early development, so pin by SHA and expect changes.

### Agent skills (2026-10-16)

Searched with consent, cached at `docs/.agent-cache/tool-discovery/coding-standards-tooling.md`. Installed: `oxc-project/oxc@migrate-oxlint`, `oxc-project/oxc@migrate-oxfmt`, `dotnet/skills@authoring-github-workflows`, `github/awesome-copilot@github-actions-hardening`, `github/awesome-copilot@dependabot`. Failed: `uinaf/agent-skills@vite-plus` (repo refused access). Not installed: the CodeQL skills. Nothing credible found for zizmor, size-limit, typos, typescript-eslint, or dotnet format, and no MCP server fits these tools.

## References

**Project sources**:

- Scope feature 7 in `docs/scope/foundations.md` (the Vite+ choice and the TypeScript question)
- The Enforcement tables of specs 0001, 0002, 0003, 0004, 0005, 0006; spec 0003 WEB-2, A11Y-5, A11Y-6, BDL-1, SEC-5; spec 0005 SDK-1; spec 0002 GEN-2, GEN-5; spec 0006 SUP-1 to SUP-6; spec 0007 layout (`.github/`)
- `server/Directory.Build.props`, `server/.editorconfig`, `console/package.json`, `deploy/Dockerfile` (console stage)
- Root `AGENTS.md` (local setup, the "do not invent tooling" rule)

**Practices & standards**:

- Conventional Commits with squash merge, trunk based development
- Least privilege workflow tokens and SHA pinned actions (GitHub Actions security hardening)
- Required status check aggregation (one gate job over path filtered jobs)
- Formatting only commits with `.git-blame-ignore-revs`

**Links** (web verified during the landscape check):

- Vite+ releases: https://github.com/voidzero-dev/vite-plus/releases
- Vite+ commit hooks guide: https://github.com/voidzero-dev/vite-plus/blob/main/docs/guide/commit-hooks.md
- Vite+ check guide: https://github.com/voidzero-dev/vite-plus/blob/main/docs/guide/check.md
- Vite+ CI guide: https://github.com/voidzero-dev/vite-plus/blob/main/docs/guide/ci.md
- setup-vp action: https://github.com/voidzero-dev/setup-vp
- Vite+ Windows Defender issue: https://github.com/voidzero-dev/vite-plus/issues/2866
- Vite+ Windows PATH issue: https://github.com/voidzero-dev/vite-plus/issues/2984
- Vite+ pnpm 12 `.bin` issue: https://github.com/voidzero-dev/vite-plus/issues/2690
- Oxlint plugins: https://oxc.rs/docs/guide/usage/linter/plugins.html
- Oxlint jsx-a11y rules (source): https://github.com/oxc-project/oxc/tree/main/crates/oxc_linter/src/rules/jsx_a11y
- tsgolint: https://github.com/oxc-project/tsgolint
- eslint-plugin-oxlint: https://github.com/oxc-project/eslint-plugin-oxlint
- Oxfmt: https://oxc.rs/docs/guide/usage/formatter.html
- actionlint 1.7.12: https://github.com/rhysd/actionlint/releases/tag/v1.7.12
- zizmor 1.31.1: https://github.com/zizmorcore/zizmor/releases/tag/v1.31.1
- zizmor action: https://github.com/zizmorcore/zizmor-action
