# 0006. Security baseline: rationale

This is the decision record for [index.md](index.md). The build spec is in `index.md`; read this only for the why.

## Context

Orvano is a self hostable backend that stores other people's end users, data, and secrets. Many projects run on one install, so a bug in one place can expose every project. Later features add webhooks that call out to developer chosen URLs and a function runtime that runs developer code, which raises the stakes further. Security choices made after the first feature ships are costly: password hashes, token formats, key storage, and the way projects are separated all end up in every table, SDK, and install in the field.

Four earlier specs (0002 to 0005) already pointed here for several open items: password hashing, token signing, secrets at rest, log redaction, the console cookie and CSRF design, the Content Security Policy and referrer header, the API key prefix, dependency audit strictness, and what browser and mobile clients store. Backwards compatibility is not required before beta, so this is the cheapest moment to get the formats right.

The team is small. The spec has to be something the team can build, test, and operate without a dedicated security engineer, so it leans on a public checklist and on automated checks.

## Options considered

### Option 1: Write the standard once and enforce it from the first line of code

Adopt OWASP ASVS 5.0 Level 2 as the bar, record the concrete choices as numbered rules, and back each rule with an analyzer, a test, a CI setting, or a review line.

**Pros**:
- One place to point to; later feature specs stay short.
- Most rules fail a build instead of relying on memory.
- Level 2 is the usual target for apps that hold user data and credentials.

**Cons**:
- Real up front effort in features 6, 7, and 13 to wire the checks.
- Some rules (root key, per project keys) add operating work.

### Option 2: Document the standard and rely on review

The same rules, with no automated enforcement.

**Pros**:
- Fastest to write; no tooling to build.

**Cons**:
- Rules decay as contributors change; a missed check becomes a leak in many projects.
- Review is weakest on subtle items (wrong token algorithm, one forgotten project check).

### Option 3: Lighter bar now (ASVS Level 1), raise it later

Start with the basics and tighten before beta.

**Pros**:
- Less to build in the first slices.

**Cons**:
- Hash and token formats and the isolation model cannot be tightened later without migrating every install.
- Level 1 is below what a platform holding other people's secrets should accept.

### Choices inside Option 1 (what you picked, and what was set instead)

- **Password hash**: Argon2id over scrypt, bcrypt, and PBKDF2. Argon2id is OWASP's first choice and resists graphics card attacks. Cost: a library choice, because the best known .NET package fails the 12 month maintenance rule.
- **Tokens**: opaque, revocable sessions plus short signed access tokens, over opaque only (a database hit on every request) and JWT only (hard to revoke). ES256 over EdDSA for tooling reach.
- **Secrets**: envelope encryption over one app wide key (one leak exposes all, and rotation means re encrypting everything) and over database side crypto (keys sit next to the data).
- **API keys**: hashed and shown once, over reversible storage (a database leak exposes live keys) and over self contained signed keys (cannot be revoked).
- **Isolation**: a database per project over a shared schema or row level security. The blast radius of one missed check is one project.
- **Console session**: HttpOnly cookie with CSRF header over a token in script reachable storage.
- **Outbound requests**: block internal ranges by default, because a customer webhook URL could otherwise reach the project database host or cloud metadata.

## Rationale

Option 1 is chosen because the forces in Context (many projects on one install, other people's secrets, a small team, formats that cannot be changed cheaply later) all point the same way: decide the hard to change items now and make machines check them.

Level 2 is the honest middle. Level 1 is too thin for key and secret handling, and Level 3 is meant for critical infrastructure and would slow the first slices for little gain. Where Orvano's own risk is higher than Level 2 asks (secret storage, project isolation, the future sandbox), the spec sets stricter specific rules.

In the design questions the recommended pick was chosen every time. That includes CodeQL and secret scanning on top of Dependabot and dependency review, and optional console TOTP now with a required flag for owners later. Several smaller items were settled by recommendation during writing, with the runner up in brackets: Argon2 default of 64 MiB and 3 iterations (OWASP's 46 MiB and 1 iteration), refresh token 30 day sliding with a 90 day cap (30 days fixed), operator session idle 12 hours and absolute 14 days (8 hours idle), per project JWKS rotation every 180 days (365 days), ES256 (EdDSA), a bundled common password list with no outside call (the Have I Been Pwned range API, off by default), and fix targets of 7, 30, and 90 days (14, 60, 120).

A cross check by a second model then found ten decision gaps and about twenty soundness issues (project resolution for calls with no token, `aud` read before the signature check, revocation, refresh races, one time tokens, CSRF token source, data key storage, root key loss, first run takeover, and untrusted content on the console origin). All were resolved in the recommended direction, which added TOK-9, TOK-10, CON-6, CON-7, KEY-6, and NET-6 and amended several other rules.

One conflict was found while writing and is recorded rather than hidden: spec 0002 GEN-5 requires a release in the last 12 months, and `Konscious.Security.Cryptography.Argon2` last released in June 2024. PWD-6 hands the library choice to feature 6.

## References

**Project sources**:
- `AGENTS.md` (Tracer Bullet build approach, GA workflow level)
- `docs/scope/foundations.md`, feature 5 row and the boundary notes in features 6 to 11
- Spec 0002: GEN-0, GEN-4, GEN-5, DAT-2a, LOG-2, CFG rules, banned API and architecture test setup
- Spec 0003: SEC-1 to SEC-6, UX-33 (show once)
- Spec 0004: SES-3, NET-7
- Spec 0005: KEY-4, SHP-10, RN-2
- The installed `nuget-trusted-publishing` skill

**Practices and standards**:
- OWASP ASVS 5.0, level 2 as the target for applications holding user credentials and personal data
- OWASP Password Storage Cheat Sheet, Argon2id
- OWASP cheat sheets for session management, secrets management, SSRF prevention, logging, and JSON Web Tokens (not fetched, cited by name only)
- Envelope encryption with a key wrapping key
- Refresh token rotation with reuse detection
- Double submit style CSRF token plus Origin check, with `__Host-` cookies
- DNS pinning for SSRF defense
- GitHub dependency review, Dependabot, CodeQL, secret scanning with push protection, artifact attestations, and private vulnerability reporting (documented on docs.github.com, not fetched here)

**Links** (web verified only):
- OWASP ASVS repository and releases: https://github.com/OWASP/ASVS
- OWASP Password Storage Cheat Sheet (Argon2id minimum: 19 MiB, 2 iterations, 1 lane): https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Konscious.Security.Cryptography.Argon2 on NuGet (version 1.3.1, last published 2024-06-19): https://www.nuget.org/packages/Konscious.Security.Cryptography.Argon2
- NuGet trusted publishing: https://learn.microsoft.com/nuget/nuget-org/trusted-publishing
- npm trusted publishers: https://docs.npmjs.com/trusted-publishers
- Sigstore cosign signing overview: https://docs.sigstore.dev/cosign/signing/overview/

## Research notes and gaps

The web check (one pass, five searches, eight pages) could not confirm the following, so the spec does not depend on them and each is a follow up for the feature that builds it:
- The exact ASVS 5.0 release year (the cross check recalled May 2025, not verified here) and its Level 2 and Level 3 definitions. The spec relies on the common reading that Level 2 is the target for most applications; the feature specs name the ASVS chapters and requirements they meet, which will exercise the official text.
- Whether .NET 10 has a built in Argon2id. Not verified; feature 6 checks before choosing a library. `BouncyCastle.Cryptography` is named from knowledge and not verified here.
- The `Isopoh.Cryptography.Argon2` package status.
- The CodeQL supported languages page. C# and JavaScript and TypeScript support is expected and is checked when the workflow is added in feature 7.
- GitHub notes: dependency review and secret push protection on private repositories need paid code security products; attestations on free plans are limited to public repositories. Orvano's repos are public, so this does not block the plan.
