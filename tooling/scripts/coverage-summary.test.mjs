// Spec 0008 CI-6: coverage-summary.mjs reads the .NET Cobertura files and the console's json-summary into one table.
// Each test builds the result files in a temporary folder and runs the script there.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";

const script = join(import.meta.dirname, "coverage-summary.mjs");

/**
 * @param {Record<string, string>} files relative path → contents
 * @param {{ stepSummary?: boolean }} [options]
 */
const run = (files, { stepSummary = false } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "orvano-coverage-"));
  try {
    for (const [path, contents] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), contents);
    }
    const summary = join(dir, "step-summary.md");
    const env = { ...process.env };
    delete env.GITHUB_STEP_SUMMARY;
    if (stepSummary) {
      writeFileSync(summary, "");
      env.GITHUB_STEP_SUMMARY = summary;
    }
    const result = spawnSync("node", [script], { cwd: dir, encoding: "utf8", env });
    assert.equal(result.status, 0, result.stderr);
    return {
      stdout: result.stdout,
      summary: stepSummary ? readFileSync(summary, "utf8") : undefined,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/** @param {[name: string, line: number, branch: number][]} packages */
const cobertura = (packages) =>
  [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<coverage line-rate="0.5" branch-rate="0.5">`,
    "  <packages>",
    ...packages.map(
      ([name, line, branch]) =>
        `    <package name="${name}" line-rate="${String(line)}" branch-rate="${String(branch)}" complexity="1">\n      <classes />\n    </package>`,
    ),
    "  </packages>",
    "</coverage>",
  ].join("\n");

const consoleSummary = JSON.stringify({
  total: { lines: { pct: 81.25 }, branches: { pct: 60 }, statements: { pct: 80 } },
});

describe("coverage-summary.mjs", () => {
  test("prints one row per assembly and the console, sorted, as percentages", () => {
    const { stdout } = run({
      "server/TestResults/run-a/host.cobertura.xml": cobertura([
        ["Orvano.Host", 0.5, 0.25],
        ["Orvano.Modules.Auth", 0.9123, 0.8],
      ]),
      "console/coverage/coverage-summary.json": consoleSummary,
    });
    assert.equal(
      stdout,
      [
        "### Coverage (reported, not gated)",
        "",
        "| Project | Lines | Branches |",
        "|---|---|---|",
        "| Orvano.Host | 50.0% | 25.0% |",
        "| Orvano.Modules.Auth | 91.2% | 80.0% |",
        "| @orvano/console | 81.25% | 60% |",
        "",
        "",
      ].join("\n"),
    );
  });

  test("keeps each assembly's best run across test projects", () => {
    const { stdout } = run({
      "server/TestResults/a/one.cobertura.xml": cobertura([["Orvano.Host", 0.4, 0.9]]),
      "server/TestResults/b/nested/two.cobertura.xml": cobertura([["Orvano.Host", 0.7, 0.1]]),
      "server/TestResults/c/three.cobertura.xml": cobertura([["Orvano.Host", 0.6, 0.5]]),
    });
    assert.match(stdout, /^\| Orvano\.Host \| 70\.0% \| 10\.0% \|$/m);
    assert.equal(stdout.match(/Orvano\.Host/g)?.length, 1);
  });

  test("leaves out test assemblies and Orvano.Testing", () => {
    const { stdout } = run({
      "server/TestResults/a/x.cobertura.xml": cobertura([
        ["Orvano.Host", 0.5, 0.5],
        ["Orvano.Host.Tests", 1, 1],
        ["Orvano.Host.IntegrationTests", 1, 1],
        ["Orvano.Testing", 1, 1],
      ]),
    });
    assert.doesNotMatch(stdout, /Tests|Orvano\.Testing/);
    assert.match(stdout, /\| Orvano\.Host \|/);
  });

  test("ignores files that aren't Cobertura", () => {
    const { stdout } = run({
      "server/TestResults/a/results.trx": cobertura([["Orvano.Host", 0.5, 0.5]]),
    });
    assert.equal(stdout, "_No coverage files found._\n\n");
  });

  test("works with only the console summary", () => {
    const { stdout } = run({ "console/coverage/coverage-summary.json": consoleSummary });
    assert.match(stdout, /\| @orvano\/console \| 81\.25% \| 60% \|/);
    assert.doesNotMatch(stdout, /Orvano\./);
  });

  test("says so when there is no coverage at all", () => {
    assert.equal(run({}).stdout, "_No coverage files found._\n\n");
  });

  test("appends the table to $GITHUB_STEP_SUMMARY in CI", () => {
    const { stdout, summary } = run(
      {
        "server/TestResults/a/x.cobertura.xml": cobertura([["Orvano.Host", 0.5, 0.5]]),
      },
      { stepSummary: true },
    );
    assert.equal(summary, stdout);
    assert.match(summary ?? "", /\| Orvano\.Host \| 50\.0% \| 50\.0% \|/);
  });
});
