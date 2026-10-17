// Spec 0010 ISS-1 to ISS-3, OWN-1, COM-1 to COM-3, AC-3 to AC-5: the issue forms, CODEOWNERS, and community files in
// the core and the org starter. GitHub reads the forms as YAML; these tests read the small subset the forms use
// (no YAML parser is a dependency), so a form written in another YAML style fails here first. Reword it or the reader.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

const root = join(import.meta.dirname, "..", "..");
const read = (/** @type {string} */ path) =>
  readFileSync(join(root, path), "utf8").replaceAll("\r\n", "\n");

const core = ".github/ISSUE_TEMPLATE";
const org = "tooling/starters/org/.github/ISSUE_TEMPLATE";

/**
 * @typedef {{ type: string, id?: string, label?: string, required: boolean, options: string[],
 *   requiredOptions: string[], render?: string }} Field
 */

/**
 * Reads an issue form's top level labels and its body fields.
 * @param {string} path
 * @returns {{ labels: string[], fields: Field[] }}
 */
function form(path) {
  const text = read(path);
  const labels =
    /^labels: \[([^\]]*)\]$/m
      .exec(text)?.[1]
      ?.split(",")
      .map((l) => l.trim()) ?? [];
  const body = text.slice(text.indexOf("\nbody:\n") + "\nbody:\n".length);
  const fields = body
    .split(/^ {2}- type: /m)
    .slice(1)
    .map((block) => {
      const value = (/** @type {string} */ key) =>
        new RegExp(`^ {4,6}${key}: (.+)$`, "m").exec(block)?.[1]?.trim();
      const options = [...block.matchAll(/^ {8}- (?:label: )?(.+)$/gm)].map((m) =>
        (m[1] ?? "").replace(/^"(.*)"$/, "$1"),
      );
      const requiredOptions = [...block.matchAll(/^ {8}- label: (.+)\n {10}required: true$/gm)].map(
        (m) => m[1] ?? "",
      );
      return {
        type: block.slice(0, block.indexOf("\n")).trim(),
        id: value("id"),
        label: value("label"),
        required: /^ {4}validations:\n {6}required: true$/m.test(block),
        options,
        requiredOptions,
        render: value("render"),
      };
    });
  return { labels, fields };
}

/**
 * @param {Field[]} fields
 * @param {string} id
 */
function field(fields, id) {
  const found = fields.find((f) => f.id === id);
  assert.ok(found, `field ${id}`);
  return found;
}

/**
 * Reads a config.yml's blank issue switch and its contact links, in order.
 * @param {string} path
 */
function config(path) {
  const text = read(path);
  return {
    blank: /^blank_issues_enabled: (\w+)$/m.exec(text)?.[1],
    links: [...text.matchAll(/^ {2}- name: (.+)\n {4}url: (.+)$/gm)].map((m) => ({
      name: m[1]?.trim(),
      url: m[2]?.trim(),
    })),
  };
}

const qa = "https://github.com/orvanohq/orvano/discussions/categories/q-a";
const advisory = "https://github.com/orvanohq/orvano/security/advisories/new";
const area = ["Server", "Console", "Deploy and install", "Docs", "Not sure"];
const packages = [
  "orvano_flutter",
  "orvano_server (Dart)",
  "@orvano/client",
  "@orvano/server",
  "@orvano/nextjs",
  "Orvano.Server (.NET)",
];

describe("core issue config (ISS-1, AC-5)", () => {
  test("turns blank issues off and links Q&A, private reporting, then the SDK repos, in that order", () => {
    assert.deepEqual(config(`${core}/config.yml`), {
      blank: "false",
      links: [
        { name: "Ask a question", url: qa },
        { name: "Report a vulnerability", url: advisory },
        { name: "A bug in an SDK", url: "https://github.com/orvanohq" },
      ],
    });
  });

  test("offers only the bug report and feature request forms", () => {
    const forms = ["bug_report.yml", "feature_request.yml"].map((f) => read(`${core}/${f}`));
    assert.deepEqual(
      forms.map((text) => /^name: (.+)$/m.exec(text)?.[1]),
      ["Bug report", "Feature request"],
    );
  });
});

describe("core bug form (ISS-2)", () => {
  const { labels, fields } = form(`${core}/bug_report.yml`);

  test("is labeled bug and triage", () => {
    assert.deepEqual(labels, ["bug", "triage"]);
  });

  test("requires what happened, what you expected, steps, the version, the install method, and the area", () => {
    const required = fields.filter((f) => f.required).map((f) => f.id);
    assert.deepEqual(required, [
      "what-happened",
      "expected",
      "steps",
      "version",
      "install",
      "area",
    ]);
  });

  test("the version field names the image tag and orvano --version", () => {
    assert.match(
      read(`${core}/bug_report.yml`),
      /The image tag, or the output of `orvano --version`/,
    );
  });

  test("the install and area dropdowns list the ISS-2 choices", () => {
    assert.deepEqual(field(fields, "install").options, [
      "Reference compose",
      "My own compose or Kubernetes",
      "From source",
    ]);
    assert.deepEqual(field(fields, "area").options, area);
  });

  test("logs are optional and render as shell", () => {
    const logs = field(fields, "logs");
    assert.equal(logs.required, false);
    assert.equal(logs.render, "shell");
  });

  test("both checkboxes are required: searched issues, and not a vulnerability", () => {
    assert.deepEqual(field(fields, "checks").requiredOptions, [
      "I searched the existing issues.",
      "This is not a security vulnerability (those go to private reporting).",
    ]);
  });
});

describe("core feature form (ISS-2)", () => {
  const { labels, fields } = form(`${core}/feature_request.yml`);

  test("is labeled enhancement and triage", () => {
    assert.deepEqual(labels, ["enhancement", "triage"]);
  });

  test("requires the problem, the solution, and the area; alternatives are optional", () => {
    assert.deepEqual(
      fields.filter((f) => f.required).map((f) => f.id),
      ["problem", "solution", "area"],
    );
    assert.equal(field(fields, "alternatives").required, false);
    assert.deepEqual(field(fields, "area").options, area);
  });

  test("requires the searched issues and discussions checkbox", () => {
    assert.deepEqual(field(fields, "checks").requiredOptions, [
      "I searched the existing issues and discussions.",
    ]);
  });
});

describe("SDK issue forms in the org starter (ISS-3)", () => {
  test("config turns blank issues off and sends vulnerabilities and server bugs to the core", () => {
    assert.deepEqual(config(`${org}/config.yml`), {
      blank: "false",
      links: [
        { name: "Ask a question", url: qa },
        { name: "Report a vulnerability", url: advisory },
        {
          name: "A bug in the server or console",
          url: "https://github.com/orvanohq/orvano/issues/new/choose",
        },
      ],
    });
  });

  for (const file of ["bug_report.yml", "feature_request.yml"]) {
    test(`${file} requires the package, from the REP-3 list`, () => {
      const pkg = field(form(`${org}/${file}`).fields, "package");
      assert.equal(pkg.type, "dropdown");
      assert.equal(pkg.required, true);
      assert.deepEqual(pkg.options, packages);
    });

    test(`${file} keeps the core form's labels`, () => {
      assert.deepEqual(form(`${org}/${file}`).labels, form(`${core}/${file}`).labels);
    });
  }

  test("the bug form requires the package version, runtime and platform, server version, and the core's questions", () => {
    const { fields } = form(`${org}/bug_report.yml`);
    assert.deepEqual(
      fields.filter((f) => f.required).map((f) => f.id),
      [
        "package",
        "package-version",
        "runtime",
        "server-version",
        "what-happened",
        "expected",
        "steps",
      ],
    );
    assert.deepEqual(
      field(fields, "checks").requiredOptions,
      field(form(`${core}/bug_report.yml`).fields, "checks").requiredOptions,
    );
  });

  test("the feature form requires the problem and solution, and the searched checkbox", () => {
    const { fields } = form(`${org}/feature_request.yml`);
    assert.deepEqual(
      fields.filter((f) => f.required).map((f) => f.id),
      ["package", "problem", "solution"],
    );
    assert.deepEqual(field(fields, "checks").requiredOptions, [
      "I searched the existing issues and discussions.",
    ]);
  });
});

describe("code owners and community files", () => {
  test("CODEOWNERS has one rule, * @Atteprojects (OWN-1, AC-4)", () => {
    const rules = read(".github/CODEOWNERS")
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"));
    assert.deepEqual(rules, ["* @Atteprojects"]);
  });

  test("README has the status line and links all five community files (COM-1, AC-4)", () => {
    const readme = read("README.md");
    assert.match(readme, /early development, not ready for production/);
    const start = readme.indexOf("\n## Community\n");
    assert.ok(start >= 0, "a Community section");
    const end = readme.indexOf("\n## ", start + 1);
    const community = readme.slice(start, end < 0 ? undefined : end);
    const linked = [...community.matchAll(/\]\(([A-Z_]+\.md)\)/g)].map((m) => m[1]).toSorted();
    assert.deepEqual(linked, [
      "CODE_OF_CONDUCT.md",
      "CONTRIBUTING.md",
      "SECURITY.md",
      "SUPPORT.md",
      "TRADEMARKS.md",
    ]);
  });

  test("SECURITY.md names private reporting first and promises the VRP-3 targets (AC-1)", () => {
    const security = read("SECURITY.md");
    assert.ok(security.indexOf(advisory) < security.indexOf("fallback"));
    assert.match(security, /within 3 business days/);
    assert.match(security, /within 90 days/);
    assert.match(security, /^## Safe harbor$/m);
  });

  test("CONTRIBUTING.md has the COM-2 sections in order (AC-3)", () => {
    const headings = [...read("CONTRIBUTING.md").matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    assert.deepEqual(headings, [
      "Ways to help",
      "Before a big change",
      "Local setup",
      "Branches and pull requests",
      "Sign your work (DCO)",
      "Dependabot NuGet PRs (maintainers)",
      "Windows notes",
      "License",
    ]);
  });

  test("CONTRIBUTING.md's DCO section has the DCO 1.1 text, the sign off fix, and the CTB-6 sentence (AC-3, AC-7)", () => {
    const text = read("CONTRIBUTING.md");
    const dco = text.slice(text.indexOf("## Sign your work (DCO)"), text.indexOf("## Dependabot"));
    assert.match(dco, /Developer Certificate of Origin\nVersion 1\.1/);
    assert.match(dco, /git rebase --signoff origin\/main/);
    assert.match(dco, /git push --force-with-lease/);
    assert.match(dco, /If you use AI coding tools, you still sign off personally/);
  });
});
