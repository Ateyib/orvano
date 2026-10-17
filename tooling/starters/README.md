# SDK repo starters

Spec 0008 KIT-1 to KIT-3 and spec 0010 TPL-1 to TPL-6: the files each SDK repo starts with, so it gets the same
formatting, linting, hooks, CI, security checks, and community defaults as this repo. This folder is the only place
that content is edited (KIT-2, TPL-2). Each target repo gets a copy through the export:

| Folder        | Exported to                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `common/`     | every SDK template, first                                                                       |
| `dotnet/`     | `orvanohq/sdk-template-dotnet`, on top of `common/`                                             |
| `typescript/` | `orvanohq/sdk-template-typescript`, on top of `common/`                                         |
| `dart/`       | `orvanohq/sdk-template-dart`, on top of `common/`                                               |
| `org/`        | `orvanohq/.github`, with the core root `SECURITY.md`, `CODE_OF_CONDUCT.md`, and `SUPPORT.md` |

## Export

After you change anything here, or one of the core root community files, run the export into a clone of each
affected repo, look at the diff, then commit there with `git commit -s` and open a PR (no workflow pushes to another
repo):

```bash
node tooling/scripts/export-template.mjs sdk-template-dotnet ../sdk-template-dotnet
```

Targets: `sdk-template-dotnet`, `sdk-template-typescript`, `sdk-template-dart`, `.github`. The export fills
`<lang>` and `<codeql-lang>`, pins `<FULL_SHA>` to this repo's `origin/main` with `<date>` set to today, trims
`dependabot.yml` to the target's ecosystems, adds `.github/CODEOWNERS`, and merges the folder READMEs into one
`SETUP.md`. It removes tracked files it no longer produces and never commits. With `--check` it writes nothing and
exits 1 when the clone differs (the pinned SHA and date already in the clone are kept for the comparison).

Repos already made from a template don't follow it: port a change to them by hand (TPL-6).

These files are proven when the first SDK repo of each language goes green on them (KIT-3), not before. Until then,
change them in the same PR as the practice spec they copy (0002, 0004, 0005). This whole folder is excluded from
this repo's workspace, formatter, linters, typos, and Dependabot, so its config never acts on the core repo.
