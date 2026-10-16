# Orvano

Open source, self hostable backend as a service (auth, databases, storage, realtime, functions, sites, messaging) with a React console and client and server SDKs.

## Stack

Given in [docs/scope/index.md](docs/scope/index.md). The stack and architecture spec (feature 6) is not written yet, so this section is a seed.

- **Server**: .NET 10, PostgreSQL as the first project database engine
- **Console**: React, built with Vite
- **SDKs**: Flutter and Dart, JavaScript and TypeScript, Next.js, .NET (server)
- **Repos**: `orvanohq` GitHub org, one core monorepo `orvano` (server, console, API contract, docs), one repo per SDK

## Build approach

**Tracer Bullet**: each slice runs end to end through server, console, and every SDK, working; later slices thicken one strand.

## Read before you write code

Read the matching practice spec first. Each rule has an ID (for example `API-1`, `UX-27`), so cite the ID in code review. Where an installed skill disagrees with a spec, the spec wins (rule GEN-0 in spec 0002).

| You are writing | Read first |
|---|---|
| .NET server code or the .NET SDK | [0002 .NET backend practices](docs/specs/0002-dotnet-backend-practices/index.md) |
| Console UI (React) | [0003 React console practices](docs/specs/0003-react-console-practices/index.md) and [0001 Console UX patterns](docs/specs/0001-console-ux-patterns/index.md) |
| Dart or Flutter SDK | [0004 Dart and Flutter practices](docs/specs/0004-dart-flutter-practices/index.md) |
| TypeScript, JavaScript, or Next.js SDK | [0005 TypeScript SDK practices](docs/specs/0005-typescript-sdk-practices/index.md) |

Each spec has a `rationale.md` beside it; read it only when you need the why. Each spec also lists its implementation skills under `.claude/skills/`; load only the ones the task needs.

## Specs

Stored in `docs/specs/`, one folder per spec: `docs/specs/NNNN-title/index.md`. A feature's own spec comes from `/architect` and must link the practice specs it builds on.

## Scope and workflow

- [docs/scope/index.md](docs/scope/index.md) is the feature list and status. The next step for a feature is its first unticked box.
- Workflow level is GA: `/develop`, then `/check verify`, `/test`, a fresh model `/check review`, then `/document`.
- Backwards compatibility is not required until after beta.

## Rules

- Orvano holds other people's users, data, and secrets and runs their code: treat security as a default, not a later pass.
- The data API is engine neutral (other database engines come later). Do not leak Postgres specifics into the public API or SDKs.
- Usage is metered from the start. New billable operations must be countable.
- Console strings are translation ready from day one (see spec 0003).
- Coding standards and tooling (lint, hooks, CI, git integration) are not decided yet. Do not invent them; they come from features 5, 6 and 7.

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
