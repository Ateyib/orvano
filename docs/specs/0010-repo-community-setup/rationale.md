# 0010. Repo and community setup: rationale

The decision record behind [index.md](index.md). `/develop` reads `index.md`; this file is the why.

## Context

Orvano's core repo `orvanohq/orvano` exists on GitHub, private, with CI from spec 0008 already green (the Windows job included) and the license from spec 0009 in place. What's missing is everything that makes it a safe public project: a way to report vulnerabilities, contributor guidance, the `dco` check spec 0009 CTB-3 describes, a protected `main`, and the repo settings CTB-4 and spec 0006 SUP-4 ask for. Six SDK repos (spec 0007 REP-3) will follow, and spec 0008 KIT-2 promised they'd start from template repos.

The live state on 2026-10-16, read with `gh`: the org is on GitHub **Free** and has one member, `Atteprojects`. The repo allows merge commits and rebase merges, keeps branches after merge, uses "commit messages" for the squash body, and doesn't require web sign off. Discussions is off. Asking for rulesets returns 403 ("Upgrade to GitHub Pro or make this repository public"). CodeQL and dependency review are written to skip while the repo is private (spec 0008 CI-3), because on Free they need a public repo. So on this plan, protection and the security checks can't exist until the repo is public. The flip is a prerequisite of the feature, not an afterthought.

Two things in the history would become public with it. The first commit, `d551057`, has the author `the work email`, which looks like an employer address. And 412 tracked files under `.claude/skills/` and `.agents/skills/` are 51 third party agent skills from 22 source repos (per `skills-lock.json`), whose licenses haven't been checked; content with no license may not be republished. The repo also has three closed Dependabot PRs, whose `refs/pull/*/head` refs keep the old commits reachable even after a force push, and GitHub doesn't let users delete those refs.

The forces: a solo maintainer (no second reviewer exists, and GitHub never lets an author approve their own PR); a security first project that will hold other people's secrets, so its own repo hygiene is part of its credibility; seven or more repos that must stay configured alike; and a strong preference, from spec 0008 CI-4 and spec 0006 SUP-6, for nothing in CI holding broad write tokens. Not deciding leaves `main` unprotected, the security checks permanently skipped, and each SDK repo set up by memory.

## Options considered

### Option 1: Settings as code, ruleset, flip inside the feature, exported per language templates (chosen)

A Node script in the core holds a profile per repo kind and checks or applies it with the maintainer's own `gh` login. Each repo gets one repository ruleset. The core goes public inside this feature once a blocking checklist (history, skills, secrets, files) is clear. `tooling/starters/**` is exported into three per language template repos and an org `.github` repo.

**Pros**:

- One reviewed place for every setting, with drift shown by one command, across seven or more repos.
- Rulesets carry everything needed (squash only, linear, checks pinned to the Actions app, code scanning gating) and are free on public repos.
- Going public unlocks CodeQL, dependency review, push protection, and the ruleset at once, so the same day proofs show the whole control set working.
- Templates come ready to use, and the core stays the only place starter content is edited.

**Cons**:

- A script to own and keep current with GitHub's API.
- Every change to `main` needs a PR from then on, including small docs commits.
- Recreating the repo is a one time destructive step, with some lost run history.

### Option 2: A manual checklist in the UI, no script

Write the settings as a checklist in `CONTRIBUTING.md` or the spec, and click them in for each repo.

**Pros**:

- Nothing to build or maintain; the UI always matches GitHub's current options.
- Fastest for the core repo alone.

**Cons**:

- Seven or more repos set by hand drift, and nothing shows when they have.
- Easy to miss one toggle (push protection, web sign off) on a new SDK repo.

### Option 3: A third party settings tool (the Terraform GitHub provider, or a settings app)

Manage the org and repos with Terraform state, or install a GitHub App that syncs a `settings.yml`.

**Pros**:

- Mature drift detection, and plans before applying (Terraform).
- Org wide coverage, including teams and memberships.

**Cons**:

- Terraform brings state storage and a provider to pin and upgrade, which is a lot for one maintainer and a handful of repos.
- A settings app needs admin access to every repo, the kind of standing third party write access spec 0009 CTB-3 avoided for `dco`.

### Option 4: Stay private and pay for GitHub Team

Upgrade the org so rulesets (including org rulesets) work while private, and go public later.

**Pros**:

- Org rulesets cover every repo with one rule.
- No pressure to clean the history now.

**Cons**:

- CodeQL and dependency review still need GitHub Advanced Security on private repos, so the security checks keep skipping.
- A recurring cost for a project that will be public anyway, and the history cleanup only gets harder once SDK repos pin core SHAs.

## Rationale

Option 1 wins because the Free plan ties every protection to the repo being public. Delaying the flip (Option 4) or protecting only part of it (Option 2 on a private repo) leaves `main` and the security checks off for the very stage where the most setup churn happens. Doing the flip inside the feature, behind a checklist, means the one irreversible exposure happens once, after the only two known leaks (the work email and possibly unlicensed skills) are gone, and the same day proofs show the controls on a real PR.

Settings as code is the smallest thing that keeps seven or more repos alike. A script with profiles is a few hundred lines of Node, which fits the existing `tooling/scripts/*.mjs` pattern with `node --test`. It runs only with your own login, so no CI job ever holds an admin token (spec 0008 CI-4, spec 0006 SUP-6). Terraform (Option 3) solves a bigger problem than Orvano has and adds state to look after. A settings app gives a third party admin access everywhere. The manual checklist (Option 2) is what the script replaces once the second repo exists.

The sub decisions follow the same forces:

- **Reporting**: private vulnerability reporting gives reporters an advisory workflow and CVE requests with no inbox to secure, and the email fallback covers reporters without GitHub, plus the TMK-1 trademark contact that spec 0009 put in `SECURITY.md`. A project mailbox, not a personal one, so the address can be handed over. The 3, 7, and 90 day targets are what one person can keep, and 90 days is the common coordinated disclosure window. Pre 1.0 there are no backports, matching "no backwards compatibility until after beta".
- **Code of conduct**: Contributor Covenant 3.0 is the current version of the most recognised one, and community health checks look for it.
- **Ruleset settings**: 0 required approvals is the only setting under which a solo maintainer can merge their own PRs without a bypass. With that, there's no reason to keep any bypass, and a standing bypass is exactly what a stolen session would use. Strict "up to date" is cheap at this PR volume. Linear history and blocking force pushes match squash only. `dco` stays inside `ci-gate` (one required name per repo, and `ci-gate` already fails on it) instead of copying nested names like `repo / hygiene / dco` into every profile. Pinning checks to the Actions app stops another app's status from satisfying them. The CodeQL gate at high or worse makes CodeQL block, not just report, without the noise of `security-extended`'s lower findings.
- **History**: rewriting is cheapest now (no forks, no SDK repo pins a core SHA, no public links). The `refs/pull/*` refs make a force push alone leave the old commits reachable, so delete and recreate is the only clean way. The loss (39 runs, 3 closed bot PRs) is trivial.
- **Templates**: per language templates give a repo that's nearly ready after "Use this template" (merged files, filled `<lang>` and SHA, trimmed Dependabot), where one combined template would leave the same manual merge steps the starters README asks for today. An export script, not a syncing workflow, keeps the core the only source and puts no cross repo write token in CI. The org `.github` repo gives every SDK repo the security policy, conduct, support, and issue forms with zero copies to drift.
- **SDK scans**: spec 0006 SUP-2 and SUP-3 say every repo runs dependency review and CodeQL, but the starters had neither. Copying the core's reviewed workflows into the starters keeps one style, where default setup would split CI-3's "reviewed workflow file" rule.

The main risk is RUL-5: whether GitHub accepts CodeQL uploads from fork PRs and Dependabot PRs (both get a read only token by default). A code scanning merge rule waits for results, so a refused upload would leave a PR stuck with only an emergency ruleset edit to free it. That's why RUL-4 ships deferred: the `analyze` checks are required from day one, and the alert gate is added only after a fork PR and a Dependabot PR prove the upload works. The cross check on 2026-10-16 raised this, along with the private plan limits on secret scanning and private reporting, the `pull-requests: read` ceiling on the reusable workflow callers, and the trailers and file contents a mailmap alone wouldn't rewrite. All of them are folded into the rules.

## The bot skip (decided 2026-10-16, after the review)

The fresh model review (`docs/reviews/2026-10-16-review-repo-community-setup.md`) found that skipping every commit whose GitHub author has `type: "Bot"` can be faked. GitHub sets a commit's `author` to whichever account the author email maps to, and it never checks that the person pushing owns that email. A contributor who sets `user.email` to `49699333+dependabot[bot]@users.noreply.github.com` gets a `Bot` author and no sign off check. Nobody reproduced it live, but it follows from how GitHub links emails, so it is treated as real.

Options weighed:

- **Accept it as a residual risk.** No code. The maintainer reads and merges every PR. Rejected: the cost of closing the hole is a few lines and one test, and a sign off record with a known bypass is weaker evidence if someone ever asks where a contribution came from. A bot author on an outside PR is also easy to miss in review.
- **Also require the PR author to be a bot (chosen).** `pull_request.user` is the account that opened the PR, which no commit field can fake. Dependabot, Renovate, and Copilot agent PRs all have `user.type` `Bot`, so their commits are still skipped with no name list (CTB-3's intent holds). A maintainer who rebases a Dependabot branch or pushes the DPB-3 lock file commit onto it leaves the PR author as Dependabot, and their own commits are checked as usual (CTB-5). The one case that gets worse is a person's PR holding a real bot commit (a cherry picked Dependabot commit, say). That is rare here (no workflow pushes bot commits onto PRs), and the error tells the person to make themselves its author and add their sign off, which is also what DCO asks for: the person submitting the change certifies it. The SDK repos get it for free, because a reusable workflow sees the caller's `pull_request` event.
- **Skip every commit in a bot's PR, whoever wrote it.** Simpler, but a maintainer's unsigned commit pushed onto a Dependabot branch would pass, breaking CTB-5.
- **Require a verified signature on the bot commit.** Rejected: GitHub verifies a signature against the committer, not the author, so someone can sign with their own key and still author as Dependabot. Commits pushed by `github-actions[bot]` with `git push` aren't signed either.
- **A list of bot names or emails.** Rejected: the email is the part that gets faked, so a list blocks nothing and needs upkeep.

Legal intent: DCO is a statement by the person submitting the code. A bot's commit has no person to sign it off, and the maintainer who turned the bot on answers for it. So the skip should follow who submitted the PR, not whose name is on a commit.

## Skills license inventory

_Filled by the build (SKL-1) before the history rewrite: one row per skill in `skills-lock.json`, with its source, the source license, and whether it stays (license file added) or is removed from history._

| Skill | Source | License | Kept or removed |
| ----- | ------ | ------- | --------------- |

## OPN-1 record

_Filled by the build: the HIS-1 inventory, the HIS-4 sweep output (email list, gitleaks image digest and result, any explained findings), and the date each OPN-1 item was ticked._
