# Verify: Stack & architecture · spec 0007 · updated 2026-10-16

_Updated 2026-10-16 for INS-2, INS-5 and the two bug fixes. Steps derived from feature 6's "Done when" (the scaffold boots the server and console locally and builds clean) and the spec 0007 rules the scaffold builds, since spec 0007 has no numbered acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Commands

- [ ] `CI=true dotnet build server/Orvano.slnx --no-incremental` → `0 Warning(s)`, build succeeded (spec 0002 GEN-2)
- [ ] `pnpm --dir console build` → typecheck passes, Vite build succeeds, first load JavaScript under 200 KB gzip (spec 0003 BDL-1) → Done when
- [ ] `docker compose -f deploy/compose.dev.yaml up -d --wait`, then `dotnet run --project server/src/Orvano.Host -- migrate` → exit 0 (INS-2, DEV-1)
- [ ] With PostgreSQL stopped, `orvano migrate` → exit 1 with "Cannot reach the platform database", no stack trace (RUN-5)
- [ ] `dotnet run --project server/src/Orvano.Host` → listens on `http://localhost:5080`; `/health/live` and `/health/ready` return `Healthy` (CSL-3, LOG-6) → Done when
- [ ] `orvano --help` and `orvano --version` work with no configuration (RUN-1)
- [ ] `orvano serve` with no root key → exit 1, message names `ORVANO_ROOT_KEY_FILE` (spec 0006 SCR-2)
- [ ] `ORVANO_ROLES=foo orvano serve` → exit 1, message names `ORVANO_ROLES` (RUN-2)
- [ ] Only one of `ORVANO_TLS__CERTFILE` / `ORVANO_TLS__KEYFILE` set → exit 1, message names both variables (TLS-2, spec 0002 CFG-4)
- [ ] `orvano init --out <dir> --domain x.test` → sets `<dir>` to 0700, writes `root.key` at 0644 and `.env` at 0600; a second run refuses, exits 1, and leaves the folder mode alone (INS-3, INS-5)
- [ ] `orvano init --public-url ftp://x.test` (or text that is not a URL) → exit 1 with "--public-url must be an absolute http or https URL", no stack trace (INS-3)
- [ ] With `ORVANO_TRUSTED_PROXIES` unset, a request carrying `X-Forwarded-For` and `X-Forwarded-Proto: https` → the server keeps the real client address and sends no HSTS (spec 0006 NET-1)
- [ ] `orvano healthcheck --port 5080` → exit 0 while the server is ready, 1 when it is down (IMG-4)
- [ ] `docker buildx build --platform linux/arm64 --load -f deploy/Dockerfile -t orvano:test .` then `docker run --rm orvano:test admin selftest` → "Self test passed … linux-arm64" (HSH-3)
- [ ] Same for `--platform linux/amd64` → "Self test passed … linux-x64" (HSH-3)
- [ ] The image runs as user `1654` and has no shell (`--entrypoint /bin/sh` fails) (IMG-2)
- [ ] `dotnet run -c Release --project server/benchmarks/Orvano.Benchmarks -- --filter '*PasswordHashing*'` on the reference box (4 vCPU, 8 GB) → `Hash` mean at or under 250 ms (HSH-2)

## UI / manual

- [ ] With the server running, `pnpm --dir console dev`, open `http://localhost:5173/console/` → "Orvano console" heading, no console errors; `http://localhost:5173/health/ready` → `Healthy` through the proxy (CSL-3) → Done when
- [ ] Reference install in an empty folder: copy `compose.yaml`, `Caddyfile`, `postgres-init/`; run `init` from the image with the INS-3 command; `docker compose up -d` → `migrate` exits 0 with no root key mounted, `orvano` turns healthy (INS-1, INS-2)
- [ ] On a Linux host, under rootful Docker, rootful Podman, and rootless Podman: the same install works, another host user cannot read `root.key`, and init without `--user` fails safely (INS-5, open follow up)
- [ ] `https://<domain>/console/` → 200 with the spec 0006 NET-2 headers (CSP, `Referrer-Policy`, COOP, `Permissions-Policy`) and `Strict-Transport-Security` (TLS-1, NET-1)
- [ ] A hashed file under `/console/assets/` → `Cache-Control: public, max-age=31536000, immutable`, JavaScript content type; `/console/some/deep/link` → `index.html` with `no-cache` (CSL-2)
- [ ] `https://<domain>/` → redirect to `/console/`; `http://<domain>/` → redirect to HTTPS (RUN-4, TLS-1)
- [ ] The built console loads in a browser under the strict CSP with no violations, and an unknown client route shows the router's not found view (NET-2, CSL-1)

## Acceptance-criteria coverage

- Done when (server boots locally, builds clean): build, migrate, serve, and health steps above
- Done when (console boots locally, builds clean): console build and dev proxy steps
- RUN-1, RUN-2, RUN-4, RUN-5 · INS-1 to INS-3 · IMG-1 to IMG-4 · CSL-1 to CSL-3 · TLS-1, TLS-2 · DEV-1 · HSH-2, HSH-3: the steps tagged with each
