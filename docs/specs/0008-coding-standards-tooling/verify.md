# Verify: Coding standards and tooling · spec 0008 · updated 2026-10-16

_Steps derived from spec 0008's rules, its Rollout step 9 (the local proof), and the feature 7 Done when. The spec has no
numbered acceptance criteria, so each step names the rule it proves. `/check verify` runs these; `/test` locks the
durable ones. Steps marked "after feature 58" need the repo on GitHub._

## Commands (local, from the repo root)

- [ ] `pnpm install` → installs, and `prepare` installs the hook dispatcher (`vp hooks status` shows `Dispatcher: installed`) → TL-1, TL-2, HOK-1
- [ ] `pnpm check` → format, Oxlint, ESLint, tsc, catalog and route tree drift, `dotnet format`, and the strict .NET build all pass → TL-6, FMT-1 to FMT-4, FMT-6, LNT-1, LNT-2, TYC-1, CI-2
- [ ] `pnpm check:lint-fixtures` → `all 16 restriction rule IDs fire` → LNT-3
- [ ] `pnpm test` → console Vitest (browser mode) and every .NET test project pass → TL-6
- [ ] `pnpm --filter @orvano/console build && pnpm --filter @orvano/console size` → first load under 200 KB and every JS file under 80 KB gzip → spec 0003 BDL-1
- [ ] `cd server && dotnet test --solution Orvano.slnx --coverage --coverage-output-format cobertura --results-directory "$PWD/TestResults"`, then `node tooling/scripts/coverage-summary.mjs` → one table with a row per assembly and the console → CI-6
- [ ] `docker buildx build --platform linux/amd64 -f deploy/Dockerfile .` → the image builds from the root workspace without the root lint tools → TL-7
- [ ] Workflow lint through Docker: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12` and `docker run --rm -v "$PWD:/repo" -w /repo ghcr.io/zizmorcore/zizmor:1.30.1 --offline ./.github` → no findings → CI-4

## Hooks and banned APIs (manual)

- [ ] Stage one badly formatted `.ts` file and one badly formatted `.cs` file under `server/`, then `git commit` → both are committed formatted → HOK-2, VER-1
- [ ] Stage a `.ts` file with `export default` → the commit is refused by `vp lint` → HOK-2, LNT-1
- [ ] Stage 20 changed files and time `git commit` → under 10 seconds (measured 1.4 s on 2026-10-16) → HOK-3, VER-4
- [ ] Add `DateTime.UtcNow` to a file in `server/src/Orvano.Host` and build → RS0030 names GEN-9; add `Guid.NewGuid()` in `Orvano.Modules.Auth` → RS0030 names TOK-1 → LNT-6
- [ ] In a console feature file, import `react-aria-components` or read `import.meta.env` → ESLint reports DIR-3 or WEB-8; the same in `src/shared/config.ts` passes for WEB-8 → LNT-3

## Change detection

- [ ] `node --input-type=module -e 'import { changedAreas } from "./tooling/scripts/changes.mjs"; console.log(changedAreas(["docs/x.md"]), changedAreas(["pnpm-lock.yaml"]))'` → docs only changes no area; the lockfile changes every area → CI-1

## After feature 58 pushes the repo (Rollout step 11)

- [ ] A PR runs `ci.yml`; `ci-gate` is green, and a docs only PR skips the area jobs while `ci-gate` still passes → CI-1
- [ ] A PR titled `Fix stuff.` fails `pr-title`; `fix(auth): OAuth state` passes → GIT-2
- [ ] CodeQL and dependency review run and are required; a fork PR's CodeQL runs without uploading → CI-3
- [ ] The Windows job passes, including the hook proof → CI-8, TL-5 (decide within two weeks)
- [ ] A Dependabot NuGet PR: do its lock files update, or does it need DPB-3's manual step → DPB-3
- [ ] The Monday `scheduled.yml` run is seen once → CI-9

## Rule coverage

- TL-1, TL-2, TL-6, TL-7: install, check, test, and image steps · FMT-1 to FMT-6: check and the format commit · LNT-1 to LNT-6: check, fixtures, banned API steps · TYC-1: check · HOK-1 to HOK-3: hook steps · CI-1 to CI-9 and DPB-3: change detection, workflow lint, and the after feature 58 steps · KIT-1 to KIT-3: proven by the first SDK repo (not here)
