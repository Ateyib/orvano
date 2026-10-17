# /check verify repo and community setup · BLOCKED (partial run, nothing failed)

_Feature 58, spec 0010. Build: `main` at `022bea5` (PR 4, orvanohq/orvano#4, merged). Steps from
[verify.md](../specs/0010-repo-community-setup/verify.md). Run on 2026-10-16, while the repo is still private on GitHub
Free and the project mailbox doesn't exist yet._

**BLOCKED: 7 of the 8 Commands steps passed, 1 passed with a wording problem in the step itself, nothing failed. The
rest can't run yet** (they need the OPN-1 history work, the public flip, the templates, or the mailbox). That is the
plan, not a defect.

Next: nothing to fix in code. You may want to run `/test` for feature 58 next, and come back to the blocked steps in
OPN-1 and OPN-2. The scope's `Verify it` box stays unticked, because most steps can't run yet.

## Worth a look

- **The `{{SECURITY_EMAIL}}` grep can never find nothing.** `git grep -n '{{SECURITY_EMAIL}}'` lists the three expected
  files (`SECURITY.md:10`, `CODE_OF_CONDUCT.md:50`, `TRADEMARKS.md:20`), but also spec 0010 itself (`index.md` lines 68,
  76, 161, 222, 270, 278) and `verify.md` lines 9 and 48, because they quote the placeholder. OPN-1 item 1 says the grep
  must find nothing, so as written it would block the flip forever. You may want `/architect` to scope the check, for
  example `git grep -n '{{SECURITY_EMAIL}}' -- ':!docs/specs'`. Left unticked in verify.md for that reason.
- **A skipped CodeQL job reports an unexpanded name.** On PR 4's head commit, the skipped CodeQL check run is named
  `analyze (${{ matrix.language }})`, not `analyze (csharp)` or `analyze (javascript-typescript)`. Today the job's only
  skip condition is `if: ${{ !github.event.repository.private }}` (`codeql.yml:23`, no path filter), so after the flip it
  should always run and report the real names. Low risk, but if a skip condition is ever added, the required checks
  from RUL-3 would wait forever. The OPN-2 proof PR (AC-9) confirms the real names.

## Passed (evidence)

| Step                                  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` (AC-19)                  | Exit 0 with the pnpm 12.12.1 native binary; the .NET build ends with 0 warnings, 0 errors                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pnpm test:tooling` (AC-7, 8, 16, 19) | Exit 0, 162 tests, 0 failed. `dco.test.mjs` (dco job wiring, dco script), `github-settings.test.mjs` (profiles, subsetDiff, check mode, `--apply`, `--org`, arguments), and `export-template.test.mjs` (SDK templates, `.github` target, trimDependabot, writing and `--check`, arguments) all pass                                                                                                                                                                                            |
| CoC diff (AC-2)                       | Downloaded the official Contributor Covenant 3.0 Markdown (EthicalSource `contributor_covenant`, `content/version/3/0/code_of_conduct.md`, Hugo front matter stripped) and diffed it. Exactly two changes: the reporting line now reads ``email `{{SECURITY_EMAIL}}`.`` instead of the reporting NOTE, and the enforcement NOTE paragraph is removed                                                                                                                                           |
| `CONTRIBUTING.md` (AC-3)              | Sections in COM-2 order: Ways to help, Before a big change, Local setup (points to `README.md#local-development` and `AGENTS.md`), Branches and pull requests, Sign your work (DCO), Dependabot NuGet PRs, Windows notes, License (with the trademark pointer). The DCO 1.1 text is word for word the one on developercertificate.org. CTB-6 sentence at line 107, `git rebase --signoff origin/main` at 98, `--force-with-lease` at 102, web edits sign off (CTB-4) at 105, DPB-3 step at 117 |
| Files and README (AC-4)               | `ls SUPPORT.md TRADEMARKS.md .github/CODEOWNERS` finds all three. `README.md:5` has the status line; `## Community` links CONTRIBUTING, CODE_OF_CONDUCT, SUPPORT, SECURITY, and TRADEMARKS                                                                                                                                                                                                                                                                                                     |
| Starters and export (AC-18)           | `tooling/starters/common/.github/workflows/` has `ci.yml`, `codeql.yml`, `dependency-review.yml`. `node tooling/scripts/export-template.mjs sdk-template-dart <scratch clone>` exits 0, writes 17 files pinned to `022bea5`, and no `codeql.yml` among them                                                                                                                                                                                                                                    |
| Settings check (AC-8)                 | `node tooling/scripts/github-settings.mjs orvanohq/orvano --profile core` (read only) exits 1. Real drift, all settings not applied yet: merge commits, rebase merge, squash title, web sign off, delete branch on merge, auto merge, update branch, projects, discussions, Dependabot alerts and security updates, the `triage` label. Exactly 4 `waiting for public` lines: secret scanning, push protection, private vulnerability reporting, `ruleset.main`                                |

## Partly checked on GitHub (read only)

- **AC-5 issue chooser: config confirmed, the rendered page not seen.** On `main`, `.github/ISSUE_TEMPLATE/` holds
  `bug_report.yml` ("Bug report"), `feature_request.yml` ("Feature request"), and `config.yml` with
  `blank_issues_enabled: false`. GitHub's GraphQL API serves the three contact links (Ask a question, Report a
  vulnerability, A bug in an SDK) for the repo. The API doesn't list YAML issue forms, and the built in browser isn't
  signed in to GitHub (the private repo returns 404), so nobody has looked at the chooser page itself. Open
  `https://github.com/orvanohq/orvano/issues/new/choose` signed in to tick this.
- **AC-7 dco, pass path only.** PR 4 (head `ada300a`): `repo / hygiene / dco` succeeded and its log prints
  `dco: 2 commit(s) signed off, 0 skipped (merge or bot).`; `ci-gate` succeeded. Both commits (`505aba9`, `ada300a`) have
  author `atteprojects@gmail.com` and a matching `Signed-off-by`. The failure cases (an unsigned commit, a mismatched
  email), the Dependabot and merge commit skips, and the weekly `Scheduled` run were not exercised. They need a
  throwaway PR with an unsigned commit, which wasn't run without your go.

## Not yet possible (and why)

| Step                                             | Waiting on                                                                                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{SECURITY_EMAIL}}` gone, same value in 3 files | VRP-1 mailbox (placeholder still present, as expected)                                                                                                                          |
| AC-7 failure cases, bot skips, Scheduled run     | a throwaway PR (your go), a Dependabot PR, the next weekly run                                                                                                                  |
| AC-12 `--org orvanohq`                           | `gh auth refresh -s admin:org`, an org admin step                                                                                                                               |
| AC-13 HIS-4 sweep and `git ls-remote`            | the OPN-1 history rewrite and repo recreation (done by hand)                                                                                                                    |
| AC-14 skills inventory and licenses              | OPN-1                                                                                                                                                                           |
| AC-1, 6, 8 (exit 0), 9, 10, 11, 15               | the public flip and `--apply` (OPN-2): rulesets, CodeQL, dependency review, secret scanning, private vulnerability reporting, Discussions all need a public repo on GitHub Free |
| AC-16, AC-17                                     | the `orvanohq/.github` repo and the `sdk-template-*` repos, made public                                                                                                         |
| AC-20 (RUL-4)                                    | CodeQL results from a fork PR and a Dependabot PR, after the flip                                                                                                               |
| Value sourcing rows                              | the flip (check names, `integration_id`), the templates (pin, CodeQL language), the SDK repos                                                                                   |

## What was ticked

- `verify.md`: ticked the 7 Commands steps that passed (`pnpm check`, `pnpm test:tooling`, the CoC diff,
  `CONTRIBUTING.md`, files and README, starters and export, the settings check). The `{{SECURITY_EMAIL}}` grep and every
  GitHub step stay unticked.
- Scope: nothing ticked; `Verify it` stays open.
- Spec: status unchanged.

## For /check review

- The unexpanded `analyze (${{ matrix.language }})` name on a skipped CodeQL run (above).
- The OPN-1 grep wording (above).
