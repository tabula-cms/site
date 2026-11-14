# CLAUDE.md — tabula-cms/site

> Internal reference for Claude Code sessions working in this repository.
>
> **Last verified: 2026-11-12 (owner decision K1: the exit no longer promises that every backup is deleted).**
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
| `src/pages/index.astro` | Story 80 (S1): the home, sections 1–13 (plus «Для шкіл, садочків і коледжів», id `kinds`, after the four things: four tiles for the kinds of institution, `Kinds.astro`, no header link; and «З чого почати», id `start`, between them: four cards to the role pages, `Roles.astro`) in the product layout (`src/components/product/home/*`); replaced `src/content/docs/index.mdx`, which was deleted |
| `src/layouts/Product.astro`, `src/styles/product.css` | Story 80: the product layout (`<html data-product-page>`, skip link, one `<h1>`, own CSS, self-hosted fonts) — see Conventions |
| `src/components/product/` | Story 80: `Header.astro`, `Footer.astro` (with the `help` slot; three link columns and a bottom row, see Conventions), `Shot.astro` (responsive `astro:assets` image), `Tick.astro`, `shots.ts` (the screenshots + hero preload options), `home/*.astro` (one component per section) |
| `src/components/product/home/NextStep.astro` | The slim «what to do next» row between two sections of the home (after the assistant and after «Чому Tabula»): one sentence, «Подати заявку» (`requestHref`) and an optional second link. «Чому Tabula» marks the usual way with a red cross and muted text, not struck-through text (it was hard to read); the assistant's six tabs are a 2 × 3 grid below 560 px |
| `src/scripts/tabs.js`, `src/scripts/header.js` | Story 80: the only two scripts of the product pages (tabs with keyboard support — the assistant, the templates and the step tabs of «Харчування» and «Панель»; header shadow and «Меню») |
| `src/assets/shots/` | Story 80: the home's screenshots (WebP) and `facts.json` (`lawFilled`/`lawTotal`), written by `scripts/shots.mjs`; committed |
| `scripts/shots.mjs` (`npm run shots`), `scripts/lib/shot-kep-line.cjs` | Story 80: reproducible screenshots from a running tabula demo; the `SHOTS` table is exported and tested in `test/shots.test.mjs` |
| `scripts/budget.mjs` (`npm run budget`), `scripts/lib/serve-dist.mjs` | Story 80: the home's performance budget (600 KB at 390 px, lazy images, LCP preload); the static server of `dist/` shared with `a11y.mjs` |
| `THIRD_PARTY_LICENSES.md` | The fonts (SIL OFL 1.1, via Fontsource) and the CC0 photos |
| `test/tabs.test.mjs`, `test/shots.test.mjs` | `node --test`: tabs keyboard logic (pure helper + a fake DOM); the `SHOTS` table (every file exists, starts `RIFF….WEBP`, `facts.json` valid) |
| `src/content/pages/*.md(x)`, `src/pages/[slug].astro`, `src/layouts/ProductPage.astro` | Story 80 (S2): the thirteen reading pages of the site (the `pages` collection), at `/<slug>/` in the product layout; the `.mdx` ones import `offer.mjs` for the numbers and dates |
| `src/config/offer.mjs` | Story 78 (W1): the **one source of the offer's numbers and dates** — `pilotUntil`, `priceYearUah`, `priceQuarterUah`, `asOf`, reply times, contacts, `cpUrl` / `turnstileSiteKey` (env `TABULA_CP_URL`, `TABULA_TURNSTILE_SITEKEY`), `requestsOpen`, `copiesWhere` (Hetzner), `backupRetentionDays`, `exitClosedDays`, `copiesGoneDays` (owner decision K1: the locked encrypted copies are gone no later than 370 days after deletion; equals cloud `MIRROR_GONE_DAYS`); plus `footerLine` (the footer bottom line), `exitText`, the "what the institution gets" list (`includes`) and formatters. No page types a price or a date of the offer by hand: such a page is `.mdx` and imports this module; story 80 added `assistantStatus`, `demoSiteUrl`, `supportEmail` (the one public address; `contactEmail` is gone), `includesShort` (the price card's lines, each with `coveredBy` indexes into `includes`) and the helpers `withinWorkingDays`, `formatDateLongYear`, `yearOf`, `formatUah`; story 82 (S1a) added `complaintEmail` (the owner fills it in; `complaintEmail()` falls back to `privacyEmail()` while it is null), used by the section «Демо» (`#demo`) of `personalni-dani.mdx`; story 82 (S1b) added `demoOpen` (false), `demoKinds` (`['school']`), `demoUrl` (env `TABULA_DEMO_URL`), `demoTurnstileSiteKey` (env `TABULA_DEMO_TURNSTILE_SITEKEY`), `DEMO_KINDS`, `DEMO_ROLES` and `demoHeading()`; story 82 phase 2 added `demoKeepDays` (14, a demo copy from its last save), `demoReminderDays`, `demoViewMinutes` (a colleague's look) and `demoRefHours` (the CP's `demo_ref` cookie), quoted by Consent 1 and the section «Демо», and `cpBackupDays` (30: the control plane's nightly copies kept on the Storage Box, equals cloud `OFFSITE_KEEP`; no Storage Box snapshots), the longest erased data stays in the CP's backups; spec 83 added `checkedOn` («Перевірено …»), `urgentSubject`, `documentsSubject`, `firstWeekHours`, `weeklyMinutes`, `trashDays`, `addressHoldMonths`, `contractUntil`, `paymentBankDays`, `graceDays`, `noticeDays`, `law` (procurement limits and working-day deadlines), the codes (`dk021*`, `kekv*`), `operator` and `lyceum` (null until the owner fills them in), `authorsLine` (and `footerLine` built from it), `decisions` + `decided()`, `documents`, `priceIncludes`, `exitSteps`; the 2026-11-14 round added `requestFormOpen()`, `requestHref()`, the env switches `TABULA_REQUESTS_OPEN` / `TABULA_DEMO_OPEN` (exactly `1`; no workflow sets them) and `assistantUndoDays` / `assistantProposalDays` (the assistant's numbers on the home, equal to tabula's `docs/editor/pomichnyk-i-dani.md`) |
| `src/layouts/RolePage.astro`, `src/config/audience.mjs`, `src/components/product/audience/*`, `src/styles/audience.css`, `src/scripts/page-tools.js` | Spec 83: the role pages and «Ціна й оплата» (hero, «На цій сторінці», the components of spec §10, print, «Скопіювати»/«Роздрукувати») — see Conventions |
| `src/data/article30.mjs`, `src/data/lawChanges.mjs`, `src/data/sources.mjs` | Spec 84: the list «Що оприлюднити» of «Закон і сайт школи» (article 30, finances, other laws; `panelKey` names the matching item of tabula's `src/config/transparency.js`), the law's changes (ChangeLog), the sources with full requisites and the numbered «Джерела» of each page (official texts only) |
| `src/lib/refs.mjs`, `test/spec84.test.mjs` | Spec 84: `refParts()` (`[n]` and `41¹` in a spec string), `firstRefIds()` (the anchor `ref-n` of a source's first mention), `refNumbers()`; the tests of spec 84's data and checks |
| `src/components/product/PreFooterCta.astro` | Spec 83 §9: the band above the footer of every product page but `zaiavka` |
| `src/lib/typo.mjs`, `src/components/product/Typo.astro` | Spec 83: `typo()`/`typoHtml()` (no-break spaces) and `slugUk()` (Latin heading ids); `Typo.astro` runs them over every own page's body |
| `test/typo.test.mjs` | `node --test`: `typo()`, `typoHtml()`, `slugUk()` |
| `src/pages/sprobuvaty.astro`, `src/scripts/demo-try.js`, `src/styles/try.css` | Story 82 (S1b): «Спробувати», the demo's sign-in — see Conventions |
| `src/components/product/RequestForm.astro`, `src/styles/request.css`, `src/pages/zaiavka/diakuiemo.astro`, `src/pages/zaiavka/pomylka/[code].astro` | Story 78 W2 / story 80 S3: the pilot request form (a plain HTML form posted to `{cpUrl}/v1/requests`; built into `zaiavka.mdx` only while `requestFormOpen()`) and the control plane's result pages — see Conventions («The request form») |
| `test/demo-try.test.mjs` | `node --test`: the pure helpers of `demo-try.js` (answers → states, plural, timer, referrer domain, stored attempt) |
| `scripts/check-built.mjs` (`npm run check:built`; also runs after the build via `postbuild`) | Story 78/80: the product-page rules on all thirteen product pages (header, no Starlight chrome, no header/footer link into the docs, forbidden phrases, ʼ, no-break spaces, «станом на» on the own pages, `zaiavka` scripts), the doc-page chrome rules, `footerLine` on every page, `CLOSED_SERVICE_PATTERNS` on the product pages, the «Спробувати» rules (`checkTryPage`, `checkTryLinks`). Rules are exported and unit-tested in `test/check-built.test.mjs` |
| `scripts/a11y.mjs` (`npm run a11y`) | Story 78/80: axe-core (WCAG 2.2 AA) over the home and every reading page at 1280 and 320 px (reduced motion) in headless Chromium, served from `dist/`; CI job `a11y` |
| `src/styles/site.css` | `customCss` for the Starlight (documentation) config: the deep ink-blue accent palette and the light-mode header border — see Conventions |
| `src/components/EditLink.astro` | `EditLink` override that renders nothing (the docs' `editUrl` points into a private repository) |
| `src/components/Footer.astro` | `Footer` override for the documentation: Starlight's default footer, then «На головну Tabula», «Підтримка», `footerLine` and «© 2026 Tabula» (no GitHub or licence links) |
| `src/components/SiteTitle.astro` | `SiteTitle` override: the text default plus a small inline SVG wordmark mark |
| `public/favicon.svg` | The site's mark (story 80, S1): the teal rounded square with the white «T», the same drawing as the product header's inline SVG, with literal hex colours (`#1F6F66`); Starlight's pages use the same file |
| `scripts/lib/docs-transform.mjs` | Pure functions used by `fetch-docs.mjs`: frontmatter building/serialisation, link rewriting, `sidebar.order` from `docs/INDEX.md`, `editUrl` mapping, back-link removal. No filesystem or network access — this is what `test/docs-transform.test.mjs` unit-tests directly. |
| `scripts/fetch-docs.mjs` | Imports `docs/{editor,install,qa,dev}` from `tabula-cms/tabula` into the gitignored `src/content/docs/{editor,install,qa,dev}/` (issue #3) — obtains the source (local dir or a sparse git clone), runs the transform, writes the output, prints a summary. See Conventions for the rules it implements. |
| `scripts/check-links.mjs` (`npm run check:links`; also runs automatically after `npm run build` via `postbuild`) | Walks the built `dist/` and fails if any internal link or `#anchor` resolves to nothing. Replaces `starlight-links-validator`, which cannot validate this site's relative-link convention — see Conventions. |
| `test/offer.test.mjs` | `node --test` check of `src/config/offer.mjs` (types, real dates, `priceQuarterUah * 4 === priceYearUah`, formatters, apostrophes; spec 83: `decided()` shows nothing unconfirmed, the operator and lyceum stay null, the decisions take their numbers from `offer`) |
| `test/check-built.test.mjs` | `node --test` unit tests of the pure rules exported by `scripts/check-built.mjs` |
| `test/smoke.test.mjs` | `node --test` check of `astro.config.mjs`'s `site`/`base` defaults and env overrides |
| `test/docs-transform.test.mjs` | `node --test` fixture-based unit tests for `scripts/lib/docs-transform.mjs` (pure functions only, no network) |
| `package.json`, `package-lock.json` | npm scripts and locked dependencies |
| `.github/workflows/ci.yml` | CI: the `build` job that branch protection requires (issue #4); the `a11y` job also runs `npm run budget` (story 80); its «Install Chromium» falls back to `playwright install chromium` without `--with-deps` when apt fails or takes over 5 minutes |
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

- Tabula is a closed, paid service (footer-and-audience-pages spec, 2026-11-09): no user-facing text mentions open code, a
  licence, GitHub (except «GitHub Pages» as this site's host on the privacy pages), self-installation or «вільна … назавжди»;
  `check-built` holds this on every product page (`CLOSED_SERVICE_PATTERNS`). `/vstanovyty-samostiino/` was deleted and is an
  Astro `redirects` entry to `/khostynh-i-tsina/` (out of the sitemap). Only `docs/editor/` is imported (`PUBLISHED_FOLDERS`
  in `scripts/lib/docs-transform.mjs`); a link from it into `install/`, `qa/`, `dev/` or out of `docs/` keeps its text and loses
  the link. Starlight shows no GitHub icon and no edit link (`src/components/EditLink.astro` renders nothing).
- The home (`/`) and the thirteen reading pages are not Starlight pages. The home is `src/pages/index.astro` (product layout,
  see the product-pages bullet below). The reading pages (`yak-tse-pratsiuie`, `khostynh-i-tsina` («Ціна й оплата»), `dlia-dyrektora`,
  `dlia-vidpovidalnoho`, `dlia-bukhhalterii`, `demo`, `zakon-i-sait-shkoly`, `bezpeka-i-dani`, `pidtrymka`, `dostupnist`,
  `personalni-dani`, `zaiavka`, `pro-proiekt`) live in the `pages` content collection (`src/content/pages/*.md(x)`, frontmatter `title` and
  `description`, no H1 in the body: `src/layouts/ProductPage.astro` renders the title as the page's one `<h1>`), are
  rendered by `src/pages/[slug].astro` at `/<slug>/`, and are styled by section 17 of `src/styles/product.css` (a narrow
  720 px column, Unbounded H1, Manrope 18 px; a table is wrapped in `<div class="reading-table" tabindex="0" role="region"
  aria-label="…">` so it scrolls on phones). They are not in Starlight's `docs` collection (no search index entry, no
  duplicate route). Internal links inside them are relative (`../zaiavka/`). Starlight `template: splash` is no longer used.
- Accent palette (issue #5): `src/styles/site.css` overrides only `--sl-color-accent-low`, `--sl-color-accent` and
  `--sl-color-accent-high` (dark mode in `:root`, light mode in `:root[data-theme='light']`), following Starlight's own
  theme-colour convention. Light-mode accent ≈ `#1f3d63`, dark-mode ≈ `#8fb3e0` (≥ 5.7:1 contrast). The neutral gray scale
  is untouched. That is all `site.css` holds since S2: the landing/about/W1 rules were removed with those pages.
- The product footer (`src/components/product/Footer.astro`, spec 83 §9): the brand column (mark, «Сайти для шкіл, садочків і
  коледжів із готовими розділами за законом», «Про проєкт»), then «Для кого» (Для директора, Для того, хто веде сайт, Для
  бухгалтерії), «Про сервіс» (Як це працює, Ціна й оплата, Безпека й дані, Закон і сайт школи), «Допомога» (Часті запитання,
  Посібник редактора, Підтримка, the support address); a bottom row with Обробка персональних даних · Доступність · the privacy
  address, `footerLine` of `offer.mjs` (the authors line) and «© 2026 Tabula». The link to the current page has
  `aria-current="page"`. Below 900 px the brand and «Допомога» take whole rows and the other two columns sit side by side.
  `check-built` fails an own page the footer does not link, except `FOOTER_EXEMPT` (`demo`, `zaiavka`), which must be linked
  from some other product page. Above the footer every product page but `zaiavka` has the band `PreFooterCta.astro`
  («Безкоштовно до {pilotUntil}» · Подати заявку · Подивитися шаблони; `Product.astro` prop `cta`).
- The role pages (spec 83, 2026-11-09): «Для директора», «Для того, хто веде сайт», «Для бухгалтерії» and «Ціна й оплата» are
  MDX pages of the `pages` collection with frontmatter `hero: <key>`; `[slug].astro` renders them with
  `src/layouts/RolePage.astro`: the switcher of the three role pages (`RoleSwitcher`, a sideways-scrolling row on phones), the
  hero (`RoleHero`: label, H1, lead, `KeyFacts`, buttons, «Перевірено {checkedOn}»), «На цій сторінці» (`OnThisPage`, from
  `render()`'s headings — Starlight's TOC needs Starlight's route data and `sl-` chrome; sticky on the right from 1100 px, a
  closed `<details>` below), the body, then «Що далі», «Інші сторінки» (`RelatedRoles`) and `CommunityLine`. The hero and the
  end are data in `src/config/audience.mjs`; the components are in `src/components/product/audience/` (`Steps`/`Step`,
  `Timeline`/`TimelineStage`, `AnswerList`, `CardGrid`/`ChoiceCards`/`Card`, `Faq`, `Callout`, `StatusBadge`,
  `DocumentTable`, `CopyBlock`, `Requisites`, `SourceRef`/`SourceList`, `ShareButton`, `PriceCard`, `Actions`); styles in
  `src/styles/audience.css` (imported by the layout only). Every own page's body goes through `src/components/product/Typo.astro`
  (`typoHtml()` of `src/lib/typo.mjs`: the no-break spaces of the spec's rules are put by code); on the role pages it also
  turns Astro's Cyrillic heading ids into Latin ones (`slugUk()`, the national transliteration), the ids «На цій сторінці»
  links to. `src/scripts/page-tools.js` (marker `data-page-tools`, allowed by check-built on `data-role-page` pages only)
  shows and runs «Скопіювати» and «Роздрукувати»; without JavaScript both stay hidden. Print (`audience.css`): no chrome,
  buttons or «докладніше», questions printed open, the page address and «Перевірено …» at the bottom; «Роздрукувати» of
  «Для бухгалтерії» adds `print-summary` to `<html>` and prints only `[data-print-summary]` blocks (Коротко, the details,
  the plan line) on one A4 sheet (`npm run a11y` checks it). «Для бухгалтерії» was rewritten on 2026-11-14
  after a school accountant and four reviews (an accounting firm, a school accountant, the tax office, the auditors) read
  it. Owner's decisions of that day: the page is exhaustive but reads short — «Що робить заклад» (three actions) first, then
  «Коротко», the requisites, the detailed steps as one closed block per stage (`Faq` + `Steps`: trial, plan, January,
  each quarter, ids `etap-…` and `shchokvartalu`), then «Довідка» as closed questions under H3 groups; the owner expects
  to see «an offer and one page to sign», so nothing long may stand open above the fold; the contract is an offer (договір приєднання, its text signed with the operator's КЕП) the institution
  joins by a one-page application its head signs, which the operator prepares and signs first and the head signs
  and dates (that date is the contract's date and the start of the paid period; the trial runs until it; the last
  settlement period of a year is 1 October – 15 December), a two-sided copy only if the Treasury office asks; the code is
  72260000-5, never 72410000-7 «Послуги провайдерів» (accountants read it as an internet provider). The page must keep
  the notification to Мінцифри (division 72 is informatization), Є-Data, ЄСВ and the year-end act. Its sources line
  says «Тексти норм звірено … {sourcesRead}» (a date in the MDX), not «Перевірено», which check-built ties to
  `checkedOn`. The operator's details (`offer.operator`, owner's decision
  «Реквізити»), the lyceum of «Хто ми» (`offer.lyceum`) are null until the owner fills them in; a null field is not shown.
  Texts that wait for the owner's confirmation are `offer.decisions.*` (`confirmed: false`); pages show them only through
  `decided()`, so an unconfirmed promise never renders.
- The group «Про сервіс» (spec 84, 2026-11-10): «Як це працює» (`hero: robota`), «Ціна й оплата» (`tsina`), «Безпека й дані»
  (`bezpeka`), «Закон і сайт школи» (`zakon`) are RolePage pages with `service: <slug>` in their hero: `ServiceNav` (the row of
  the four, `SERVICE_PAGES` of `audience.mjs`, the role switcher's styles) instead of `RoleSwitcher`, the label «Про сервіс»,
  «Перевірено {checkedAt.service}» (one date for the group, `offer.checkedAt`; `checkedOnFor(slug)` picks a page's date and
  check-built holds it), `toc` as an explicit list of the spec's anchors (the H2s are `<h2 id="…">` in the MDX), and «Для кого»
  (`RelatedRoles` with `service`) at the end. New components: `ServiceNav`, `ResponsibilitySplit` (`offer.responsibilities`),
  `ChecklistTable` (screen: a `<details>` per group; print: one table of every group with ☐, the line «Заклад · Перевірив ·
  Дата» and the empty «Відповідальний», «Дата розміщення»), `ChangeLog`, `RefText` (a string with `[n]`), `FirstRefs` (wraps
  the RolePage article). `hero.print: 'checklist'` prints only that table and the stamp, on A4 landscape (`@page checklist`).
  Sources are `src/data/sources.mjs`; `SourceList` titles are HTML (`<sup>`). Open owner decisions are `decisions.*` with
  `text: null` (`terminationNotice`, `twoAdmins`, `whoIfIll`): no proposed wording is kept in this public repository.
  check-built: on the four pages no «Станом на», «пілот», «Джерело:», „ as the outer quote, links to legalaid.wiki, kodeksy,
  telegraf, ligazakon, yur-gazeta, or the names Anthropic, Resend, Cloudflare, Telegram, «ШІ-помічник» in <main>; every [n] has
  its line in «Джерела» and back (`checkServicePage`). uCoz is allowed on `zakon-i-sait-shkoly` and `yak-tse-pratsiuie`
  (`UCOZ_PAGES`); a page that names a law only to link `zakon-i-sait-shkoly/` needs no «станом на» (`LAW_PAGE_LINK`).
- The Starlight chrome (S2 of story 80): Starlight is the documentation only. The header is Starlight's own (wordmark via
  `src/components/SiteTitle.astro`, search, theme switch) — no site navigation, no request button; the wordmark leads to
  the product home. `src/components/Footer.astro` keeps Starlight's default footer (edit link, pagination) and adds the link
  «На головну Tabula» (base-aware), «Підтримка», `footerLine` and «© 2026 Tabula». The
  product pages never link into `editor/`, `install/`, `qa/`, `dev/` from their header or footer (`check-built`), except the
  footer's «Посібник редактора», exactly `{base}/editor/` (spec 83 §9, `GUIDE_SLUG`); a body
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
  `src/pages/index.astro`, sections 1–13 (and the `start` and `kinds` bands after the four things) as components in `src/components/product/home/`; `Header.astro` (sticky; since 2026-11-14 the role pages are in it: from 1100 px the dropdown «Для кого» — a native `<details class="nav-for">`, first in the row, with «Директору», «Тому, хто веде сайт», «Бухгалтерії», «Як це працює» — then six anchors (ШІ-помічник … Запитання; «Контакти» left the row), then «Подати заявку» (`requestHref(root, home)`) and, only while `offer.demoOpen`, the secondary button «Спробувати» before it, from 1280 px up (`.btn-try`, hidden on narrower widths; measured air between the last link and the first button: 87 px at 1100 px without it, 96 px at 1280 px with it); `header.js`'s `initMenu` is shared by both disclosures: Escape (focus back to the summary), a click outside, focus leaving, a followed link; the page being shown has `aria-current="page"`; below 1100 px a `<details>` «Меню» whose panel lists the group heading «Для кого» with the same four links, then the seven anchors (with «Контакти»), then «Звʼязатися»; the panel scrolls inside itself (`max-height`) on short phones (every header item is `nowrap`; below 480 px «Меню» is the three-bar icon only, 44×44, the word stays as visually hidden text, and the header is tighter, so brand + button + icon fit on one line down to 320 px, checked at 320/360/390/430); links are `#…` on the home and `{BASE_URL}#…` elsewhere, prop `home`) and
  `Footer.astro` (four columns, a `help` slot «Довідка» that renders nothing until the docs story) are in `src/components/product/`.
  Fonts are self-hosted from `@fontsource/{unbounded,manrope,caveat}` — own `@font-face` rules with `unicode-range` in
  `product.css` (the packages' per-subset CSS has none), Cyrillic + Latin files of the used weights only, no Google Fonts.
  Fonts have metric-matched Arial fallbacks (`size-adjust`/`ascent-override`… in `product.css`) and the first screen's five woff2 files are preloaded with `font-display: optional` (see the layout-shift bullet below). Unbounded is wide: `product.css` shrinks the display sizes with `clamp()` on phones (the mockup's screenshots were evidently
  rendered without it, so its line breaks differ). ₴ is not in the Cyrillic/Latin subsets and falls back to a system font.
  Only two scripts (header.js is the compact-header state and the «Меню» close; Starlight's link prefetch is switched off with `prefetch: false` in `astro.config.mjs`, so no `page.*.js` loads;
  `check-built` fails a product page that loads any other script): `src/scripts/tabs.js` (WAI-ARIA tabs for all four tablists — the assistant, «Харчування», the templates, «Панель»; Up/Down move like Right/Left for the vertical step tabs; the other panels' lazy pictures are switched to eager once a pointer or focus reaches a tablist; without JS the tablists are `hidden`, every panel
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
  `demoSiteUrl`, `demoHref(root)`); reply times on the home always say «зазвичай» (story 78 decision 24; the spec-83 pages quote spec 83, which promises «протягом N робочих днів»). The «23 з 24» figure is `src/assets/shots/facts.json`.
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
  (5) **«Харчування» and «Панель» as step tabs** (owner, 2026-11-09, third round; the same idea as the templates): each section is a heading, a
  vertical tablist of steps (`.showcase__tab`: the step's title and text in the button, the current one dark with an accent bar and a light fill, the others #5f6e83)
  and a stage with one panel per step; choosing a step shows its picture, which rises in by itself (`showcase-in` / `showcase-screen`, ~0.5 s, `product.css` §18
  item 5); nothing is tied to the scroll and nothing is pinned. History, so it is not redone: the pinned scroll stories (#26–#28, then threshold switching in #31)
  either looked stuck half-way between screens or still felt odd — do not go back to sticky, scroll-driven steps here. Shared classes `.showcase*` (`.showcase--wide`
  for the laptop); from 900 px the steps sit beside the stage, below it the stage comes right under the heading and the steps follow. Without JS every panel shows
  under its heading with the step's text (`.showcase__note`, hidden with JS). «Харчування»: admin phone → day page + the chat card sliding in from the right →
  `phone-meal-allergens` (with the `<li>` claim «15 алергенів за постановою № 305» and its link, spec decision 14) → the handwritten sheet (the scan line runs
  once, then the «Сніданок / Обід» lines appear). `phone-meal-allergens` is a real shot of the public day page with the marks on: its row in `scripts/shots.mjs` has `setup: 'allergens'` (signs in as the fixture admin, turns on «Позначати алергени й калорійність у меню», marks the shot's day dishes with codes and kcal — it CHANGES the demo's throwaway database, so only that row runs it) and scrolls to the dishes and the legend. The panel screens of the «Панель» story (`admin-overview` `/admin`, `admin-news-editor` `/admin/news/1/edit`, `admin-pages` `/admin/pages`, `admin-documents`, `admin-albums` `/admin/photos`, `admin-events` `/admin/events`) are template-free rows clipped to the panel's content area, 1110×624 (16:9, so no button is cut at the right edge; `crop-overview` was dropped for `admin-overview`, same clip). The demo throttles sign-ins (a few per minute); shoot rows one at a time. (6) **«Панель»**: six step tabs (title + text; the first two are the mockup's strings, the rest written from `docs/editor/*.md`), each panel a laptop with its screen (`admin-overview`, `admin-news-editor`, `admin-pages`, `admin-documents`, `admin-albums`, `admin-events`); only the screen inside the frame moves on a switch. The five short lines of the mockup («Огляд» підкаже… Переїзд…) are a compact grid (`.panel__notes`) under the tabs. Step 2 says «попередні версії зберігаються», not «кожна версія»: the news «Історія» keeps the last 50 versions. The script is inlined
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
- The demo site (story 80, round 3): `offer.demoSiteUrl` stays `null` until a public demo exists. The hero's «Подивитися приклад сайту» (an outlined button while `demoOpen` is false, a quiet link under the buttons once it is true, see the next bullets) and the templates section's «Відкрити приклад сайту» (always rendered now) use `demoHref(root)` from `offer.mjs`: the demo URL when set, else `{base}demo/`. `src/content/pages/demo.mdx` («Демо-сайт», reading page, linked from the footer's «Продукт» column) shows the amber chip «У розробці», the two verbatim sentences and links to `../#look` and `../#request` while `demoSiteUrl` is null; once it is set it shows the primary button «Відкрити демо-сайт» instead (no chip). `test/offer.test.mjs` covers both states of `demoHref`.
- The home's role cards and the assistant's story (owner's request, 2026-11-14): «З чого почати» (`Roles.astro`, id `start`, right after the four things,
  ~335 px tall at 1440) is four whole-card links — «Директору», «Тому, хто веде сайт», «Бухгалтерії», «Як це працює» — in the kinds tiles' grid (four in a row,
  2×2 up to 1000 px, one column up to 600 px; `.reveal` and the grid's staggered reveal only); each sentence is written from the page it leads to, so
  change them together. Under the assistant's six tabs (unchanged, with the «Випробовуємо» chip) three static blocks, no script: «Як це виглядає в
  роботі» (the panel's three steps, a strip of numbered cards), «Ще помічник уміє» (a two-column list) and «Що відбувається з даними» (four `Tick` lines
  and a link to `editor/pomichnyk-i-dani/`, rendered only when that guide page was imported: CI imports tabula's `main`, which may not have it yet). Every line is checked against
  tabula's `docs/editor/pomichnyk.md` and `pomichnyk-i-dani.md` (30 days to undo, what the site strips from a document, what the project stores: time, action
  and size only; the assistant is for adult staff, which the admin marks — admins and editors have the mark at once). Change them with those guides.
- Layout shift (round 3): the first screen must not move when the fonts arrive (CLS 0.0000 over 10 loads at 1440 and 390, motion allowed and reduced). Unbounded and Manrope faces are `font-display: optional` (Caveat stays `swap`: it is below the first screen) and five files are preloaded in `src/layouts/Product.astro` (Unbounded cyrillic 600 and latin 600 — the heading and the wordmark — and Manrope cyrillic 400, 600 and 700 — the nav links are 600), so they are used from the first paint or not at all. The other faces (Manrope cyrillic 500 and 800 and the Latin Manrope) are not preloaded, so on a cold first visit those weights (the extra-bold lines, digits and Latin words) render in the Arial fallback and the real font arrives on the next page or visit — the price of CLS 0.000 with a light preload; ten preloads delayed the LCP image (slow 4G, cold cache, median of 5: LCP ~1660 ms at 1440 and ~1165 ms at 390 with ten, ~830 / ~745 with four, ~1130 / ~705 with the five now; FCP ~700–760 and CLS 0 throughout); the metric-matched fallbacks alone were not exact (the hero wrapped differently in Arial: CLS 0.017–0.35). Re-measure after touching the fonts or the hero text.
- `astro.config.mjs` configures `@astrojs/sitemap` itself with a filter, because the integration lists the home twice (`…/site` and `…/site/`) when `base` has no trailing slash; Starlight only adds its own copy when none is configured.
- Product-page checks: `check-built.mjs` treats a built page (the home and the thirteen reading pages) whose `<html>` has `data-product-page` as a product page (the header held exactly by `checkProductHeader`: the four «Для кого» links, six anchors, the button's href = `requestHref` and «Спробувати» only while `demoOpen`, the panel's list; on the home also `checkHeroButtons`, `checkHomeRoles`, `checkAssistantMore`; no Starlight chrome, forbidden phrases, ʼ, no-break spaces before ₴/«року»/«грн» and inside dates on the raw text, «ШІ-помічник»
  spelling, the chip while `assistantStatus` is `testing`, a law word only with a link to `zakon-i-sait-shkoly/`); on every built page
  every `<img>` has `alt` and nothing refers to Google Fonts; the demo address (`127.0.0.1`, `localhost`) is kept out of every page
  except tabula's imported docs (they may say `localhost` in a command). `npm run a11y` also opens each tab of the tablists on the
  home (reduced motion); `npm run budget` fails above 600 KB on first load at 390 px, on a non-lazy image below the first viewport, or
  without a matching preload of the LCP image (CI runs it after a11y).
- «Спробувати» (story 82, S1b): `src/pages/sprobuvaty.astro` at `/sprobuvaty/`, a reading page (`ProductPage.astro`, which now forwards a
  `head` slot) outside the `pages` collection. The form posts urlencoded (no preflight, no credentials) to `{cpUrl}/v1/demo/signin`
  with the Turnstile token (action `demo-signin`, the demo widget's `demoTurnstileSiteKey`); the code step on the same page posts the
  attempt id and the code to `{cpUrl}/v1/demo/code`; the pass goes in a hidden POST form to `{demoUrl}/__demo/start`. CP answers map
  to the page: 503 → «Демо тимчасово закрите», 429 → «Зараз демо переповнене» (the broker shows the same page on its IP limit), 403 → the
  Turnstile line, 400 → a field line, else a server line; a code 400 → «Код не підходить… лишилося N …», 410 → «Цей код уже не діє…». The
  attempt is kept in sessionStorage (decision 26: a reload keeps the code step); «Надіслати ще раз» waits 60 s and renders a second
  Turnstile widget for its token; a Turnstile token not given within 20 s shows the Turnstile line. `demo-try.js` loads Turnstile itself
  (`?render=explicit`), so without JavaScript only the line «Демо працює лише з увімкненим JavaScript.» shows and nothing reaches
  Cloudflare; without a site key the page shows the closed state. Texts are the spec's, phase 2: Consent 1 says the demo copy is kept `demoKeepDays` days (check-built holds its exact text), ʼ as the
  apostrophe. The page sets `<meta name="referrer" content="strict-origin-when-cross-origin">` and must never be `no-referrer` (the broker
  checks `Origin`, decision 32). While `demoOpen` is false (phase 1, by invitation) the page is `noindex`, out of the sitemap and linked
  from nowhere; true adds the footer link «Спробувати демо» (column «Про сервіс»), the header button «Спробувати» and makes «Спробувати демо» the hero's first (primary) button, with «Подати заявку» secondary and «Подивитися приклад сайту» a quiet link below. `offer.demoOpen` is `process.env.TABULA_DEMO_OPEN === '1'` (false by default), so the open state can be built and checked (`TABULA_DEMO_OPEN=1 TABULA_REQUESTS_OPEN=1 TABULA_TURNSTILE_SITEKEY=… npm run build`). `check-built` holds all of it (`checkTryPage`, `checkTryLinks`, the page's
  own script allowed by `data-demo-try`); `npm run a11y` scans it with every hidden state shown. Its styles are `src/styles/try.css`, imported by that page only.
- The request form (story 78 W2 / story 80 S3): `offer.requestsOpen` is `process.env.TABULA_REQUESTS_OPEN === '1'` (false by default) and
  `requestFormOpen()` is that AND `turnstileSiteKey` (env `TABULA_TURNSTILE_SITEKEY`); pages read `requestFormOpen()`, never
  `requestsOpen`, so the text matches what the visitor sees. `requestHref(root, home)` is where every «Подати заявку» button of the
  body leads (`{root}zaiavka/` when open, else the home's `#request`; the header's and the hero's buttons use it too). Open: `zaiavka.mdx` shows a
  short intro, `RequestForm.astro`, «Що буде далі» and the privacy link; the home's section 13 shows «Заявка займе близько пʼяти хвилин.» and the button «Заповнити
  заявку». Closed: the e-mail text, no form. The form is plain HTML (`method="post"`, `accept-charset="utf-8"`, no script of ours; only
  Cloudflare's `api.js`, which `check-built` allows on `zaiavka` alone): groups «Заклад» (`school`, `edrpou`, `place`, `current_site`,
  `wanted`), «Контактна особа» (`name`, `position`, `email`, `phone`), «Договір» (the `signer` radios), then `comment`, the required
  `consent` checkbox (`value="yes"`), the honeypot `website` (off-screen, `tabindex="-1"`, wrapper `aria-hidden`), the Turnstile div, the
  notice line and the always-enabled button. Names, `maxlength`s, `required` and the radio values are the spec's W2 table and equal
  `cloud/control/src/requestForm.js` (`REQUEST_FIELDS` in `check-built.mjs` repeats them: change both sides together). The control plane
  answers `303` to `/zaiavka/diakuiemo/` or `/zaiavka/pomylka/{invalid,bot,limit,server,closed}/`: always built, `noindex`, filtered out of the
  sitemap in `astro.config.mjs`, linked from nowhere (`checkResultPage`, `checkResultLinks`, `checkSitemapResults`); the error pages lead back to
  the form. `checkRequestPage` holds the form's state (open: one form with every field; closed: no `<form>`, the support address);
  `a11y.mjs` scans the result pages always and the form when the site is built open
  (`TABULA_REQUESTS_OPEN=1 TABULA_TURNSTILE_SITEKEY=1x00000000000000000000AA npm run build`, Cloudflare's published always-pass key).
- Story 78 pages (W1, now the reading pages of S2): the numbers, dates, reply times and contacts of the offer come only from
  `src/config/offer.mjs`. The operator's details are published only from `offer.operator` on «Для бухгалтерії» (spec 83 replaced decision 5); never typed anywhere else. The key messages
  of the spec are quoted verbatim, with ʼ (U+02BC) as the apostrophe. Every own page that names a law or a procurement rule
  says «станом на {asOf}» and links its source — or, on the spec-83 pages (`hero:`), «Перевірено {checkedOn}» in the hero and
  a numbered «Джерела» list; `scripts/check-built.mjs` holds this on every own page. Spec 83's checks (`check-built`): no
  «[уточнити», «{рішення», «{дані» in any built page; the price, the free-period date, «Перевірено» and the reply times on
  every product page equal `offer.mjs` (`checkOfferNumbers`); no straight quotes or apostrophe, paired «» and „“, digit
  groups joined by U+00A0 in <main> and the footer (`checkTypography`). `npm run a11y` also fails a product page that
  scrolls sideways at 360 px. Sums in running text
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
  українському ліцеї» and «Tabula роблять учителі з досвідом програмування» and names neither a school nor people
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
npm run a11y          # axe over the home and the thirteen reading pages, needs a build and `npx playwright install chromium`
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
