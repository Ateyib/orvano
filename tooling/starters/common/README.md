# Common files

Copy all of these into the SDK repo's root:

- `.editorconfig`, `.gitattributes`: the same basics as the core repo (spec 0008 FMT-4, GIT-4)
- `LICENSE`, `NOTICE`: Apache 2.0 (spec 0009 LIC-1, LIC-2). Replace `{{PRODUCT_NAME}}` in `NOTICE` with the repo's name
  from spec 0009 LIC-2's table (for example `Orvano .NET Server SDK`); leave `LICENSE` exactly as it is
- `.github/dependency-review-config.yml`: the SDK license lists (spec 0009 DEP-8); keep only your repo's exceptions
- `typos.toml`: keep only the excludes that exist in your repo
- `.github/pull_request_template.md`: keep the blocks that fit the SDK (Security always stays, PRT-1)
- `.github/dependabot.yml`: delete the ecosystems your repo doesn't use
- `.github/zizmor.yml`: the same zizmor settings as the core repo
- `.github/workflows/ci.yml`: calls the shared workflows; set `<FULL_SHA>` and `<lang>` (KIT-1)

Branch protection requires `ci-gate` (feature 58 sets it up).
