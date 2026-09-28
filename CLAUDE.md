# CLAUDE.md — tabula-cms/site

> Internal reference for Claude Code sessions working in this repository.
>
> **Last verified: 2026-09-28.**
>
> **How to keep this file honest:** every pull request that changes a convention, a command,
> or the file layout updates the matching section of this file in the same PR.

## What this is

This repository is the public site of [Tabula](https://github.com/tabula-cms/tabula), a free,
open-source, self-hosted CMS for Ukrainian schools (AGPL-3.0). The site has two parts: (1)
documentation for schools and developers, built at build time from the `docs/` folder of
`tabula-cms/tabula`, and (2) — later — a catalogue of schools running Tabula (a Cloudflare
Worker + KV).

`tabula-cms/tabula` is the single source of truth for documentation text. This repository
never edits doc text; it only imports it. Everything else (site chrome, catalogue, CI, deploy)
lives here.

## Repository map

Exists now:

| Path | Purpose |
|---|---|
| `README.md` | Public description of the site (Ukrainian) |
| `CONTRIBUTING.md` | Contribution rules (English) |
| `CLAUDE.md` | This file |
| `.github/ISSUE_TEMPLATE/` | Bug and feature issue forms (Ukrainian), `config.yml` |
| `.github/pull_request_template.md` | PR checklist (English) |
| `.github/dependabot.yml` | npm + github-actions update groups |
| `.nvmrc`, `.editorconfig`, `.gitignore` | Toolchain and hygiene |
| `.claude/agents/implementer.md`, `.claude/agents/reviewer.md` | Agent definitions used by the lead session |
| `astro.config.mjs` | Astro Starlight configuration (site/base env vars, conditional sidebar — see Conventions) |
| `tsconfig.json` | `astro/tsconfigs/strict` |
| `src/content.config.ts` | Starlight's `docs` collection (`docsLoader()` + `docsSchema()`, extended with an optional `lang` field) |
| `src/routeData.ts` | Route data middleware that applies a page's `lang` frontmatter to its `<html lang>` — see Conventions |
| `src/content/docs/index.mdx` | Landing page content (issue #5, design pass 2) — hand-written `template: splash` MDX sections styled by `src/styles/site.css`: full-bleed tinted bands (hero, "Можливості"), bordered cards ("Три кроки", "Для кого", the "Потрібно" checklist), a tile grid, and small monochrome icons from Starlight's built-in `<Icon name="…" />` set (`@astrojs/starlight/components`) — no `hero` frontmatter and no Starlight `CardGrid`/`Card` |
| `src/content/docs/pro-proiekt.md` | About-the-project page (issue #5), `template: splash`, hidden from the sidebar, its content column narrowed by `src/styles/site.css`'s `.prose-narrow` |
| `src/styles/site.css` | `customCss` for the Starlight config (issue #5): the deep ink-blue accent palette (`--sl-color-accent*`, light/dark) and the layout/typography for the hand-written landing and about pages — see Conventions |
| `src/components/Footer.astro` | `Footer` component override (issue #5): a quiet, site-wide link row + tagline; still renders Starlight's default footer (edit link, pagination) above it on `template: doc` pages — see Conventions |
| `src/components/PageTitle.astro` | `PageTitle` component override (issue #5): suppressed on `template: splash` pages, which write their own top heading in the body — see Conventions |
| `src/components/Header.astro` | `Header` component override (issue #5, design pass 3): adds site-wide navigation (a `<nav>` on wide viewports, a native `<details>` "Меню" dropdown below 1024px) between the wordmark and the search box — see Conventions |
| `src/components/SiteTitle.astro` | `SiteTitle` component override (issue #5, design pass 3): the text-only default plus a small inline SVG wordmark — see Conventions |
| `public/favicon.svg` | The site's mark (issue #5, design pass 3): the same "tablet" motif as `SiteTitle.astro`'s inline SVG, redrawn at a 32×32 viewBox with hard-coded hex colours and its own `prefers-color-scheme` variant (an `<img>`/browser favicon can't read the page's CSS custom properties) — replaces the Starlight starter's placeholder mark |
| `scripts/lib/docs-transform.mjs` | Pure functions used by `fetch-docs.mjs`: frontmatter building/serialisation, link rewriting, `sidebar.order` from `docs/INDEX.md`, `editUrl` mapping, back-link removal. No filesystem or network access — this is what `test/docs-transform.test.mjs` unit-tests directly. |
| `scripts/fetch-docs.mjs` | Imports `docs/{editor,install,qa,dev}` from `tabula-cms/tabula` into the gitignored `src/content/docs/{editor,install,qa,dev}/` (issue #3) — obtains the source (local dir or a sparse git clone), runs the transform, writes the output, prints a summary. See Conventions for the rules it implements. |
| `scripts/check-links.mjs` (`npm run check:links`; also runs automatically after `npm run build` via `postbuild`) | Walks the built `dist/` and fails if any internal link or `#anchor` resolves to nothing. Replaces `starlight-links-validator`, which cannot validate this site's relative-link convention — see Conventions. |
| `test/smoke.test.mjs` | `node --test` check of `astro.config.mjs`'s `site`/`base` defaults and env overrides |
| `test/docs-transform.test.mjs` | `node --test` fixture-based unit tests for `scripts/lib/docs-transform.mjs` (pure functions only, no network) |
| `package.json`, `package-lock.json` | npm scripts and locked dependencies |
| `.github/workflows/ci.yml` | CI: the `build` job that branch protection requires (issue #4) |
| `.github/workflows/deploy.yml` | Deploy: `main`/schedule/manual/`repository_dispatch` triggers, `build` + `deploy` jobs to GitHub Pages (issue #4) |
| `.github/actions/build-site/action.yml` | Composite action shared by both workflows — setup-node, `npm ci`, docs import, `npm test`, `npm run build` (checkout stays in the calling workflow; issue #4) |

Later (#7–#9):

| Path | Purpose |
|---|---|
| `workers/catalogue/` | Cloudflare Worker for the school catalogue |

## Working process

1. The lead session (Fable) writes the spec into the issue (English for a technical spec,
   Ukrainian for a bug/content issue; acceptance criteria in Gherkin).
2. A work branch is created for it.
3. The `implementer` agent (Sonnet) writes the code/files from a brief written for that issue.
4. The `reviewer` agent (Opus) reviews the change against the issue's acceptance criteria and
   this file's conventions.
5. The implementer (or the lead) applies fixes from the review.
6. The lead session commits, pushes, and opens the pull request with `Closes #N`.
7. Merge after the `build` check is green.

Agents never run `git` (the reviewer may run read-only `git diff`/`git status`/`git log`).
Briefs live in the session scratchpad, not in this repository.

## Branch and deploy model

`main` is the only long-lived branch and is always live. Work branches are `feature/…`,
`fix/…`, `chore/…`, one PR per issue, squash merge allowed. `main` is protected and requires
the `build` check. Deploy target is GitHub Pages, built by GitHub Actions from `main`, with a
daily scheduled rebuild (so doc changes in `tabula-cms/tabula` reach the site without a PR
here). The site builds from `tabula-cms/tabula`'s `main` (its released state), not `develop`.
`deploy.yml` also takes a manual `workflow_dispatch` with a `tabula_ref` input (default
`main`), so a `develop` preview build can be triggered by hand; that preview is overwritten by
the next scheduled run against `main`. `SITE_URL` and `SITE_BASE` are repository variables
consumed by the build. See `CONTRIBUTING.md` for the manual repository settings this depends
on.

Both workflows share `.github/actions/build-site/` (a composite action: setup-node, `npm ci`,
docs import, `npm test`, `npm run build`) so their build steps can't drift apart; checkout
happens in each workflow, not in the composite action. Both checkouts pass
`persist-credentials: false` (neither job pushes back to the repository).

- **`ci.yml`** — `pull_request` and `push: branches: [main]`; one job, named exactly `build`
  (branch protection's required check); `concurrency: cancel-in-progress` is true only for
  `pull_request` runs, so two pushes to `main` in a row (e.g. two merges back-to-back) each
  still get their own build check rather than one being cancelled. `TABULA_REF` is always
  `main`. `tabula-cms/tabula` is still private (see CONTRIBUTING.md), and only a fork PR
  (`github.event.pull_request.head.repo.fork == true`) or a Dependabot PR
  (`github.actor == 'dependabot[bot]'`) has no access to the `TABULA_DOCS_TOKEN` secret at
  all — ci.yml computes `allow-import-skip` from exactly that condition and passes it to the
  composite action. Only for those two cases does a failed `npm run docs:fetch` fall back —
  `::notice::` plus a landing-page-only build (which also sets `DOCS_IMPORT_SKIPPED=true` so
  the Build step passes `--ignore-scripts` and skips the postbuild link check, which would
  otherwise fail on links into the never-imported `editor/install/qa/dev` folders) — instead of
  failing the job. A same-repo PR always has `allow-import-skip: 'false'`, so an import failure
  there fails CI even if `TABULA_DOCS_TOKEN` happens to be unset. Once `tabula-cms/tabula` is
  public, remove `allow-import-skip` from `ci.yml` and the input from
  `.github/actions/build-site/action.yml` entirely — the clone then succeeds anonymously and
  there is no fork case left to handle. `SITE_URL`/`SITE_BASE` come from repository variables,
  defaulting to the GitHub Pages project URL.
- **`deploy.yml`** — triggers: `push: branches: [main]`; `schedule: '30 3 * * *'` (03:30 UTC =
  06:30 Kyiv in summer/EEST, 05:30 in winter/EET, before schools' day starts either way);
  `workflow_dispatch` with a `tabula_ref` string input (default `main`); `repository_dispatch:
  types: [tabula-docs-updated]` (a future hook from Tabula's own release workflow — the sender
  side is out of scope here). `concurrency: group: pages, cancel-in-progress: false` — a
  half-finished Pages deploy is worse than a queued one, unlike CI's behaviour. Permissions are
  split per job (least privilege): the workflow-level default is `contents: read`; job `build`
  adds `pages: read` (all `actions/configure-pages` needs); job `deploy` has `pages: write` and
  `id-token: write` — the Pages-write and OIDC credentials live only in the job that deploys,
  never in `build`. Job `build` calls the same composite action with the import step's fallback
  disabled (`allow-import-skip: 'false'`): deploy never runs against a fork or from Dependabot,
  so any docs-import failure fails the run outright rather than risk shipping a partial site to
  production. `build` then runs `actions/configure-pages` and `actions/upload-pages-artifact`
  (`path: dist`). Job `deploy` (`needs: build`) runs `actions/deploy-pages` in the
  `github-pages` environment.
- GitHub disables a scheduled workflow automatically in a public repository after 60 days with
  no repository activity (commits, PRs, etc.) — if the daily deploy stops running with no other
  explanation, re-enable it under **Actions → Deploy**.

## Conventions

- Landing (`src/content/docs/index.mdx`) and about (`src/content/docs/pro-proiekt.md`) page
  content (issue #5): hand-written `template: splash` MDX/Markdown sections with plain classed
  `<div>`/`<section>` markup, styled in `src/styles/site.css` — not Starlight's `hero`
  frontmatter or `CardGrid`/`Card` components, which read as decorative for this site's
  audience (education-department officials, principals, the installing teacher). Internal
  links inside these two pages follow the same relative-link convention as imported pages (no
  leading slash; `../` from `/pro-proiekt/`) — see the link-convention bullet below.
- Landing page visual structure (issue #5, design pass 2, 2026-09-28): the plain-text sections
  from the first pass gained bands, cards, tiles, and icons so the page has visual anchors
  instead of reading as "bare text on white" — `.landing-band` is the full-bleed tinted-band
  primitive (`margin-inline: calc(50% - 50vw)`, background `--tabula-tint-bg`) used for the
  hero and "Можливості"; `.landing-container` re-applies the page's 72rem/1.5rem (1rem on
  phones) column inside a band, derived from the same `--sl-content-width`/`--sl-content-pad-x`
  custom properties as Starlight's own `.sl-container` (see below) so a band's content and a
  plain section's content share the same left edge; `.for-whom-item`/`.steps-card`/
  `.needs-card`/`.capability-tile` are the bordered card/tile style (1px `--sl-color-gray-5`
  border, `--sl-color-bg` surface, 0.75rem radius for the first three, 0.625rem for the tile,
  the tile also getting hover border-accent + shadow). Icons are Starlight's own built-in set
  via `<Icon name="…" />` (imported from `@astrojs/starlight/components` at the top of
  `index.mdx`) — small and monochrome (`color: var(--sl-color-accent)`), decorative (`Icon`
  defaults to `aria-hidden="true"` when no `label` prop is passed, so no extra markup is
  needed), and picked only from the verified name list in
  `node_modules/@astrojs/starlight/dist/components-internals/Icons.js` (there is no `Icons.ts`
  source file in the published package — the `.js` is authoritative). Two of the ten
  "Можливості" tiles fall back to a close-enough icon because no better one exists in that set:
  "Фотогалереї" uses `document` (no `image`/`photo` icon), "Колектив" uses `information` (no
  `user` icon). `:root:not([data-has-sidebar])` widens `--sl-content-width` to 72rem and
  `--sl-content-pad-x` to 1.5rem (1rem on phones) for these two pages only; every imported doc
  page has a sidebar and is unaffected. Design pass 3 (review round) changed this from
  `html:not([data-has-sidebar])` — the exact selector Starlight's own `Page.astro` uses inline
  to detect a sidebar-less page — because that gave both rules *equal* specificity, so
  whichever the cascade placed later won regardless of authorship; a reviewer confirmed
  Starlight's own inline rule was winning in practice, silently keeping these two pages at
  Starlight's stock 67.5rem instead of this file's intended 72rem the whole time. `:root` and
  `html` are the same element, but `:root:not(...)` carries one more pseudo-class of specificity
  than `html:not(...)`, so it now wins reliably. The `.landing-quiet` ("Про проєкт") block keeps
  its own tint + left accent bar treatment from the first pass, just thickened to a 4px bar and
  given the same corner radius as the new cards.
- Accent palette (issue #5): `src/styles/site.css` overrides only `--sl-color-accent-low`,
  `--sl-color-accent` and `--sl-color-accent-high` (dark mode in `:root`, light mode in
  `:root[data-theme='light']`), following Starlight's own theme-colour convention (see
  https://starlight.astro.build/guides/css-and-tailwind/#theming). Target colours: light-mode
  accent ≈ `#1f3d63`, dark-mode accent ≈ `#8fb3e0` — both give ≥5.7:1 contrast against this
  site's own background and against the button/text pairing used on the landing page (AA
  minimum is 4.5:1). The neutral gray scale is untouched. `--tabula-accent-hover` is a small
  extra custom property (not a Starlight one) for the landing page's own button hover state,
  because Starlight's `-high`/`-low` accent steps aren't reliably *lighter* than the base accent
  in both themes.
- Site-wide footer override (issue #5): `src/components/Footer.astro` replaces Starlight's
  `Footer` (registered via `components.Footer` in `astro.config.mjs`). It renders Starlight's
  own default footer (`@astrojs/starlight/components/Footer.astro`, imported directly) above
  its own content only on `template: doc` pages, so "Edit this page" and prev/next pagination
  are preserved there; `template: splash` pages (landing, about) get only the quiet link
  row + tagline, since they have no edit link or pagination to show. The footer's "Про проєкт"
  link is the one internal link on the site that can't be written relative — the footer renders
  at every page depth (`/`, `/editor/`, `/editor/novyny/`, ...) — so it's built from
  `import.meta.env.BASE_URL` (Astro's resolved `base`) joined with `pro-proiekt/`;
  `scripts/check-links.mjs` resolves an absolute (leading-slash) href directly against its own
  base-prefixed page map, so this doesn't need special-casing there.
- `PageTitle` component override (issue #5): `src/components/PageTitle.astro` replaces
  Starlight's default (registered via `components.PageTitle`), rendering nothing on
  `template: splash` pages — those pages write their own top heading in the body as a raw
  `<h1 id="_top">` (the landing's hero `<h1>`, the about page's own
  `<h1 id="_top">Про проєкт</h1>` — not a `# ...` Markdown heading, which can't carry an id),
  and the default `PageTitle` would otherwise duplicate it (and, on the landing page, render in
  the wrong place — before the hand-written eyebrow line instead of after it). Starlight's
  `SkipLink` always targets `#_top`, which `PageTitle`/`Hero` would normally provide; any future
  `template: splash` page must carry `id="_top"` on its own top heading itself, or the skip link
  (and `check-links.mjs`'s anchor check) will break. `template: doc` pages are unaffected.
  Starlight also still renders the (now-empty) `.content-panel` that would have held
  `PageTitle` on these pages; `src/styles/site.css` collapses it and the hairline after it.
- Site-wide header navigation and wordmark (issue #5, design pass 3, owner feedback: the site
  read as "bare/off" without either). `src/components/Header.astro` replaces Starlight's
  default (registered via `components.Header`); its imports of `SiteTitle`/`Search`/
  `SocialIcons`/`ThemeSelect`/`LanguageSelect` are copied verbatim from
  `@astrojs/starlight/dist/components/Header.astro` (still going through the
  `virtual:starlight/components/*` indirection, not the concrete files, so a future
  `components.*` override of one of them keeps working here too). It adds one `<nav
  aria-label="Основна навігація">` landmark holding both the inline link row (wide viewports)
  and a native `<details>` "Меню" dropdown (narrow viewports) — one landmark for both variants,
  not two, since a screen-reader user only ever sees one of them at a time anyway. The link list
  (Документація/editor/, Встановлення/install/, Розробникам/dev/, Про проєкт/pro-proiekt/) is
  base-aware (`import.meta.env.BASE_URL`, the same technique as `Footer.astro`'s "Про проєкт"
  link) and shared between both variants; "Документація" also matches any `/qa/` page (Tabula's
  testing docs have no nav link of their own and read as part of the editor docs). Each link
  gets `aria-current="page"` on an exact match or `aria-current="true"` on a prefix match that
  isn't exact (e.g. `/editor/novyny/`, or any `/qa/...` page, under "Документація") — both
  values are styled identically as "current" (`a[aria-current]`, not `a[aria-current='page']`),
  weight + underline, not colour alone (a reviewer asked for this in both the inline nav and the
  "Меню" panel, for readers who can't rely on colour). Starlight's own responsive breakpoints
  (`sl-hidden`/`md:`/`lg:` utility classes, defined in `@astrojs/starlight/dist/style/util.css`)
  sit at 50rem/72rem, neither of which is the 1024px this brief originally asked for, so the
  nav/"Меню" swap uses its own plain `@media` rules instead — at two *different* breakpoints,
  by page type (review round): Starlight's header grid (below) sizes its title column from the
  sidebar's own width on pages that have one, so a reviewer found the inline nav still didn't
  fit at 1024–1100px there (the theme switcher was cut off at 1024px, "Про проєкт" wrapped onto
  two lines by ~1100px) — confirmed and fixed by giving `[data-has-sidebar]` pages their own
  72rem (1152px) breakpoint instead, while the landing/about pages (no sidebar, no such column
  pressure) keep 1024px, both verified by measuring every link's `getClientRects().length` (1,
  i.e. one line) and the theme switcher's right edge against `clientWidth` at each breakpoint on
  `/editor/novyny/` and `/`. `.tabula-nav a { white-space: nowrap }` was also needed — without
  it "Про проєкт" (the longest label) would wrap under column-width pressure instead of the nav
  simply taking the width it needs. Starlight's own header becomes a 3-column grid at its 50rem
  breakpoint (title | search `1fr` | right-group `auto`) computed from several sidebar/toc-width
  custom properties; this override keeps that calculation untouched but adds a 4th column (an
  `auto` track between title and search) from the same 50rem breakpoint up, with every part's
  `grid-column` set explicitly (`.tabula-nav-wrapper`, the one `<nav>` landmark, takes the new
  column) — both to give the nav/"Меню" slot somewhere to go and because auto-placement would
  otherwise wrap a 4th DOM child onto a second row once the grid only defines 3 tracks
  (confirmed while building this: exactly the "no extra rows on desktop" the brief warned
  against). Below the 50rem breakpoint the header is a plain flex row (Starlight's own default,
  unmodified); `.tabula-nav-wrapper` gets `margin-inline-start: auto` there instead, so it (and
  the search button after it) sit together at the header's end rather than `justify-content:
  space-between` spreading title/nav/search apart evenly. The "Меню" panel is
  `position: absolute` with no bleed math of its own — it resolves against `PageFrame.astro`'s
  own fixed, full-width `<header class="header">` (the nearest positioned ancestor; this
  component's own root, and the `<details>` itself, are both plain unpositioned boxes —
  confirmed the hard way while building this that giving `.tabula-mobile-nav` its own
  `position: relative`, a natural first instinct for a dropdown trigger, makes *it* the
  containing block instead and shrinks the panel to the `<summary>`'s own ~16px width), so
  `width: 100%`/`top: 100%` already give a full-viewport-width panel flush under the header. An
  icon-only "Меню" variant below 480px (dropped in the review round) turned out to duplicate
  Starlight's own sidebar hamburger — both rendered as a plain "bars" icon right next to each
  other on a narrow doc page; "Меню" now keeps its text + chevron down to 320px, which still
  fits next to the wordmark, search icon, and (on doc pages) that hamburger — checked at 375px
  on `/editor/novyny/`, which has both. Starlight's own sidebar hamburger (`MobileMenuToggle`)
  is otherwise untouched — it lives in `PageFrame.astro`, not here, toggles the unrelated doc
  sidebar, and only ever renders on pages that have one (never the sidebar-less landing/about
  pages).
  `src/components/SiteTitle.astro` replaces Starlight's text-only default (registered via
  `components.SiteTitle`) with the same title link plus a small inline SVG "tablet" mark before
  it (two offset rounded rectangles, stroke only, `aria-hidden="true"` — the link's accessible
  name stays the title text). The title text itself comes from `Astro.locals.starlightRoute
  .siteTitle` (Starlight's own resolved site title, "Tabula" today per `astro.config.mjs`'s
  `starlight({ title: 'Tabula' })`), not a hardcoded string, so this stays a drop-in visual
  replacement of the text-only default even if that title ever changes.
  `public/favicon.svg` redraws the same motif at a 32×32 viewBox with literal hex colours
  (`#1f3d63` light / `#8fb3e0` dark via an `@media (prefers-color-scheme: dark)` rule inside the
  SVG's own `<style>`, the same pattern the Starlight starter's placeholder favicon already
  used) — a favicon can't read the page's `--sl-color-accent` custom property, so the mark's
  colours are duplicated by value here rather than referenced from `src/styles/site.css`'s
  palette; if that palette's accent hex values ever change, this file needs updating too.
  `favicon: '/favicon.svg'` in `astro.config.mjs` is Starlight's own default and so technically
  a no-op, kept only to document that this is the site's real mark, not a leftover placeholder;
  Starlight prefixes `base` itself when rendering the `<link rel="icon">` tag (`fileWithBase` in
  its `dist/utils/head.js`), confirmed against a built `dist/index.html` (`/site/favicon.svg`).
  The header's own border-bottom (`--sl-color-hairline-shade`, from `PageFrame.astro`) is barely
  visible in light mode. An earlier version of this fix switched it to `--sl-color-hairline` —
  a reviewer pointed out that changes nothing, since `--sl-color-hairline` and
  `--sl-color-hairline-shade` both resolve to the same `--sl-color-gray-6` in light mode (see
  `@astrojs/starlight/dist/style/props.css`); it also quietly relaxed dark mode's border from
  Starlight's own near-black `--sl-color-hairline-shade` to the lighter `--sl-color-hairline`,
  which wasn't asked for. `src/styles/site.css` now overrides `border-bottom-color` to
  `--sl-color-gray-5` (a step darker than the gray-6 both hairline tokens resolve to in light
  mode, so this one actually changes something) and adds a matching 1px shadow underneath,
  scoped to `:root[data-theme='light']` only — dark mode is left exactly as Starlight ships it,
  since its own hairline-shade already reads clearly there. Targets the tag+class selector
  (`header.header`) rather than plain `.header`, since this component's own root `<div>` in
  `src/components/Header.astro` reuses the same class name for its inner flex/grid row.
- Two small landing-page layout fixes from the design pass 3 review round: (1) the hero band sat
  1.5rem below the header instead of flush against it — that gap was the first `.content-panel`'s
  own top padding (Starlight core; `PageTitle.astro` empties that panel's *content* on
  `template: splash` pages but doesn't remove the panel's own padding), fixed with
  `.landing-hero-band { margin-top: -1.5rem }` rather than reaching into Starlight's own panel
  padding (every other page still needs it); verified `header.getBoundingClientRect().bottom ===
  .landing-hero-band.getBoundingClientRect().top` at both 375px and 1280px. (2) a `.landing-band`
  + `.landing-section` pair (i.e. right after "Можливості") showed two dividers back to back —
  the band's own tint background already separates it from what follows, so `.landing-band +
  .landing-section { border-top: 0 }` drops the redundant hairline.
- Card and tile borders (`.steps-card`, `.for-whom-item`, `.needs-card`, `.capability-tile`) use
  `--sl-color-gray-5`, not `--sl-color-hairline` (design pass 3, review round): a reviewer
  measured the hairline-bordered cards at roughly a 1.16:1 contrast ratio against their own
  `--sl-color-bg` surface in both themes — `--sl-color-hairline` resolves to the *same* gray
  step as the page background's near-neighbour in both themes (gray-6, one step from
  `--sl-color-bg`/`--sl-color-black`/`--sl-color-white`), so the border was barely there.
  `--sl-color-gray-5` is one step further from the background in both themes, reading as a
  quiet-but-visible line rather than a heavy one. `.landing-section`'s own plain divider
  (`border-top`) and `.needs-note`'s divider keep `--sl-color-hairline` — only bordered
  card/tile *surfaces* needed the contrast bump, not the plain section rules between them.
- Landing page horizontal-overflow fix (issue #5, design pass 3, corrected in the review round):
  `.landing-band`'s full-bleed technique (`margin-inline: calc(50% - 50vw)`) measured 8px —
  exactly a vertical scrollbar's width — too wide at a 716px viewport, because `100vw` always
  includes the scrollbar while the page's actual centred column is laid out in the narrower
  space the scrollbar leaves for content. The first version of this fix set `overflow-x: clip`
  on `:root`. A reviewer found that broke Starlight's own scroll lock: Starlight sets
  `overflow: hidden` on `<body>` while the search modal is open (`[data-search-modal-open]`, in
  its `Search.astro`) and while the mobile sidebar popover is open
  (`body:has(#starlight__sidebar:popover-open)`, in `PageFrame.astro`) — that only stops the
  page scrolling behind the modal/sidebar when the *root*'s own `overflow` is still `visible`
  (per the CSS Overflow spec's propagation rules, the UA applies `<body>`'s `overflow` to the
  viewport specifically when `<html>`'s is `visible`); with `<html>` no longer `visible`, that
  propagation didn't happen, and the reviewer confirmed the page behind the search modal kept
  scrolling. Fixed by scoping the clip to just the sidebar-less pages' own content column — the
  only place `.landing-band` exists — instead of the document root: `html:not([data-has-sidebar])
  .main-frame { overflow-x: clip; }`. Verified after the fix: opening the search modal (any
  page) and the mobile sidebar popover (`/editor/novyny/` at 375px) both still show
  `document.body`'s `overflow` computed as `hidden`, and the search modal genuinely blocks page
  scroll (`window.scrollBy` no longer moves `window.scrollY`) — the sidebar popover's own scroll
  lock turned out to rely on a separate, pre-existing mechanism unrelated to this rule (`<dialog
  showModal()>`'s native inert-background behaviour for the search modal vs. a plain
  `popover=""` attribute for the sidebar, which doesn't get the same treatment — true before
  design pass 3 touched anything here, and outside this fix's scope). `document.documentElement
  .scrollWidth === document.documentElement.clientWidth` was confirmed at 375, 800, 1024 and
  1280px in this environment's browser pane — which uses overlay scrollbars that reserve no
  layout width, so it cannot reproduce the classic reserved-scrollbar gap the bug depends on;
  the exact-match result confirms the fix introduces no *self-inflicted* overflow, but a classic
  (non-overlay) scrollbar hasn't been re-verified against this exact fix the way the original
  8px-at-716px measurement was. Deliberately not `container-type: inline-size` + `50cqw` (the
  other fix an earlier brief floated): `container-type` implies layout containment, which would
  make whichever ancestor carries it the containing block for the header's `position: fixed` —
  a correctness bug traded for a cosmetic one. Nothing on the site needs genuine page-level
  horizontal scroll (code blocks scroll within their own `pre`, an independent scroll container
  unaffected by clipping above it).
- Languages: user-facing text is Ukrainian; developer-facing files and code are English.
- Acceptance criteria: Gherkin keywords in English, scenario text in Ukrainian (Ukrainian
  issues) or English (English specs).
- Third-party GitHub Actions are pinned by full commit SHA with a `# vX.Y.Z` comment next to
  it; Dependabot keeps both current.
- No real school, city, person, or domain in examples, issues, code, comments, commit messages
  or screenshots. The only example school is the fictitious «Вигаданий ліцей № 0»; screenshots
  come only from Tabula's demo site. **One deliberate exception** (owner's decision,
  2026-09-27): the project's origin story — the «Про проєкт» block on the landing page and
  `src/content/docs/pro-proiekt.md` — names the lyceum where Tabula was created and the two
  people who initiated it. Nothing else about that school (its domain, pupils, staff, content,
  screenshots of its live site) goes anywhere in this repository.
- Documentation text is never edited in this repository — fix it in `tabula-cms/tabula`.
- Generated doc folders (`src/content/docs/{editor,install,qa,dev}/`) are gitignored and never
  committed; `src/content/docs/index.mdx` (the landing page) and `src/content/docs/pro-proiekt.md`
  (the about page) are the two committed content pages — everything else under
  `src/content/docs/` is generated.
- Node: 22 (Astro 7 requires `>=22.12.0`); see `.nvmrc` and `package.json`'s `engines.node`.
- `astro.config.mjs`'s `site`/`base` default to the GitHub Pages project URL
  (`https://tabula-cms.github.io` / `/site`) and are overridden by the `SITE_URL`/`SITE_BASE`
  repository variables in CI; the custom domain later sets `SITE_BASE=/`. Internal links in
  `src/content/docs/index.mdx` — the hero buttons and all other landing links — are written
  without a leading slash (`editor/`, not `/editor/`) so they resolve under either base —
  Starlight does not rewrite frontmatter link fields for the configured `base` itself.
- The sidebar's four groups (`editor`, `install`, `qa`, `dev`) are only added to
  `astro.config.mjs`'s `sidebar` array when the matching `src/content/docs/<dir>` folder
  exists (checked with `node:fs`'s `existsSync`). This is cosmetic, not a build requirement —
  an autogenerated group whose directory doesn't exist still builds fine, it would just show
  an empty group in the sidebar before that section has been imported. Those folders are
  generated by `scripts/fetch-docs.mjs` (issue #3) and gitignored, so a fresh clone that
  hasn't run `docs:fetch` yet has none of them.
- Per-page `<html lang>`: Starlight's `docsSchema()` (0.42.4) has no `lang` frontmatter field
  and no way to set `<html lang>` for one page differently from the site's locale, short of
  making that page's folder its own Starlight locale — which was tried and rejected, because
  it makes Starlight's i18n layer treat that locale as a translation of the *whole* site and
  render every other page a second time under it as "untranslated fallback content"
  (duplicate routes, sidebar entries, and search index entries). Instead: `src/content.config.ts`
  extends `docsSchema()` with an optional `lang` field, and `src/routeData.ts` is registered
  as Starlight `routeMiddleware` to copy that frontmatter value into the route's `lang` and
  `entryMeta.lang` (which also drives the `lang` Starlight puts on `<main>`). Confirmed on a
  real build: `<html lang>` and `<main lang>` both flip to `en` on `/dev/` pages, `/editor/`
  stays `uk`. The import script (#3) sets `lang: en` on pages under `docs/dev/`; nothing keys
  off the folder name itself, so this also works if a future section needs a different
  language. Two accepted gaps: (1) route middleware runs after Starlight has already built
  the page's `<head>` tags, so `og:locale` stays the site's `uk` even on `/dev/` pages — a
  minor SEO nit, not worth reaching into `starlightRoute.head` for; (2) Pagefind's index
  (`dist/pagefind/pagefind-entry.json`) lists both `uk` and `en` once `/dev/` has real
  content — intentional, so a reader on a `/dev/` page searches English-tokenised content.
- "Edit this page" links are per page, not site-wide: there is no `editLink.baseUrl` in
  `astro.config.mjs` (that option makes Starlight build `baseUrl + entry.filePath`, i.e. a
  link into *this* repository's `src/content/docs/...`, which is never where doc text is
  edited). The import script (#3) instead writes an absolute `editUrl` into each imported
  page's frontmatter, pointing at the matching file in `tabula-cms/tabula` (mapping
  `index.md` back to `README.md`). The landing page (`src/content/docs/index.mdx`) isn't
  imported from anywhere, so it sets `editUrl: false` and shows no edit link at all.
- Internal links inside imported pages are always emitted **relative**, computed from each
  page's own URL (`README.md` -> `/<folder>/`, `name.md` -> `/<folder>/<slug>/`), never with a
  leading slash: `path.posix.relative(fromUrl, toUrl) + '/'` (`./` when the two pages are the
  same), with `#anchor` appended verbatim — see `relativeHref()`/`rewriteLink()` in
  `scripts/lib/docs-transform.mjs`. This is the same reason as the index.mdx hero links above:
  Starlight does not prefix Markdown body links with `base` either. A link that leaves `docs/`,
  or lands in `docs/INDEX.md` (skipped, not published), becomes an absolute
  `https://github.com/tabula-cms/tabula/blob/<TABULA_REF>/…` link instead; a link into
  `docs/audits/` or `docs/design/` (internal-only, and not even in the public `tabula-cms/tabula`
  tree, so likely a 404 on GitHub) does the same but also logs a warning, counted in
  `fetch-docs.mjs`'s summary (see issue #3). A page in one of the four imported folders that
  isn't Markdown (none exist today) is not treated as a page either, for the same absolute-link
  reason — `classifyRepoPath()` requires a `.md` extension. Link rewriting skips fenced code
  blocks (` ``` `/`~~~`, indentation and list-item nesting allowed) and inline code spans,
  so example Markdown quoted in the docs is never touched. Known limits: a closing fence must be
  the same length as the opening one, an unclosed fence is not treated as code, and 4-space
  indented code blocks are not detected (none of these occur in Tabula's docs today); a reference-style link
  definition (`[label]: url`), which this transform doesn't understand, is left alone and logged
  as a warning instead of silently mismatching.
- The sidebar replaces Tabula's own in-page navigation line. On the first non-blank line after
  the heading, when its first ` · `/` — `/` | `-separated segment is a leading `[←…](…)` link,
  every segment that is *pure navigation* is dropped: a link whose label starts with `←`; a link
  whose label ends with `→` (optionally preceded by `Далі:`, `Next:`, or `Далі —`); or any link
  (regardless of label) targeting `README.md` or `../INDEX.md`. Surviving segments are rejoined
  with ` · ` and go through normal link rewriting — several real Tabula pages put a genuine
  cross-reference on this line (e.g. `docs/dev/architecture.md`'s `[← Developer docs](README.md)
  · Deep reference: [\`CLAUDE.md\`](../../CLAUDE.md)`, where only the leading back-link is
  navigation), and only the navigation itself should disappear. A line with no leading `←` link
  is never touched. When nothing survives, the whole line is dropped, along with the blank
  line(s) that leaves at the top — see `removeBackLink()` in `scripts/lib/docs-transform.mjs`.
- `sidebar.order` for an imported page comes from its 1-based first-appearance rank as
  `](<folder>/<file>)` in `docs/INDEX.md` (`index.md` is always `0`, overriding whatever rank
  it computes to); pages missing from `INDEX.md` sort after the known ones, alphabetically.
  Gaps in the numbering (e.g. `README.md`'s own rank never being used) are harmless — Starlight
  only needs a consistent relative order.
- `lang: en` is set only on pages imported from `docs/dev/`; nothing else keys off folder names,
  so the rule is really "the import script sets `lang`", not "the `dev/` folder is special" —
  see the per-page `<html lang>` bullet above.
- Link checking is `scripts/check-links.mjs`, run automatically after every `npm run build` via
  npm's `postbuild` hook (also runnable on its own as `npm run check:links`), not
  `starlight-links-validator`: that plugin's `errorOnRelativeLinks` option is all-or-nothing
  (error on every relative link, or silently skip validating every relative link *and its
  anchor* — confirmed by reading its source and by a build with a deliberately broken relative
  link and anchor under `errorOnRelativeLinks: false`, which reported no errors at all). Since
  this site's whole link convention is relative links, that plugin cannot validate them, so
  `check-links.mjs` walks the built `dist/` HTML directly instead: every `<a href>` that isn't a
  URI scheme (`http(s):`, `mailto:`, `tel:`, …) or a protocol-relative `//host/...` URL must
  resolve to a file under `dist/`, and any `#fragment` — including a bare same-page one — must
  match an `id` on the target page.

## Commands

```sh
nvm use
npm ci
TABULA_DOCS_DIR=../tabula/docs npm run docs:fetch   # or clone mode — see CONTRIBUTING.md
npm run dev
npm run build         # runs check-links.mjs afterwards via postbuild; fails on a broken link
npm run check:links   # same check, standalone, without rebuilding
npm test
```

## Related repositories

[`tabula-cms/tabula`](https://github.com/tabula-cms/tabula): default branch `develop`, `main`
is what's released. Its `docs/` folder layout: `INDEX.md`, `editor/`, `install/`, `qa/`,
`dev/`, `issues/` — `INDEX.md` and `issues/` are internal and are not published on this site.
A folder may be absent at the imported ref (Tabula's `main` had no `docs/qa/` before its first
release while `develop` did): `fetch-docs.mjs` then skips it with a warning and the sidebar
hides the group; it only fails when none of the four folders exists.
Page language: `editor/`, `install/`, `qa/` are Ukrainian; `dev/` is English, imported with
`lang: en` in frontmatter — see the per-page `<html lang>` bullet in Conventions for how that
reaches the rendered page.

## Where decisions are recorded

The branch, deploy, and process model in this file was decided in issue #1 of this repository.
The overall plan and issue sequence is issue #10.
