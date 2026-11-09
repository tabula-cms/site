# CLAUDE.md — tabula-cms/site

> Internal reference for Claude Code sessions working in this repository.
>
> **Last verified: 2026-11-09 (story 80, round 3).**
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
| `src/pages/index.astro` | Story 80 (S1): the home, sections 1–13 (plus «Для шкіл, садочків і коледжів», id `kinds`, after the four things: four tiles for the kinds of institution, `Kinds.astro`, no header link) in the product layout (`src/components/product/home/*`); replaced `src/content/docs/index.mdx`, which was deleted |
| `src/layouts/Product.astro`, `src/styles/product.css` | Story 80: the product layout (`<html data-product-page>`, skip link, one `<h1>`, own CSS, self-hosted fonts) — see Conventions |
| `src/components/product/` | Story 80: `Header.astro`, `Footer.astro` (with the `help` slot; its «Продукт» column lists «Демо-сайт»), `Shot.astro` (responsive `astro:assets` image), `Tick.astro`, `shots.ts` (the screenshots + hero preload options), `home/*.astro` (one component per section) |
| `src/scripts/tabs.js`, `src/scripts/header.js` | Story 80: the only two scripts of the product pages (tabs with keyboard support; header shadow and «Меню») |
| `src/assets/shots/` | Story 80: the home's screenshots (WebP) and `facts.json` (`lawFilled`/`lawTotal`), written by `scripts/shots.mjs`; committed |
| `scripts/shots.mjs` (`npm run shots`), `scripts/lib/shot-kep-line.cjs` | Story 80: reproducible screenshots from a running tabula demo; the `SHOTS` table is exported and tested in `test/shots.test.mjs` |
| `scripts/budget.mjs` (`npm run budget`), `scripts/lib/serve-dist.mjs` | Story 80: the home's performance budget (600 KB at 390 px, lazy images, LCP preload); the static server of `dist/` shared with `a11y.mjs` |
| `THIRD_PARTY_LICENSES.md` | The fonts (SIL OFL 1.1, via Fontsource) and the CC0 photos |
| `test/tabs.test.mjs`, `test/shots.test.mjs` | `node --test`: tabs keyboard logic (pure helper + a fake DOM); the `SHOTS` table (every file exists, starts `RIFF….WEBP`, `facts.json` valid) |
| `src/content/pages/*.md(x)`, `src/pages/[slug].astro`, `src/layouts/ProductPage.astro` | Story 80 (S2): the twelve reading pages of the site (the `pages` collection), at `/<slug>/` in the product layout; the `.mdx` ones import `offer.mjs` for the numbers and dates |
| `src/config/offer.mjs` | Story 78 (W1): the **one source of the offer's numbers and dates** — `pilotUntil`, `priceYearUah`, `priceQuarterUah`, `asOf`, reply times, contacts, `cpUrl` / `turnstileSiteKey` (env `TABULA_CP_URL`, `TABULA_TURNSTILE_SITEKEY`), `requestsOpen`, `copiesWhere`; plus the operator line, the "what the institution gets" list (`includes`) and formatters. No page types a price or a date of the offer by hand: such a page is `.mdx` and imports this module; story 80 added `assistantStatus`, `demoSiteUrl`, `supportEmail` (the one public address; `contactEmail` is gone), `includesShort` (the price card's lines, each with `coveredBy` indexes into `includes`) and the helpers `withinWorkingDays`, `formatDateLongYear`, `yearOf`, `formatUah` |
| `scripts/check-built.mjs` (`npm run check:built`; also runs after the build via `postbuild`) | Story 78/80: the product-page rules on all twelve product pages (header, no Starlight chrome, no header/footer link into the docs, forbidden phrases, ʼ, no-break spaces, «станом на» on the own pages, `zaiavka` scripts), the doc-page chrome rules, the operator line on every page. Rules are exported and unit-tested in `test/check-built.test.mjs` |
| `scripts/a11y.mjs` (`npm run a11y`) | Story 78/80: axe-core (WCAG 2.2 AA) over the home and every reading page at 1280 and 320 px (reduced motion) in headless Chromium, served from `dist/`; CI job `a11y` |
| `src/styles/site.css` | `customCss` for the Starlight (documentation) config: the deep ink-blue accent palette and the light-mode header border — see Conventions |
| `src/components/Footer.astro` | `Footer` override for the documentation: Starlight's default footer, then «На головну Tabula», the GitHub links, the tagline and the operator line |
| `src/components/SiteTitle.astro` | `SiteTitle` override: the text default plus a small inline SVG wordmark mark |
| `public/favicon.svg` | The site's mark (story 80, S1): the teal rounded square with the white «T», the same drawing as the product header's inline SVG, with literal hex colours (`#1F6F66`); Starlight's pages use the same file |
| `scripts/lib/docs-transform.mjs` | Pure functions used by `fetch-docs.mjs`: frontmatter building/serialisation, link rewriting, `sidebar.order` from `docs/INDEX.md`, `editUrl` mapping, back-link removal. No filesystem or network access — this is what `test/docs-transform.test.mjs` unit-tests directly. |
| `scripts/fetch-docs.mjs` | Imports `docs/{editor,install,qa,dev}` from `tabula-cms/tabula` into the gitignored `src/content/docs/{editor,install,qa,dev}/` (issue #3) — obtains the source (local dir or a sparse git clone), runs the transform, writes the output, prints a summary. See Conventions for the rules it implements. |
| `scripts/check-links.mjs` (`npm run check:links`; also runs automatically after `npm run build` via `postbuild`) | Walks the built `dist/` and fails if any internal link or `#anchor` resolves to nothing. Replaces `starlight-links-validator`, which cannot validate this site's relative-link convention — see Conventions. |
| `test/offer.test.mjs` | `node --test` check of `src/config/offer.mjs` (types, real dates, `priceQuarterUah * 4 === priceYearUah`, formatters, apostrophes) |
| `test/check-built.test.mjs` | `node --test` unit tests of the pure rules exported by `scripts/check-built.mjs` |
| `test/smoke.test.mjs` | `node --test` check of `astro.config.mjs`'s `site`/`base` defaults and env overrides |
| `test/docs-transform.test.mjs` | `node --test` fixture-based unit tests for `scripts/lib/docs-transform.mjs` (pure functions only, no network) |
| `package.json`, `package-lock.json` | npm scripts and locked dependencies |
| `.github/workflows/ci.yml` | CI: the `build` job that branch protection requires (issue #4); the `a11y` job also runs `npm run budget` (story 80) |
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

- The home (`/`) and the twelve reading pages are not Starlight pages. The home is `src/pages/index.astro` (product layout,
  see the product-pages bullet below). The reading pages (`yak-tse-pratsiuie`, `khostynh-i-tsina`, `dlia-bukhhalterii`, `demo`,
  `zakon-i-sait-shkoly`, `bezpeka-i-dani`, `pidtrymka`, `dostupnist`, `personalni-dani`, `zaiavka`, `pro-proiekt`,
  `vstanovyty-samostiino`) live in the `pages` content collection (`src/content/pages/*.md(x)`, frontmatter `title` and
  `description`, no H1 in the body: `src/layouts/ProductPage.astro` renders the title as the page's one `<h1>`), are
  rendered by `src/pages/[slug].astro` at `/<slug>/`, and are styled by section 17 of `src/styles/product.css` (a narrow
  720 px column, Unbounded H1, Manrope 18 px; a table is wrapped in `<div class="reading-table" tabindex="0" role="region"
  aria-label="…">` so it scrolls on phones). They are not in Starlight's `docs` collection (no search index entry, no
  duplicate route). Internal links inside them are relative (`../zaiavka/`). Starlight `template: splash` is no longer used.
- Accent palette (issue #5): `src/styles/site.css` overrides only `--sl-color-accent-low`, `--sl-color-accent` and
  `--sl-color-accent-high` (dark mode in `:root`, light mode in `:root[data-theme='light']`), following Starlight's own
  theme-colour convention. Light-mode accent ≈ `#1f3d63`, dark-mode ≈ `#8fb3e0` (≥ 5.7:1 contrast). The neutral gray scale
  is untouched. That is all `site.css` holds since S2: the landing/about/W1 rules were removed with those pages.
- The product footer (`src/components/product/Footer.astro`) links every product page, so none is orphaned (`check-built`
  fails a page the footer does not link): «Продукт» — the home anchors (ШІ-помічник, Шаблони, Панель, Ціна; `#…` on the home,
  `{BASE_URL}#…` elsewhere), «Як це працює», «Хостинг і ціна»; «Для закладу» — Для бухгалтерії, «Закон і сайт школи», Безпека й
  дані, Обробка персональних даних, Доступність; «Допомога» — Часті запитання, «Підтримка», «Подати заявку» (zaiavka/), the support and privacy
  addresses, «Установити на власний сервер»; under the tagline in the first column — «Про проєкт».
- The Starlight chrome (S2 of story 80): Starlight is the documentation only. The header is Starlight's own (wordmark via
  `src/components/SiteTitle.astro`, search, theme switch) — no site navigation, no request button; the wordmark leads to
  the product home. `src/components/Footer.astro` keeps Starlight's default footer (edit link, pagination) and adds the link
  «На головну Tabula» (base-aware), the GitHub/licence/bug/vulnerability links, the tagline and the operator line. The
  product pages never link into `editor/`, `install/`, `qa/`, `dev/` from their header or footer (`check-built`); a body
  link from a text page into the docs is allowed. `qa/` is in no menu. `public/favicon.svg` is the product header's mark
  with literal hex colours (a favicon cannot read CSS custom properties); `favicon: '/favicon.svg'` in `astro.config.mjs`
  is Starlight's own default, kept only to document that. The light-mode header border in `site.css` targets
  `header.header`: `--sl-color-hairline` and `-shade` are the same gray-6 there, so it uses gray-5.
- Starlight's scroll lock (search modal, mobile sidebar) relies on `<html>`'s `overflow` staying `visible`: never set
  `overflow` on `:root`/`html` in `site.css`. (History: the deleted landing's full-bleed bands needed a clip, applied
  to `html:not([data-has-sidebar]) .main-frame` only, for exactly this reason; that rule went with the landing in S2.)
- Product pages (story 80, S1): `src/layouts/Product.astro` is the layout of the site's own pages — `<html lang="uk" data-product-page>`,
  a skip link to `#main`, one `<h1>`, no Starlight; `src/styles/product.css` is its stylesheet (the mockup's values as classes;
  tokens as CSS custom properties on `:root[data-product-page]`, focus `3px #2F7FD6`, 44 px targets below 900 px). The home is
  `src/pages/index.astro`, sections 1–13 (and the `kinds` band after the four things) as components in `src/components/product/home/`; `Header.astro` (sticky, seven links +
  «Подати заявку», a `<details>` «Меню» below 1100 px (the seven links and the button need 1025 px, all `nowrap`; below 480 px «Меню» is the three-bar icon only, 44×44, the word stays as visually hidden text, and the header is tighter, so brand + button + icon fit on one line down to 320 px, checked at 320/360/390/430); links are `#…` on the home and `{BASE_URL}#…` elsewhere, prop `home`) and
  `Footer.astro` (four columns, a `help` slot «Довідка» that renders nothing until the docs story) are in `src/components/product/`.
  Fonts are self-hosted from `@fontsource/{unbounded,manrope,caveat}` — own `@font-face` rules with `unicode-range` in
  `product.css` (the packages' per-subset CSS has none), Cyrillic + Latin files of the used weights only, no Google Fonts.
  Fonts have metric-matched Arial fallbacks (`size-adjust`/`ascent-override`… in `product.css`) and the first screen's five woff2 files are preloaded with `font-display: optional` (see the layout-shift bullet below). Unbounded is wide: `product.css` shrinks the display sizes with `clamp()` on phones (the mockup's screenshots were evidently
  rendered without it, so its line breaks differ). ₴ is not in the Cyrillic/Latin subsets and falls back to a system font.
  Only two scripts (header.js is the compact-header state and the «Меню» close; Starlight's link prefetch is switched off with `prefetch: false` in `astro.config.mjs`, so no `page.*.js` loads;
  `check-built` fails a product page that loads any other script): `src/scripts/tabs.js` (WAI-ARIA tabs for both tablists; without JS the tablists are `hidden`, every panel
  is shown under its own `[data-tab-heading]` and has no `tabpanel` role — the script sets role, `aria-labelledby` and `tabindex`; `nextIndex()` is pure and unit-tested) and `src/scripts/header.js` (header shadow
  via IntersectionObserver, «Меню» closes on link/Escape). Motion lives only in `product.css` §16 and `header.js`, all behind `prefers-reduced-motion: no-preference`; scroll-driven
  effects also behind `@supports (animation-timeline: view())` / `scroll()`, written as longhands in separate rules (a minifier folds
  `animation` + `animation-timeline: view()` into a shorthand Chromium rejects). Effects: reveal (rise 24 px over entry 0–40 %) with
  stagger by `--i` shifting each item's `animation-range`; devices once as they enter (laptops tilt, phones/chat slide ~40 px, КЕП/law cards
  rise; they end at rest at entry 100 %); the hero's devices settle once by time on load (transform only, the LCP image never starts
  invisible); three H2 key phrases (`.marker--scroll`) draw on scroll, the hero's (`.marker--load`) on load; the price comes into focus and its marker draws (see below);
  a reading-progress bar (`.page-progress`, a fixed 3 px bar of its own, outside the header, `scroll(root)`); the header's progress bar sits on its bottom edge (the header is sticky; the bar is its last child, `top: 100%`). The header itself is always visible — there is no hide-on-scroll (owner's decision: a vanishing menu with only the bar left was confusing); `header.js` only toggles the compact `is-scrolled` state (shadow, smaller padding, compensated by a margin so the document keeps its height) with an IntersectionObserver and closes «Меню» on link/Escape. `.anchor`'s `scroll-margin-top` clears the compact header (72 px; 96 px below 900 px, a safe margin: the header button never wraps and the header is 73 px on phones). `scripts/a11y.mjs` checks the header is in the viewport after scrolling 2000 px and after a long jump, at 1280 and 390 px. Device effects end at `entry 40%` and the slides are transform-only. No scroll hijacking; transform/opacity only (the richer effects below were added on 2026-11-09).
  `src/assets/shots/*.webp` through `astro:assets` (`components/product/Shot.astro`); the hero laptop is the LCP image (eager,
  `fetchpriority=high`, preloaded in `<head>` with the same widths/sizes from `shots.ts`). Every number, date, sum and address on the
  home comes from `offer.mjs` (`formatDateLongYear`, `formatUah`, `withinWorkingDays`, `includesShort`, `supportEmail`, `assistantStatus`,
  `demoSiteUrl`, `demoHref(root)`); reply times always say «зазвичай» (story 78 decision 24). The «23 з 24» figure is `src/assets/shots/facts.json`.
  The request section renders no form while `requestsOpen` is false (the form is slice S3: see `TODO(S3)` in `Request.astro`).
- Richer motion on the home (owner's request, 2026-11-09; **the owner widened spec decision 10 the same day: light parallax, number
  counters and a scroll-linked story are allowed on the home**). Still without exception: everything is off under
  `prefers-reduced-motion: reduce` (all of it is in `product.css` §18 inside `@media (prefers-reduced-motion: no-preference)`; the
  full-page screenshots under reduced motion are pixel-identical to the page before it); no scroll hijacking (no snapping, no wheel/touch
  interception, no auto-advancing carousel; the page never changes the scroll); content never hidden without JS, without
  `animation-timeline` or with reduced motion; screen readers get the real text once (animated duplicates are `aria-hidden`); `translate`/
  `scale` (individual properties) so a rule's own `transform` is never clobbered; scroll-driven effects as longhands. The effects:
  (1) **the assistant plays** (`src/scripts/tabs.js`, `PHASES`/`stagger`/`buildSchedule`/`PLAN`, unit-tested): when the section first enters
  the viewport (IntersectionObserver, once) and on every tab switch the panel runs «Ви даєте» (pills pop, the message is typed word by word
  from spans the script wraps around the real words, thumbs/files/photos fade in) → the arrow pulses and draws (`stroke-dashoffset`) →
  «Готую чернетку…» → the draft builds part by part (card, title, text, the `[уточніть: хто]` and «неясно — перевірте» highlights flash
  amber twice, notes slide in, buttons pop; table rows, descriptions, the plan items one by one; «Було» fades into «Стало»), in at most 2.5 s,
  restarting on a switch. The script marks parts with `data-p` and delays `--d`; CSS (`.is-playing`, `.is-primed` until the first play) does the rest.
  (2) **the hero**: on load the laptop rises, the phone slides in, the AI card pops and its title is typed (spans added by the script
  only when motion is allowed), `без рутини` draws (the H1 is «Сайт закладу освіти без рутини»; under it a quiet link «Для шкіл, садочків, коледжів і закладів професійної освіти →» to `#kinds`, 44 px tall on phones; `.marker` and «закладу освіти» are `white-space: nowrap`. The H1 is «Сайт закладу освіти / без рутини» at 1440, 1280, 1200 (44 px, a 572 px text column beside the laptop from 1180 px, where side by side really fits; below it the hero is stacked) and in the stacked layout at 1000–1179 (52 px, the text has the whole row, max 720 px); on phones (≥320 px, `clamp(26px, 8.6vw, 52px)`) it is «Сайт / закладу освіти / без рутини», never «освіти» alone. The laptop is 530–580 px wide beside the text); then idle loops (phone and card float ±4 px, 6.5 s / 7 s; the mint blob drifts 26 s),
  transform-only and left running off screen (compositor-only, no layout or paint). (3) **parallax**, ≤ 24 px, `translate`: the hero's phone and
  card over the first 700 px of scroll (`scroll(root)`), the blob slower; the second card of «Документи з КЕП» and the phone of «Такий вигляд»
  (`view()` cover). None on text blocks, none in «Харчування». (4) **counters**: only «23 з 24» counts up while it enters
  (`@property --n` on an `aria-hidden` overlay `.count__anim`, `entry 0%` → `cover 45%`); the real text (`.count__real`) stays in the DOM
  and is transparent only while the overlay shows the same text. **The price never counts** (owner, 2026-11-09: people dislike a price that changes): the digits
  `4 800 ₴` (`.price-focus`) come into focus as the card scrolls in (opacity .35 → 1, blur 6 px → 0, scale .96 → 1 over the card's view timeline `--price-card`, entry 0–40 %), then the marker under them (`.marker--price`, a thin band over the lower 20 % of the line box, never over the digits) draws over entry 40–70 %. End state is fully opaque and sharp; without support or under reduced motion the sum is simply sharp with the marker drawn.
  (5) **«Харчування» as a scroll story**, from 900 px and only with `animation-timeline: view()`: the four points are four 75 vh steps (each its
  own view timeline `--s1…--s4`, `timeline-scope` on the section); the phones become one sticky stage whose screens crossfade (admin → day page + the chat
  card sliding in → `phone-meal-allergens` → the handwritten sheet with a scanning line and the «Сніданок / Обід» lines); the current step is the dark
  one — by colour, not opacity, so every step keeps ≥ 4.5:1. `phone-meal-allergens` is a real shot of the public day page with the marks on: its row in `scripts/shots.mjs` has `setup: 'allergens'` (signs in as the fixture admin, turns on «Позначати алергени й калорійність у меню», marks the shot's day dishes with codes and kcal — it CHANGES the demo's throwaway database, so only that row runs it) and scrolls to the dishes and the legend. The panel screens of the «Панель» story (`admin-overview` `/admin`, `admin-news-editor` `/admin/news/1/edit`, `admin-pages` `/admin/pages`, `admin-documents`, `admin-albums` `/admin/photos`, `admin-events` `/admin/events`) are template-free rows clipped to the panel's content area, 1110×624 (16:9, so no button is cut at the right edge; `crop-overview` was dropped for `admin-overview`, same clip). The demo throttles sign-ins (a few per minute); shoot rows one at a time. (6) **«Панель» as a scroll story** (`Panel.astro`, `product.css` §19 / item 6 of the motion block), from 900 px wide, and 780 px high (the pin is sized to its content, 614–628 px at those widths, under an 84 px sticky top; step 6 was checked fully on screen at 1440×900, 1280×800, 1100×800, 1000×860 and 900×860, and 1000×760 / 900×760 get the static cards), and only with `animation-timeline: view()`: the model is «Харчування», the stage is the laptop. Six steps (title + text; the first two are the mockup's strings, the rest written from `docs/editor/*.md`), six 75 vh spacers (`--p1…--p6`) + a 50 vh tail, the heading, the list and the laptop pinned (`.panel__pin`, sticky, content-sized); the laptop's screen crossfades through six panel screens (`admin-overview`, `admin-news-editor`, `admin-pages`, `admin-documents`, `admin-albums`, `admin-events`), the current step is dark with an accent bar (the others #5f6e83), six `aria-hidden` dots follow; reuses `lay-*` / `step-*` keyframes. Otherwise (narrow, short, no support, reduced motion) the six steps are a static grid of cards with a lazy screenshot each and the laptop is `display: none` (both sets of images are lazy, so only the shown one is fetched). The five short lines of the mockup («Огляд» підкаже… Переїзд…) are a compact grid (`.panel__notes`) under the scene. Step 2 says «попередні версії зберігаються», not «кожна версія»: the news «Історія» keeps the last 50 versions. The script is inlined
  into the home page whatever its size (`assetsInlineLimit` in `astro.config.mjs`): as a separate file it ran after the first paint and the panels it hides flashed.
  `npm run a11y` also scans the home at 1280 px with motion allowed after scrolling to the bottom in steps and waiting 3 s.
- Screenshots (story 80, decision 11): `scripts/shots.mjs` (`npm run shots`) drives Playwright against a running tabula demo
  (`npm run demo -- --seed school --template <key>` in a tabula checkout; `TABULA_DEMO_URL`, default `http://127.0.0.1:3100`) and
  writes WebP into `src/assets/shots/` (committed); its exported `SHOTS` table is the list of files. `--template <key>` shoots that
  template's rows plus the template-free ones (the body class is checked against the demo's template); `--only <file>` one row.
  The demo's address (origin and host:port from `TABULA_DEMO_URL`, and `localhost`) is replaced by `licey0.tabula.org.ua` in the page before each shot; shots are written at their real scale-2 pixel size (astro:assets makes the responsive widths). `phone-meal-day` and `kep-line` are pinned to `panorama`. `kep-line` needs a signed document, which
  the demo cannot show (its signatures are not chained to a trusted provider), so `scripts/lib/shot-kep-line.cjs` starts a throwaway
  site from the tabula checkout (`TABULA_DIR`, default `../tabula`) with a fictitious trusted chain. The three CC0 photos are copied
  from tabula's `test/fixtures/school-seed/photos/`; see `THIRD_PARTY_LICENSES.md`.
- The demo site (story 80, round 3): `offer.demoSiteUrl` stays `null` until a public demo exists. The hero's «Подивитися приклад сайту» and the templates section's «Відкрити приклад сайту» (always rendered now) use `demoHref(root)` from `offer.mjs`: the demo URL when set, else `{base}demo/`. `src/content/pages/demo.mdx` («Демо-сайт», reading page, linked from the footer's «Продукт» column) shows the amber chip «У розробці», the two verbatim sentences and links to `../#look` and `../#request` while `demoSiteUrl` is null; once it is set it shows the primary button «Відкрити демо-сайт» instead (no chip). `test/offer.test.mjs` covers both states of `demoHref`.
- Layout shift (round 3): the first screen must not move when the fonts arrive (CLS 0.0000 over 10 loads at 1440 and 390, motion allowed and reduced). Unbounded and Manrope faces are `font-display: optional` (Caveat stays `swap`: it is below the first screen) and five files are preloaded in `src/layouts/Product.astro` (Unbounded cyrillic 600 and latin 600 — the heading and the wordmark — and Manrope cyrillic 400, 600 and 700 — the nav links are 600), so they are used from the first paint or not at all. The other faces (Manrope cyrillic 500 and 800 and the Latin Manrope) are not preloaded, so on a cold first visit those weights (the extra-bold lines, digits and Latin words) render in the Arial fallback and the real font arrives on the next page or visit — the price of CLS 0.000 with a light preload; ten preloads delayed the LCP image (slow 4G, cold cache, median of 5: LCP ~1660 ms at 1440 and ~1165 ms at 390 with ten, ~830 / ~745 with four, ~1130 / ~705 with the five now; FCP ~700–760 and CLS 0 throughout); the metric-matched fallbacks alone were not exact (the hero wrapped differently in Arial: CLS 0.017–0.35). Re-measure after touching the fonts or the hero text.
- `astro.config.mjs` configures `@astrojs/sitemap` itself with a filter, because the integration lists the home twice (`…/site` and `…/site/`) when `base` has no trailing slash; Starlight only adds its own copy when none is configured.
- Product-page checks: `check-built.mjs` treats a built page (the home and the twelve reading pages) whose `<html>` has `data-product-page` as a product page (seven header
  links, no Starlight chrome, forbidden phrases, ʼ, no-break spaces before ₴/«року»/«грн» and inside dates on the raw text, «ШІ-помічник»
  spelling, the chip while `assistantStatus` is `testing`, a law word only with a link to `zakon-i-sait-shkoly/`); on every built page
  every `<img>` has `alt` and nothing refers to Google Fonts; the demo address (`127.0.0.1`, `localhost`) is kept out of every page
  except tabula's imported docs (they may say `localhost` in a command). `npm run a11y` also opens each tab of both tablists on the
  home (reduced motion); `npm run budget` fails above 600 KB on first load at 390 px, on a non-lazy image below the first viewport, or
  without a matching preload of the LCP image (CI runs it after a11y).
- Story 78 pages (W1, now the reading pages of S2): the numbers, dates, reply times and contacts of the offer come only from
  `src/config/offer.mjs`. The operator is only «фізична особа — підприємець» (decision 5) — no name anywhere. The key messages
  of the spec are quoted verbatim, with ʼ (U+02BC) as the apostrophe. Every own page that names a law or a procurement rule
  says «станом на {asOf}» and links its source; `scripts/check-built.mjs` holds this on every own page. Sums in running text
  come from `formatGrn()` (no-break spaces) and dates with a year from `formatDateLongYear()`. `npm run a11y` needs
  `npx playwright install chromium` once.
- Languages: user-facing text is Ukrainian; developer-facing files and code are English.
- Acceptance criteria: Gherkin keywords in English, scenario text in Ukrainian (Ukrainian
  issues) or English (English specs).
- Third-party GitHub Actions are pinned by full commit SHA with a `# vX.Y.Z` comment next to
  it; Dependabot keeps both current.
- No real school, city, person, or domain in examples, issues, code, comments, commit messages
  or screenshots. The only example school is the fictitious «Вигаданий ліцей № 0»; screenshots
  come only from Tabula's demo site. There is no exception: the «Про проєкт» page says «Tabula створена в
  українському ліцеї» and «Tabula розробляє команда в Україні» and names neither a school nor people
  (story 80, slice S2).
- Documentation text is never edited in this repository — fix it in `tabula-cms/tabula`.
- Generated doc folders (`src/content/docs/{editor,install,qa,dev}/`) are gitignored and never
  committed; `src/content/docs/` holds nothing else, and the site's own pages live in `src/content/pages/`.
- Node: 22 (Astro 7 requires `>=22.12.0`); see `.nvmrc` and `package.json`'s `engines.node`.
- `astro.config.mjs`'s `site`/`base` default to the GitHub Pages project URL
  (`https://tabula-cms.github.io` / `/site`) and are overridden by the `SITE_URL`/`SITE_BASE`
  repository variables in CI; the custom domain later sets `SITE_BASE=/`. Internal links in
  the hand-written W1 pages (`src/content/docs/*.mdx`) are written
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
  `index.md` back to `README.md`). The site's own pages (`src/content/docs/*.mdx`) aren't
  imported from anywhere, so they set `editUrl: false` and show no edit link at all.
- Internal links inside imported pages are always emitted **relative**, computed from each
  page's own URL (`README.md` -> `/<folder>/`, `name.md` -> `/<folder>/<slug>/`), never with a
  leading slash: `path.posix.relative(fromUrl, toUrl) + '/'` (`./` when the two pages are the
  same), with `#anchor` appended verbatim — see `relativeHref()`/`rewriteLink()` in
  `scripts/lib/docs-transform.mjs`. This is the same reason as the W1 pages' relative links above:
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
npm run check:built   # story 78 rules over dist/ (runs after the build too)
npm run a11y          # axe over the home and the twelve reading pages, needs a build and `npx playwright install chromium`
npm run budget        # story 80: the home's size/lazy/LCP budget, needs a build and Chromium
npm run shots -- --template panorama   # story 80: screenshots from a running tabula demo (see CONTRIBUTING.md)
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
