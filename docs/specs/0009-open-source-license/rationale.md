# 0009. Open source license: rationale

The decision record behind [index.md](index.md). `/develop` reads `index.md`; this file is the why.

## Context

Orvano is about to go public as an open source, self hostable backend as a service. Before that first public push it needs a license, because without one the code is "all rights reserved" and nobody may use it, and the license can only be changed easily before outside contributions arrive. Feature 58 (branch protection, `SECURITY.md`, `CONTRIBUTING.md`, sign off checks, going public) is blocked on it.

Several things already wait on the answer. Spec 0002 LIB-2 needs a `PackageLicenseExpression` for `Orvano.Server`, and the SDK starter has a placeholder for it. Spec 0004 PUB-3 needs a `LICENSE` file for pub points. Spec 0002 GEN-5 set an interim dependency allow list until "Orvano's own license is chosen", and spec 0008 CI-3 copied it into `.github/dependency-review-config.yml`. Spec 0008 GIT-3 left sign off versus a contributor agreement open. Once the repo is public, the dependency review check becomes required, so the list must be right by then.

The forces: Orvano is new and needs adoption by app teams and companies more than it needs protection from a large cloud reselling it. The SDKs go inside other people's apps, often closed source ones, so whatever the core uses, the SDKs must be easy to embed. A backend that stores other people's users and secrets benefits from a patent grant, since companies' lawyers look for one. The project has one maintainer today, so contributor terms should cost contributors and the maintainer as little as possible. Finally, the current dependency tree already contains licenses the interim list does not allow (see _License scan_ below), so the list must be fixed, not just copied.

Not deciding means feature 58 cannot ship, packages cannot be published with correct metadata, and the first contributor PRs arrive with no agreed terms, which makes any later license change need every contributor's consent.

## Options considered

### Option 1: Apache 2.0 everywhere, DCO sign off

The core, the console, the docs, and all SDKs under Apache 2.0, copyright "The Orvano Authors", contributions certified per commit with the Developer Certificate of Origin.

**Pros**:

- Permissive with an explicit patent grant and patent termination clause; the license most companies already approve (basis: Apache License 2.0, sections 2 and 3).
- One license across every repo, so the SDKs embed in closed apps with nothing to clear.
- Apache 2.0 code can be included in GPL 3.0 and AGPL 3.0 works, so a stricter license for later versions stays possible without contributors' consent (basis: FSF license compatibility list, Apache 2.0 compatible with GPLv3).
- DCO is one flag per commit, used by Linux, GitLab, and most CNCF projects (basis: DCO 1.1).

**Cons**:

- Anyone may run a hosted or closed modified Orvano and give nothing back.
- Without a CLA there is no single copyright holder, so commercial dual licensing and moves to source available licenses are ruled out for contributed code.
- The NOTICE mechanism and third party notices add a small release task.

### Option 2: AGPL 3.0 for the core, permissive SDKs

The core under AGPL 3.0 only, the SDKs under Apache 2.0 or MIT, with DCO.

**Pros**:

- Anyone who offers a modified Orvano over the network must publish their changes, which stops closed hosted forks.
- Used by several self hosted infrastructure projects (Grafana, MinIO before its change), so it is a known model.

**Cons**:

- Some companies ban AGPL software outright, including for internal self hosting, which hurts adoption of a new project.
- Moving to a permissive license later needs every contributor's consent (or a CLA from day one).
- Copyleft questions at the edge (functions code, plugins, custom modules loaded into the server) need careful answers and documentation.
- Two licenses across the org instead of one.

### Option 3: AGPL 3.0 plus a commercial license (dual licensing), with a CLA

AGPL for the community, a paid license for companies that won't accept AGPL; contributors sign a CLA so the project owns enough rights to sell the commercial license.

**Pros**:

- A direct business model: the license itself is a product.
- Full control over future licensing.

**Cons**:

- A CLA is the biggest single barrier to outside contributions, and many developers distrust CLAs used for dual licensing.
- Needs a legal entity to sell licenses, which doesn't exist today.
- All of Option 2's adoption costs.

### Option 4: MIT everywhere, DCO sign off

Like Option 1 but with the MIT license.

**Pros**:

- The shortest and most familiar license; the norm on npm and pub.dev (PocketBase and Nhost use it).
- No NOTICE file.

**Cons**:

- No explicit patent grant or patent termination, which matters more for a server product companies run than for a small library.
- No practical gain over Apache 2.0 for app teams, since both are permissive.

## Rationale

Option 1 fits the forces. The biggest risk for a new backend as a service is not that a cloud resells it but that nobody adopts it, and the permissive license with a patent grant is the one company lawyers clear fastest. AGPL's protection only matters once Orvano is popular enough to be worth reselling, and Apache 2.0 keeps that door open: because Apache 2.0 code flows into AGPL 3.0 works, a future major version could switch to AGPL for new code without tracking down contributors. The reverse (AGPL now, permissive later) needs every contributor's consent, which is why Option 2 is the riskier bet for a one maintainer project. Option 3 needs a company and a CLA the project doesn't have, and the CLA would cost the contributions a young project most needs. Option 4 is close, but Apache's patent grant is worth its NOTICE file for software that runs in companies' infrastructure.

The SDKs follow the core because they must be permissive anyway (apps embed them), and one license in every repo means one sentence in every README and one answer for every scanner. DCO pairs with Apache 2.0: since the project doesn't need extra rights from contributors, a CLA would only add friction. Copyright "The Orvano Authors" with no AUTHORS file is the usual DCO pairing; git already records who wrote what.

The dependency list is tiered because the two kinds of repos carry different risk. The core is a program people run, so MPL 2.0 libraries are fine there as long as Orvano never edits their files (MPL's copyleft covers changes to those files only, the same reasoning as the Apache Software Foundation's category B). The SDKs pass their dependencies to every app that installs them, so they stay permissive only and app teams never inherit a notice duty. Dev only tools with other licenses are named exceptions per package, not a wider license list, because dependency review checks licenses without knowing whether a package is a dev or runtime dependency: a wider list would quietly widen the runtime list too. A generated `THIRD_PARTY_NOTICES` at release meets MIT's, BSD's, and Apache's notice terms for what the image and console bundle redistribute, without committing a large generated file that churns on every Dependabot bump.

A short trademark policy is the cheap half of the protection AGPL would have given: Apache 2.0 section 6 grants no rights to the name, so writing down "forks must rename" before going public is what stops a hosted fork from trading on the Orvano name.

## License scan (2026-10-16)

**npm** (every package under `node_modules/.pnpm`, runtime and dev, read from each `package.json`):

| License         | Packages | Examples outside the interim list                                   |
| --------------- | -------- | ------------------------------------------------------------------- |
| `MIT`           | 284      |                                                                     |
| `Apache-2.0`    | 20       |                                                                     |
| `ISC`           | 11       |                                                                     |
| `BSD-2-Clause`  | 6        |                                                                     |
| `BSD-3-Clause`  | 5        |                                                                     |
| `MPL-2.0`       | 2        | `lightningcss`, `lightningcss-darwin-arm64` (Vite+ CSS, build only) |
| `BlueOak-1.0.0` | 1        | `minimatch` (dev)                                                   |
| `CC-BY-4.0`     | 1        | `caniuse-lite` (Browserslist data, build only)                      |
| `Unlicense`     | 1        | `isbot`                                                             |

`axe-core` and `@axe-core/playwright` (MPL 2.0, spec 0003 WEB-7) were not yet installed. Only the macOS `lightningcss` binary was installed; CI on Linux and Windows installs the matching `lightningcss-linux-*` and `lightningcss-win32-*` packages, hence the `lightningcss-*` entry.

**NuGet** (package references in `server/`, licenses as published on nuget.org, as of my knowledge): `Npgsql`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `Npgsql.OpenTelemetry` (PostgreSQL License); `NSec.Cryptography` (MIT); `OpenTelemetry.*` (Apache 2.0); `System.CommandLine`, `Microsoft.AspNetCore.*`, `Microsoft.CodeAnalysis.BannedApiAnalyzers` (MIT); `xunit.v3.*` (Apache 2.0); `Shouldly`, `BenchmarkDotNet`, `Testcontainers.PostgreSql` (MIT; `Testcontainers` is MIT); `Microsoft.Testing.Extensions.CodeCoverage` (Microsoft Software License Terms, not open source: the one dev exception on the .NET side).

**Container image**: final stage `mcr.microsoft.com/dotnet/aspnet:10.0.13-noble-chiseled` (chiseled Ubuntu 24.04). Its OS packages include LGPL and GPL components (glibc and similar), which are separate programs aggregated in the image (DEP-7), not dependencies of Orvano's code.

## References

**Project sources**:

- Spec 0002 GEN-5 (interim list, maintenance test), LIB-2 (package metadata)
- Spec 0003 WEB-7 (MPL dev only carve out)
- Spec 0004 PUB-3 (LICENSE for pub points)
- Spec 0005 NPM-4 (npm adds LICENSE)
- Spec 0006 SUP-2 (dependency review blocks forbidden licenses)
- Spec 0007 REP-1, REP-3, IMG-1 (repo layout, SDK repo names, image)
- Spec 0008 GIT-2, GIT-3, CI-3, CI-4, KIT-1 (squash merges, the open sign off choice, dependency review, workflow hardening, the shared hygiene workflow)
- `.github/dependency-review-config.yml`, `tooling/starters/dotnet/Directory.Build.props`, `deploy/Dockerfile`

**Practices & standards**:

- Apache License, Version 2.0 (sections 2, 3, 4, 6: copyright grant, patent grant and termination, redistribution and NOTICE, trademarks)
- Developer Certificate of Origin 1.1
- Free Software Foundation license compatibility (Apache 2.0 with GPLv3 and AGPLv3)
- Apache Software Foundation third party license policy (category A permissive, category B weak copyleft used unmodified, category X forbidden)
- Mozilla Public License 2.0 (file level copyleft)
- SPDX license identifiers and expressions
- GitHub dependency review action configuration (`allow-licenses`, `allow-dependencies-licenses` by package URL)
- OCI image annotations (`org.opencontainers.image.licenses`)
