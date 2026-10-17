# Contributing to Orvano SDKs

Thanks for helping. This guide is the default for every Orvano SDK repo. The server, console, and docs live in [`orvanohq/orvano`](https://github.com/orvanohq/orvano), which has [its own guide](https://github.com/orvanohq/orvano/blob/main/CONTRIBUTING.md). Everyone taking part follows the [code of conduct](https://github.com/orvanohq/.github/blob/main/CODE_OF_CONDUCT.md).

## Ways to help

- Answer a question or share what you built in [Discussions](https://github.com/orvanohq/orvano/discussions) on the core repo. SDK repos keep Discussions off.
- Report a bug or ask for a feature with the issue forms in the SDK's own repo.
- Improve the docs or examples, fix a bug, or pick up an issue labeled `triage` that a maintainer has confirmed.

Questions go to [Discussions Q&A](https://github.com/orvanohq/orvano/discussions/categories/q-a), not issues. [SUPPORT.md](https://github.com/orvanohq/.github/blob/main/SUPPORT.md) says where everything else goes. Security problems never go in public: see [SECURITY.md](https://github.com/orvanohq/.github/blob/main/SECURITY.md).

## Before a big change

For anything larger than a small fix (a new API, a new dependency, a breaking change), open an issue or an [Ideas discussion](https://github.com/orvanohq/orvano/discussions/categories/ideas) first. Agreeing on the shape early saves you from rewriting a finished PR.

## Local setup

See the repo's `README.md` for the tools and commands.

## Branches and pull requests

- Fork the repo and work on a branch in your fork. Name it however you like.
- Maintainers working in the repo name branches `<type>/<short-topic>` in kebab case, for example `feat/retry-backoff` or `fix/token-refresh`.
- The PR title follows [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>)!: <summary>`, at most 72 characters, no trailing period. Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`. For example:
  - `feat(auth): add email sign in`
  - `fix(storage): retry an interrupted upload`
- PRs are squash merged, so the PR title becomes the commit on `main`.
- Fill in the PR template and delete the checklist blocks your change doesn't touch. The Security block always stays.
- Run the repo's check and test commands (in its `README.md`) before you push.

## Sign your work (DCO)

Orvano uses the [Developer Certificate of Origin](https://developercertificate.org/) (DCO) instead of a contributor license agreement. Every commit in a PR needs a `Signed-off-by` line, which `git commit -s` adds for you:

```text
Signed-off-by: Your Name <you@example.com>
```

By adding it, you certify this:

```text
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

The email in your sign off must match the commit's author email (case doesn't matter). A GitHub `noreply` address is fine, as long as it's also your author email. Check both with:

```bash
git config user.email
```

The `dco` check runs on every PR. If it fails, it prints each commit that needs fixing. To add the missing sign offs, run:

```bash
git rebase --signoff origin/main
```

```bash
git push --force-with-lease
```

Edits you make in the GitHub web editor, and review suggestions you commit there, are signed off automatically.

If you use AI coding tools, you still sign off personally, and your sign off certifies that you have the right to submit the change.

## License

Contributions are accepted under the Apache License 2.0, the license in the repo's `LICENSE` file. The name "Orvano" and its logo aren't covered by that license; see [TRADEMARKS.md](https://github.com/orvanohq/orvano/blob/main/TRADEMARKS.md).
