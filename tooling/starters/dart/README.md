# Dart and Flutter SDK starter

For the `sdk-dart` and `sdk-flutter` repos (spec 0004, names from spec 0007 REP-3).

- `analysis_options.yaml`: at the repo root (DRT-4). Confirm the casing of `no_runtimeType_toString` and that
  every rule exists in the floor's analyzer (DRT-1); drop any that don't, with a note in spec 0004.
- `example/analysis_options.yaml` and `tool/analysis_options.yaml`: copies of `analysis_options.tool.yaml` (the export writes both).
- `.github/dependabot.yml`: `pub` and `github-actions` (the export trims the rest).

The `tool/check_*.dart` scripts spec 0004 names (imports, deps, version, pana) are written with the first Dart repo
(LNT-7, KIT-3). `sdk-dart.yml` runs them when they exist.
