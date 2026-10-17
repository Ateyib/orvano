# Lint fixtures

Spec 0008 LNT-3: each file here breaks one console restriction on purpose. `pnpm check:lint-fixtures` lints every
file as if it lived at the path on its `// lint-as:` line, and fails unless every restriction message in
`tooling/config/console-restrictions.ts` fires in a fixture named after its rule ID (`<rule-id>[.<variant>].tsx`).

When you add a restriction, add or extend the fixture for its rule ID. The main `eslint` run ignores this folder.
