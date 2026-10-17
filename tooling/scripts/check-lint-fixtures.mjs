// Spec 0008 LNT-3: fails unless every console restriction fires in its fixture, so a mistyped selector or pattern
// can't silently match nothing. Each fixture is linted as if it lived at the path on its `// lint-as:` line.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ESLint } from "eslint";
import { restrictionMessages } from "../config/console-restrictions.ts";

const fixturesDir = "tooling/lint-fixtures";
const restrictionRules = new Set([
  "no-restricted-imports",
  "no-restricted-globals",
  "no-restricted-syntax",
]);

const eslint = new ESLint({
  // Only the restriction rules, and no type information: fixtures are virtual files outside every tsconfig.
  ruleFilter: ({ ruleId }) => restrictionRules.has(ruleId),
  overrideConfig: [
    { languageOptions: { parserOptions: { projectService: false, project: null } } },
  ],
});

/** @type {Map<string, Set<string>>} rule ID → messages that fired in its fixtures */
const fired = new Map();
const problems = [];

const fixtures = readdirSync(fixturesDir)
  .filter((file) => file.endsWith(".tsx"))
  .map((name) => ({ name, text: readFileSync(join(fixturesDir, name), "utf8") }));

const results = await Promise.all(
  fixtures.map(async ({ name, text }) => {
    const lintAs = /^\/\/ lint-as: (\S+)/.exec(text)?.[1];
    if (!lintAs) return { name, lintAs, messages: [] };
    const [result] = await eslint.lintText(text, { filePath: lintAs, warnIgnored: true });
    return { name, lintAs, messages: result?.messages ?? [] };
  }),
);

for (const { name, lintAs, messages } of results) {
  if (!lintAs) {
    problems.push(`${name}: the first line must be "// lint-as: <path under console/src>"`);
    continue;
  }
  const id = (name.split(".")[0] ?? name).toUpperCase();
  const seen = fired.get(id) ?? new Set();
  for (const message of messages) {
    if (message.fatal) problems.push(`${name}: ${message.message}`);
    if (message.ruleId && restrictionRules.has(message.ruleId)) seen.add(message.message);
  }
  fired.set(id, seen);
}

for (const [id, expected] of restrictionMessages()) {
  const seen = [...(fired.get(id) ?? [])];
  if (!fired.has(id)) {
    problems.push(`${id}: no fixture. Add ${fixturesDir}/${id.toLowerCase()}.tsx that breaks it.`);
    continue;
  }
  for (const message of expected) {
    const text = message.replace(/\.$/, "");
    if (!seen.some((actual) => actual.includes(text))) {
      problems.push(`${id}: no fixture fired "${message}"`);
    }
  }
}

if (problems.length > 0) {
  console.error(
    `check:lint-fixtures found ${problems.length} problem(s):\n  ${problems.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(`check:lint-fixtures: all ${restrictionMessages().size} restriction rule IDs fire.`);
