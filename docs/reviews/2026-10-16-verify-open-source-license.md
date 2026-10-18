# /check verify open source license · PASS

_Feature 57, spec 0009 Rollout steps 1 to 5. Build: commit 269a067 on `main`, plus the Dart fix in `4335a79`. Steps
from [verify.md](../specs/0009-open-source-license/verify.md). First run on 2026-10-16 (FAIL), rerun the same day
after the fix (PASS)._

**PASS: all 10 steps met, every specced surface in Rollout steps 1 to 5 built.** The "after the repo goes public" step
(DEP-8 scratch branch proof) is feature 58 and was skipped, as planned.

Next: feature 57's next box. The scope's Verify it box is now ticked. Marking the feature `done` and spec 0009
`Accepted` waits for your go.

## Fixed since the first run

- **LIC-8, `sdk-dart.yml` "The package carries LICENSE and NOTICE"**: the first run found that the old grep,
  `(^|[[:space:]|'-])LICENSE\b` over the whole `pub publish --dry-run` output, matched pub's own error line
  `* You must have a LICENSE file in the root directory.`, so a package with no `LICENSE` passed (exit 0). The `|| true`
  hides pub's own failure and no other step runs a publish dry run, so nothing else caught it.
- `4335a79` now matches only the dry run's file tree lines: `grep -Eq "^[[:space:]]*(├|└)── $file( |$)"`.
- Evidence (rerun): the committed step's script, extracted from the workflow and run with `FLUTTER=false` against three
  scratch Dart packages with real `dart pub publish --dry-run`, in the default locale and with `LC_ALL=C`: both files →
  exit 0; no `NOTICE` → `::error::the published package has no NOTICE`, exit 1; no `LICENSE` →
  `::error::the published package has no LICENSE`, exit 1.

## Passing (evidence)

| Step                     | Evidence                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LIC-1 `LICENSE` checksum | `shasum -a 256 LICENSE` → `cfc7749b…bc523d30`, as expected; the appendix is present                                                                                                                                                                                                                                                                                            |
| LIC-2 `NOTICE`           | `cat NOTICE` → the five LIC-2 lines with `Orvano`, ending in one newline                                                                                                                                                                                                                                                                                                       |
| LIC-7 license fields     | `node -p "…"` → `Apache-2.0 Apache-2.0`                                                                                                                                                                                                                                                                                                                                        |
| DEP-8 core lists         | `allow-licenses` is the 12 Permissive IDs plus `MPL-2.0`; `allow-dependencies-licenses` is `pkg:npm/caniuse-lite` and `pkg:nuget/Microsoft.Testing.Extensions.CodeCoverage`; `fail-on-severity: moderate`                                                                                                                                                                      |
| LIC-6 image              | `docker buildx build --load --platform linux/amd64 -f deploy/Dockerfile -t orvano:verify .` exit 0; labels `{"org.opencontainers.image.licenses":"Apache-2.0","org.opencontainers.image.source":"https://github.com/orvanohq/orvano"}`; the exported filesystem has `app/LICENSE` (same checksum) and `app/NOTICE` (byte identical to the root file). Image removed afterwards |
| Starters, common         | `LICENSE` same checksum; `NOTICE` has `{{PRODUCT_NAME}}`; the SDK review config lists the Permissive IDs only (no `MPL-2.0`), with the DEP-5 dev exceptions for TypeScript (`caniuse-lite`, `lightningcss` and its 8 platform packages) and .NET                                                                                                                               |
| Starters, dotnet         | `PackageLicenseExpression` `Apache-2.0`, the `LICENSE;NOTICE` pack item with `PackagePath=""`, `RepositoryUrl` `https://github.com/orvanohq/sdk-dotnet`; the README has no "feature 57" note                                                                                                                                                                                   |
| Starters, typescript     | `package.json` `"license": "Apache-2.0"`; the README says each published package sets `"files": ["dist", "NOTICE"]` (the starter root is the private workspace, so `files` belongs on each package)                                                                                                                                                                            |
| LIC-8 npm and NuGet      | Each step's script, extracted and run on scratch packages. npm: both files → exit 0, no `NOTICE` → error, exit 1. NuGet: both at the zip root → exit 0; a missing `NOTICE` and a `NOTICE` only in a subfolder → one error each, exit 1                                                                                                                                         |
| PR templates             | `.github/pull_request_template.md:19` and `tooling/starters/common/.github/pull_request_template.md:19` read "allowed license (spec 0009 DEP-1)"                                                                                                                                                                                                                               |
| `pnpm check`             | Exit 0 with the pnpm 12.12.1 wrapper; the strict .NET build ends with 0 warnings, 0 errors                                                                                                                                                                                                                                                                                     |

## Not checked here

- The DEP-8 scratch branch proof (a listed exception passes, an unlisted license fails): needs the repo to be public,
  feature 58.
- A real `dotnet pack` with the starter `Directory.Build.props`: the step asks for the file's content, and the zip
  check was proved on scratch `.nupkg` files. The first `sdk-dotnet` repo's CI will run it for real.

## For /check review

- The Dart step's `|| true` is needed (pub exits non zero on warnings), so only the grep decides. It now depends on
  pub's tree drawing characters (`├──`, `└──`); a pub release that changes that layout would fail the step loudly
  (both files reported missing), not pass it silently.
