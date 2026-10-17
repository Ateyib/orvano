# Common files

Every SDK repo has these at its root:

- `.editorconfig`, `.gitattributes`: the same basics as the core repo (spec 0008 FMT-4, GIT-4)
- `LICENSE`, `NOTICE`: Apache 2.0 (spec 0009 LIC-1, LIC-2). Replace `{{PRODUCT_NAME}}` in `NOTICE` with the repo's
  name from spec 0009 LIC-2's table (for example `Orvano .NET Server SDK`); leave `LICENSE` exactly as it is
- `.github/dependency-review-config.yml`: the SDK license lists (spec 0009 DEP-8); keep only your repo's exceptions
- `typos.toml`: keep only the excludes that exist in your repo
- `.github/pull_request_template.md`: keep the blocks that fit the SDK (Security always stays, PRT-1)
- `.github/dependabot.yml`: the ecosystems the repo uses (the export keeps the language's and `github-actions`)
- `.github/zizmor.yml`: the same zizmor settings as the core repo
- `.github/CODEOWNERS`: added by the export (spec 0010 OWN-1)
- `.github/workflows/ci.yml`: calls the shared workflows at a pinned core SHA (KIT-1). The export sets the language,
  the SHA, and its date; move the pin forward with the core
- `.github/workflows/codeql.yml` (not for Dart) and `.github/workflows/dependency-review.yml`: the security checks
  the repo's `main` ruleset requires (spec 0010 TPL-5, RUL-3). Both need a public repo on GitHub Free

Community files (security policy, code of conduct, support, contributing, and issue forms) come from the org's
`orvanohq/.github` repo, so an SDK repo doesn't carry its own (spec 0010 COM-4, ISS-3).
