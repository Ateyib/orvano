// Spec 0010 SET-4, RUL-1 to RUL-3, ORG-1, AC-8: github-settings.mjs against a fake GitHub API (no network).
// The fake keeps state, so --apply is proven by the check that follows it.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  actionsAppId,
  diffOrg,
  main,
  parseArgs,
  profiles,
  subsetDiff,
} from "./github-settings.mjs";

const repo = "orvanohq/orvano";

/** @param {string} name */
function profile(name) {
  const found = profiles[name];
  assert.ok(found, `profile ${name}`);
  return found;
}

/**
 * A live repo that matches a profile exactly, as GitHub would return it (with server fields added). Loosely typed,
 * since tests change it freely.
 * @param {string} name
 * @returns {any}
 */
function matchingState(name) {
  const p = profile(name);
  return {
    repo: {
      ...p.repo,
      private: false,
      id: 1,
      full_name: repo,
      security_and_analysis: {
        secret_scanning: { status: "enabled" },
        secret_scanning_push_protection: { status: "enabled" },
        dependabot_security_updates: { status: "enabled" },
      },
    },
    /** @type {any[]} */
    rulesets: [
      {
        ...structuredClone(p.ruleset),
        id: 42,
        source: repo,
        source_type: "Repository",
        node_id: "RRS_1",
        _links: { self: { href: "x" } },
        created_at: "2026-10-16T00:00:00Z",
        updated_at: "2026-10-16T00:00:00Z",
        current_user_can_bypass: "never",
      },
    ],
    labels: [
      ...p.labels.map((l) => ({ ...l, id: 1, default: false })),
      { name: "documentation", color: "0075ca", description: "Docs", id: 2, default: true },
    ],
    dependabotAlerts: true,
    dependabotSecurityUpdates: true,
    privateVulnerabilityReporting: true,
    actionsEnabled: p.actions?.enabled ?? true,
    defaultSetup: "not-configured",
    categories:
      p.discussionCategories?.map((c) => Object.assign({}, c, { slug: c.name.toLowerCase() })) ??
      [],
    org: {
      two_factor_requirement_enabled: true,
      sha_pinning_required: true,
      default_workflow_permissions: "read",
      can_approve_pull_request_reviews: false,
    },
  };
}

/** @param {unknown} data */
const ok = (data) => ({ status: 200, data });

/**
 * A fake `gh api` over a state object. Records every call.
 * @param {ReturnType<typeof matchingState>} state
 */
function fakeApi(state) {
  /** @type {{ method: string, path: string, body?: any }[]} */
  const calls = [];
  /** @type {import("./github-settings.mjs").Api} */
  const api = (method, path, rawBody) => {
    const body = /** @type {any} */ (rawBody);
    calls.push({ method, path, body });
    const r = `repos/${repo}`;
    const isPrivate = state.repo.private;
    switch (`${method} ${path}`) {
      case `GET ${r}`:
        return ok(state.repo);
      case `PATCH ${r}`: {
        const { security_and_analysis: analysis, ...rest } = body;
        Object.assign(state.repo, rest);
        if (analysis) Object.assign(state.repo.security_and_analysis, analysis);
        return ok(state.repo);
      }
      case `GET ${r}/rulesets?includes_parents=false`:
        if (isPrivate) return { status: 403, data: { message: "Upgrade to GitHub Pro" } };
        return ok(state.rulesets.map((/** @type {any} */ s) => ({ id: s.id, name: s.name })));
      case `POST ${r}/rulesets`:
        state.rulesets.push({ ...body, id: 99 });
        return ok(body);
      case `GET ${r}/labels?per_page=100`:
        return ok(state.labels);
      case `POST ${r}/labels`:
        state.labels.push(body);
        return { status: 201, data: body };
      case `GET ${r}/vulnerability-alerts`:
        return { status: state.dependabotAlerts ? 204 : 404, data: null };
      case `PUT ${r}/vulnerability-alerts`:
        state.dependabotAlerts = true;
        return { status: 204, data: null };
      case `GET ${r}/automated-security-fixes`:
        return ok({ enabled: state.dependabotSecurityUpdates, paused: false });
      case `PUT ${r}/automated-security-fixes`:
        state.dependabotSecurityUpdates = true;
        return { status: 204, data: null };
      case `GET ${r}/private-vulnerability-reporting`:
        return ok({ enabled: state.privateVulnerabilityReporting });
      case `PUT ${r}/private-vulnerability-reporting`:
        state.privateVulnerabilityReporting = true;
        return { status: 204, data: null };
      case `GET ${r}/actions/permissions`:
        return ok({ enabled: state.actionsEnabled, allowed_actions: "all" });
      case `PUT ${r}/actions/permissions`:
        state.actionsEnabled = body.enabled;
        return { status: 204, data: null };
      case `GET ${r}/code-scanning/default-setup`:
        if (isPrivate)
          return { status: 403, data: { message: "Advanced Security must be enabled" } };
        return ok({ state: state.defaultSetup, languages: [] });
      case `PATCH ${r}/code-scanning/default-setup`:
        state.defaultSetup = body.state;
        return ok({});
      case "POST graphql":
        return ok({
          data: { repository: { discussionCategories: { nodes: state.categories } } },
        });
      case "GET orgs/orvanohq":
        return ok({
          login: "orvanohq",
          two_factor_requirement_enabled: state.org.two_factor_requirement_enabled,
        });
      case "GET orgs/orvanohq/actions/permissions":
        return ok({
          enabled_repositories: "all",
          sha_pinning_required: state.org.sha_pinning_required,
        });
      case "GET orgs/orvanohq/actions/permissions/workflow":
        return ok({
          default_workflow_permissions: state.org.default_workflow_permissions,
          can_approve_pull_request_reviews: state.org.can_approve_pull_request_reviews,
        });
      default: {
        const ruleset = /^(GET|PUT) repos\/[^/]+\/[^/]+\/rulesets\/(\d+)$/.exec(
          `${method} ${path}`,
        );
        if (ruleset) {
          const index = state.rulesets.findIndex(
            (/** @type {any} */ s) => String(s.id) === ruleset[2],
          );
          if (index < 0) return { status: 404, data: { message: "Not Found" } };
          if (method === "PUT") state.rulesets[index] = { ...body, id: state.rulesets[index].id };
          return ok(state.rulesets[index]);
        }
        const label = /^PATCH repos\/[^/]+\/[^/]+\/labels\/(.+)$/.exec(`${method} ${path}`);
        if (label) {
          const found = state.labels.find(
            (/** @type {any} */ l) => l.name === decodeURIComponent(label[1] ?? ""),
          );
          if (found) Object.assign(found, body);
          return ok(found);
        }
        return { status: 404, data: { message: `fake has no route for ${method} ${path}` } };
      }
    }
  };
  return { api, calls };
}

/**
 * @param {string[]} argv
 * @param {ReturnType<typeof matchingState>} state
 */
function run(argv, state) {
  const { api, calls } = fakeApi(state);
  /** @type {string[]} */
  const lines = [];
  const code = main(argv, api, (line) => lines.push(line));
  return { code, out: lines.join("\n"), calls };
}

const writes = (/** @type {{ method: string }[]} */ calls) =>
  calls.filter(
    (c) => c.method !== "GET" && !(c.method === "POST" && "path" in c && c.path === "graphql"),
  );

describe("profiles", () => {
  test("core requires the four RUL-3 checks, each pinned to the GitHub Actions app", () => {
    const rules = /** @type {any[]} */ (profile("core").ruleset.rules);
    const checks = rules.find((r) => r.type === "required_status_checks").parameters;
    assert.deepEqual(
      checks.required_status_checks.map((/** @type {{ context: string }} */ c) => c.context),
      ["ci-gate", "analyze (csharp)", "analyze (javascript-typescript)", "dependency-review"],
    );
    assert.ok(
      checks.required_status_checks.every(
        (/** @type {any} */ c) => c.integration_id === actionsAppId,
      ),
    );
    assert.equal(checks.strict_required_status_checks_policy, true);
  });

  test("every SDK profile requires ci-gate and dependency-review, Dart has no CodeQL", () => {
    /** @type {Record<string, string[]>} */
    const want = {
      "sdk-dotnet": ["ci-gate", "analyze (csharp)", "dependency-review"],
      "sdk-typescript": ["ci-gate", "analyze (javascript-typescript)", "dependency-review"],
      "sdk-dart": ["ci-gate", "dependency-review"],
    };
    for (const [name, checks] of Object.entries(want)) {
      const rules = /** @type {any[]} */ (profile(name).ruleset.rules);
      const got = rules
        .find((r) => r.type === "required_status_checks")
        .parameters.required_status_checks.map((/** @type {{ context: string }} */ c) => c.context);
      assert.deepEqual(got, checks, name);
    }
  });

  test("template and org-github keep only deletion and non_fast_forward, with Actions off", () => {
    for (const name of ["template", "org-github"]) {
      const p = profile(name);
      const types = /** @type {any[]} */ (p.ruleset.rules).map((r) => r.type);
      assert.deepEqual(types, ["deletion", "non_fast_forward"], name);
      assert.deepEqual(p.actions, { enabled: false });
      assert.equal(p.repo.has_issues, false);
    }
    assert.equal(profile("template").repo.is_template, true);
  });

  test("every profile: no bypass, squash only, sign off on web commits (RUL-1, SET-1)", () => {
    for (const p of Object.values(profiles)) {
      assert.deepEqual(p.ruleset.bypass_actors, [], p.name);
      assert.equal(p.ruleset.enforcement, "active");
      assert.equal(p.repo.allow_merge_commit, false);
      assert.equal(p.repo.allow_rebase_merge, false);
      assert.equal(p.repo.squash_merge_commit_message, "COMMIT_MESSAGES");
      assert.equal(p.repo.web_commit_signoff_required, true);
      const pr = /** @type {any[]} */ (p.ruleset.rules).find((r) => r.type === "pull_request");
      if (pr) {
        assert.deepEqual(pr.parameters.allowed_merge_methods, ["squash"]);
        assert.equal(pr.parameters.required_approving_review_count, 0);
      }
    }
  });

  test("only core has Discussions, with exactly the ISS-4 categories", () => {
    assert.deepEqual(
      profile("core").discussionCategories?.map((c) => c.name),
      ["Announcements", "Q&A", "Ideas", "Show and tell"],
    );
    for (const name of ["sdk-dotnet", "sdk-typescript", "sdk-dart"]) {
      assert.equal(profile(name).repo.has_discussions, false);
    }
  });
});

describe("subsetDiff", () => {
  test("ignores fields the profile doesn't name and server fields", () => {
    /** @type {any[]} */
    const out = [];
    subsetDiff(
      { a: 1, b: { c: [1, 2] } },
      { a: 1, extra: true, id: 7, b: { c: [1, 2], d: 3 } },
      "x",
      out,
    );
    assert.deepEqual(out, []);
  });

  test("reports a changed value, a longer array, and a missing object with their paths", () => {
    /** @type {any[]} */
    const out = [];
    subsetDiff(
      { a: 1, list: [], o: { k: true } },
      { a: 2, list: [{ actor_id: 5 }], o: null },
      "x",
      out,
    );
    assert.deepEqual(
      out.map((d) => d.field),
      ["x.a", "x.list", "x.o"],
    );
  });
});

describe("check mode", () => {
  for (const name of Object.keys(profiles)) {
    test(`a repo matching the ${name} profile exits 0 and writes nothing`, () => {
      const result = run([repo, "--profile", name], matchingState(name));
      assert.equal(result.code, 0, result.out);
      assert.match(result.out, new RegExp(`matches the ${name} profile`));
      assert.deepEqual(writes(result.calls), []);
    });
  }

  test("status checks and rules in another order are not drift", () => {
    const state = matchingState("core");
    const set = state.rulesets[0];
    set.rules.reverse();
    set.rules
      .find((/** @type {any} */ r) => r.type === "required_status_checks")
      .parameters.required_status_checks.reverse();
    const result = run([repo, "--profile", "core"], state);
    assert.equal(result.code, 0, result.out);
  });

  test("merge commits turned on by hand is drift, named by field (AC-8)", () => {
    const state = matchingState("core");
    state.repo.allow_merge_commit = true;
    const result = run([repo, "--profile", "core"], state);
    assert.equal(result.code, 1);
    assert.match(result.out, /drift {2}repo\.allow_merge_commit: want false, got true/);
  });

  for (const [what, change, field] of /** @type {[string, (s: any) => void, RegExp][]} */ ([
    [
      "a bypass actor",
      (s) => s.rulesets[0].bypass_actors.push({ actor_id: 5, actor_type: "OrganizationAdmin" }),
      /ruleset\.bypass_actors/,
    ],
    [
      "a dropped required check",
      (s) =>
        s.rulesets[0].rules
          .find((/** @type {any} */ r) => r.type === "required_status_checks")
          .parameters.required_status_checks.pop(),
      /required_status_checks/,
    ],
    [
      "a check from another app",
      (s) => {
        s.rulesets[0].rules.find(
          (/** @type {any} */ r) => r.type === "required_status_checks",
        ).parameters.required_status_checks[0].integration_id = 1;
      },
      /integration_id/,
    ],
    [
      "an extra rule",
      (s) => s.rulesets[0].rules.push({ type: "creation" }),
      /ruleset\.rules\.creation: want "absent"/,
    ],
    [
      "enforcement off",
      (s) => {
        s.rulesets[0].enforcement = "disabled";
      },
      /ruleset\.enforcement/,
    ],
    [
      "merge allowed by the PR rule",
      (s) => {
        s.rulesets[0].rules
          .find((/** @type {any} */ r) => r.type === "pull_request")
          .parameters.allowed_merge_methods.push("merge");
      },
      /allowed_merge_methods/,
    ],
    [
      "the main ruleset missing",
      (s) => {
        s.rulesets = [];
      },
      /ruleset\.main: want "present", got "absent"/,
    ],
    [
      "a second ruleset",
      (s) => s.rulesets.push({ id: 7, name: "temp", rules: [] }),
      /ruleset "temp".*delete it by hand/,
    ],
    [
      "secret scanning off",
      (s) => {
        s.repo.security_and_analysis.secret_scanning.status = "disabled";
      },
      /security\.secret_scanning/,
    ],
    [
      "Dependabot alerts off",
      (s) => {
        s.dependabotAlerts = false;
      },
      /security\.dependabot_alerts/,
    ],
    [
      "Dependabot security updates off",
      (s) => {
        s.dependabotSecurityUpdates = false;
      },
      /security\.dependabot_security_updates/,
    ],
    [
      "private reporting off",
      (s) => {
        s.privateVulnerabilityReporting = false;
      },
      /security\.private_vulnerability_reporting/,
    ],
    [
      "a missing label",
      (s) => {
        s.labels = s.labels.filter((/** @type {any} */ l) => l.name !== "triage");
      },
      /labels\.triage/,
    ],
    [
      "a recolored label",
      (s) => {
        s.labels[0].color = "000000";
      },
      /labels\.bug/,
    ],
    [
      "CodeQL default setup on",
      (s) => {
        s.defaultSetup = "configured";
      },
      /code_scanning\.default_setup/,
    ],
    [
      "the General category",
      (s) => s.categories.push({ name: "General", isAnswerable: false }),
      /discussions\.categories.*by hand/,
    ],
  ])) {
    test(`${what} is drift`, () => {
      const state = matchingState("core");
      change(state);
      const result = run([repo, "--profile", "core"], state);
      assert.equal(result.code, 1, result.out);
      assert.match(result.out, field);
    });
  }

  test("extra labels are left alone", () => {
    const state = matchingState("core");
    state.labels.push({
      name: "good first issue",
      color: "7057ff",
      description: "",
      id: 9,
      default: true,
    });
    assert.equal(run([repo, "--profile", "core"], state).code, 0);
  });

  test("Actions on in a template repo is drift", () => {
    const state = matchingState("template");
    state.actionsEnabled = true;
    const result = run([repo, "--profile", "template"], state);
    assert.equal(result.code, 1);
    assert.match(result.out, /actions\.enabled: want false, got true/);
  });

  test("on a private repo the four needsPublic fields wait for public instead of drifting (OPN-1 item 6)", () => {
    const state = matchingState("core");
    state.repo.private = true;
    delete (/** @type {any} */ (state.repo).security_and_analysis);
    state.rulesets = [];
    state.privateVulnerabilityReporting = false;
    const result = run([repo, "--profile", "core"], state);
    assert.equal(result.code, 0, result.out);
    const waiting = result.out.split("\n").filter((line) => line.startsWith("waiting for public"));
    assert.deepEqual(
      waiting.map((line) => /waiting for public {2}([^:]+):/.exec(line)?.[1]),
      [
        "security.secret_scanning",
        "security.push_protection",
        "security.private_vulnerability_reporting",
        "ruleset.main",
      ],
    );
  });
});

describe("--apply", () => {
  test("writes every difference, then checks again and exits 0", () => {
    const state = matchingState("core");
    state.repo.allow_merge_commit = true;
    state.repo.has_wiki = true;
    state.repo.security_and_analysis.secret_scanning_push_protection.status = "disabled";
    state.dependabotAlerts = false;
    state.dependabotSecurityUpdates = false;
    state.privateVulnerabilityReporting = false;
    state.rulesets[0].bypass_actors = [{ actor_id: 5, actor_type: "OrganizationAdmin" }];
    state.labels = state.labels.filter((/** @type {any} */ l) => l.name !== "triage");
    state.labels[0] = { ...state.labels[0], color: "ffffff" };
    state.defaultSetup = "configured";
    const result = run([repo, "--profile", "core", "--apply"], state);
    assert.equal(result.code, 0, result.out);
    const patch = result.calls.find((c) => c.method === "PATCH" && c.path === `repos/${repo}`);
    assert.deepEqual(patch?.body, {
      allow_merge_commit: false,
      has_wiki: false,
      security_and_analysis: { secret_scanning_push_protection: { status: "enabled" } },
    });
    assert.ok(
      result.calls.some((c) => c.method === "PUT" && c.path === `repos/${repo}/rulesets/42`),
    );
    assert.deepEqual(state.rulesets[0].bypass_actors, []);
  });

  test("creates the main ruleset when there is none", () => {
    const state = matchingState("sdk-dart");
    state.rulesets = [];
    const result = run([repo, "--profile", "sdk-dart", "--apply"], state);
    assert.equal(result.code, 0, result.out);
    assert.ok(result.calls.some((c) => c.method === "POST" && c.path === `repos/${repo}/rulesets`));
  });

  test("turns Actions off for a template", () => {
    const state = matchingState("template");
    state.actionsEnabled = true;
    const result = run([repo, "--profile", "template", "--apply"], state);
    assert.equal(result.code, 0, result.out);
    assert.equal(state.actionsEnabled, false);
  });

  test("never deletes a second ruleset or edits Discussions categories, so it still exits 1", () => {
    const state = matchingState("core");
    state.rulesets.push({ id: 7, name: "temp", rules: [] });
    state.categories.push({ name: "Polls", isAnswerable: false, slug: "polls" });
    const result = run([repo, "--profile", "core", "--apply"], state);
    assert.equal(result.code, 1);
    assert.deepEqual(writes(result.calls), []);
    assert.equal(state.rulesets.length, 2);
  });

  test("skips needsPublic fields on a private repo", () => {
    const state = matchingState("core");
    state.repo.private = true;
    state.rulesets = [];
    state.privateVulnerabilityReporting = false;
    const result = run([repo, "--profile", "core", "--apply"], state);
    assert.equal(result.code, 0, result.out);
    assert.deepEqual(writes(result.calls), []);
  });
});

describe("--org", () => {
  test("an org matching ORG-1 exits 0", () => {
    const result = run(["--org", "orvanohq"], matchingState("core"));
    assert.equal(result.code, 0, result.out);
  });

  test("a writable workflow token is drift", () => {
    const state = matchingState("core");
    state.org.default_workflow_permissions = "write";
    const result = run(["--org", "orvanohq"], state);
    assert.equal(result.code, 1);
    assert.match(result.out, /org\.default_workflow_permissions: want "read", got "write"/);
  });

  test("a field the API doesn't return becomes a manual tick, not drift", () => {
    const diff = diffOrg({
      two_factor_requirement_enabled: true,
      default_workflow_permissions: "read",
      can_approve_pull_request_reviews: false,
    });
    assert.equal(diff.length, 1);
    assert.match(diff[0]?.manual ?? "", /verify\.md/);
    const state = matchingState("core");
    /** @type {any} */ (state.org).sha_pinning_required = undefined;
    assert.equal(run(["--org", "orvanohq"], state).code, 0);
  });

  test("a token without admin:org exits 2 with the fix", () => {
    const state = matchingState("core");
    const { api } = fakeApi(state);
    /** @type {string[]} */
    const lines = [];
    const code = main(
      ["--org", "orvanohq"],
      (method, path) =>
        path === "orgs/orvanohq/actions/permissions"
          ? { status: 403, data: {} }
          : api(method, path),
      (line) => lines.push(line),
    );
    assert.equal(code, 2);
    assert.match(lines.join("\n"), /gh auth refresh -s admin:org/);
  });

  test("--org with --apply is refused", () => {
    assert.equal(run(["--org", "orvanohq", "--apply"], matchingState("core")).code, 2);
  });
});

describe("arguments", () => {
  test("an unknown profile exits 2", () => {
    const result = run([repo, "--profile", "nope"], matchingState("core"));
    assert.equal(result.code, 2);
    assert.match(result.out, /Unknown profile "nope"/);
  });

  test("a missing profile or repo prints usage and exits 2", () => {
    assert.equal(run([repo], matchingState("core")).code, 2);
    assert.equal(run(["--profile", "core"], matchingState("core")).code, 2);
  });

  test("an unknown option exits 2", () => {
    assert.equal(run([repo, "--profile", "core", "--force"], matchingState("core")).code, 2);
  });

  test("parses the flags", () => {
    assert.deepEqual(parseArgs([repo, "--profile", "core", "--apply"]), {
      apply: true,
      repo,
      profile: "core",
    });
  });
});
