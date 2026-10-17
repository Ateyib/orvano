// Spec 0010 DCO-1, DCO-2, spec 0009 CTB-1 to CTB-3: the dco job's inline script, run exactly as written in
// repo-hygiene.yml (the whole `run:` block, through bash) against a local stub of the PR commits endpoint.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

const root = join(import.meta.dirname, "..", "..");
const read = (/** @type {string} */ path) => readFileSync(join(root, path), "utf8");
const hygiene = read(".github/workflows/repo-hygiene.yml");

/** The dco job's text, from its `dco:` key to the next job. */
function dcoJob() {
  const start = hygiene.indexOf("\n  dco:\n");
  assert.ok(start >= 0, "repo-hygiene.yml has a dco job");
  const end = hygiene.indexOf("\n  workflows:\n", start);
  return hygiene.slice(start, end);
}

/** The `run: |` block of the dco job's step, with its YAML indentation removed. */
function runBlock() {
  const lines = dcoJob().split("\n");
  const at = lines.findIndex((line) => line.trim() === "run: |");
  assert.ok(at >= 0, "the dco step has a run block");
  const body = [];
  for (const line of lines.slice(at + 1)) {
    if (line.trim() !== "" && !line.startsWith("          ")) break;
    body.push(line.slice(10));
  }
  return body.join("\n");
}

const script = runBlock();

/**
 * @typedef {{ sha: string, parents: { sha: string }[], author: { type: string } | null,
 *   commit: { author: { email: string }, message: string } }} ApiCommit
 */

/**
 * @param {{ sha?: string, email?: string, message?: string, parents?: number, bot?: boolean, linked?: boolean }} options
 * @returns {ApiCommit}
 */
function commit({
  sha = "a".repeat(40),
  email = "dev@example.com",
  message = "feat: add a thing\n\nSigned-off-by: Dev <dev@example.com>",
  parents = 1,
  bot = false,
  linked = true,
} = {}) {
  return {
    sha,
    parents: Array.from({ length: parents }, (_, i) => ({ sha: `p${String(i)}` })),
    author: linked ? { type: bot ? "Bot" : "User" } : null,
    commit: { author: { email }, message },
  };
}

/** @param {number} n */
const sha = (n) => n.toString(16).padStart(40, "0");

/** @type {ApiCommit[]} */
let served = [];
let status = 200;
/** @type {{ url: string, authorization: string | undefined, accept: string | undefined }[]} */
const requests = [];

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://stub");
  requests.push({
    url: url.pathname + url.search,
    authorization: req.headers.authorization,
    accept: req.headers.accept,
  });
  if (url.pathname !== "/repos/orvanohq/demo/pulls/7/commits" || status !== 200) {
    res.writeHead(status === 200 ? 404 : status).end("{}");
    return;
  }
  const perPage = Number(url.searchParams.get("per_page"));
  const page = Number(url.searchParams.get("page"));
  // Like GitHub, the endpoint never returns more than 250 commits in total.
  const visible = served.slice(0, 250);
  res
    .writeHead(200, { "content-type": "application/json" })
    .end(JSON.stringify(visible.slice((page - 1) * perPage, page * perPage)));
});

/** @type {string} */
let api = "";

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  api = `http://127.0.0.1:${String(address.port)}`;
});

after(() => {
  server.close();
});

/**
 * Runs the run block the way Actions does (`bash -e`), against the stub.
 * @param {ApiCommit[]} commits
 * @param {{ count?: number, httpStatus?: number }} options
 * @returns {Promise<{ code: number | null, out: string }>}
 */
function runDco(commits, { count = commits.length, httpStatus = 200 } = {}) {
  served = commits;
  status = httpStatus;
  requests.length = 0;
  return new Promise((resolve, reject) => {
    const child = spawn("bash", ["-e", "-c", script], {
      env: {
        PATH: process.env.PATH,
        GITHUB_API_URL: api,
        GH_TOKEN: "test-token",
        REPO: "orvanohq/demo",
        PR_NUMBER: "7",
        COMMIT_COUNT: String(count),
      },
    });
    let out = "";
    child.stdout.on("data", (/** @type {Buffer} */ chunk) => (out += chunk.toString()));
    child.stderr.on("data", (/** @type {Buffer} */ chunk) => (out += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, out });
    });
  });
}

describe("dco job wiring", () => {
  test("runs on pull requests only, with read only access to contents and PRs", () => {
    const job = dcoJob();
    assert.match(job, /^ {4}name: dco$/m);
    assert.match(job, /^ {4}if: github\.event_name == 'pull_request'$/m);
    assert.match(job, /^ {4}permissions:\n {6}contents: read\n {6}pull-requests: read\n/m);
    assert.doesNotMatch(
      job,
      /\$\{\{[^}]*(message|title|name)[^}]*\}\}/,
      "no untrusted text inline (CI-4)",
    );
  });

  for (const [path, job] of [
    [".github/workflows/ci.yml", "repo"],
    [".github/workflows/_repo.yml", "hygiene"],
    [".github/workflows/scheduled.yml", "ci"],
    ["tooling/starters/common/.github/workflows/ci.yml", "hygiene"],
  ]) {
    test(`${String(path)} grants pull-requests: read to its ${String(job)} job`, () => {
      const text = read(String(path));
      const block = text.slice(text.indexOf(`\n  ${String(job)}:\n`) + 1).split("\n\n")[0] ?? "";
      assert.match(block, /^ {6}pull-requests: read\b/m);
    });
  }
});

describe("dco script", () => {
  test("passes when every commit is signed off by its author", async () => {
    const result = await runDco([commit(), commit({ sha: sha(2) })]);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /2 commit\(s\) signed off, 0 skipped/);
    assert.equal(requests[0]?.authorization, "Bearer test-token");
    assert.equal(requests[0]?.accept, "application/vnd.github+json");
  });

  test("fails a commit with no sign off and prints its SHA and the fix", async () => {
    const result = await runDco([commit(), commit({ sha: sha(9), message: "fix: oops" })]);
    assert.equal(result.code, 1);
    assert.match(result.out, new RegExp(`::error::${sha(9)}: no Signed-off-by line`));
    assert.match(result.out, /git rebase --signoff origin\/main/);
    assert.match(result.out, /git push --force-with-lease/);
  });

  test("fails a sign off that doesn't match the author email", async () => {
    const result = await runDco([
      commit({
        email: "author@example.com",
        message: "x\n\nSigned-off-by: Other <other@example.com>",
      }),
    ]);
    assert.equal(result.code, 1);
    assert.match(result.out, /no Signed-off-by matches the author email author@example\.com/);
  });

  test("compares the key and the email case insensitively, and ignores the name", async () => {
    const result = await runDco([
      commit({
        email: "Dev@Example.com",
        message: "x\n\nsigned-OFF-by: Someone Else <DEV@example.COM>",
      }),
    ]);
    assert.equal(result.code, 0, result.out);
  });

  test("accepts extra sign offs and Co-authored-by trailers", async () => {
    const message =
      "x\n\nCo-authored-by: Pair <pair@example.com>\nSigned-off-by: Pair <pair@example.com>\nSigned-off-by: Dev <dev@example.com>";
    const result = await runDco([commit({ message })]);
    assert.equal(result.code, 0, result.out);
  });

  test("reads trailers from the last paragraph only", async () => {
    const message = "x\n\nSigned-off-by: Dev <dev@example.com>\n\nA later paragraph.";
    const result = await runDco([commit({ message })]);
    assert.equal(result.code, 1);
  });

  test("passes a message with a trailing newline and CRLF line endings", async () => {
    const result = await runDco([
      commit({ message: "x\r\n\r\nSigned-off-by: Dev <dev@example.com>\r\n" }),
    ]);
    assert.equal(result.code, 0, result.out);
  });

  test("skips commits by a Bot author", async () => {
    const result = await runDco([commit({ bot: true, message: "build(deps): bump x" }), commit()]);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /1 commit\(s\) signed off, 1 skipped/);
  });

  test("checks a commit whose email isn't linked to an account (null author)", async () => {
    const unsigned = await runDco([commit({ linked: false, message: "x" })]);
    assert.equal(unsigned.code, 1);
    const signed = await runDco([commit({ linked: false })]);
    assert.equal(signed.code, 0, signed.out);
  });

  test("skips merge commits", async () => {
    const result = await runDco([commit({ parents: 2, message: "Merge branch 'main'" }), commit()]);
    assert.equal(result.code, 0, result.out);
  });

  test("pages through every commit", async () => {
    const commits = Array.from({ length: 130 }, (_, i) => commit({ sha: sha(i + 1) }));
    commits[120] = commit({ sha: sha(121), message: "no sign off" });
    const result = await runDco(commits);
    assert.equal(result.code, 1);
    assert.match(result.out, new RegExp(sha(121)));
    assert.deepEqual(
      requests.map((r) => r.url),
      [
        "/repos/orvanohq/demo/pulls/7/commits?per_page=100&page=1",
        "/repos/orvanohq/demo/pulls/7/commits?per_page=100&page=2",
      ],
    );
  });

  test("fails a PR over 250 commits with 'split this PR', before reading them", async () => {
    const result = await runDco([commit()], { count: 251 });
    assert.equal(result.code, 1);
    assert.match(result.out, /split this PR/);
    assert.equal(requests.length, 0);
  });

  test("passes exactly 250 commits", async () => {
    const commits = Array.from({ length: 250 }, (_, i) => commit({ sha: sha(i + 1) }));
    const result = await runDco(commits);
    assert.equal(result.code, 0, result.out);
    assert.equal(requests.length, 3);
  });

  test("fails when the API call fails", async () => {
    const result = await runDco([commit()], { httpStatus: 403 });
    assert.equal(result.code, 1);
    assert.match(result.out, /HTTP 403/);
  });
});
