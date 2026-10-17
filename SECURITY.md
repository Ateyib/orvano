# Security policy

Orvano holds other people's users, data, and secrets, and runs their code. We take reports seriously and thank everyone who reports a problem responsibly.

**Please don't report a vulnerability in a public issue, pull request, or discussion.** Use one of the private channels below.

## How to report

1. **GitHub private vulnerability reporting (preferred):** open a report at <https://github.com/orvanohq/orvano/security/advisories/new>. This works for the server, the console, the image, and every SDK. If the problem is in an SDK, say which package; we move the advisory to that SDK's repo.
2. **Email (fallback):** if you can't use GitHub, write to [security@orvano.dev](mailto:security@orvano.dev).

Helpful details: the affected component and version (the image tag or `orvano --version`, or the SDK package and version), steps to reproduce, what an attacker gains, and any proof of concept. You don't need a full write up to report.

## Supported versions

| Version            | Gets security fixes |
| ------------------ | ------------------- |
| The latest release | Yes                 |
| `main`             | Yes                 |
| Anything older     | No                  |

Before 1.0, fixes are not backported: they ship in the next release. Until the first release, only `main` is supported. The SDK repos follow the same rule for their own packages.

## What to expect

- **Acknowledgement** within 3 business days.
- **Triage** within 7 days: a severity (CVSS 4.0 base score) and a plan.
- **A fix released and the advisory published** within 90 days of your report. For critical issues (CVSS 9.0 or higher) we aim for 30 days.

If we're going to miss a target, we tell you before it passes. Disclosure is coordinated: the advisory goes out with the fix or after it, never before. We credit you in the advisory unless you ask us not to.

Advisories are published through GitHub Security Advisories on the affected repo, and we request a CVE through GitHub when the issue affects a release.

## Scope

In scope:

- The code in [`orvanohq/orvano`](https://github.com/orvanohq/orvano) and in the Orvano SDK repos under [`orvanohq`](https://github.com/orvanohq)
- The official image `ghcr.io/orvanohq/orvano`
- The reference compose files in `deploy/`

Out of scope:

- A self hoster's own setup or misconfiguration
- Volumetric denial of service
- Social engineering of maintainers, contributors, or users
- Bugs in third party dependencies: please report those upstream. If the way Orvano uses a dependency makes it exploitable, do tell us.

## Safe harbor

We won't pursue or support legal action against good faith research that follows this policy, avoids privacy violations and data destruction, and tests only installs you run yourself. If you're unsure whether something is in bounds, ask us through either channel first.
