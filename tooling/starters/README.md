# SDK repo starters

Spec 0008 KIT-1 to KIT-3: the files each SDK repo copies so it starts with the same formatting, linting, hooks, and
CI as this repo. Feature 58 turns these folders into template repos.

1. Copy everything in `common/` into the new repo's root.
2. Copy the folder for its language (`dotnet/`, `typescript/`, or `dart/`) on top, and follow that folder's README.
3. In `.github/workflows/ci.yml`, replace `<FULL_SHA>` with the full commit SHA of `orvanohq/orvano` `main` you
   tested against, and keep the `# main as of <date>` comment current.

These files are proven when the first SDK repo of each language goes green on them (KIT-3), not before. Until then,
change them in the same PR as the practice spec they copy (0002, 0004, 0005). This whole folder is excluded from
this repo's workspace, formatter, linters, typos, and Dependabot, so its config never acts on the core repo.
