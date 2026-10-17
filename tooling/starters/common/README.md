# Common files

Copy all of these into the SDK repo's root:

- `.editorconfig`, `.gitattributes`: the same basics as the core repo (spec 0008 FMT-4, GIT-4)
- `typos.toml`: keep only the excludes that exist in your repo
- `.github/pull_request_template.md`: keep the blocks that fit the SDK (Security always stays, PRT-1)
- `.github/dependabot.yml`: delete the ecosystems your repo doesn't use
- `.github/zizmor.yml`: the same zizmor settings as the core repo
- `.github/workflows/ci.yml`: calls the shared workflows; set `<FULL_SHA>` and `<lang>` (KIT-1)

Branch protection requires `ci-gate` (feature 58 sets it up).
