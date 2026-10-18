# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Community files at the repo root: `SECURITY.md` (private vulnerability reporting, supported versions, response targets, scope, and safe harbor), `CODE_OF_CONDUCT.md` (Contributor Covenant 3.0), `CONTRIBUTING.md` (setup pointers, branches and PRs, the DCO sign off and how to fix a failed check, AI tools, Windows notes), `SUPPORT.md`, and `TRADEMARKS.md`. `README.md` links them from a new Community section. The project security address is still a placeholder, to be filled in before the repo goes public. (spec 0010 VRP, COC, COM; `65f6379` (old PR 4))
- Issue forms for bug reports and feature requests, with blank issues turned off and links to Discussions Q&A and private reporting, plus `.github/CODEOWNERS`. (spec 0010 ISS; `65f6379` (old PR 4))
- A `dco` sign off job inside `ci-gate` that runs on every PR. It lists each commit whose sign off is missing or doesn't match its author, and prints the `git rebase --signoff` fix. Merge commits are skipped. (spec 0010 AC-7, spec 0009 CTB-3; `65f6379` (old PR 4))
- `tooling/scripts/github-settings.mjs`, which keeps the GitHub repo and org settings (the `main` ruleset, security features, labels, Discussions categories) as code. Check mode is read only and exits 1 on drift; `--apply` writes the differences with your own `gh` login. It never runs in CI. (spec 0010 SET, RUL, ORG; `65f6379` (old PR 4))
- `tooling/scripts/export-template.mjs`, which writes a template repo's tree from `tooling/starters/**` into a clone, with `--check` to report drift. The starters gain CodeQL and dependency review workflows (the Dart export has no CodeQL) and a new `tooling/starters/org/` source for the org `.github` repo. The template repos and the org `.github` repo themselves don't exist yet. (spec 0010 TPL; `65f6379` (old PR 4))
- `node --test` suites for the dco job and both scripts, run by `pnpm test:tooling`. (spec 0010 AC-19; `65f6379` (old PR 4), `8204a94` (old PR 5))

### Changed

- CodeQL now uploads its results on every event, fork and Dependabot PRs included, so the code scanning gate can be added once both uploads are proven. (spec 0010 RUL-5; `65f6379` (old PR 4))
- The `dco` job skips a commit authored by a bot only when a bot also opened the PR. In a PR opened by a person, a bot authored commit is checked like any other and fails without a matching sign off, with the `git commit --amend --reset-author -s` fix. If the PR author type is missing, it counts as a person. This closes a gap where anyone could claim the skip through a git author email. (spec 0010 DCO-2; `19f6a6d` (old PR 6), `eda5a0a` (old PR 7))

### Fixed

- `export-template.mjs` refuses to write into the core repo (including a symlink, a folder inside or above it, or a worktree of it), and refuses a clone with uncommitted changes to tracked files unless you pass `--force`. Before, a wrong target could delete tracked files. (`8204a94` (old PR 5))
- `export-template.mjs` no longer crashes on a second run before you commit a removal, `--check` no longer calls an already removed file stale, and the `.github` target no longer needs the core's `origin/main`. (`8204a94` (old PR 5))
- `github-settings.mjs` exits 2 on a GraphQL error or an unexpected API response, so exit 1 always means drift. (`8204a94` (old PR 5))
- `CONTRIBUTING.md` (core and org) points newcomers to open issues without the `triage` label. (`8204a94` (old PR 5))
