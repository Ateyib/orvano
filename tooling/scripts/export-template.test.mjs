// Spec 0010 TPL-2, TPL-3, TPL-5, AC-16 to AC-18: export-template.mjs builds each template from the real starters and
// writes into a temp git clone; --check finds drift.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import {
  buildTree,
  existingPin,
  exportTemplate,
  main,
  targets,
  trimDependabot,
} from "./export-template.mjs";

const root = join(import.meta.dirname, "..", "..");
const sha = "0123456789abcdef0123456789abcdef01234567";
const date = "2026-10-16";
const temp = mkdtempSync(join(tmpdir(), "export-template-"));

after(() => {
  rmSync(temp, { recursive: true, force: true });
});

/** @param {string} name */
const tree = (name) => buildTree(name, { sha, date });

/**
 * @param {Map<string, { content: string }>} files
 * @param {string} path
 */
function content(files, path) {
  const file = files.get(path);
  assert.ok(file, `${path} is in the tree`);
  return file.content;
}

let clones = 0;
/** A new empty git repo, like a fresh clone of a template repo. */
function clone() {
  const dir = join(temp, `clone-${String(clones++)}`);
  mkdirSync(dir);
  spawnSync("git", ["init", "-q", dir]);
  return dir;
}

/** @param {string} dir */
function commitAll(dir) {
  spawnSync("git", ["-C", dir, "add", "-A"]);
  spawnSync("git", [
    "-C",
    dir,
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@example.com",
    "commit",
    "-qm",
    "x",
  ]);
}

/**
 * @param {string} target
 * @param {string} dir
 * @param {boolean} check
 * @param {{ sha?: string | null, root?: string, force?: boolean }} options `sha: null` leaves the pin to the script
 */
function run(target, dir, check, options = {}) {
  /** @type {string[]} */
  const lines = [];
  const code = exportTemplate(
    {
      target,
      outDir: dir,
      check,
      force: options.force,
      sha: options.sha === null ? undefined : (options.sha ?? sha),
      date,
      root: options.root ?? root,
    },
    (line) => lines.push(line),
  );
  return { code, out: lines.join("\n") };
}

describe("SDK templates", () => {
  /** @type {[string, string, string | undefined, string[]][]} */
  const cases = [
    ["sdk-template-dotnet", "dotnet", "csharp", ["nuget", "github-actions"]],
    ["sdk-template-typescript", "typescript", "javascript-typescript", ["npm", "github-actions"]],
    ["sdk-template-dart", "dart", undefined, ["pub", "github-actions"]],
  ];
  for (const [name, lang, codeql, ecosystems] of cases) {
    test(`${name}: CI pinned to the core SHA, its language, CODEOWNERS, SETUP.md, and a README`, () => {
      const files = tree(name);
      const ci = content(files, ".github/workflows/ci.yml");
      assert.match(ci, new RegExp(`repo-hygiene\\.yml@${sha} # main as of ${date}`));
      assert.match(ci, new RegExp(`sdk-${lang}\\.yml@${sha} # main as of ${date}`));
      assert.match(ci, /pull-requests: read/);
      assert.equal(
        content(files, ".github/CODEOWNERS"),
        readFileSync(join(root, ".github/CODEOWNERS"), "utf8"),
      );
      assert.match(content(files, "SETUP.md"), /\{\{PRODUCT_NAME\}\}/);
      assert.match(content(files, "SETUP.md"), new RegExp(`--profile sdk-${lang} --apply`));
      const readme = content(files, "README.md");
      assert.match(readme, /^# \{\{PRODUCT_NAME\}\}/);
      assert.match(readme, /orvanohq\/orvano\/blob\/main\/TRADEMARKS\.md/);
      assert.ok(files.has("LICENSE") && files.has("NOTICE"));
      assert.ok(files.has(".github/workflows/dependency-review.yml"));
      for (const [path, file] of files) {
        assert.doesNotMatch(file.content, /<(lang|codeql-lang|FULL_SHA|date)>/, path);
      }
    });

    test(`${name}: dependabot.yml keeps ${ecosystems.join(" and ")} only`, () => {
      const dependabot = content(tree(name), ".github/dependabot.yml");
      const found = [...dependabot.matchAll(/package-ecosystem: (\S+)/g)].map((m) => m[1]);
      assert.deepEqual(found, ecosystems);
    });

    test(`${name}: CodeQL ${codeql ? `analyzes ${codeql} as "analyze (${codeql})"` : "is dropped"}`, () => {
      const files = tree(name);
      if (!codeql) {
        assert.equal(files.has(".github/workflows/codeql.yml"), false);
        return;
      }
      const workflow = content(files, ".github/workflows/codeql.yml");
      assert.match(workflow, /name: analyze \(\$\{\{ matrix\.language \}\}\)/);
      assert.match(workflow, new RegExp(`language: \\[${codeql}\\]`));
      assert.match(workflow, /upload: always/);
      assert.match(workflow, /if: \$\{\{ !github\.event\.repository\.private \}\}/);
    });
  }

  test("the folder READMEs are merged into SETUP.md, not copied", () => {
    const files = tree("sdk-template-dotnet");
    const setup = content(files, "SETUP.md");
    assert.match(setup, /^## Common files$/m);
    assert.match(setup, /^## \.NET SDK starter$/m);
    assert.doesNotMatch(content(files, "README.md"), /Common files/);
  });

  test("dotnet's .editorconfig replaces the common one", () => {
    assert.equal(
      content(tree("sdk-template-dotnet"), ".editorconfig"),
      readFileSync(join(root, "tooling/starters/dotnet/.editorconfig"), "utf8"),
    );
  });

  test("typescript gets the core's .node-version and an executable hook", () => {
    const files = tree("sdk-template-typescript");
    assert.equal(
      content(files, ".node-version"),
      readFileSync(join(root, ".node-version"), "utf8"),
    );
    assert.equal(files.get(".vite-hooks/pre-commit")?.executable, true);
  });

  test("dart writes the tool analysis options to example/ and tool/, not the root", () => {
    const files = tree("sdk-template-dart");
    const tool = readFileSync(
      join(root, "tooling/starters/dart/analysis_options.tool.yaml"),
      "utf8",
    );
    assert.equal(content(files, "example/analysis_options.yaml"), tool);
    assert.equal(content(files, "tool/analysis_options.yaml"), tool);
    assert.equal(files.has("analysis_options.tool.yaml"), false);
    assert.ok(files.has("analysis_options.yaml"));
  });
});

describe(".github target", () => {
  test("holds the org starter plus the core's security policy, code of conduct, and support files", () => {
    const files = tree(".github");
    assert.deepEqual(
      [...files.keys()],
      [
        ".github/ISSUE_TEMPLATE/bug_report.yml",
        ".github/ISSUE_TEMPLATE/config.yml",
        ".github/ISSUE_TEMPLATE/feature_request.yml",
        "CODE_OF_CONDUCT.md",
        "CONTRIBUTING.md",
        "profile/README.md",
        "SECURITY.md",
        "SUPPORT.md",
      ],
    );
    for (const file of ["SECURITY.md", "CODE_OF_CONDUCT.md", "SUPPORT.md"]) {
      assert.equal(content(files, file), readFileSync(join(root, file), "utf8"));
    }
  });

  test("the SDK forms ask for the package from spec 0007 REP-3", () => {
    const bug = content(tree(".github"), ".github/ISSUE_TEMPLATE/bug_report.yml");
    for (const pkg of [
      "orvano_flutter",
      "orvano_server",
      "@orvano/client",
      "@orvano/server",
      "@orvano/nextjs",
      "Orvano.Server",
    ]) {
      assert.ok(bug.includes(pkg), pkg);
    }
  });
});

describe("trimDependabot", () => {
  test("fails when the target's ecosystem has no entry", () => {
    assert.throws(
      () => trimDependabot("version: 2\n\nupdates:\n  - package-ecosystem: npm\n", ["pub"]),
      /no entry for pub/,
    );
  });
});

describe("writing and --check", () => {
  for (const target of Object.keys(targets)) {
    test(`${target}: a fresh export passes --check, committed or not`, () => {
      const dir = clone();
      assert.equal(run(target, dir, false).code, 0);
      assert.equal(run(target, dir, true).code, 0);
      commitAll(dir);
      assert.equal(run(target, dir, true).code, 0);
    });
  }

  test("check mode keeps the clone's pinned SHA, so a newer core main isn't drift", () => {
    const dir = clone();
    run("sdk-template-dart", dir, false);
    assert.deepEqual(existingPin(dir), { sha, date });
    const result = run("sdk-template-dart", dir, true, { sha: "f".repeat(40) });
    assert.equal(result.code, 0, result.out);
  });

  test("a hand edit in the clone is drift", () => {
    const dir = clone();
    run("sdk-template-dotnet", dir, false);
    writeFileSync(join(dir, "typos.toml"), "# edited\n");
    const result = run("sdk-template-dotnet", dir, true);
    assert.equal(result.code, 1);
    assert.match(result.out, /differs {2}typos\.toml/);
  });

  test("a starter change not exported yet is drift (AC-16)", () => {
    const fakeRoot = join(temp, "core");
    mkdirSync(join(fakeRoot, ".github"), { recursive: true });
    mkdirSync(join(fakeRoot, "tooling"), { recursive: true });
    cpSync(join(root, "tooling/starters"), join(fakeRoot, "tooling/starters"), { recursive: true });
    cpSync(join(root, ".github/CODEOWNERS"), join(fakeRoot, ".github/CODEOWNERS"));
    const dir = clone();
    assert.equal(run("sdk-template-dotnet", dir, false, { root: fakeRoot }).code, 0);
    writeFileSync(join(fakeRoot, "tooling/starters/common/typos.toml"), "# changed upstream\n");
    const result = run("sdk-template-dotnet", dir, true, { root: fakeRoot });
    assert.equal(result.code, 1);
    assert.match(result.out, /differs {2}typos\.toml/);
  });

  test("a tracked file the export no longer makes is drift, and writing removes it", () => {
    const dir = clone();
    run("sdk-template-dart", dir, false);
    writeFileSync(join(dir, "old.txt"), "x\n");
    writeFileSync(join(dir, "untracked.txt"), "x\n");
    spawnSync("git", ["-C", dir, "add", "old.txt"]);
    spawnSync("git", [
      "-C",
      dir,
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.com",
      "commit",
      "-qm",
      "old",
    ]);
    const check = run("sdk-template-dart", dir, true);
    assert.equal(check.code, 1);
    assert.match(check.out, /stale {4}old\.txt/);
    assert.doesNotMatch(check.out, /untracked\.txt/);
    run("sdk-template-dart", dir, false);
    assert.equal(existsSync(join(dir, "old.txt")), false);
    assert.equal(existsSync(join(dir, "untracked.txt")), true);
    assert.ok(existsSync(join(dir, ".git")));
  });

  test("a missing file is drift, and the hook keeps its executable bit", () => {
    const dir = clone();
    run("sdk-template-typescript", dir, false);
    assert.notEqual(statSync(join(dir, ".vite-hooks/pre-commit")).mode & 0o111, 0);
    rmSync(join(dir, "SETUP.md"));
    const result = run("sdk-template-typescript", dir, true);
    assert.equal(result.code, 1);
    assert.match(result.out, /missing {2}SETUP\.md/);
  });

  test("a placeholder the export should fill but can't is an error (exit 2)", () => {
    const fakeRoot = join(temp, "core-bad");
    mkdirSync(join(fakeRoot, ".github"), { recursive: true });
    mkdirSync(join(fakeRoot, "tooling"), { recursive: true });
    cpSync(join(root, "tooling/starters"), join(fakeRoot, "tooling/starters"), { recursive: true });
    cpSync(join(root, ".github/CODEOWNERS"), join(fakeRoot, ".github/CODEOWNERS"));
    writeFileSync(join(fakeRoot, "tooling/starters/common/typos.toml"), "# for <lang>\n");
    assert.throws(
      () => buildTree("sdk-template-dart", { root: fakeRoot, sha, date }),
      /typos\.toml still has <lang>/,
    );
  });
});

/** A core copy that is its own git repo, so `origin/main` can point somewhere known. */
function gitCore(/** @type {string} */ name) {
  const fakeRoot = join(temp, name);
  mkdirSync(join(fakeRoot, ".github"), { recursive: true });
  mkdirSync(join(fakeRoot, "tooling"), { recursive: true });
  cpSync(join(root, "tooling/starters"), join(fakeRoot, "tooling/starters"), { recursive: true });
  cpSync(join(root, ".github/CODEOWNERS"), join(fakeRoot, ".github/CODEOWNERS"));
  spawnSync("git", ["init", "-q", fakeRoot]);
  commitAll(fakeRoot);
  return fakeRoot;
}

/** Today in the local time zone, as YYYY-MM-DD. */
const today = () => {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("-");
};

describe("the pin (value sourcing)", () => {
  test("without a SHA, a write pins CI to the core's origin/main and today's date (TPL-3)", () => {
    const fakeRoot = gitCore("core-pinned");
    const head = spawnSync("git", ["-C", fakeRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).stdout.trim();
    spawnSync("git", ["-C", fakeRoot, "update-ref", "refs/remotes/origin/main", head]);
    const dir = clone();
    const before = today();
    /** @type {string[]} */
    const lines = [];
    const code = exportTemplate(
      { target: "sdk-template-dart", outDir: dir, check: false, root: fakeRoot },
      (line) => lines.push(line),
    );
    assert.equal(code, 0, lines.join("\n"));
    const pin = existingPin(dir);
    assert.equal(pin?.sha, head);
    assert.ok(pin && [before, today()].includes(pin.date), pin?.date);
  });

  test("without a SHA and no origin/main in the core, it stops and says to fetch", () => {
    const fakeRoot = gitCore("core-unfetched");
    assert.throws(
      () =>
        exportTemplate(
          { target: "sdk-template-dart", outDir: clone(), check: false, root: fakeRoot },
          () => {},
        ),
      /Can't read the core's origin\/main\. Run `git fetch`/,
    );
  });
});

/** @param {string[]} argv */
function cli(argv) {
  /** @type {string[]} */
  const lines = [];
  return { code: main(argv, (line) => lines.push(line)), out: lines.join("\n") };
}

describe("arguments", () => {
  test("an unknown target exits 2", () => {
    const result = cli(["sdk-template-cobol", clone()]);
    assert.equal(result.code, 2);
    assert.match(result.out, /Unknown target/);
  });

  test("an out dir that isn't a git clone exits 2", () => {
    const dir = join(temp, "plain");
    mkdirSync(dir);
    const result = cli(["sdk-template-dart", dir, "--check"]);
    assert.equal(result.code, 2);
    assert.match(result.out, /isn't the root of a git clone/);
  });

  test("missing arguments or an unknown option exit 2", () => {
    assert.equal(cli(["sdk-template-dart"]).code, 2);
    assert.equal(cli(["sdk-template-dart", clone(), "--nope"]).code, 2);
  });
});

/**
 * A copy of the core's starters and root files outside any git repo, so it has no origin/main.
 * @param {string} name
 */
function fakeCore(name) {
  const dir = join(temp, name);
  mkdirSync(join(dir, ".github"), { recursive: true });
  mkdirSync(join(dir, "tooling"), { recursive: true });
  cpSync(join(root, "tooling/starters"), join(dir, "tooling/starters"), { recursive: true });
  for (const file of [
    ".github/CODEOWNERS",
    "SECURITY.md",
    "CODE_OF_CONDUCT.md",
    "SUPPORT.md",
    ".node-version",
  ]) {
    cpSync(join(root, file), join(dir, file));
  }
  return dir;
}

describe("safety (review 2026-10-16)", () => {
  test("refuses to write into the core repo, and deletes nothing there", () => {
    const result = cli(["sdk-template-dart", root]);
    assert.equal(result.code, 2);
    assert.match(result.out, /is the core repo, or overlaps it/);
    assert.ok(existsSync(join(root, "tooling/scripts/export-template.mjs")));
  });

  test("refuses --check on the core repo too", () => {
    assert.equal(cli(["sdk-template-dart", root, "--check"]).code, 2);
  });

  test("refuses an out dir that holds the core", () => {
    const dir = clone();
    const core = fakeCore(join(dir.slice(temp.length + 1), "core"));
    assert.throws(() => run("sdk-template-dart", dir, false, { root: core }), /overlaps it/);
  });

  test("refuses to write over uncommitted changes to tracked files, unless --force", () => {
    const dir = clone();
    run("sdk-template-dotnet", dir, false);
    commitAll(dir);
    writeFileSync(join(dir, "typos.toml"), "# my edit\n");
    assert.throws(
      () => run("sdk-template-dotnet", dir, false),
      /uncommitted changes to tracked files \(typos\.toml\)/,
    );
    assert.equal(readFileSync(join(dir, "typos.toml"), "utf8"), "# my edit\n");
    assert.equal(run("sdk-template-dotnet", dir, false, { force: true }).code, 0);
    assert.notEqual(readFileSync(join(dir, "typos.toml"), "utf8"), "# my edit\n");
  });

  test("untracked files don't block a write", () => {
    const dir = clone();
    run("sdk-template-dart", dir, false);
    commitAll(dir);
    writeFileSync(join(dir, "notes.txt"), "x\n");
    assert.equal(run("sdk-template-dart", dir, false).code, 0);
  });

  test("--check and --force together exit 2", () => {
    assert.equal(cli(["sdk-template-dart", clone(), "--check", "--force"]).code, 2);
  });

  test("a second run before committing a removal doesn't crash, and --check doesn't call it stale", () => {
    const dir = clone();
    run("sdk-template-dart", dir, false);
    writeFileSync(join(dir, "OLD.md"), "x\n");
    commitAll(dir);
    assert.equal(run("sdk-template-dart", dir, false).code, 0);
    assert.equal(existsSync(join(dir, "OLD.md")), false);
    const again = run("sdk-template-dart", dir, false, { force: true });
    assert.equal(again.code, 0, again.out);
    const check = run("sdk-template-dart", dir, true);
    assert.equal(check.code, 0, check.out);
    assert.doesNotMatch(check.out, /OLD\.md/);
  });

  test("the .github target needs no core origin/main, in either mode", () => {
    const core = fakeCore("core-no-origin");
    const dir = clone();
    const write = run(".github", dir, false, { root: core, sha: null });
    assert.equal(write.code, 0, write.out);
    assert.doesNotMatch(write.out, /pinned/);
    const check = run(".github", dir, true, { root: core, sha: null });
    assert.equal(check.code, 0, check.out);
  });

  test("an SDK target still needs the core's origin/main when nothing pins it", () => {
    const core = fakeCore("core-no-origin-sdk");
    assert.throws(
      () => run("sdk-template-dart", clone(), false, { root: core, sha: null }),
      /git fetch/,
    );
  });
});
