# 0004. Dart and Flutter practices: rationale and research

Decision record for [index.md](index.md). `/develop` reads index.md; this file is for people and for `/architect` on a later update.

## Context

Orvano reaches app developers through six SDKs, all generated from one API contract (feature 10) with hand written layers where a platform needs them. Two of them are written in Dart: the Flutter client SDK, used by mobile, web, and desktop apps signed in as an end user, and the Dart server SDK, used by Dart backends, CLIs, and Orvano's own Dart functions runtime (feature 37) with a server API key. The scope gives each SDK its own repo in the `orvanohq` org. Neither repo exists yet. Feature 56 will later generate Dart row types that these SDKs must accept, and features 14, 16, 29, and 34 each add SDK surface slice by slice under a Tracer Bullet build, so whatever the first slice does, every later one copies.

The Flutter client carries the hardest constraints. One package has to run on six platforms (iOS, Android, macOS, Windows, Linux, web) and on two web compilers (dart2js and dart2wasm), keep an end user's session across restarts on each (feature 14's done when), and do it without leaking the session to other apps, backups, or a reinstall. It also has to sit politely inside apps that already chose an HTTP library, a state management library, and a serialization style, without forcing version conflicts on them. The server SDK must behave like the .NET SDK (spec 0002 LIB rules) so the conformance suite can hold all server SDKs to one behavior, and it must never be easy to ship its API key inside a client app.

Publishing to pub.dev adds its own bar. pana scores every package on conventions, documentation, platform support, static analysis, and up to date dependencies, and pub.dev shows platform badges derived from the import graph. A package that claims a platform it handles badly, or loses points for missing docs, looks less trustworthy than it is. The Dart ecosystem also moved since 2024: macros were cancelled in January 2025, pub workspaces arrived in Dart 3.6, `dart:html` gave way to package:web and `dart:js_interop`, package:http gained request aborting, flutter_secure_storage dropped Jetpack Security on Android, and primary constructors became stable only in Dart 3.13 (August 2026). Choosing from memory would lock in stale practices.

The team is small, the workflow tier is GA, and much of the code will be written by agents following `AGENTS.md`. The practices must be learnable from one canonical example and checked by tools rather than by memory, and they have to be fixed before feature 10's generator templates are written, since those templates will emit code in whatever style this spec sets.

## Options considered

The libraries and patterns were chosen one area at a time (see *Research by practice area*). The options here are how the standard is enforced.

### Option 1: Document and enforce from the first commit

Write the rules and canonical pattern, and turn on the analyzer with strict modes and the lint list, format, the `tool/` import and dependency checks, pana, the downgrade job, and the conformance suite in CI before the first service lands.

**Pros**: rules hold from commit one; generated code is shaped right from the first template; nothing to migrate later; reviews spend time on design.
**Cons**: more setup in feature 7 before the first SDK call works; pana and the six platform nightly matrix take real CI effort; strict checks slow quick experiments.

### Option 2: Document, build Slice 1, then enforce

Write the rules now, add the CI gates after Slice 1 lands, and fix what doesn't comply in one PR.

**Pros**: faster first SDK call; gates tuned on real code.
**Cons**: the first generator templates and hand written layers become the pattern others copy, compliant or not; a migration after publishing risks breaking the public API.

### Option 3: Document only

Rely on review and the canonical pattern.

**Pros**: no tooling cost.
**Cons**: drifts fastest; platform imports, unawaited futures, missing docs, and dependency creep are exactly what reviewers miss; pub points would drop silently.

## Rationale

Option 1, chosen by the engineer and matching specs 0002 and 0003. Neither repo exists, so enforcing now costs only setup, while Tracer Bullet means the first service is copied by every later one, and the generator templates (feature 10) multiply any mistake across every endpoint. A published SDK's public API is hard to change after beta, so the shape (explicit client, sealed errors, codecs, cancel token) has to be right before Slice 1 ships, not tidied afterwards. Most checks are cheap: the analyzer and format ship with Dart, the `tool/` checks are short Dart scripts, and pana is one command. The expensive part, the nightly device matrix, runs nightly rather than per PR.

## Research by practice area

Each pick lists the main alternatives and why it won. Versions are from pub.dev and the Dart and Flutter docs on 2026-10-15 (see *Landscape facts*).

### Package layout: a pure Dart core plus a Flutter layer in one workspace

- **Chosen by the engineer**: the Flutter SDK repo is a pub workspace with `orvano` (pure Dart, runs on the VM and the web) and `orvano_flutter` (secure storage, first run cleanup, app lifecycle, and all of `orvano` passed through). This is the shape Supabase uses (`supabase` plus `supabase_flutter`). The pure Dart package works in Dart CLIs and Jaspr web apps, its tests run in seconds on the VM, and it keeps Flutter plugin dependencies out of anything that doesn't need them. (A workspace containing a Flutter package resolves only with the Flutter tool, so the repo's own CI runs on a Flutter SDK; apps that depend on the published `orvano` don't need Flutter.)
- **One Flutter package** (`orvano_flutter` only, or Appwrite's single `appwrite` package that depends on Flutter): one pub.dev page and simpler releases, but pure Dart apps can't use the client and every test needs the Flutter toolchain.
- **Shared runtime by templates, not a dependency** (engineer's pick): feature 10 emits the same runtime into both repos. A server package depending on `orvano` would carry client session code and couple the two repos' releases; a third `orvano_core` package would be cleanest but adds a third package and repo against the scope's one repo per SDK. The conformance suite proves the copies behave the same.
- **Pub workspaces over melos**: workspaces (Dart 3.6 and later) give one lockfile and shared resolution. Melos 8 is now built on workspaces and adds filtered `exec`, versioning, and publishing, which two packages don't need; a few `tool/` scripts do the rest.

### Client entry point: an explicit instance

Chosen by the engineer. `await Orvano.open(...)` (and `OrvanoFlutter.open`) returns an instance the app passes around however it likes, matching the .NET `OrvanoClient`. Supabase's `Supabase.initialize` plus `Supabase.instance` is quicker to start but is hidden global state: harder to test, harder to reset between tests, and awkward with two projects in one app. `open` is asynchronous so the stored session is restored before the app reads `currentState`; a synchronous constructor would need a third "restoring" auth state that every app would have to handle.

### HTTP: package:http 1.x

Chosen by the engineer. package:http is maintained by the Dart team, has a tiny footprint, runs on the VM, the web, and wasm, and since 1.5.0 can abort a request through an abort trigger, which makes real cancelling and timeouts possible. Its `Client` interface lets an app plug in `cupertino_http`, `cronet_http`, or `ok_http` for the platform's native networking (proxies, VPNs, user certificates), and `MockClient` makes tests simple. **dio 5.11** has interceptors, cancel tokens, and upload progress built in, but forces a large dependency and its version range on every app, clashes with apps on another dio major, and warns that breaking changes can land in minor versions. `RetryClient` (in `package:http/retry.dart`) was set aside because it retries by status alone, can't tell idempotent requests apart, and can't see the cancel token; NET-3 hand writes retry to match spec 0002 LIB-7 exactly.

### Cancelling: OrvanoCancelToken

Chosen by the engineer. Dart futures can't be cancelled, so cancelling needs an explicit object. A small `OrvanoCancelToken` reads clearly, can cancel several calls at once (a screen closing), and is wired to package:http's abort trigger, so the socket really closes. Passing package:http's raw `abortTrigger` future through would leak package:http types into every method and make callers manage a `Completer`. Timeouts alone would leave a closed screen's request running and updating state.

### Errors: a sealed OrvanoException tree

Chosen by the engineer. Dart 3 sealed classes let apps `switch` over every failure with the compiler checking they covered all of them, and the tree hides the difference between `SocketException` on native, `ClientException` from the browser client, and whatever a plugged in native client throws. It carries the same API fields as spec 0002 LIB-6. Mirroring .NET exactly (only API errors wrapped, network errors passed through) was closer to the .NET SDK, but in Dart those passed through types differ by platform and client, which is exactly what a cross platform SDK should hide. `OrvanoProtocolException` was added while writing (see *Calls made without a question*).

### Models: plain generated classes

Chosen by the engineer. Feature 10's generator emits immutable `final class` models with `fromJson`, `toJson`, value equality, and `copyWith`, all committed. The SDK then has no runtime codegen dependency, and app developers never run build_runner because of Orvano. Dart macros, which would have made this free, were cancelled in January 2025, and augmentations are still only planned for 2026, so code generation stays with the generator. **freezed** gives unions and `copyWith` but adds `freezed_annotation` and freezed's major version churn to every app. **json_serializable** keeps `json_annotation` as a runtime dependency and still leaves equality and `copyWith` to write. Parsing with map patterns (MDL-2) follows the `dart-use-pattern-matching` skill, including its warning that a map pattern fails when an optional key is missing.

### Typed rows: a codec on a table handle

Chosen by the engineer. `OrvanoCodec<T>` carries both directions, so one handle gives typed reads and typed writes, works with any class (generated, freezed, or hand written), and needs no reflection (unavailable under AOT and Flutter). A `fromJson` argument on each call is simpler for reads but needs a separate `toJson` for writes and invites passing the wrong decoder. Leaving the shape to feature 56 would force a public API change after beta. After the cross check, the handle is reached in two steps (`table('todos').withCodec(Todo.codec)`) instead of a `codec:` argument, because Dart has no overloads and a type argument on `table` would allow `table<Todo>('todos')` with no codec.

### Session storage: one interface, keychain on native, browser storage on the web

- **Native, flutter_secure_storage 11** (engineer's pick): the most used secure storage plugin; Keychain on iOS and macOS, its own RSA OAEP plus AES GCM cipher with the key in the Android Keystore since v10 dropped the deprecated Jetpack Security `EncryptedSharedPreferences` (v9 data migrates automatically), and libsecret on Linux. Orvano ships no native code of its own. Writing a federated plugin would mean Keychain and Keystore code in five languages for a small team to maintain and security review.
- **Web, browser storage behind the same interface** (engineer's pick): a reload keeps the user signed in on any self hosted domain, which feature 14 needs, and the docs state the XSS risk plainly. Memory only would sign users out on every reload. Server set httpOnly cookies are safer in a browser but need the app and server on the same site plus CSRF handling, which many self hosted setups can't meet, and that call belongs to features 5 and 14. flutter_secure_storage's own web mode is marked experimental and needs HSTS to avoid script hijacking, so it isn't used.
- **Store failure, memory fallback plus an event** (engineer's pick): sign in still works on Linux without a keyring or with a locked keychain, the app can tell the user, and the token never lands on disk unencrypted. Throwing would break headless Linux and CI; a plain file would leave the token in the clear.
- **Reinstall, clear on first run** (engineer's pick): iOS can keep keychain items after an uninstall, which community reports confirm though the plugin's README doesn't say so. A marker in `shared_preferences` (erased on uninstall) tells a fresh install apart, so a reinstalled app starts signed out and an old token never quietly returns.

### Platforms: honest claims per package

The client packages claim all six platforms and must be wasm ready. pana's platform code (read in `multi_platform.dart`) gives 20 points to a package with any platform tags, but caps a package that supports the web without being wasm ready at 10, and caps legacy native builds without Swift Package Manager at 10. The server package declares only Linux, macOS, and Windows (engineer's pick), since a server key never belongs in a browser or phone app, and pana still awards it full platform points because no points depend on the web. Flutter 3.47's own minimums are Android API 24, iOS 15, Windows 10, macOS 12, and Debian 10 or Ubuntu 20.04; the SDK adds no higher floor.

### SDK floor: about one year back

Chosen by the engineer. `^3.10.0` (Flutter 3.38, November 2025) lets apps that lag a few quarterly releases still install new SDK versions, while CI only tests two toolchains (the floor and the latest). Latest only (`^3.13.0`) would unlock primary constructors at once but shut out apps that haven't upgraded. Two years back (`^3.6.0`, the pub workspaces minimum) widens reach but means more workarounds. Dart and Flutter ship roughly every quarter (Flutter 3.41 in February, 3.44 in May, 3.47 in August, 3.50 due November 2026).

### Lints: package:lints plus an Orvano list

Chosen by the engineer. pana scores static analysis against package:lints, so starting from `recommended.yaml` keeps the score and the local analyzer aligned. The three strict modes (still documented on dart.dev) remove implicit `dynamic`, and the Orvano list adds what a published SDK needs (docs on every member, no unawaited futures, no dynamic calls, closed sinks and subscriptions). **very_good_analysis 11** is strict and well kept but turns on new rules on its own schedule, some of them taste. **flutter_lints 6** alone doesn't require docs or catch unawaited futures.

### State management: agnostic, streams only

Chosen by the engineer. Plain `Stream`s and `Future`s work with every library (Riverpod, Bloc, Provider, signals, plain `StreamBuilder`) and add no version constraints. Adapter packages would be nicer to start with but mean more packages to publish and keep current with those libraries' majors. A `ValueListenable` was skipped as one more way to do the same thing; `currentState` plus `stateChanges` covers `StreamBuilder` cleanly.

### Testing: hand written fakes, fast per PR, full nightly, no coverage number

- **Fakes** (engineer's pick): `MockClient` and small fakes test behavior rather than calls, need no codegen, and match spec 0002's stub handler rule. mocktail 1.0.5 needs `registerFallbackValue` for custom types and invites interaction tests; mockito 5.8 needs build_runner in the SDK repos.
- **CI matrix** (engineer's pick): VM, Chrome (dart2js and dart2wasm), Flutter layer tests, and the conformance suite per PR keep feedback fast; the six platform `integration_test` run nightly catches keychain, keyring, and lifecycle bugs that only real platforms show.
- **No coverage number** (engineer's pick, matching spec 0003): required tests by kind (DQA-5) are checkable and avoid shallow tests written to hit a number.

### Calls made without a question

Smaller calls settled while writing, each with its runner up:

| Call | Why | Runner up |
|---|---|---|
| `Orvano.open` is asynchronous (CLN-1) | The stored session is restored before the app reads `currentState`, so there is no "restoring" state for every app to handle | A synchronous constructor plus an `AuthRestoring` state |
| `OrvanoProtocolException` as a fifth error type (EXC-1) | A malformed 2xx reply is neither an API error nor a network error; without it a `TypeError` would escape | Report it as an `OrvanoApiException` with a made up code |
| Class modifiers: `final` by default (DRT-7) | Adding a member to a class apps can't extend or implement isn't breaking | Open classes, relying on docs |
| `show` lists on every export (DRT-8) | Nothing in `src/` becomes public by accident | Export whole files |
| Retry, timeout, and error fields identical to .NET (NET-3, NET-4, EXC-1) | One behavior for the conformance suite across server SDKs | Dart specific defaults |
| Timeout covers headers and body (NET-4) | A slow body otherwise hangs past the timeout | Headers only |
| No `RetryClient` (NET-3) | It can't tell idempotent requests apart or see the cancel token | Wrap `RetryClient` |
| Default `http.Client()`, no native client dependency (NET-1) | Keeps dependencies tiny; apps opt into `cupertino_http` or `cronet_http` | Depend on native clients in `orvano_flutter` |
| `https` required except localhost or an explicit opt in (NET-7) | A token over plain HTTP is readable on the network; self hosters on a home network can opt in | Allow any scheme |
| `User-Agent` only on native (NET-6) | Browsers forbid setting it | Always set it and catch the error |
| Enhanced enums with `unknown` (MDL-3) | Exhaustive switches and no crash on new server values | Extension types over `String`, which keep the raw value but lose exhaustiveness |
| 64 bit integers never as `int` when they may pass 2^53 (MDL-4) | Web builds store `int` as a JavaScript number | `int` everywhere |
| Session key `orvano.session.<projectId>@<authority>` (SES-2) | Two installs can both have a project named `default` | Project ID only |
| Keychain accessibility `first_unlock_this_device` (SES-4) | Background work can read it after the first unlock, and it never syncs or moves to another device | `after_first_unlock`, which can move with backups |
| Undecryptable or unknown version session is deleted (SES-6) | Android Auto Backup can restore data whose Keystore key is gone; that should mean signed out, not a storage failure | Treat it as a store failure |
| Cross tab sync through the `storage` event (SES-8) | Signing out in one tab signs out the others | Each tab independent |
| Memory store default for pure Dart on the VM (SES-3) | A CLI never writes a token to disk unasked | An unencrypted file in the home folder |
| `clock` plus `fake_async` for time (STR-5) | Tests control backoff and expiry without real waits, like .NET's `TimeProvider` | Injecting a custom time interface |
| No isolates or `compute()` in the SDK (STR-6) | Pages are bounded by feature 10's limits; isolates don't exist on the web; measure before adding | `Isolate.run` for bodies over 64 KB on native |
| Small `StateStream` helper instead of rxdart (STR-2) | About 40 lines, no dependency | rxdart's `BehaviorSubject` |
| package:logging, silent by default (DSC-3) | A Dart team package apps already know; nothing prints unless the app listens | A custom logger callback in options |
| No native code in Orvano packages (PKG-5) | No native review load, no Swift Package Manager cap on pana points | An Orvano plugin for storage |
| Commit the workspace `pubspec.lock` (DRT-3) | Reproducible CI; the downgrade and upgrade jobs still test the ranges | Leave it uncommitted, the usual library default |
| `dart_apitool` from the first beta (PUB-4) | Before beta, breaking changes are allowed; the tool is still 0.x | Track from day one |
| First run marker in `shared_preferences` (SES-7) | It lives in ordinary app storage, which an uninstall erases | A file in the app support folder through path_provider |
| `// Not null: <why>` comment on `!` (DRT-6) | No lint bans `!`; a comment makes review catch it | Ban `!` outright |

Calls added after the cross check, each accepted by the engineer as recommended:

| Call | Why | Runner up |
|---|---|---|
| Auth hook per attempt; one refresh and one retry on a session expired 401 (NET-8) | The shared core needs a fixed auth contract before feature 10 can emit it; a 401 means the server didn't act, so one retry is safe for any method | Leave 401 handling to each service |
| No network I/O in `open`; it throws only `ArgumentError` (CLN-1) | An offline launch must not hang on a refresh; a broken store must not stop the app | Refresh during `open` |
| `close()` idempotent, aborts first, then awaits writes, then closes the client (CLN-5) | In flight calls get `OrvanoCancelledException`, not a network error from a closed client | Close the client and let calls fail |
| A `Retry-After` above 30 s stops retrying (NET-3) | The app, not the SDK, should decide on a long wait; TLS failures never heal by retrying | Cap the wait at 30 s and retry anyway |
| No redirects on native; odd error bodies map to `OrvanoErrorCodes.unknown` (NET-10) | Redirects can silently move a token to another host or to plain HTTP; a proxy's HTML page still needs a typed error | Follow redirects like package:http's default |
| A streamed primitive under the buffered call (NET-9) | Uploads, server sent events, and function output would otherwise need a second transport later | Buffered only, extended per feature |
| Secure store in its own namespace with `resetOnError` (SES-4) | Never read or wipe the app's own secrets; Android decrypt failures heal as signed out | The plugin's default namespace with manual error classification |
| Memory fallback retries on resume and before writes (SES-5) | A keychain locked after a reboot is temporary | A fallback that lasts the whole run |
| First run cleanup once per process, no marker on failure (SES-7) | A failed delete must not leave an old token forever | Write the marker anyway |
| Session key with normalized host, port, and base path (SES-2) | Two projects behind one host with path prefixes would otherwise collide, and userinfo would end up in the key | Host and project only |
| Auth events only on sign in, sign out, user change, or persistence change (STR-2) | A token refresh shouldn't rebuild every `StreamBuilder` | Emit on every refresh |
| `Stream.multi` for the state stream (STR-2) | A broadcast controller can't replay the current value to one new listener | A custom `Stream` subclass |
| Lifecycle mapping, `inactive` ignored (CLN-6) | `inactive` flickers on iOS for overlays; background isolates opt out | Map `inactive` to paused |
| `OrvanoRow` and `ResultPage` (CLN-4, MDL-5) | `Row` and `Page` clash with Flutter's widgets library in every file that imports both | Keep the short names and tell apps to hide them |
| `collection` for deep equality; `copyWith` can't clear a field (MDL-1) | Lists and maps need element equality; a sentinel `copyWith` would lose type safety | Generated equality helpers, a sentinel `copyWith` |
| `num` reads and timestamps without an offset as UTC (MDL-2, MDL-4) | JSON numbers differ between the VM and the web; local time would shift values by the device's offset | `int` and `double` patterns, `DateTime.parse` as is |
| Option fields and defaults spelled out (CLN-8) | Builders shouldn't invent defaults | Leave them to the templates |
| pana per PR except dependency freshness, which runs weekly (PUB-1) | A dependency's new major shouldn't fail unrelated PRs | Gate every category per PR |
| Interfaces and sealed families frozen after beta (DRT-7) | Adding a subtype or an abstract member breaks app code | `abstract base class` with default methods |
| `OrvanoServer` throws on Android and iOS (PLT-3) | `platforms:` only affects pub.dev badges; web builds already fail on `dart:io` | Documentation only |
| Conformance image from the core monorepo's CI, skipped until it exists (DQA-3) | The SDK repos can wire the job before Slice 1 ships a server | Build the server inside SDK CI |
| Server SDK on Linux per PR, other OSes and a compile smoke test nightly (DQA-2, DQA-4) | Keeps PRs fast while still testing every claimed platform | Full OS matrix per PR |
| Abort race and per attempt token callbacks (NET-2, NET-5) | Clients that ignore aborting would otherwise hang the caller, and a long lived token would collect listeners | Trust the client's abort support |

### Installed agent skills

Installed into `.claude/skills/` on 2026-10-15, at the engineer's pick: from `dart-lang/skills`: `dart-run-static-analysis`, `dart-use-pattern-matching`, `dart-add-unit-test`, `dart-resolve-package-conflicts`; from `flutter/agent-plugins`: `flutter-use-http-package`, `flutter-add-integration-test`, `flutter-add-widget-test`, `flutter-implement-json-serialization`; from `kevmoo/dash_skills`: `dart-modern-features`, `dart-package-maintenance`. `dart-run-static-analysis` confirmed the strict mode settings in DRT-4, and `dart-use-pattern-matching` shaped MDL-2's handling of optional keys. Four skills partly conflict with this spec (listed in index.md `## Decision`). The engineer chose to note the official Dart and Flutter MCP server (`dart mcp-server`) for the SDK repos. Skipped as conflicting with the engineer's picks: `dart-lang/skills@dart-generate-test-mocks` (mockito) and `dart-collect-coverage`. Nothing was found for pana, Flutter plugin authoring, or Flutter web and wasm. Full discovery notes: `docs/.agent-cache/tool-discovery/dart-flutter-practices.md`.

### Cross check, 2026-10-15

An independent read of the draft on a different model (Sonnet) raised 51 findings. Code and wording bugs were fixed directly: an abort fallback for clients that ignore abort triggers, the Flutter tool needed to resolve the workspace, `Stream.multi` for the state stream, UTF 8 body decoding and `num` reads, a listener leak and a missing pre send check in the cancel token, catching `Object` in the transport, field paths without values in protocol errors, a lazy `late` and an unawaited future in the samples, empty string defaults in the server sample, per package `dart_test.yaml`, analysis options for `example/` and `tool/`, a fake client that honors aborting, a simulated restart for the nightly tests (`integration_test` can't relaunch the app), and several README notes (Android and iOS cleartext rules, Safari storage eviction, the macOS unsigned build error, testing app code). The engineer accepted the recommended fix for each of 20 decision gaps, listed in the second table under *Calls made without a question*.

### Landscape facts, checked 2026-10-15

- Dart 3.13 stable on 2026-08-12, with primary constructors stable; Flutter 3.47.0 the same day (bundling Dart 3.13), latest patch 3.47.7 on 2026-10-08. Flutter 3.38 with Dart 3.10 shipped in November 2025. Flutter's 2026 schedule: 3.41 February, 3.44 May, 3.47 August, 3.50 November.
- Flutter 3.47 minimums: Android API 24, iOS 15, Windows 10, macOS 12 Monterey, Debian 10 to 13, Ubuntu 20.04 to 24.04.
- pana platform category: 20 points; 0 with no platform tags; capped at 10 for a web package that isn't wasm ready or a legacy native build without Swift Package Manager; no per platform points. pub.dev documentation needs at least 20% of public members documented plus an example. Static analysis uses package:lints. The total maximum (150 or 160) wasn't confirmed, so PUB-1 says "full points" rather than a number.
- Pub workspaces need SDK ^3.6.0 on every member; melos 8.9 needs Dart 3.9 and builds on workspaces.
- package:http 1.6.0 current; 1.5.0 added aborting requests; `RetryClient` lives in `package:http/retry.dart`. dio 5.11.1.
- flutter_secure_storage 11.2.0: Android custom cipher since v10, web mode experimental (HTTPS or localhost, HSTS advised), Linux needs libsecret and a keyring service, macOS keychain groups need provisioning (fallback `usesDataProtectionKeychain: false`), minimum Android SDK 23.
- flutter_lints 6.0.0 (on lints ^6), very_good_analysis 11.0.0, mocktail 1.0.5, mockito 5.8.1, build_runner 2.17.1, dart_apitool 0.23.2 (still 0.x), web_socket_channel 3.0.3.
- Macros cancelled January 2025; augmentations planned for 2026, not shipped. `dart:html` deprecated in favor of package:web and `dart:js_interop`. `dart test -p chrome -c dart2wasm` is supported.
- The official Dart and Flutter MCP server runs as `dart mcp-server` (Dart 3.9 or Flutter 3.35 or later).
- Verify pass, same day, from package source and API docs: package:http 1.6.0 (Dart ^3.4) declares `AbortableRequest` and `AbortableStreamedRequest` (both `final`, on the `Abortable` mixin, with an `abortTrigger` constructor parameter) and `RequestAbortedException extends ClientException`; its docs say some clients don't support aborting, `MockClient` ignores it, and the browser client aborts through `AbortController` and honors `followRedirects`. flutter_secure_storage 11.2.0 (Dart 3.8, Flutter 3.19) has `AndroidOptions.storageNamespace` and `resetOnError` (default true) but no longer `sharedPreferencesName`; `IOSOptions` and `MacOsOptions` (on `AppleOptions`) have `accountName`, `accessibility` (default `unlocked`), and on macOS `usesDataProtectionKeychain` (default true) and `synchronizable` (default false). `test` 1.33.0 and pana 0.23.19 need Dart 3.11; `shared_preferences` 2.5.6 needs Dart 3.11 and Flutter 3.41. pana has `--json` and `--exit-code-threshold`. 20 of the 21 DRT-4 lint names are listed on dart.dev, none deprecated.
- Still unconfirmed, so still marked *verify at scaffold* in index.md: the casing of `no_runtimeType_toString`, plugin Swift Package Manager support and wasm readiness, pana's JSON report shape and total maximum, the `dart test` and `flutter test` wasm flags, and the lowest floor compatible versions of the small dependencies.

## References

**Project sources**:
- `docs/scope/index.md`: the six SDKs, one repo per SDK, GA tier, Tracer Bullet, self hosted first
- `docs/scope/foundations.md`, feature 3 row; `docs/scope/sdks.md`, features 10, 52, 56, 60; `docs/scope/auth.md`, feature 14's done when
- Spec 0002 (.NET backend practices): LIB-6 error fields, LIB-7 retry and timeout, GEN-5 license allow list, TST-5a Podman, the rule ID and deviation conventions
- Spec 0003 (React console practices): the no coverage number choice, the skill override convention
- Installed agent skills in `.claude/skills/` (listed in index.md `## Decision`)
- `docs/.agent-cache/research/dart-flutter-practices.md` and `docs/.agent-cache/tool-discovery/dart-flutter-practices.md`

**Practices & standards**:
- Effective Dart (style, documentation, usage, design)
- Sound null safety and Dart 3 class modifiers, sealed classes, and patterns
- Semantic versioning for published packages; lowest compatible dependency bounds
- Idempotent only retries with exponential backoff and full jitter
- Secrets in platform keystores, never plain files; XSS exposure of browser storage
- Testing behavior with fakes rather than interaction mocks

**Links** (opened during the 2026-10-15 check):
- pub.dev scoring: https://pub.dev/help/scoring
- pana platform scoring source: https://raw.githubusercontent.com/dart-lang/pana/master/lib/src/report/multi_platform.dart
- Dart analysis options and strict modes: https://dart.dev/tools/analysis
- Flutter supported platforms: https://docs.flutter.dev/reference/supported-platforms
- Flutter release archive and schedule: https://docs.flutter.dev/release/archive
- package:http: https://pub.dev/packages/http
- package:http changelog: https://github.com/dart-lang/http/blob/master/pkgs/http/CHANGELOG.md
- flutter_secure_storage: https://pub.dev/packages/flutter_secure_storage
- package:http abortable requests source: https://raw.githubusercontent.com/dart-lang/http/master/pkgs/http/lib/src/abortable.dart
- package:http `AbortableRequest` source: https://raw.githubusercontent.com/dart-lang/http/master/pkgs/http/lib/src/request.dart
- package:http `AbortableStreamedRequest` source: https://raw.githubusercontent.com/dart-lang/http/master/pkgs/http/lib/src/streamed_request.dart
- package:http `MockClient` source: https://raw.githubusercontent.com/dart-lang/http/master/pkgs/http/lib/src/mock_client.dart
- flutter_secure_storage `AndroidOptions`: https://pub.dev/documentation/flutter_secure_storage/latest/flutter_secure_storage/AndroidOptions-class.html
- flutter_secure_storage `MacOsOptions`: https://pub.dev/documentation/flutter_secure_storage/latest/flutter_secure_storage/MacOsOptions-class.html
- Dart linter rules: https://dart.dev/tools/linter-rules
- flutter_secure_storage README: https://github.com/juliansteenbakker/flutter_secure_storage/blob/develop/README.md
- dio: https://pub.dev/packages/dio
- melos: https://pub.dev/packages/melos
- flutter_lints: https://pub.dev/packages/flutter_lints
- very_good_analysis: https://pub.dev/packages/very_good_analysis
- mocktail: https://pub.dev/packages/mocktail
- mockito: https://pub.dev/packages/mockito
- build_runner: https://pub.dev/packages/build_runner
- dart_apitool: https://pub.dev/packages/dart_apitool
- web_socket_channel: https://pub.dev/packages/web_socket_channel
- Dart MCP server: https://dart.dev/tools/mcp-server

Named without a link because the check saw them only in search results: the Dart 3.13 announcement, the Dart 3.6 pub workspaces announcement, the January 2025 update on Dart macros, and the Flutter and Dart 2026 roadmap.
