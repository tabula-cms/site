# Contributing

## What this repository is

This repository holds the public site of [Tabula](https://github.com/tabula-cms/tabula): a
documentation site built at build time from the `docs/` folder of the Tabula repository, and
later a catalogue of schools running Tabula (a Cloudflare Worker + KV).

**What it is not:** the source of documentation texts. Those live in
[`tabula-cms/tabula`](https://github.com/tabula-cms/tabula), folders `docs/editor/`,
`docs/install/`, `docs/qa/`, `docs/dev/`. This repository imports them at build time
(`scripts/fetch-docs.mjs`, arriving with issue #3) and never edits them. A typo or an outdated
step in a doc page is fixed there, not here — use the «Помилка в тексті документації» issue
link, not the bug template in this repository.

## Language rule

- User-facing text (README, issue templates, site content) is Ukrainian.
- Developer-facing text (this file, CLAUDE.md, PR template, code comments, YAML comments) is
  English.
- Issue specs follow the same split: an English spec carries the `spec` label; a bug report or
  content issue is Ukrainian.
- Line endings are LF; `.editorconfig` and `.gitattributes` enforce it.

## Branches and pull requests

`main` is the default and only long-lived branch — what is on `main` is live. There is no
`develop` branch and no release tags.

- Work branches: `feature/…`, `fix/…`, `chore/…`.
- One pull request closes one issue (`Closes #N` in the description).
- Merge only after the `build` check is green. Squash merge is allowed.
- `main` is protected and requires the `build` check to pass. On the free organization plan, a
  private repository has neither branch protection nor GitHub Pages — the repository must be
  public for both.

## CI

Third-party GitHub Actions are pinned by full commit SHA, with a `# vX.Y.Z` comment noting the
version that SHA corresponds to. Dependabot (`.github/dependabot.yml`) keeps both the SHA and
the comment current — an action is never left on a mutable tag.

## Issues

- Use the issue templates: a bug on the site itself, or a feature/change proposal. Both are
  Ukrainian.
- Acceptance criteria are written in Gherkin: keywords (`Feature`, `Scenario`, `Given`, `When`,
  `Then`, `And`) in English; the text after them is Ukrainian in Ukrainian issues, English in
  `spec` issues.
- A written specification (for larger or technical work) is English and carries the `spec`
  label.
- Labels: Tabula's default set (`bug`, `enhancement`, `documentation`, …) plus `spec`, `infra`,
  `catalogue`, `blocked`, `priority: high`/`priority: medium`/`priority: low`.
- `tabula-cms/tabula` is still private at the time of writing, so its issue and security-policy
  links above work only for members of the organisation until it is made public — a known
  transitional state.

## Running locally

Requires Node.js 22 (Astro 7 requires `>=22.12.0`; see `.nvmrc`).

```sh
nvm use
npm ci
TABULA_DOCS_DIR=../tabula/docs npm run docs:fetch
npm run dev
npm run build
```

`docs:fetch` (`scripts/fetch-docs.mjs`) copies `editor/`, `install/`, `qa/`, `dev/` from
`tabula-cms/tabula`'s `docs/` into the gitignored `src/content/docs/{editor,install,qa,dev}/`,
rewriting frontmatter and links along the way (see CLAUDE.md's Conventions for the rules). It
never edits the source text. Environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `TABULA_DOCS_DIR` | — | Path to a local checkout's `docs/` folder. When set, no `git` is used at all — the fastest loop for offline/local development. |
| `TABULA_REPO` | `https://github.com/tabula-cms/tabula.git` | Cloned when `TABULA_DOCS_DIR` is not set. A local path (e.g. `../tabula`) also works, which is how clone mode itself is tested offline. |
| `TABULA_REF` | `main` | Branch/tag to clone or to point `editUrl` and GitHub links at. `deploy.yml`'s manual `workflow_dispatch` can pass `develop` for a preview build. |
| `TABULA_DOCS_TOKEN` | — | Fine-grained PAT (contents: read, `tabula-cms/tabula` only), needed for clone mode only while that repository is private — either set this, or use `TABULA_DOCS_DIR` instead. Passed to `git` through the environment (`GIT_CONFIG_*`, scoped to `github.com`), never argv, never the URL, never logged. Ignored for a local `TABULA_REPO` path. |

`npm run build` runs `scripts/check-links.mjs` automatically afterwards, via npm's `postbuild`
hook, and fails the build if any internal link or `#anchor` is broken. The same check can be run
on its own, without rebuilding, as `npm run check:links`. It replaces
`starlight-links-validator`, whose `errorOnRelativeLinks` option cannot validate this site's
relative-link convention (see the comment at the top of `scripts/check-links.mjs`).

## Repository settings that are manual

These are set once in GitHub's UI, not in code, in this order:

1. **Repository visibility: public.** On the free organization plan, a private repository has
   neither branch protection nor GitHub Pages; both require the repository to be public.
2. **Settings → Pages → Source: GitHub Actions.** (Requires step 1 first.)
3. **Settings → Secrets and variables → Actions → Secrets: `TABULA_DOCS_TOKEN`.** A
   fine-grained personal access token scoped to `contents: read` on `tabula-cms/tabula` only,
   needed only while that repository is private (see `docs:fetch` in "Running locally" above).
   Also add the same value under **Settings → Secrets and variables → Dependabot → Secrets**
   (a separate secret store from the Actions one above) so Dependabot's own update runs have
   it too. Fine-grained PATs expire — pick the longest expiry GitHub allows and set a calendar
   reminder to rotate it, or note the expiry date somewhere it will be seen: an expired token
   makes `deploy.yml` fail hard (see MINOR note below and CLAUDE.md's deploy model — deploy
   never falls back to a landing-page-only build). Delete this secret from both stores once
   `tabula-cms/tabula` is public — the clone then works anonymously and CI's `allow-import-skip`
   fallback (see CLAUDE.md) and this token both go away together.
4. **Settings → Secrets and variables → Actions → Variables: `SITE_URL`, `SITE_BASE`.**
   Optional for now (both default to the GitHub Pages project URL,
   `https://tabula-cms.github.io` / `/site` — see `astro.config.mjs`). Required once the custom
   domain arrives: `SITE_URL=https://<domain>`, `SITE_BASE=/`.
5. **Settings → Branches → add a protection rule for `main`:** require a pull request before
   merging, require the `build` status check to pass, disallow force pushes. The `build` check
   only appears in the list of available checks after it has run at least once — open any PR
   first, let CI run, then add the rule.

GitHub also disables a scheduled workflow automatically in a public repository after 60 days
with no repository activity (commits, PRs, etc.). If the daily deploy stops running with no
other explanation, check **Actions → Deploy → "..."** for a disabled/re-enable prompt.

## Privacy

Never use a real school's name, city, staff name, or domain in examples, issues, code,
comments, commit messages, or screenshots. The only example school allowed is the fictitious
«Вигаданий ліцей № 0». Screenshots for documentation or issues come only from Tabula's demo
site (issue #6), never from a real installation.

One deliberate exception, decided by the project owner: the origin story of Tabula (the
«Про проєкт» block on the landing page and `src/content/docs/pro-proiekt.md`) names the lyceum
where the system was created and the two people who initiated it. Nothing else about that
school — its domain, pupils, staff, content, or screenshots of its live site — belongs in this
repository.
