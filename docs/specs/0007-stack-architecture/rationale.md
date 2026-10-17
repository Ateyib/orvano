# 0007. Stack and architecture: rationale

Decision record for [index.md](index.md). `/develop` does not read this file.

## Context

Orvano is an open source backend as a service that people host themselves. The scope gives the core stack (.NET 10, React with Vite, PostgreSQL, one core monorepo plus one repo per SDK) and leaves the runtime shape to this spec. Specs 0002 to 0006 each left questions for feature 6: background jobs, events between modules, the cache backing store, how the console is served, local development (Aspire or not), the Argon2 library, how TLS is provided, the connection pooling plan for a database per project, the supported PostgreSQL version, SDK repo names, and where the image is published.

The forces that shape the answer:

- **Self hosting first.** Every component in the install is something an operator must run, upgrade, back up, and debug. No managed cloud exists yet, and there are no paid plans.
- **Small team.** One modular monolith (spec 0002 LAY-1) is already decided; the runtime must not undo it.
- **Security as a default** (spec 0006). Sessions must revoke across replicas at once (TOK-6), each project has its own database and role (TEN-1, TEN-3), and the root key protects every secret (SCR-2).
- **Many projects on one install.** A database per project multiplies connection pools; one noisy project must not take down the rest.
- **Later slices need durable plumbing.** Key rotation, webhooks, realtime, function triggers, and usage metering all need jobs and events that survive a crash.
- **License and maintenance gate** (spec 0002 GEN-5): MIT, Apache, BSD, ISC, or PostgreSQL License, with a release in the last 12 months.

## Options considered

All four options keep the given stack and the modular monolith code layout; they differ in what runs beside it.

### Option 1: One image, PostgreSQL only (chosen)

One server image whose `api` and `worker` roles are picked by config, with jobs, outbox, cache invalidation, and cross replica signals all on PostgreSQL. Caddy, S3, and PgBouncer are optional.

**Pros**: fewest moving parts to install and back up; jobs and events commit atomically with data; scales out by adding replicas or splitting roles.
**Cons**: PostgreSQL carries queue and signal load; Orvano owns a job runner and outbox; `NOTIFY` loses messages across reconnects, so recovery logic is required.

### Option 2: PostgreSQL plus Redis

Same image, plus Redis for a shared second level cache, pub/sub between replicas, rate limit counters, and a Redis backed job library.

**Pros**: fast shared cache and pub/sub; mature job libraries exist for Redis; takes load off PostgreSQL.
**Cons**: every install runs and backs up a second stateful service; jobs and data no longer commit together, so an outbox is still needed for correctness; Redis's own license changes (2024) push toward forks like Valkey, another choice to track.

### Option 3: Separate worker service and a message broker

A fixed API service and a fixed worker service talking through RabbitMQ or NATS, with a messaging framework such as Wolverine (MIT, active) handling outbox and retries.

**Pros**: strong delivery guarantees and tooling out of the box; clean isolation between request load and job load; proven at high throughput.
**Cons**: two services plus a broker for even the smallest install; the framework is a mediator and bus, which clashes with spec 0002 API-7 (no mediator); throughput Orvano does not yet need.

### Option 4: A service per module

Auth, Databases, Storage, and the rest as separate deployable services behind a gateway.

**Pros**: independent scaling and deploys per module; hard boundaries between teams.
**Cons**: contradicts spec 0002 LAY-1; distributed transactions and network failures between modules; far heavier to self host and to build with a small team.

## Rationale

Self hosting is the force that decides it. Each extra stateful service in Options 2 and 3 is a backup, an upgrade, and a failure mode the operator owns, and neither removes the need for a transactional outbox: as soon as a job or event must match a database change, it has to commit in the same database (basis: transactional outbox pattern). Putting the queue, outbox, and signals in PostgreSQL makes that free and keeps the install at Orvano, PostgreSQL, and an optional Caddy (basis: database backed queue first, add a broker only when throughput demands it).

The cost is code Orvano owns. The job runner stays small because PostgreSQL does the hard parts (`FOR UPDATE SKIP LOCKED` for claiming, unique indexes for exactly once schedule firing, `LISTEN/NOTIFY` for wake ups), and the alternatives fail the gates: Hangfire's core is LGPL (outside GEN-5), Wolverine is a mediator (API-7), TickerQ is young for something this central, and Quartz.NET is a scheduler more than a queue. The loss of `NOTIFY` messages across reconnects is handled the boring way: treat signals as hints, poll as a fallback, and clear caches and reload revoked sessions on reconnect (SIG-2).

Roles by config (one image, `api` and `worker`) give Option 3's isolation without its install cost, the day an operator needs it. Option 4 is the premature microservices failure pattern and is rejected outright (basis: monolith first).

The per layer picks follow the same forces. NSec over BouncyCastle: both pass GEN-5, but native libsodium hashes faster, which keeps PWD-1's 64 MiB default inside the 250 ms target, and libsodium's single lane already matches PWD-1 (basis: spec 0006 PWD-1, PWD-6). Caddy plus Kestrel PEM files over built in ACME: the only maintained looking .NET ACME library, LettuceEncrypt, has had no release since May 2024 and fails GEN-5's maintenance test. HybridCache in memory with `NOTIFY` invalidation over a PostgreSQL second level: a cache that writes to the database it shields defeats its purpose (basis: spec 0002 PRF-2). PostgreSQL 18 only: one version to test, and native `uuidv7()` helps feature 8. Compose plus directly run apps over Aspire: no extra projects or concepts for contributors, and it reuses the install's compose patterns (basis: spec 0002 TST-5a). Same origin console under `/console`: spec 0006 CON-1 and CON-2 rely on one origin for the session cookie and the Origin check, and one container is easier to run.

### Root key file on Linux (INS-3, INS-5, added 2026-10-16)

The scaffold showed that a 0600 `root.key` owned by the operator cannot be read by the container's uid 1654, because compose file secrets are bind mounts that keep host ownership (Docker Desktop on macOS hides this). Options weighed:

| Option                                                                      | Gains                                                                                                                             | Costs                                                                                                          | Verdict    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| `root.key` 0644 inside a 0700 install folder, init runs as the operator     | Works the same on rootful Docker, rootful Podman, and rootless Podman; stays a file secret; the operator backs it up without sudo | Protection lives in the folder: a copy taken out keeps 0644, so the warning must say so                        | **Chosen** |
| Key in `.env` as `ORVANO_ROOT_KEY`                                          | No file modes at all                                                                                                              | The key shows in `docker inspect` and the process environment, and sits beside the database passwords          | Runner up  |
| Compose runs Orvano as the operator (`user: "${UID}:${GID}"`) so 0600 works | No world readable file anywhere                                                                                                   | The image's storage volume belongs to 1654 (IMG-2), so it would need chowning; uid plumbing differs per engine | Rejected   |
| init runs as uid 1654                                                       | Key stays 0600                                                                                                                    | The operator needs sudo to prepare and back up the folder, and compose cannot read a 1654 owned `.env`         | Rejected   |

A read only cross check on another model then found the gaps that INS-5's ordered steps now close (refuse before any change, verify the mode reads back, clean up partial writes, rootful Podman, SELinux `:Z`, no key for `migrate`).

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/index.md` and `docs/scope/foundations.md`, feature 6 and the given stack
- Spec 0002 (LAY-1, LAY-3, LAY-4, API-7, ASY-5, GEN-5, PRF-2, TST-5, TST-5a, LOG-4, LOG-6, CFG-5)
- Spec 0003 (WEB-8, QA-5) · Spec 0004 (DQA-3) · Spec 0005 (repo naming premise note)
- Spec 0006 (PWD-1, PWD-6, TOK-4, TOK-6, TEN-1, TEN-3, TEN-4, SCR-2, NET-1, NET-2, CON-1, CON-2, SUP-8)
- Installed skills: `containerize-aspnetcore`, `docker-compose-patterns`, `caching`, `opentelemetry`

**Practices & standards**:

- Monolith first; database backed queue first
- Transactional outbox pattern; at least once delivery with idempotent handlers
- PostgreSQL `FOR UPDATE SKIP LOCKED` queues and `LISTEN/NOTIFY`
- Least privilege database roles; distroless (chiseled) non root containers

**Links** (web verified during the landscape check on 2026-10-16):

- NSec.Cryptography on NuGet (26.4.0, April 2026, Argon2id): https://www.nuget.org/packages/NSec.Cryptography
- BouncyCastle.Cryptography on NuGet (2.7.0, July 2026): https://www.nuget.org/packages/BouncyCastle.Cryptography
- Microsoft.Extensions.Caching.Hybrid on NuGet (10.11.0, October 2026): https://www.nuget.org/packages/Microsoft.Extensions.Caching.Hybrid
- Npgsql on NuGet (10.0.3, PostgreSQL License): https://www.nuget.org/packages/Npgsql
- Caddy releases (2.11.7, October 2026): https://github.com/caddyserver/caddy/releases
- Aspire releases (13.6.1, October 2026): https://github.com/dotnet/aspire/releases
- WolverineFx on NuGet (6.51.0, MIT): https://www.nuget.org/packages/WolverineFx
- TickerQ on GitHub: https://github.com/Arcenox-co/TickerQ

## Landscape check (2026-10-16)

Summary of the researcher's check; the full notes are in `docs/.agent-cache/research/stack-architecture.md`.

| Layer      | Finding                                                                                                                                         | Verified                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Jobs       | Wolverine 6.51 MIT, active; TickerQ dual MIT and Apache, young; Hangfire core LGPL (fails GEN-5); hand rolled `SKIP LOCKED` has no license risk | Wolverine and TickerQ fetched; Hangfire license from memory                 |
| Cache      | HybridCache 10.11 stable, MIT, tag invalidation in .NET 10; no PostgreSQL `IDistributedCache` provider confirmed                                | Fetched                                                                     |
| Argon2id   | NSec 26.4 exposes Argon2id via libsodium; BouncyCastle 2.7 managed                                                                              | Fetched                                                                     |
| TLS        | Caddy 2.11.7 current; LettuceEncrypt last release 1.3.3 in May 2024                                                                             | Caddy fetched; LettuceEncrypt from search only                              |
| Aspire     | Now named "Aspire", 13.6.1; AppHost is a local orchestrator                                                                                     | Fetched                                                                     |
| PostgreSQL | 18.6 reported as latest 18 minor; Npgsql 10.0.3                                                                                                 | Version from secondary sources only; pin the exact minor at scaffold (PG-1) |
| Pooling    | PgBouncer transaction mode breaks session features such as `LISTEN`                                                                             | From knowledge, not fetched                                                 |
