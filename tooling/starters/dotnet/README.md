# .NET SDK starter

For the `sdk-dotnet` repo (spec 0002 LIB-1 to LIB-12, name from spec 0007 REP-3). Copy these into the repo root:

- `global.json`, `Directory.Build.props`, `Directory.Packages.props`: the server's settings plus LIB-2's package
  settings, including `Apache-2.0` and packing `LICENSE` and `NOTICE` (spec 0009 LIC-6).
- `.editorconfig`: the common basics plus the server's C# rules (FMT-6), in one file that replaces
  `common/.editorconfig`.
- `BannedSymbols.txt`: the server's list without the EF Core and Npgsql rows (the SDK has neither) and without
  the `HttpClient` constructor (LIB-4 builds one on a shared `SocketsHttpHandler` when the app passes none).

Then, in the packable project: set `<CentralPackageTransitivePinningEnabled>false</CentralPackageTransitivePinningEnabled>`
(LIB-3) and reference `Microsoft.CodeAnalysis.PublicApiAnalyzers` with `PublicAPI.Shipped.txt` and
`PublicAPI.Unshipped.txt` (LIB-10). Tests get `XUNIT_GENERATED_DISABLE_WARNINGS` in their `DefineConstants`, as in the
core repo's `server/tests/Directory.Build.props`.

CI: `sdk-dotnet.yml` (KIT-1) restores in locked mode, checks `dotnet format`, builds with `-p:CI=true`, tests, and
packs.
