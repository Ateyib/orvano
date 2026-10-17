// Spec 0010 TPL-2, TPL-3: writes a template repo's whole tree from tooling/starters/** (and the core root community
// files) into a clone of that repo. It removes tracked files it no longer produces (never .git) and never commits.
// --check writes nothing and exits 1 when the clone differs; it keeps the core SHA and date already pinned in the
// clone's ci.yml, so moving main alone isn't drift. It refuses to write into the core repo, and into a clone with
// uncommitted changes to tracked files unless you pass --force.
// Usage: node tooling/scripts/export-template.mjs <target> <out-dir> [--check | --force]
// Exit codes: 0 done or in step, 1 drift (--check), 2 usage errors.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  lstatSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const coreRoot = join(import.meta.dirname, "..", "..");

/**
 * @typedef {{
 *   folders: string[],
 *   rootFiles: string[],
 *   sdk?: { lang: string, codeqlLang?: string, ecosystems: string[], summary: string, install: string,
 *     manifest: string, profile: string },
 *   copies?: Record<string, string[]>,
 * }} Target
 * @typedef {{ content: string, executable: boolean }} OutFile
 */

/** @type {Record<string, Target>} */
export const targets = {
  "sdk-template-dotnet": {
    folders: ["common", "dotnet"],
    rootFiles: [],
    sdk: {
      lang: "dotnet",
      codeqlLang: "csharp",
      ecosystems: ["nuget", "github-actions"],
      summary: "The Orvano SDK for .NET.",
      install: "dotnet add package {{PACKAGE_NAME}}",
      manifest:
        "the packable project's `.csproj` (`PackageId`, `Description`), and the repo name in `Directory.Build.props` `RepositoryUrl` (it says `sdk-dotnet`)",
      profile: "sdk-dotnet",
    },
  },
  "sdk-template-typescript": {
    folders: ["common", "typescript"],
    rootFiles: [".node-version"],
    sdk: {
      lang: "typescript",
      codeqlLang: "javascript-typescript",
      ecosystems: ["npm", "github-actions"],
      summary: "An Orvano SDK for JavaScript and TypeScript.",
      install: "pnpm add {{PACKAGE_NAME}}",
      manifest:
        "each published package's `packages/*/package.json` (`name`, `description`, `repository`)",
      profile: "sdk-typescript",
    },
  },
  "sdk-template-dart": {
    folders: ["common", "dart"],
    rootFiles: [],
    sdk: {
      lang: "dart",
      ecosystems: ["pub", "github-actions"],
      summary: "An Orvano SDK for Dart and Flutter.",
      install: "dart pub add {{PACKAGE_NAME}}",
      manifest: "`pubspec.yaml` (`name`, `description`, `repository`)",
      profile: "sdk-dart",
    },
    copies: {
      "analysis_options.tool.yaml": ["example/analysis_options.yaml", "tool/analysis_options.yaml"],
    },
  },
  ".github": {
    folders: ["org"],
    rootFiles: ["SECURITY.md", "CODE_OF_CONDUCT.md", "SUPPORT.md"],
  },
};

/** Placeholders the export fills. Any left over is a bug in a starter or here (exit 2). */
const exportPlaceholders = /<(lang|codeql-lang|FULL_SHA|date)>/;

/** Today in the local time zone, as YYYY-MM-DD (the `# main as of` date). */
function localDate() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("-");
}

/** Thrown for usage errors (exit 2). */
export class ExportError extends Error {}

/**
 * Every file under `dir`, as paths relative to it, `/` separated.
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => statSync(join(dir, file)).isFile())
    .toSorted();
}

/** @param {string} path */
function readOut(path) {
  return {
    content: readFileSync(path, "utf8"),
    executable: (statSync(path).mode & 0o111) !== 0,
  };
}

/**
 * Keeps only the `updates` entries for the given ecosystems.
 * @param {string} text
 * @param {string[]} ecosystems
 */
export function trimDependabot(text, ecosystems) {
  const [head = "", ...blocks] = text.split(/^(?= {2}- package-ecosystem: )/m);
  const kept = blocks.filter((block) => {
    const ecosystem = /^ {2}- package-ecosystem: (\S+)/.exec(block)?.[1];
    return ecosystem !== undefined && ecosystems.includes(ecosystem);
  });
  const missing = ecosystems.filter(
    (e) => !kept.some((block) => block.startsWith(`  - package-ecosystem: ${e}\n`)),
  );
  if (missing.length > 0) {
    throw new ExportError(`dependabot.yml has no entry for ${missing.join(", ")}.`);
  }
  const header = head.replace(
    "Delete the ecosystems your repo doesn't use.",
    "export-template.mjs keeps this repo's ecosystems.",
  );
  return `${header}${kept.map((block) => block.trimEnd()).join("\n\n")}\n`;
}

/**
 * A folder README as a SETUP.md section: every heading one level down.
 * @param {string} text
 */
const asSection = (text) => text.replaceAll(/^(#+) /gm, "#$1 ");

/**
 * @param {string} name
 * @param {NonNullable<Target["sdk"]>} sdk
 * @param {{ sha: string, date: string }} pin
 * @param {string[]} readmes
 */
function setupFile(name, sdk, pin, readmes) {
  return `# Set up this repo

You made this repo from \`orvanohq/${name}\` (spec 0010 TPL-4). Work through this list, then delete this file.

## Placeholders to fill in

- \`{{PRODUCT_NAME}}\` in \`NOTICE\` and \`README.md\`: the repo's name from spec 0009 LIC-2's table
- \`{{PACKAGE_NAME}}\` in \`README.md\`: the package name from spec 0007 REP-3
- The package name and description in the language manifest: ${sdk.manifest}

## Steps

1. Make the repo **public** from the start ("Use this template" with visibility public). On GitHub Free, its
   ruleset, CodeQL, and secret scanning need that.
2. Fill in the placeholders above.
3. From a clone of \`orvanohq/orvano\`, apply the settings (a template doesn't copy rulesets or settings):

   \`\`\`bash
   node tooling/scripts/github-settings.mjs orvanohq/<this-repo> --profile ${sdk.profile} --apply
   \`\`\`

4. Open a first PR. Its green CI is the proof these starter files work (spec 0008 KIT-3).
5. Delete this file.

CI calls the core's shared workflows at \`${pin.sha}\` (\`main\` as of ${pin.date}). Move that pin forward with the
core.

${readmes.map(asSection).join("\n")}`;
}

/**
 * @param {NonNullable<Target["sdk"]>} sdk
 */
function readmeFile(sdk) {
  return `# {{PRODUCT_NAME}}

${sdk.summary} Orvano is an open source, self hostable backend as a service; see
[orvanohq/orvano](https://github.com/orvanohq/orvano).

## Install

\`\`\`bash
${sdk.install}
\`\`\`

## License

Apache License 2.0 (see \`LICENSE\` and \`NOTICE\`). The name "Orvano" and its logo aren't covered by the license;
see [TRADEMARKS.md](https://github.com/orvanohq/orvano/blob/main/TRADEMARKS.md).
`;
}

/**
 * The full tree for a target.
 * @param {string} name
 * @param {{ root?: string, sha: string, date: string }} options
 * @returns {Map<string, OutFile>}
 */
export function buildTree(name, { root = coreRoot, sha, date }) {
  const target = targets[name];
  if (!target) {
    throw new ExportError(`Unknown target "${name}". Targets: ${Object.keys(targets).join(", ")}.`);
  }
  const starters = join(root, "tooling", "starters");
  /** @type {Map<string, OutFile>} */
  const tree = new Map();
  /** @type {string[]} */
  const readmes = [];

  for (const folder of target.folders) {
    const dir = join(starters, folder);
    for (const file of listFiles(dir)) {
      // Each SDK folder's README is merged into SETUP.md (TPL-3).
      if (target.sdk && file === "README.md") {
        readmes.push(readFileSync(join(dir, file), "utf8"));
        continue;
      }
      tree.set(file, readOut(join(dir, file)));
    }
  }
  for (const [from, to] of Object.entries(target.copies ?? {})) {
    const file = tree.get(from);
    if (!file) throw new ExportError(`${name}: ${from} is missing from the starters.`);
    tree.delete(from);
    for (const path of to) tree.set(path, file);
  }
  for (const file of target.rootFiles) {
    const path = join(root, file);
    if (!existsSync(path)) throw new ExportError(`${name}: the core root has no ${file}.`);
    tree.set(file, readOut(path));
  }

  if (target.sdk) {
    const sdk = target.sdk;
    for (const [path, file] of tree) {
      if (!path.startsWith(".github/workflows/")) continue;
      tree.set(path, {
        ...file,
        content: file.content
          .replaceAll("<lang>", sdk.lang)
          .replaceAll("<codeql-lang>", sdk.codeqlLang ?? "<codeql-lang>")
          .replaceAll("<FULL_SHA>", sha)
          .replaceAll("<date>", date),
      });
    }
    // Spec 0006 SUP-3: CodeQL has no Dart support.
    if (!sdk.codeqlLang) tree.delete(".github/workflows/codeql.yml");

    const dependabot = tree.get(".github/dependabot.yml");
    if (dependabot) {
      tree.set(".github/dependabot.yml", {
        ...dependabot,
        content: trimDependabot(dependabot.content, sdk.ecosystems),
      });
    }
    tree.set(".github/CODEOWNERS", readOut(join(root, ".github", "CODEOWNERS")));
    tree.set("SETUP.md", {
      content: setupFile(name, sdk, { sha, date }, readmes),
      executable: false,
    });
    tree.set("README.md", { content: readmeFile(sdk), executable: false });
  }

  for (const [path, file] of tree) {
    const left = exportPlaceholders.exec(file.content);
    if (left) throw new ExportError(`${name}: ${path} still has ${left[0]} after the export.`);
  }
  return new Map([...tree].toSorted(([a], [b]) => a.localeCompare(b)));
}

/**
 * @param {string} cwd
 * @param {string[]} args
 */
function git(cwd, args) {
  return spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
}

/** @param {string} outDir */
function trackedFiles(outDir) {
  const top = git(outDir, ["rev-parse", "--show-toplevel"]);
  if (top.status !== 0 || realpathSync(top.stdout.trim()) !== realpathSync(outDir)) {
    throw new ExportError(`${outDir} isn't the root of a git clone. Clone the target repo first.`);
  }
  return git(outDir, ["ls-files", "-z"]).stdout.split("\0").filter(Boolean);
}

/**
 * The git folder shared by every worktree of a repo, or undefined outside one.
 * @param {string} dir
 */
function gitCommonDir(dir) {
  const result = git(dir, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  return result.status === 0 ? realpathSync(result.stdout.trim()) : undefined;
}

/**
 * True when `path` is `folder` or inside it.
 * @param {string} path
 * @param {string} folder
 */
const inside = (path, folder) => path === folder || path.startsWith(folder + sep);

/**
 * The export deletes tracked files it doesn't produce, so it must never point at the core repo (or a worktree of it),
 * a folder inside it, or a folder that holds it.
 * @param {string} outDir
 * @param {string} root
 */
function refuseCoreRepo(outDir, root) {
  const out = realpathSync(outDir);
  const core = realpathSync(root);
  const coreGit = gitCommonDir(core);
  if (inside(out, core) || inside(core, out) || (coreGit && coreGit === gitCommonDir(out))) {
    throw new ExportError(
      `${outDir} is the core repo, or overlaps it. Export into a separate clone of the template repo.`,
    );
  }
}

/**
 * Tracked files with uncommitted changes, which a write could overwrite or delete.
 * @param {string} outDir
 */
function dirtyFiles(outDir) {
  return git(outDir, ["status", "--porcelain", "--untracked-files=no"])
    .stdout.split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3));
}

/** @param {string} path */
function present(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * The core SHA and date pinned in a clone's ci.yml, if any.
 * @param {string} outDir
 */
export function existingPin(outDir) {
  const ci = join(outDir, ".github", "workflows", "ci.yml");
  if (!existsSync(ci)) return undefined;
  const match = /@([0-9a-f]{40}) # main as of (\d{4}-\d{2}-\d{2})/.exec(readFileSync(ci, "utf8"));
  return match?.[1] && match[2] ? { sha: match[1], date: match[2] } : undefined;
}

/**
 * @param {{ target: string, outDir: string, check: boolean, force?: boolean, root?: string, sha?: string,
 *   date?: string }} options
 * @param {(line: string) => void} print
 * @returns {number} the exit code
 */
export function exportTemplate(
  { target, outDir, check, force = false, root = coreRoot, sha, date },
  print,
) {
  const spec = targets[target];
  if (!spec) {
    throw new ExportError(
      `Unknown target "${target}". Targets: ${Object.keys(targets).join(", ")}.`,
    );
  }
  if (!existsSync(outDir))
    throw new ExportError(`${outDir} doesn't exist. Clone the target repo first.`);
  refuseCoreRepo(outDir, root);
  const tracked = trackedFiles(outDir);

  // Only the SDK targets pin the core (the .github target has no workflows).
  let pin = check || !spec.sdk ? existingPin(outDir) : undefined;
  if (!pin && !spec.sdk) pin = { sha: "", date: "" };
  if (!pin) {
    let pinSha = sha;
    if (!pinSha) {
      const head = git(root, ["rev-parse", "origin/main"]);
      if (head.status !== 0) {
        throw new ExportError(
          "Can't read the core's origin/main. Run `git fetch` in the core repo first.",
        );
      }
      pinSha = head.stdout.trim();
    }
    pin = { sha: pinSha, date: date ?? localDate() };
  }

  const tree = buildTree(target, { root, ...pin });
  /** @type {string[]} */
  const drift = [];
  for (const [path, file] of tree) {
    const dest = join(outDir, path);
    if (!existsSync(dest)) {
      drift.push(`missing  ${path}`);
    } else {
      const current = readOut(dest);
      if (current.content !== file.content) drift.push(`differs  ${path}`);
      // Windows checkouts don't carry the executable bit; git does, so only compare it where it means something.
      else if (process.platform !== "win32" && current.executable !== file.executable) {
        drift.push(`mode     ${path}`);
      }
    }
  }
  // git ls-files still lists a removal that isn't committed, so only files still on disk are stale.
  const stale = tracked.filter((path) => !tree.has(path) && present(join(outDir, path)));
  for (const path of stale) drift.push(`stale    ${path}`);

  if (check) {
    for (const line of drift) print(line);
    print(
      drift.length === 0
        ? `${target}: ${outDir} matches the export.`
        : `${target}: ${outDir} differs from the export (${String(drift.length)} file(s)). Run without --check, then commit with -s.`,
    );
    return drift.length === 0 ? 0 : 1;
  }

  const dirty = dirtyFiles(outDir);
  if (dirty.length > 0 && !force) {
    throw new ExportError(
      `${outDir} has uncommitted changes to tracked files (${dirty.join(", ")}), which the export could overwrite or delete. Commit or stash them, or pass --force to discard them.`,
    );
  }
  for (const [path, file] of tree) {
    const dest = join(outDir, path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, file.content);
    chmodSync(dest, file.executable ? 0o755 : 0o644);
  }
  for (const path of stale) rmSync(join(outDir, path), { force: true });
  for (const line of drift) print(line);
  print(
    `${target}: wrote ${String(tree.size)} file(s) to ${outDir}${spec.sdk ? `, pinned to ${pin.sha} (${pin.date})` : ""}. Review the diff there, then commit with -s.`,
  );
  return 0;
}

/**
 * @param {string[]} argv
 * @param {(line: string) => void} print
 */
export function main(argv, print) {
  try {
    const check = argv.includes("--check");
    const force = argv.includes("--force");
    if (check && force) throw new ExportError("--check never writes, so it takes no --force.");
    const positional = argv.filter((arg) => arg !== "--check" && arg !== "--force");
    const unknown = positional.find((arg) => arg.startsWith("--"));
    if (unknown) throw new ExportError(`Unknown option ${unknown}.`);
    const [target, outDir] = positional;
    if (!target || !outDir || positional.length !== 2) {
      throw new ExportError(
        `Usage: node tooling/scripts/export-template.mjs <${Object.keys(targets).join("|")}> <out-dir> [--check | --force]`,
      );
    }
    return exportTemplate({ target, outDir: resolve(outDir), check, force }, print);
  } catch (error) {
    if (error instanceof ExportError) {
      print(error.message);
      return 2;
    }
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  process.exitCode = main(process.argv.slice(2), (line) => {
    console.log(line);
  });
}
