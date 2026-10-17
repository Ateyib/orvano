# Contributing to Orvano

Thanks for helping. This guide covers how to get a change from your machine onto `main`. Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Ways to help

- Answer a question or share what you built in [Discussions](https://github.com/orvanohq/orvano/discussions).
- Report a bug or ask for a feature with the [issue forms](https://github.com/orvanohq/orvano/issues/new/choose).
- Improve the docs, fix a bug, or pick up an issue labeled `triage` that a maintainer has confirmed.

Questions go to [Discussions Q&A](https://github.com/orvanohq/orvano/discussions/categories/q-a), not issues. [SUPPORT.md](SUPPORT.md) says where everything else goes. Security problems never go in public: see [SECURITY.md](SECURITY.md).

## Before a big change

For anything larger than a small fix (a new feature, a new dependency, a change to the API or the install), open an issue or an [Ideas discussion](https://github.com/orvanohq/orvano/discussions/categories/ideas) first. Orvano designs features in specs under [`docs/specs/`](docs/specs/), and agreeing on the shape early saves you from rewriting a finished PR.

## Local setup

Follow [README.md, Local development](README.md#local-development) for the tools and the run order, and read the root [AGENTS.md](AGENTS.md) before you write code: it links the practice spec for each area and the rules every change follows.

## Branches and pull requests

- Fork the repo and work on a branch in your fork. Name it however you like.
- Maintainers working in this repo name branches `<type>/<short-topic>` in kebab case, for example `feat/email-auth` or `fix/root-key-mode` (spec 0008 GIT-1).
- The PR title follows [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>)!: <summary>`, at most 72 characters, no trailing period (GIT-2). Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`. For example:
  - `feat(auth): add email sign in`
  - `fix(console): keep the project picker open on resize`
- PRs are squash merged, so the PR title becomes the commit on `main`.
- Fill in the [PR template](.github/pull_request_template.md) and delete the checklist blocks your change doesn't touch. The Security block always stays.
- Before you push, run these at the repo root:

  ```bash
  pnpm check
  ```

  ```bash
  pnpm test
  ```

  `pnpm fix` applies the formatters and lint fixers.

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

## Dependabot NuGet PRs (maintainers)

If a Dependabot NuGet PR doesn't update the `packages.lock.json` files (so the locked restore fails), check out its branch, then run:

```bash
dotnet restore server/Orvano.slnx --force-evaluate
```

Commit the changed lock files with `git commit -s` and push them to the same branch (spec 0008 DPB-3). No workflow does this for you.

## Windows notes

Windows works, and CI runs the JavaScript checks, the console tests, and a real commit through the hook on Windows every time. A few known issues with Vite+ on Windows, and how to avoid them (spec 0008 TL-2, TL-5):

- **You don't need a global Vite+.** Every script calls the local `vp` pinned in `package.json`, so run `pnpm check`, `pnpm fix`, and `pnpm test` rather than a global `vp`.
- **Defender may flag the global installer's shims** ([vite-plus#2866](https://github.com/voidzero-dev/vite-plus/issues/2866)), and the installer can leave `PATH` unset ([vite-plus#2984](https://github.com/voidzero-dev/vite-plus/issues/2984)). If you installed Vite+ globally and see either, skip the global install and use the pnpm scripts.
- **Use Git for Windows with its bash.** The pre commit hook is a shell script, and `pnpm install` installs it through the root `prepare` script.
- **Line endings** are set by `.gitattributes` (LF everywhere, CRLF only for `.cmd` and `.bat`), so leave `core.autocrlf` at its default and don't convert files by hand.

If something else breaks on Windows, open an issue with the area "deploy and install" or "not sure", and include your Windows, Node, and pnpm versions.

## License

Contributions are accepted under the [Apache License 2.0](LICENSE), the license of this repo (spec 0009). The name "Orvano" and its logo aren't covered by that license; see [TRADEMARKS.md](TRADEMARKS.md).
