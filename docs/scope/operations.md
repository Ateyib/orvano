# Orvano scope: Operations & trust

Part of the [Orvano scope](index.md). The legend, workflow default, and build approach live there.

What lets a project owner trust Orvano with real users: limits, usage, logs, monitoring, audit, privacy, and backups.

## Slice 2: Auth breadth

### 23. Rate limits & abuse guards · needs a decision

Per project and per IP limits on auth and API calls, plus protection against sign up abuse. Placed early because auth is the first thing attackers hit.
**Done when:** going over a limit returns a clear error every SDK understands, limits are configurable per project, and repeated failed sign ins are slowed.

- [ ] Design it (spec): `/architect rate limits & abuse guards`

## Slice 9: Operations and trust

### 45. Usage metrics & metering · needs a decision

Requests, bandwidth, storage, database size, function runs, and messages per project, charted in the console and stored so paid plans can use them later.
**Done when:** the console shows usage per project over time, and the numbers match a known test load.

- [ ] Design it (spec): `/architect usage metrics & metering`

### 46. Request & function logs · needs a decision

Searchable logs of API requests and function runs per project.
**Done when:** an operator finds a failed request or function run by time, status, or path and sees its details, with secrets redacted.

- [ ] Design it (spec): `/architect request & function logs`

### 47. Platform error monitoring · needs a decision

Errors, traces, and health of the Orvano server itself, for whoever runs the install.
**Done when:** a forced server error shows up with a trace the operator can follow, and a health check reports each service.

- [ ] Design it (spec): `/architect platform error monitoring`

### 48. Audit logs · needs a decision

A record of who did what in the console and through API keys, per organization and project.
**Done when:** every change to settings, keys, schema, and users is recorded with actor, time, and source, and can be filtered in the console.

- [ ] Design it (spec): `/architect audit logs`

### 49. End user data export & delete · needs a decision

Export or erase one end user's data across auth, databases, storage, and messaging, for privacy requests.
**Done when:** an operator or a server SDK exports a user's data as a file and erases it everywhere, and the action lands in the audit log.

- [ ] Design it (spec): `/architect end user data export & delete`

### 50. Backups & restore · needs a decision

Scheduled backups of project databases and storage with a restore path that is actually tested.
**Done when:** a scheduled backup runs, and restoring it on a fresh install brings back data and files intact.

- [ ] Design it (spec): `/architect backups & restore`
