# Rereview, repo & community setup (feature 58), 2026-10-16

**Reviewed by**: Sonnet 5.5 (the fixes were written on Opus 5.5, from the commit trailers on 09941a0 and 50f1c4b)
**Scope**: only the fixes for the first review (`docs/reviews/2026-10-16-review-repo-community-setup.md`): `8204a94` (old PR 5), fix commit `09941a0`, and `eda5a0a` (old PR 7), fix commit `50f1c4b`, both merged on `main`
**Verdict**: Approve with nits

## Summary

Every finding from the first review is resolved. I tried to get around the new core repo guard through a symlink, a relative path, a parent folder, and a git worktree, and all four are refused with exit 2. The Bot skip now needs the PR author to be a `Bot` too, it fails closed, and the PR author type reaches the script through `env:` only. No new problem is serious. There are two small nits, one of them the friction you asked about: a second export before you commit now needs `--force`.

I ran `node --test "tooling/scripts/*.test.mjs"` (224 pass). I also ran the export by hand against a throwaway template clone and against symlinked, relative, parent, worktree, and separate clone targets of the core.

## Earlier findings

| First review finding                                                                       | Status                           | Evidence                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟠 Major: the export deletes tracked files in any git root                                 | **Resolved**                     | `refuseCoreRepo` (`export-template.mjs`) compares real paths, so it refuses the core, a folder inside it, a folder that holds it, and any worktree of it (shared git common dir). The dirty check refuses a write over uncommitted tracked changes unless `--force`. `--check` and `--force` together exit 2. Tests for each. |
| 🟡 Minor: a re-run before committing crashes, and `--check` calls a removed file stale     | **Resolved**                     | `stale` now needs the file to exist (`lstat`), and `rmSync` uses `force: true`. A tracked symlink is covered by the same check. See nit 1 for the re-run itself.                                                                                                                                                              |
| 🟡 Minor: `.github` `--check` needs the core's `origin/main`                               | **Resolved**                     | Pin lookup is only for targets with `sdk`. Tests cover both modes for `.github`, and that an SDK target still needs it.                                                                                                                                                                                                       |
| 🟡 Minor: a GraphQL error or odd API shape exits 1                                         | **Resolved**                     | `readLive` throws `SettingsError` on `errors` or a missing `nodes` array, and `expectArray` guards the rulesets and labels lists. Four tests. This matches SET-4 (exit 1 is drift only).                                                                                                                                      |
| 🟡 Minor: the Bot skip can be claimed through a git author email                           | **Resolved**                     | Matches DCO-2 as decided in `19f6a6d` (old PR 6) and AC-7. See the DCO section.                                                                                                                                                                                                                                               |
| 🟡 Minor: CONTRIBUTING sends people to `triage` issues                                     | **Resolved**                     | Both `CONTRIBUTING.md` and `tooling/starters/org/CONTRIBUTING.md` now say an open issue _without_ `triage`, which matches ISS-5 ("Needs a first look").                                                                                                                                                                       |
| ⚪ Nits (dco API failure advice, `toggle` DELETE, CodeQL write, COC wording, README links) | Not in scope for these two fixes | Not reviewed again. They stay as the first review left them (the first review marked them as nits).                                                                                                                                                                                                                           |

## The core repo guard

Tried, all refused with exit 2:

- A symlink to the core (`link-core`): refused.
- A relative path, `.`, a subfolder (`server`), and the parent folder (`..`): refused.
- A `git worktree` of the core: refused, through the shared git common dir.

One case passes, which I think is fine: a separate full clone of the core repo somewhere else. It is a different repo with its own `.git`, so the guard does not see it. The dirty check still protects uncommitted work there, and `--check` against it reports lots of stale files, so a wrong target is easy to spot. I would not add code for this. The spec wording ("a clone of its repo") cannot tell a core clone from a template clone without a content check.

## DCO-2: `eda5a0a` (old PR 7)

- `PR_AUTHOR_TYPE: ${{ github.event.pull_request.user.type }}` is under `env:`. Every `${{ }}` in `repo-hygiene.yml` sits in `env:`, `with:`, or `working-directory:`, none inline in `run:`, and the script text is a quoted heredoc. No untrusted event text reaches the shell.
- `botPr = PR_AUTHOR_TYPE === "Bot"`, so a missing or any other value is a person (fails closed). A commit is skipped only when `botCommit && botPr`. A null author is still not a bot.
- A bot authored commit in a person's PR with no matching sign off fails with the "authored by a bot inside a person's PR" text and the `git commit --amend --reset-author -s` fix. One that is signed off with a matching email passes. The success line says "merge or bot PR". All of that is what DCO-2 and AC-7 say.
- Tests cover the Bot PR skip, the User PR failure text, the missing value, the matching sign off, and a check that the value goes through `env:`.

## Nits

- ⚪ **A second export before committing needs `--force`**, `tooling/scripts/export-template.mjs` (dirty check). I reproduced it: the first export leaves `CONTRIBUTING.md` modified and `OLD.md` deleted, so run two exits 2 ("uncommitted changes to tracked files") until you commit or pass `--force`. That is safe and the message is clear, but it means the loop "change a starter, export, look, change again, export" always needs `--force` after the first round, and `--force` also discards any real hand edit. `--check` is not blocked, and it correctly says the clone matches. Suggest one sentence in the usage comment and in `tooling/starters/README.md`: commit between exports, or use `--check` to see drift. No code change needed. Untracked files and the first run in a clean clone are not blocked.
- ⚪ **Spec 0010 TPL-2 does not mention the guard or `--force`.** It still shows `<target> <out-dir> [--check]` and says nothing about refusing the core or a dirty clone. Add one line to TPL-2 through `/architect` so the spec matches the script (the file header already documents it).

## Strengths

- The guard uses real paths plus the git common dir, so symlinks, relative paths, and worktrees all land on the same answer, and it runs before `--check` as well as before writes.
- The dirty check ignores untracked files, so a first export into a fresh clone and a scratch file never block anything.
- The fail closed default in the dco job is one expression, easy to read, and has a test.
- The error paths in `github-settings.mjs` name what came back, so a wrapper sees exit 2 and a reason.

## Test coverage

`TESTS = configured`. 224 tooling tests pass. Each fix has its own test: the three refusals (write, `--check`, parent folder), the dirty check with `--force` and untracked files, the second run, the `.github` target without `origin/main`, the four GraphQL and list shape errors, and the four dco cases. Not covered by any test: a symlinked or worktree target (I checked both by hand, they hold), and a separate clone of the core (accepted above).
