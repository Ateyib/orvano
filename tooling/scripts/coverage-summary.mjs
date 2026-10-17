// Spec 0008 CI-6: coverage is reported, never gated. Reads the .NET Cobertura files and the console's Vitest
// json-summary, and appends one small table to $GITHUB_STEP_SUMMARY (or prints it locally).
// Usage: node tooling/scripts/coverage-summary.mjs
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** @param {number} rate */
const percent = (rate) => `${(rate * 100).toFixed(1)}%`;
const rows = [];

// .NET: one <package> per assembly. Test runs write one file per test project, so keep each assembly's best run.
const assemblies = new Map();
const resultsDir = "server/TestResults";
const coberturaFiles = existsSync(resultsDir)
  ? readdirSync(resultsDir, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".cobertura.xml"))
      .map((file) => join(resultsDir, file))
  : [];
for (const file of coberturaFiles) {
  const xml = readFileSync(file, "utf8");
  for (const match of xml.matchAll(/<package\s[^>]*>/g)) {
    const tag = match[0];
    const name = /name="([^"]+)"/.exec(tag)?.[1];
    const line = Number(/line-rate="([^"]+)"/.exec(tag)?.[1] ?? 0);
    const branch = Number(/branch-rate="([^"]+)"/.exec(tag)?.[1] ?? 0);
    if (!name || name.endsWith(".Tests") || name.endsWith("Tests") || name === "Orvano.Testing")
      continue;
    const best = assemblies.get(name);
    if (!best || line > best.line) assemblies.set(name, { line, branch });
  }
}
for (const [name, { line, branch }] of [...assemblies].toSorted(([a], [b]) => a.localeCompare(b))) {
  rows.push(`| ${name} | ${percent(line)} | ${percent(branch)} |`);
}

// Console: Vitest's json-summary reporter.
const consoleSummary = "console/coverage/coverage-summary.json";
if (existsSync(consoleSummary)) {
  const { total } = JSON.parse(readFileSync(consoleSummary, "utf8"));
  rows.push(`| @orvano/console | ${total.lines.pct}% | ${total.branches.pct}% |`);
}

const table =
  rows.length === 0
    ? "_No coverage files found._\n"
    : [
        "### Coverage (reported, not gated)",
        "",
        "| Project | Lines | Branches |",
        "|---|---|---|",
        ...rows,
        "",
      ].join("\n");

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
console.log(table);
