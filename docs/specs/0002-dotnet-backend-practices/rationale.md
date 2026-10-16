# 0002. .NET backend practices: rationale and research

Decision record for [index.md](index.md). `/develop` does not need this file; it is for people and for `/architect` on a later update.

## Context

Orvano is a self hostable backend as a service. Its server holds other people's users, data, and secrets, and later runs their code, so the scope sets the GA workflow tier for it. The server is written in .NET 10 (given, not reopened), and one of the six SDKs, the .NET server SDK, is a published NuGet library in its own repo. No code exists yet; features 6 (scaffold) and 7 (`/audit` and tooling) turn this spec into a real project and into `AGENTS.md` conventions.

Forces that shaped the rules:

- **Many hands, many agents.** About 50 features will be built one slice at a time, largely by AI agents following `AGENTS.md`. Without one written way, each slice invents its own error style, test style, and folder shape, and the codebase drifts fast. Rules have to be specific enough to check, not just advice.
- **Two kinds of data.** Orvano's own tables have a fixed schema. Project databases have tables your users define at runtime, must stay engine neutral (other engines come later), and are an injection risk because names and values come from callers.
- **Self hosting.** Operators run Orvano on their own boxes with Docker or Kubernetes. Configuration, migrations, and logs have to be safe and obvious for someone who did not write the code, and upgrades (feature 53) must not race between replicas.
- **Open source with no paid plans.** Dependencies must stay free for anyone who forks or self hosts. Several well known .NET libraries changed to commercial licenses in 2025.
- **A published library has different duties than an app.** The SDK must stay small, dependency light, compatible across versions after beta, and safe to embed in any server app.
- **Timing.** .NET 8 and .NET 9 both leave support on 2026-11-10, four weeks after this spec, and .NET 10 is the LTS release until 2028-11-14.
- **Backwards compatibility is not required until after beta,** so early design can change, but the habits that make compatibility possible should start now.

## Options considered

The technology picks per area are below under *Research by practice area*. The top level choice for a cross cutting standard is how hard to enforce it.

### Option 1: Document and enforce from the first line of code

Write numbered rules, then enforce the checkable ones with analyzers, a banned API list, and architecture tests in CI from the scaffold onward; review covers the rest.

**Pros**: rules hold without relying on memory; agents get immediate build feedback; no cleanup debt, because there is no code yet.
**Cons**: tooling setup cost in feature 7; strict builds slow down quick experiments; some rules (log content, cache need) still rely on review.

### Option 2: Document, build first, then one migration PR

Write the rules, let the first slices land loosely, then bring everything in line in one coordinated change.

**Pros**: fastest first slice; rules can be tuned against real code before they bite.
**Cons**: with no existing code, this only manufactures debt; the migration PR touches every module at once and is risky to review.

### Option 3: Document only

Write the rules and rely on code review.

**Pros**: zero tooling cost; maximum flexibility.
**Cons**: weakest enforcement; drift starts on day one, and agents repeat whatever pattern they last saw.

## Rationale

Option 1. There is no existing code, so enforcing from the start costs nothing in migration and avoids all debt (the main argument for Option 2 is moot). The builders are mostly agents reading `AGENTS.md`; a failing build is the feedback they act on most reliably, which is why the engineer chose MUST and SHOULD rules with examples, analyzers plus architecture tests, and one spec covering shared, server, and library rules. Review stays for what tools cannot judge.

Across the technology picks, three forces did most of the work: prefer what ships in .NET 10 (fewer dependencies for a self hosted, open source product, and nothing that can change license under us), keep each feature's code in one place (slices match how the scope is built), and test against the real engine (the data API is the product).

## Research by practice area

Each row: the options weighed, the pick (chosen by the engineer in the design conversation), why, and the runner up.

### Layout and API

| Area | Options weighed | Pick | Why | Runner up |
|---|---|---|---|---|
| Code organization | Modular monolith with vertical slices · Clean Architecture layers · classic N tier | Modular monolith, slices | Matches the scope's slices; a feature's change stays in one folder; boundaries per product area (basis: vertical slice architecture; modular monolith before microservices) | Clean Architecture (familiar, but one feature touches four projects) |
| Projects | Project per module · one project with folders · two projects per module | Project per module | `internal` really hides module internals; references are checkable | One project with folders (faster builds, weaker boundaries) |
| Endpoint style | Minimal APIs · MVC controllers · FastEndpoints | Minimal APIs | Microsoft's current default; .NET 10 adds built in validation and OpenAPI 3.1 for them (basis: ASP.NET Core 10 release notes) | Controllers |
| Dispatch | Direct handler classes · source generated Mediator (MIT) · MediatR · Wolverine | Direct handlers | Traceable with go to definition, no indirection; MediatR is commercial from 13.0 | Mediator by martinothamar (MIT, source generated) |
| DI | Built in, explicit · built in plus Scrutor scanning · Autofac | Built in, explicit | Visible registrations, AOT safe; handler counts per module stay small | Scrutor |
| Mapping | Hand written · Mapperly · AutoMapper | Hand written | Most reads project straight to responses in EF; explicit and AOT safe; AutoMapper is commercial from 15.0 | Mapperly |

### Data access

| Area | Options weighed | Pick | Why | Runner up |
|---|---|---|---|---|
| Platform tables | EF Core 10 + Npgsql · Dapper · raw Npgsql | EF Core 10 + Npgsql | Typed model, LINQ, and migrations in one tool; Npgsql's provider 10.0.x is stable; EF Core 10 is LTS to 2028-11-10 | Dapper |
| Project databases | Raw Npgsql behind an engine adapter · SqlKata · Dapper plus own builder | Npgsql behind adapter | Runtime schemas cannot have a compile time model; the adapter is what keeps the data API engine neutral (basis: ports and adapters) | SqlKata |
| Migrations | Explicit migrate step · auto migrate at startup · SQL first tool (DbUp, grate) | Explicit migrate step | Upgrades are visible, never race between replicas, and fail before the server starts (basis: EF Core guidance against migrating at app startup in production) | SQL first tool |
| DbContext use | DbContext in handlers · repository per aggregate · one shared DbContext | DbContext in handlers | EF already is the unit of work and repository; a shared context would break module boundaries | Repository per aggregate |
| Naming | snake_case via EFCore.NamingConventions · snake_case by hand · EF default PascalCase | Plugin | Postgres idiom; no quoted identifiers in the SQL editor, backups, or hand written SQL | By hand |

### Errors, validation, logging, configuration

| Area | Options weighed | Pick | Why | Runner up |
|---|---|---|---|---|
| Expected failures | Own small Result type · exceptions plus global handler · ErrorOr · FluentResults | Own Result | Failures visible in signatures, cheap on hot paths, about 150 lines, no dependency (basis: result pattern; RFC 9457 at the edge) | Exceptions plus `IExceptionHandler` |
| Validation | .NET 10 built in · FluentValidation (Apache 2.0) · handler only | Built in | No dependency; one style; data rules live in handlers anyway | FluentValidation |
| Logging and telemetry | MEL plus OpenTelemetry · Serilog · MEL only | MEL plus OpenTelemetry | Vendor neutral, built in, one pipeline for logs, traces, and metrics; features 45 to 47 build on it | Serilog |
| Configuration | `ORVANO_` env vars with `__` nesting · flat names mapped by hand · config file first | Env vars with prefix | Maps straight onto options with no mapping code; natural for Docker and Kubernetes; `_FILE` keys cover mounted secrets (basis: twelve factor config; Docker secrets convention) | Flat names |

### Testing

| Area | Options weighed | Pick | Why | Runner up |
|---|---|---|---|---|
| Framework | xUnit v3 · TUnit · MSTest 4 · NUnit | xUnit v3 | Most used, most examples (helps agents); now on Microsoft.Testing.Platform v2 | TUnit (fast and modern, younger and fast moving) |
| Assertions | Shouldly · AwesomeAssertions · built in Assert · FluentAssertions v8 | Shouldly | Long lived, small, permissive license; FluentAssertions v8 needs a paid Xceed license for commercial use | AwesomeAssertions (Apache 2.0 fork, young, v9 renames namespaces) |
| Test doubles | Fakes first plus NSubstitute · Moq · FakeItEasy · hand written only | Fakes first, NSubstitute | Readable, license clean; Moq's 2023 SponsorLink episode left trust issues (current status not verified) | Hand written only |
| Test database | Testcontainers plus Respawn · shared compose database · container per test class | Testcontainers plus Respawn | Same engine as production, same on every machine and CI | Container per test class |
| Architecture tests | ArchUnitNET · NetArchTest.eNhancedEdition · reflection tests by hand | ArchUnitNET | Actively maintained, expressive type level rules | NetArchTest.eNhancedEdition |

### Performance and build

| Area | Options weighed | Pick | Why | Runner up |
|---|---|---|---|---|
| Compile mode | JIT with AOT friendly code · Native AOT · JIT plus ReadyToRun | JIT, AOT friendly | EF Core and reflection work freely; Dynamic PGO gives strong steady state speed for a long running server; source generators keep AOT open | ReadyToRun |
| Caching | HybridCache · IMemoryCache plus IDistributedCache · FusionCache | HybridCache | GA, in the box, two levels with stampede protection and tags, works with or without Redis | FusionCache |
| Build setup | `.slnx`, Directory.Build.props, central package management, global.json · classic `.sln` and per project versions | Modern central | One version per package across 15+ projects; the SDK repo copies the same files | Classic |
| Analyzers | latest-recommended plus warnings as errors · latest-all · defaults as warnings | Recommended plus errors | Catches real bugs without teaching people to suppress | latest-all |
| Perf checks | Budgets plus BenchmarkDotNet plus load tests · benchmarks only · profile when needed | Budgets plus benchmarks | Regressions found before release, not by self hosters | Benchmarks only |
| Load tool | k6 · NBomber · bombardier or wrk | k6 | Scenarios and thresholds as budgets; runs as a separate binary so its AGPL license never touches Orvano code; NBomber needs a paid license for organizations | NBomber |
| Outbound resilience | Microsoft.Extensions.Http.Resilience · Polly directly · no retries | Http.Resilience | Standard handler (Polly v8) on every client, consistent; replaces the older Http.Polly package | Polly directly |
| JSON | System.Text.Json source generated · STJ reflection · Newtonsoft | STJ source generated | Fastest, in the box, trimming and AOT safe for the SDK | STJ reflection |

_Amended 2026-10-16: spec 0007 later chose JIT plus ReadyToRun for faster container start, and PRF-1 now follows it. The reasons above still hold for staying off Native AOT._

### Library (SDK)

| Area | Options weighed | Pick | Why | Runner up |
|---|---|---|---|---|
| Targets | `net10.0` only · `net10.0` plus `netstandard2.0` · `net8.0` plus `net10.0` | `net10.0` only | Only supported LTS at release; modern APIs and AOT compatibility without polyfills (basis: .NET library cross platform targeting guidance) | Adding `netstandard2.0` for .NET Framework reach |
| Dependencies and DI | One package on Microsoft.Extensions only · core plus separate DI package · core only | One package | One package to publish; ASP.NET Core apps already have these assemblies | Core plus separate DI package (the Azure SDK pattern) |
| Package ID | `Orvano.Server` · `Orvano` · `Orvano.Sdk` | `Orvano.Server` | Says it is the server SDK; leaves `Orvano.Client` free for a future .NET client SDK | `Orvano` |
| Public API tracking | Track now, enforce at beta · enforce from day one · start after beta | Track now, enforce at beta | Every change shows in review now; blocking starts when compatibility matters | Enforce from day one |
| Error style | Typed exceptions · Result objects · both | Typed exceptions | What .NET developers expect from a client library (HttpClient, Azure SDK, Stripe) | Both styles |

### Calls made without a question

Smaller calls settled while writing, each with a reason and a runner up. Change any of them with `/architect` on this spec.

| Call | Reason | Runner up |
|---|---|---|
| `TimeProvider` for every clock read (GEN-9) | In the box since .NET 8, testable with `FakeTimeProvider` | A custom `IClock` |
| `ConfigureAwait(false)` in the library only (ASY-3) | ASP.NET Core has no synchronization context; library callers might | Everywhere (noise in server code) |
| Server moves between LTS releases only (GEN-1) | Self hosters get three years of support per release | Follow every STS |
| Schema per module, own migration history (DAT-1) | Makes module ownership of tables visible in the database | One schema with table prefixes |
| `xmin` for optimistic concurrency (DAT-9) | Built into PostgreSQL, no extra column | A version column |
| `EnableRetryOnFailure` with execution strategies (DAT-8) | Survives brief database blips; costs explicit transaction wrapping | No retries |
| Template database cloned per test class, Respawn between tests (TST-5) | Keeps your Testcontainers plus Respawn pick while letting classes run in parallel | Serial integration tests |
| Test names `<Behavior>_<expected>_when_<condition>` (TST-3) | Reads as a sentence in failure output | `Method_Scenario_Expected` |
| Coverage shown, no numeric gate (TST-8) | AC traceability is the real gate; numeric gates invite empty tests | An 80 percent gate |
| Banned API analyzer for clock, blocking, Newtonsoft, migrations, raw connections (Enforcement) | Microsoft's Roslyn analyzer, MIT, turns several MUST rules into build errors | Review only |
| Lock files with locked mode in CI (GEN-4) | Reproducible self hoster builds; supply chain hygiene | Floating restore |
| Liveness and readiness health checks (LOG-6) | Container platforms need both; readiness includes pending migrations | Single health endpoint |
| Event ID blocks of 1000 per module (LOG-1) | Stable IDs operators can alert on | No event IDs |
| `SocketsHttpHandler` with 2 minute connection lifetime when no `HttpClient` is given (LIB-4) | Avoids socket exhaustion and stale DNS, the classic `HttpClient` traps | Require an `HttpClient` |
| SDK retries: GET, HEAD, OPTIONS, idempotent keyed requests; 2 retries; 0.5 s base; `Retry-After` up to 30 s; 30 s per attempt timeout (LIB-7) | Never retries something unsafe; bounded worst case wait | No retries by default |
| No strong naming (LIB-2) | No .NET Framework target, and modern .NET ignores strong names | Sign anyway |
| Unknown enum values tolerated (LIB-9) | Newer servers must not break older SDKs | Throw on unknown |
| Default perf budget p95 at or under 100 ms at 200 rps on a 4 vCPU, 8 GB box (PRF-5) | A concrete starting line for k6 thresholds until Slice 1 is measured | No default budget |

### Cross check, 2026-10-15

An independent read of the draft on a different model (Sonnet) raised 28 findings. Correctness fixes were applied directly: Result nullability annotations and invalid `default`, the sample's `Location` path and one type per file, `.ProducesProblem` for failure statuses, per module migration history tables, Respawn ignoring history tables, pool clearing before cloning the template, the .NET 10 `global.json` test runner setting, the exception handler logging itself, UTC normalization for Npgsql, the `TimeProvider` aware timeout token, the `ExecuteUpdate` concurrency caveat, sensitive EF logging limited to Development, and the LIB-10 wording. Twenty decision gaps were resolved by the engineer accepting the recommended fixes: endpoint naming, the public type carve out, interim status mapping and error extensions, one validation shape, cancellation handling, constraint aware violation helpers, endpoint metadata tests, automatic project isolation (DAT-2a), project database defaults, migration safety tests, the engine adapter's home, configuration details (CFG-2 to CFG-5), test project and harness layout, spec qualified AC traits, test connection limits and the interim PostgreSQL 18 pin, SDK request options, timeouts, and request rebuilding, SDK transitive pinning, cache limits without a shared cache, the interim license allowlist, event ID blocks, telemetry registration and tag rules, health check paths, and interim module communication.

### Landscape facts, checked 2026-10-15

- .NET 10 released 2025-11-11, LTS, supported to 2028-11-14. .NET 8 (LTS) and .NET 9 (STS) both end support 2026-11-10. .NET 11 launches at .NET Conf, November 10 to 13, 2026.
- ASP.NET Core 10: `AddValidation()` validates Minimal API parameters from DataAnnotations through an endpoint filter (400 on failure, `.DisableValidation()` per endpoint); OpenAPI 3.1 is the default (OpenAPI.NET 2.0, a breaking change for transformers); `TypedResults.ServerSentEvents`; `IExceptionHandler` handled exceptions are no longer logged by the middleware.
- EF Core 10: LTS to 2028-11-10; named query filters; complex types with `ToJson()`; `LeftJoin` and `RightJoin`; an analyzer warning for string concatenation in `FromSqlRaw`. `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3 is the latest stable.
- Licenses: MediatR (from 13.0) and AutoMapper (from 15.0) dual licensed RPL 1.5 or commercial since 2025-07-02. FluentAssertions v8 under the Xceed Community License since January 2025 (v7 stays Apache 2.0). AwesomeAssertions is an Apache 2.0 fork. FluentValidation is Apache 2.0. Moq's README says MIT. martinothamar/Mediator is MIT.
- Tests: xUnit v3 core framework 4.0 (2026-08-14) defaults to Microsoft.Testing.Platform v2. MSTest 4 uses the platform natively since 4.4. TUnit is built on it. `Testcontainers.PostgreSql` exists (current version not confirmed).
- HybridCache is GA. Microsoft.Extensions.Http.Resilience (Polly v8) is the recommended successor to Http.Polly.
- Aspire 13 is the first release under the new name (no longer ".NET Aspire"), versioned apart from .NET, and needs the .NET 10 SDK.

Full notes: `docs/.agent-cache/research/dotnet-backend-practices.md` (expires after 30 days for reuse).

## References

**Project sources**:
- `docs/scope/index.md`: given stack, GA tier, Tracer Bullet approach, engine neutral data API, metering from the start
- `docs/scope/foundations.md`, feature 1 row and features 5 to 10 boundaries
- Installed agent skills in `.claude/skills/` (listed in index.md `## Decision`), with the GEN-0 overrides

**Practices & standards**:
- RFC 9457, Problem Details for HTTP APIs
- Vertical slice architecture; modular monolith before microservices
- Ports and adapters (the engine adapter)
- Result pattern for expected failures; exceptions for the exceptional
- Twelve factor app, configuration in the environment
- Expand then contract schema migration
- OpenTelemetry semantic conventions
- Semantic versioning

**Links** (opened during the 2026-10-15 check):
- .NET support policy: https://dotnet.microsoft.com/platform/support/policy/dotnet-core
- What's new in ASP.NET Core in .NET 10: https://learn.microsoft.com/en-us/aspnet/core/release-notes/aspnetcore-10.0?view=aspnetcore-10.0
- What's new in EF Core 10: https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-10.0/whatsnew
- Npgsql.EntityFrameworkCore.PostgreSQL on NuGet: https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL
- .NET library guidance, cross platform targeting: https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting
- FluentValidation repository: https://github.com/FluentValidation/FluentValidation
- Moq repository: https://github.com/moq/moq4
- Mediator (martinothamar) repository: https://github.com/martinothamar/Mediator

**Links** (found in search results, not opened):
- AutoMapper and MediatR commercial editions: https://www.jimmybogard.com/automapper-and-mediatr-commercial-editions-launch-today/
- Fluent Assertions FAQ (Xceed): https://xceed.com/fluent-assertions-faq/
- AwesomeAssertions: https://github.com/AwesomeAssertions/AwesomeAssertions
- xUnit v3 4.0.0 release notes: https://xunit.net/releases/v3/4.0.0
- MSTest v3 to v4 migration: https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-migration-v3-v4
- TUnit releases: https://github.com/thomhurst/TUnit/releases
- Testcontainers for .NET, PostgreSQL module: https://dotnet.testcontainers.org/modules/postgres/
- HybridCache is now GA: https://devblogs.microsoft.com/dotnet/hybrid-cache-is-now-ga/
- Building resilient cloud services with .NET 8: https://devblogs.microsoft.com/dotnet/building-resilient-cloud-services-with-dotnet-8/
- Package validation overview: https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview
- What's new in Aspire 13: https://aspire.dev/whats-new/aspire-13/
