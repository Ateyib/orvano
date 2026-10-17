// Spec 0008 HOK-2: the pre-commit hook hands staged C# paths to format-cs.mjs. A fake `dotnet` on PATH records each
// call, so these check the paths and chunks without formatting anything.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { after, describe, test } from "node:test";

const script = join(import.meta.dirname, "format-cs.mjs");

describe(
  "format-cs.mjs",
  { skip: process.platform === "win32" && "the fake dotnet is a shell script" },
  () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "orvano-format-cs-")));
    const bin = join(dir, "bin");
    const calls = join(dir, "calls.log");
    mkdirSync(bin);
    mkdirSync(join(dir, "server"));
    // Logs the working folder and every argument, one per line, then exits with $FAKE_EXIT.
    writeFileSync(
      join(bin, "dotnet"),
      `#!/bin/sh\n{ echo "cwd=$PWD"; for arg in "$@"; do echo "$arg"; done; echo "--end--"; } >> "${calls}"\nexit "\${FAKE_EXIT:-0}"\n`,
    );
    chmodSync(join(bin, "dotnet"), 0o755);
    after(() => rmSync(dir, { recursive: true, force: true }));

    /**
     * @param {string[]} files
     * @param {Record<string, string>} [env]
     */
    const run = (files, env = {}) => {
      writeFileSync(calls, "");
      const result = spawnSync("node", [script, ...files], {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, ...env, PATH: `${bin}${delimiter}${process.env.PATH ?? ""}` },
      });
      const invocations = readFileSync(calls, "utf8")
        .split("--end--\n")
        .filter(Boolean)
        .map((block) => {
          const [cwd = "", ...args] = block.trimEnd().split("\n");
          return { cwd: cwd.replace(/^cwd=/, ""), args };
        });
      return { status: result.status, invocations };
    };

    const prefix = ["format", "whitespace", ".", "--folder", "--include"];

    test("runs dotnet format in server/ with paths relative to it", () => {
      const { status, invocations } = run([
        "server/src/Orvano.Host/Program.cs",
        join(dir, "server", "tests", "A.cs"),
      ]);
      assert.equal(status, 0);
      assert.deepEqual(invocations, [
        {
          cwd: join(dir, "server"),
          args: [...prefix, "src/Orvano.Host/Program.cs", "tests/A.cs"],
        },
      ]);
    });

    test("skips paths outside server/", () => {
      const { status, invocations } = run([
        "tooling/starters/dotnet/Sample.cs",
        "../elsewhere/B.cs",
        "server/C.cs",
      ]);
      assert.equal(status, 0);
      assert.deepEqual(
        invocations.map((call) => call.args),
        [[...prefix, "C.cs"]],
      );
    });

    test("does not call dotnet when no path is under server/", () => {
      const { status, invocations } = run(["sdk/Thing.cs"]);
      assert.equal(status, 0);
      assert.deepEqual(invocations, []);
    });

    test("splits paths into chunks of 50", () => {
      const files = Array.from({ length: 120 }, (_, index) => `server/src/File${String(index)}.cs`);
      const { status, invocations } = run(files);
      assert.equal(status, 0);
      assert.deepEqual(
        invocations.map((call) => call.args.length - prefix.length),
        [50, 50, 20],
      );
      assert.equal(invocations[0]?.args.at(-1), "src/File49.cs");
      assert.equal(invocations[2]?.args.at(-1), "src/File119.cs");
    });

    test("stops at the first failing chunk and passes its exit code on", () => {
      const files = Array.from({ length: 60 }, (_, index) => `server/F${String(index)}.cs`);
      const { status, invocations } = run(files, { FAKE_EXIT: "3" });
      assert.equal(status, 3);
      assert.equal(invocations.length, 1);
    });
  },
);
