# Orvano scope: Storage

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

## Slice 4: Storage and docs

### 29. Buckets & files · needs a decision

Buckets with size and type limits, plus upload, download, preview, delete, and access rules from the access control model.
**Done when:** a user uploads and downloads a file from the client SDKs within bucket rules, unauthorized access is denied, and temporary signed links work and expire.

- [ ] Design it (spec): `/architect buckets & files`

### 30. Resumable uploads · needs a decision

Large files upload in chunks and pick up where they stopped after a dropped connection.
**Done when:** a large upload from the Flutter and JavaScript SDKs resumes after an interruption without starting over.

- [ ] Design it (spec): `/architect resumable uploads`

### 31. Image transformations · needs a decision

Resize, crop, convert format, and set quality on the fly, cached after the first request.
**Done when:** an image URL with transform options returns the transformed image, repeats come from cache, and oversized or malicious images are rejected safely.

- [ ] Design it (spec): `/architect image transformations`
