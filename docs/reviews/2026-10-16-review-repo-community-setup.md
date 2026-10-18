# Review, repo & community setup (feature 58), 2026-10-16

**Reviewed by**: Sonnet 5.5 (author on Opus 5.5, from the commit trailer on fd2f541)
**Scope**: 39 files from commit `fd2f541`, merged in `65f6379` (old PR 4), plus 3 uncommitted test files, on `main`
**Verdict**: Changes requested

## Summary

The change adds the community files, issue forms, the `dco` job, `github-settings.mjs`, `export-template.mjs`, and the SDK and org starters, per spec 0010. The security sensitive parts hold up. The dco script keeps untrusted text out of the shell, and `--apply` never deletes a ruleset and never writes a `needsPublic` field on a private repo. The export never touches `.git`. One real problem remains: `export-template.mjs` will delete tracked files in whatever git root you point it at, including the core repo itself. I reproduced that in a throwaway clone. The rest are minors and nits.

I ran `node --test "tooling/scripts/*.test.mjs"` (207 pass) and `pnpm check:js` (format, lint, types, drift all pass), with the uncommitted tests present.

## Major

### 🟠 The export deletes tracked files in any git root, with no guard against the core repo or a dirty clone, `tooling/scripts/export-template.mjs:294`

**Problem**: `trackedFiles()` only checks that `outDir` is the top level of some git repo. Then every tracked file the target doesn't produce is "stale" (line 360) and removed with `rmSync` (line 379). Nothing stops `outDir` from being the core repo, and nothing checks that the clone is clean.

**Failure case**: from the core root, `node tooling/scripts/export-template.mjs sdk-template-dotnet .`. In a throwaway clone of this repo, `--check` reported 714 differing files, and the write run deleted 97 tracked files (for example `.agents/skills/**`) before it crashed on a tracked symlinked folder (`ERR_FS_EISDIR` on `.claude/skills/dotnet-system-commandline`). Committed content comes back with `git checkout`, but uncommitted edits to any deleted file are lost. The same happens in a template clone that holds hand edits to a tracked file that is no longer produced. The `.git` folder is never touched, so the spec's wording holds. The intent ("a clone of its repo") isn't enforced.

**Suggested fix**: Refuse (exit 2) when the real path of `outDir` equals or contains the core root, or when it shares the core's git directory. Before deleting anything, refuse when `git status --porcelain` shows changes to tracked files, or require a `--force`. Add a test for each.

## Minor

### 🟡 A re-run before committing crashes, and `--check` calls an already removed file stale, `tooling/scripts/export-template.mjs:379`

**Problem**: `stale` comes from `git ls-files`, which still lists a file whose removal isn't staged yet. `rmSync(path)` has no `force`.

**Failure case**: reproduced. Export removes `OLD.md` and prints "wrote 8 file(s)". Before committing, run it again: `ENOENT lstat .../OLD.md`, a stack trace, and exit 1. In `--check` mode the same file shows as `stale OLD.md` even though it is gone. A tracked symlink to a folder fails the same way (`EISDIR`).

**Suggested fix**: Only treat a path as stale when it still exists on disk (`lstat`), and remove with `force: true`. Test the second run.

### 🟡 `--check` for the `.github` target needs the core's `origin/main`, `tooling/scripts/export-template.mjs:329`

**Problem**: With `--check` and no `ci.yml` in the clone, `pin` is empty, so the script runs `git rev-parse origin/main` in the core. The `.github` target has no workflows and never uses the SHA.

**Failure case**: in a core clone with no fetched `origin/main`, `export-template.mjs .github ../dot-github --check` exits 2 ("Run `git fetch`") for an unrelated reason, and the AC-16 and AC-17 drift check can't run.

**Suggested fix**: Resolve the pin only for targets that have `sdk`.

### 🟡 A GraphQL error, or any unexpected API shape, exits 1, the same code as drift, `tooling/scripts/github-settings.mjs:528`

**Problem**: `result.data.repository...` is read without a check. `gh api graphql` returns HTTP 200 with `{"data":null,"errors":[...]}` when a query fails (for example a token without the right scope). `result.data` is then `null`, which throws a plain `TypeError`, not a `SettingsError`. Node then exits 1 with a stack trace. The same goes for `.map` on a rulesets response that isn't an array (line 467).

**Failure case**: `github-settings.mjs orvanohq/orvano --profile core` on a public repo whose token can't read Discussions exits 1. A wrapper, or you reading only the exit code, takes that as "drift". The spec says exit 1 means drift and exit 2 means errors.

**Suggested fix**: Check `errors` and the shape, and throw `SettingsError` (exit 2). Add a test with a fixture error body.

### 🟡 The `Bot` skip can be claimed by anyone through a git author email, `.github/workflows/repo-hygiene.yml:100`

**Problem**: `author.type` is derived by GitHub from the commit's author email. A contributor can set `user.email` to Dependabot's noreply address (`49699333+dependabot[bot]@users.noreply.github.com`) and the commit is skipped, with no sign off. I did not reproduce this against live GitHub, so treat it as likely, not proven. Spec 0009 CTB-3 and 0010 DCO-2 choose this on purpose ("without a name list").

**Failure case**: an outside PR with commits authored as the bot passes `dco`. The impact is small, since you still read and merge every PR, but it makes the DCO check an advisory control, not a hard one.

**Suggested fix**: No code change needed if you accept it. Record it as an accepted residual in spec 0010 (or `rationale.md`). If you want it closed, also require the PR author (`github.event.pull_request.user.type`) to be a `Bot` before skipping.

### 🟡 `CONTRIBUTING.md` sends people to the wrong issues, `CONTRIBUTING.md:9`

**Problem**: It says to "pick up an issue labeled `triage` that a maintainer has confirmed". Per ISS-5 the `triage` label means "Needs a first look from a maintainer", so it marks the issues nobody has confirmed. The same sentence is in `tooling/starters/org/CONTRIBUTING.md:9`, and so will be in the `.github` repo.

**Failure case**: a first time contributor starts on an unconfirmed report, and the maintainer may close it.

**Suggested fix**: Point to a label that means confirmed (for example `good first issue`, once it exists), or drop the clause. Fix both files, then re-export `.github`.

## Nits

- ⚪ `.github/workflows/repo-hygiene.yml:89`: when the commit list call fails, the output ends with the sign off fix ("git rebase --signoff origin/main"). That advice is wrong for an API failure. Print the fix only when a commit failed.
- ⚪ `tooling/scripts/github-settings.mjs:594`: the `toggle` helper sends `DELETE` when a profile turns a security setting off. No profile does that today, so nothing is deleted, but the "never deletes" guarantee holds only because of the data. A one line assert (or no `DELETE` path) keeps it true.
- ⚪ `tooling/scripts/github-settings.mjs:652`: `--apply` switches CodeQL default setup off. That matches spec 0008 CI-3 and the spec's "confirms default setup is off", but it is a write beyond the profile's own fields. It is worth one line in the usage comment.
- ⚪ `CODE_OF_CONDUCT.md`: I diffed it against Contributor Covenant 3.0 upstream. It is identical except for the contact and the removed enforcement NOTE. AC-2 says "unchanged except the contact", so add "and the NOTE" to COC-1 and AC-2 so the spec matches the file. I agree with removing the NOTE.
- ⚪ `tooling/starters/org/profile/README.md:7`: the repo table links to SDK repos that don't exist yet (REP-3). Expected until features 10 and 52, but check the links before the `.github` repo goes public.

## Known deliberate choices, reviewed

- `read -r -d '' ... || true` for the dco script: correct under `bash -e` (the tests run the exact block through `bash -e`), and fine on bash 3.2.
- Trailers from the last paragraph only: matches DCO-2. A `Co-authored-by` block separated by a blank line after the sign off will fail the check and prints the fix. Acceptable, and CONTRIBUTING covers the fix.
- `--apply` reporting a second ruleset and the Discussions categories: right, and it keeps the "never deletes" promise. Tested at `github-settings.test.mjs` ("never deletes a second ruleset...").
- `--check` keeping the pinned SHA: right, otherwise every core commit would be drift.
- The `pull-requests: read` grant in `scheduled.yml`: needed, since a called workflow can't be granted more than its caller, and `ci.yml` now requests it for `repo`.

## Strengths

- The dco script is safe: the repo, PR number, and token arrive through `env:`; the script text sits in a quoted heredoc and is passed to `node -e "$script"` as one word, so commit text never reaches the shell. The only untrusted text printed is the author email in an annotation, and git emails can't hold a newline, so it can't forge a second workflow command. The token goes in a `Bearer` header to `GITHUB_API_URL` only.
- Paging and the 250 limit are right: `COMMIT_COUNT > 250` fails fast, exactly 250 passes, and a null author is checked as a human (DCO-2).
- `github-settings.mjs` is read only in check mode. In `--apply` on a private repo, the `waiting` fields are filtered out before any write (secret scanning, push protection, private reporting, the ruleset). Extra labels and rulesets are never removed, and the ruleset write only targets the one named `main`.
- `export-template.mjs` never reaches `.git`: removal is limited to paths from `git ls-files`, and the placeholder check fails the export (exit 2) if a starter still has `<lang>`, `<FULL_SHA>`, or `<date>`.
- Tests read the real `run:` block of `repo-hygiene.yml` and run it, so the job and its tests can't drift apart.
- The core and org issue forms, the CONTRIBUTING sections in order, and the DCO 1.1 text match AC-3 to AC-5 and COM-2.

## Test coverage

`TESTS = configured`. 207 tooling tests pass, including the new `community-setup.test.mjs` (forms, `config.yml`, CODEOWNERS, README links, CONTRIBUTING sections) and the additions to `github-settings.test.mjs` (private repo reads, `ghApi` parsing, the GraphQL query) and `export-template.test.mjs`. Gaps, all tied to the findings above: no test that the export refuses the core repo or a dirty clone; no test for a second run before committing; no test for a GraphQL error body. Not covered by any test, by design: the live GitHub steps (AC-1 private reporting, AC-6, AC-9 to AC-15, AC-20 including the unproven fork and Dependabot CodeQL upload), which wait for the public flip.
