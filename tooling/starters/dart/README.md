# Dart and Flutter SDK starter

For the `orvano-dart` and `orvano-flutter` repos (spec 0004).

- `analysis_options.yaml`: copy to the repo root (DRT-4). Confirm the casing of `no_runtimeType_toString` and that
  every rule exists in the floor's analyzer (DRT-1); drop any that don't, with a note in spec 0004.
- `analysis_options.tool.yaml`: copy to `example/analysis_options.yaml` and `tool/analysis_options.yaml`.
- `.github/dependabot.yml` from `common/`: keep `pub` and `github-actions`.

The `tool/check_*.dart` scripts spec 0004 names (imports, deps, version, pana) are written with the first Dart repo
(LNT-7, KIT-3). `sdk-dart.yml` runs them when they exist.
