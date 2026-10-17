# Orvano scope: SDKs

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

Six SDKs: Flutter, JavaScript, and Next.js for client apps; Dart, JavaScript, and .NET for servers. Every service feature's **Done when** includes working through these SDKs, so most SDK work happens inside those features. The features here are the parts that belong to the SDKs themselves.

## Foundation

### 10. API contract & SDK generation · needs a decision

One machine readable API contract is the single source of truth. All six SDKs are generated from it, with hand written layers only where a platform needs them. It also fixes the shared error format, pagination, the API version header, and one conformance test suite that every SDK runs.
**Done when:** changing the contract regenerates all six SDKs, each passes the shared conformance tests against a running server, and a health call works from every SDK.

- [ ] Design it (spec): `/architect API contract & SDK generation`

## Slice 2: Auth breadth

### 21. Next.js server sessions · needs a decision

The Next.js SDK keeps the end user session in secure cookies so server components, route handlers, middleware, and server actions all act as that user.
**Done when:** a Next.js app renders signed in data on the server, refreshes sessions safely, and never exposes a server key to the browser.

- [ ] Design it (spec): `/architect Next.js server sessions`

## Slice 3: Database breadth

### 56. Type generation · needs a decision

Generate types from a project's table schema so app code is fully typed end to end, for example `rows.list<Todo>()`. It builds on schema management (feature 24) and the CLI (feature 28), and maps the engine neutral column types so a future database engine produces the same types.
**Done when:** `orvano types` (and a console download) produces TypeScript and Dart types that the client and server SDKs accept, a schema change shows up in the next generated types, and the same command runs in CI.

- [ ] Design it (spec): `/architect type generation`

## Alpha release

### 52. SDK publishing & versioning · needs a decision

Release all six SDKs to their registries (npm, pub.dev, NuGet) with versions, changelogs, and reference docs that move in step with the server. The name `orvano` is already reserved on npm, pub.dev, and NuGet (2026-10-15).
**Done when:** one release process publishes every SDK at a matching version with a changelog, and a fresh app installs each one from its registry and passes the conformance suite.

- [ ] Design it (spec): `/architect SDK publishing & versioning`

### 60. Example apps & starters · needs a decision

Small real apps built on the published SDKs: a Flutter app, a Next.js app, and a server sample. Alpha testers start from them, the docs link to them, and they run as end to end tests against each release.
**Done when:** each example installs from the registries, runs against a fresh Orvano install using auth, databases, storage, and realtime, and passes in CI on every release.

- [ ] Design it (spec): `/architect example apps & starters`
