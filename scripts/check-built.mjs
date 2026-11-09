#!/usr/bin/env node
// Checks the built site against the rules of story 78 (W1). Runs after `npm run build` (npm's
// `postbuild` hook, after check-links) and on its own as `npm run check:built`.
//
// What it holds:
//   1. The site's own pages (src/content/pages/*.md(x), the twelve reading pages of story 80, slice S2):
//      none of decision 8's forbidden phrases («uCoz» is allowed only on the law page), «станом на»
//      on every page that names a law or a procurement rule, and the apostrophe ʼ (U+02BC) — never
//      ' or ’ between Cyrillic letters.
//   2. In the built own pages every «станом на» is followed by the formatted `asOf` date of
//      offer.mjs (a stale date fails), and the law-pattern/«станом на» rule is applied again to the
//      text of <main> as built, so text that comes from offer.mjs or a component is covered.
//   3. `zaiavka`'s <main> has no inline <script> and no script `src` other than Cloudflare
//      Turnstile's api.js.
//   4. The footer line (`footerLine` of offer.mjs, verbatim; it replaced story 78's operator line) on EVERY
//      html page of dist/, imported docs included. Forbidden phrases stay on the own pages: the imported docs
//      are tabula's text.
//   5. Story 80 — PRODUCT pages, the built pages whose <html> has `data-product-page` (the home and
//      the twelve own pages; every own page must be one): the header's seven links in order and the
//      button «Подати заявку» -> #request (inline and in the «Меню» panel, which adds «Звʼязатися»);
//      no Starlight chrome; no link from the header or the footer into the documentation (editor/,
//      install/, qa/, dev/; own-origin absolute links and links without the trailing slash included);
//      every product page linked from the product footer except FOOTER_EXEMPT, which must be linked from
//      another product page (so none is orphaned); one <h1>; nothing about open code, a licence, GitHub,
//      self-installation or «назавжди» (CLOSED_SERVICE_PATTERNS; «GitHub Pages» as this site's host is allowed); «Залишити
//      заявку» nowhere (one CTA name); decision 8's forbidden phrases; ʼ only; a no-break space between
//      a number and ₴ / «року» / «грн» and inside a date, day-month and month-year (checked on the raw
//      text, because htmlText() folds &nbsp;, and on the meta description); «ШІ-помічник» spelled so. On the home only: the chip when `assistantStatus` is
//      'testing' and a law or procurement word only together with a link to «Закон і сайт школи»
//      (spec decision 14); the other product pages cite their sources and say «станом на» (items 1–2).
//   6. Documentation pages (Starlight): the header has no site navigation and no request button, and
//      the footer has the link «На головну Tabula» to the product home. «Залишити заявку» is in neither.
//   7. Every built html page: every <img> has an alt attribute (`alt`, `alt=""` or text) and nothing
//      refers to fonts.googleapis.com; the built CSS neither. The demo's address (127.0.0.1,
//      localhost) is kept out of every page that is not tabula's own imported documentation
//      (that text may legitimately say «localhost» in a command).
//
// The rules are pure functions exported for test/check-built.test.mjs; the checks over the files
// run only when this file is invoked directly.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { offer, footerLine, formatDate } from '../src/config/offer.mjs';

export const LAW_PAGE_SLUG = 'zakon-i-sait-shkoly';

// Decision 8: forbidden on the site's own pages, matched case-insensitively.
export const FORBIDDEN_PHRASES = [
	'гарантуємо відповідність',
	'відповідає закону',
	'Схвалено МОН',
	'рекомендовано ДСЯО',
	'дані зберігаються в Україні',
	'дані не залишають ЄС',
	'оплата за рік наперед',
	'без чужого логотипа',
	'e-schools',
	'Метастудія',
	'school.org.ua',
];
// Allowed only in the law page's sentence about МОН's letter (decision 8).
export const UCOZ_PAGE = 'zakon-i-sait-shkoly';
// Decision 8: a page whose text matches this must say «станом на».
export const LAW_PATTERN = /Закон|постанов|Prozorro|КЕКВ|ДК 021/;

export const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

const CYRILLIC = 'А-ЯҐЄІЇа-яґєії';
const BAD_APOSTROPHE = new RegExp(`[${CYRILLIC}]['’][${CYRILLIC}]`);

/** The forbidden phrases found in `text`; `uCoz` counts unless `allowUcoz`. */
export function findForbidden(text, { allowUcoz = false } = {}) {
	const lower = text.toLowerCase();
	const found = FORBIDDEN_PHRASES.filter((phrase) => lower.includes(phrase.toLowerCase()));
	if (!allowUcoz && lower.includes('ucoz')) found.push('uCoz');
	return found;
}

/** Problems with the source of one own page; `name` is the file name without extension. */
export function checkOwnSource(name, text) {
	const problems = [];
	for (const phrase of findForbidden(text, { allowUcoz: name === UCOZ_PAGE })) {
		problems.push(`forbidden phrase «${phrase}»`);
	}
	if (LAW_PATTERN.test(text) && !/станом на/i.test(text)) {
		problems.push('names a law or a procurement rule but has no «станом на»');
	}
	if (BAD_APOSTROPHE.test(text)) {
		problems.push("a ' or ’ between Cyrillic letters — use ʼ (U+02BC)");
	}
	return problems;
}

/** Problems with «станом на» in a built page's text: every occurrence must be followed by `asOfText`. */
export function checkAsOfDate(bodyText, asOfText) {
	const problems = [];
	const re = /станом на\s+(\S*)/gi;
	let match;
	while ((match = re.exec(bodyText))) {
		const date = match[1].replace(/[.,;:)]+$/, '');
		if (date !== asOfText) problems.push(`«станом на» is followed by "${match[1]}", expected ${asOfText}`);
	}
	return problems;
}

/** The law-pattern rule on a built page's <main> text: a law or procurement rule needs «станом на». */
export function checkBuiltAsOf(_name, bodyText) {
	if (LAW_PATTERN.test(bodyText) && !/станом на/i.test(bodyText)) {
		return ['the built page names a law or a procurement rule but has no «станом на»'];
	}
	return [];
}

/** Problems with the footer line (`footerLine`, verbatim) on one built page. */
export function checkFooterLine(html, line) {
	const footer = html.match(/<footer\b[^>]*site-footer[^>]*>([\s\S]*?)<\/footer>/i);
	if (!footer) return ['no <footer class="site-footer">'];
	return htmlText(footer[1]).includes(line) ? [] : ['the footer lacks the footer line (footerLine of offer.mjs)'];
}

/**
 * Footer-and-audience-pages spec (2026-11-09): Tabula is a closed service. A product page says nothing about open
 * code, a licence, GitHub, installing it yourself or «вільна … назавжди». «GitHub Pages», the host of this very
 * site named on the privacy pages, is allowed. «відкрит» alone is not a rule: «Відкрити» (a button) and
 * «інформаційна відкритість» (the law's term) are ordinary words.
 */
export const CLOSED_SERVICE_PATTERNS = [
	/AGPL/i,
	/GitHub(?!\s+Pages)/,
	/github\.com\/tabula-cms/i,
	/відкрит(?:ий|ого|им|ому) код|код[^.]{0,20}відкрит/i,
	/вільн(?:а|ий|е|у) (?:й|і|та) безкоштовн/i,
	/власн(?:ий|ому|ого) сервер/i,
	/самостійн/i,
	/назавжди/i,
	/ліцензі[яї] (?:AGPL|GPL)|відкрит(?:ий|ого) проєкт/i,
];

export function checkClosedService(text) {
	return CLOSED_SERVICE_PATTERNS.filter((re) => re.test(text)).map((re) => `mentions open code, a licence, GitHub or self-hosting (${re})`);
}

/** The inner HTML of the first <main> element, or the whole page when there is none. */
export function extractMain(html) {
	const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
	return match ? match[1] : html;
}

/** Visible-ish text of an HTML fragment: scripts and styles dropped, tags removed, spaces folded. */
export function htmlText(html) {
	return html
		.replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Problems with the <script> elements in a fragment (zaiavka's <main>). */
export function checkScripts(fragment) {
	const problems = [];
	const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
	let match;
	while ((match = re.exec(fragment))) {
		const src = match[1].match(/\bsrc\s*=\s*"([^"]*)"/i);
		if (!src) problems.push('an inline <script>');
		else if (src[1] !== TURNSTILE_SRC) problems.push(`a script with src "${src[1]}"`);
	}
	return problems;
}

// ---------------------------------------------------------------------------------------------
// Story 80: product pages.

/** True when the page's <html> element carries `data-product-page`. */
export function isProductPage(html) {
	return /<html\b[^>]*\bdata-product-page\b/i.test(html);
}

/** The header's links of a product page, in order: text and the anchor id each one must point at. */
export const PRODUCT_LINKS = [
	['ШІ-помічник', 'assistant'],
	['Харчування', 'meals'],
	['Документи', 'docs'],
	['Шаблони', 'look'],
	['Ціна', 'price'],
	['Запитання', 'faq'],
	['Контакти', 'contact'],
];

function anchorsOf(fragment) {
	const anchors = [];
	const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = re.exec(fragment))) {
		const href = match[1].match(/\bhref="([^"]*)"/i);
		anchors.push({ href: href ? href[1] : '', text: htmlText(match[2]) });
	}
	return anchors;
}

/** `#id` on the home, `{base}#id` on other product pages: the href ends with the anchor. */
const pointsAt = (href, id) => href === `#${id}` || href.endsWith(`/#${id}`);

/** Problems with a product page's header: seven links in order, the button, the «Меню» panel. */
export function checkProductHeader(html) {
	const header = html.match(/<header\b[^>]*data-site-header[^>]*>([\s\S]*?)<\/header>/i);
	if (!header) return ['no <header data-site-header>'];
	const problems = [];
	const inline = header[1].match(/<nav\b[^>]*class="[^"]*nav-links[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
	if (!inline) problems.push('no inline nav (.nav-links)');
	else {
		const got = anchorsOf(inline[1]);
		const wantText = PRODUCT_LINKS.map(([text]) => text).join(' | ');
		if (got.map((a) => a.text).join(' | ') !== wantText) {
			problems.push(`inline nav is "${got.map((a) => a.text).join(' | ')}", expected "${wantText}"`);
		}
		PRODUCT_LINKS.forEach(([text, id], i) => {
			if (got[i] && !pointsAt(got[i].href, id)) problems.push(`«${text}» points at "${got[i].href}", expected #${id}`);
		});
	}
	const button = header[1].match(/<a\b[^>]*class="[^"]*btn-main[^"]*"[^>]*>[\s\S]*?<\/a>/i);
	const buttonAnchor = button ? anchorsOf(button[0])[0] : null;
	if (!buttonAnchor || buttonAnchor.text !== 'Подати заявку' || !pointsAt(buttonAnchor.href, 'request')) {
		problems.push('the button «Подати заявку» -> #request is missing');
	}
	const panel = header[1].match(/<nav\b[^>]*class="[^"]*nav-menu__panel[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
	if (!/<details\b[^>]*class="[^"]*nav-menu/i.test(header[1]) || !panel) {
		problems.push('no <details class="nav-menu"> panel');
	} else {
		const got = anchorsOf(panel[1]);
		const wantText = [...PRODUCT_LINKS.map(([text]) => text), 'Звʼязатися'].join(' | ');
		if (got.map((a) => a.text).join(' | ') !== wantText) {
			problems.push(`«Меню» panel is "${got.map((a) => a.text).join(' | ')}", expected "${wantText}"`);
		}
		const last = got[got.length - 1];
		if (last && !last.href.startsWith('mailto:')) problems.push('«Звʼязатися» is not a mailto: link');
	}
	return problems;
}

/** Starlight's chrome on a product page: `sl-` classes, the search box, the theme select. */
export function checkNoStarlight(html) {
	const problems = [];
	if (/class="[^"]*\bsl-[a-z]/i.test(html)) problems.push('a Starlight class (sl-…)');
	if (/site-search/i.test(html)) problems.push('the Starlight search box');
	if (/starlight-theme-select/i.test(html)) problems.push('the Starlight theme select');
	return problems;
}

/** The hrefs of the anchors in the first element matching `tag` (with `marker` in its attributes). */
function hrefsIn(html, tag, marker) {
	const m = html.match(new RegExp(`<${tag}\\b[^>]*${marker}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
	return m ? anchorsOf(m[1]).map((a) => a.href) : [];
}

const SITE_ORIGIN = (process.env.SITE_URL ?? 'https://tabula-cms.github.io').replace(/\/$/, '');

/** A href into the documentation: relative or root-relative, or absolute on the site's own origin; with or without the trailing slash. */
export function isDocsHref(href, origin = SITE_ORIGIN) {
	let path = href;
	if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) {
		const own = href.startsWith('//') ? href.replace(/^\/\//, '').startsWith(origin.replace(/^https?:\/\//, '')) : href.startsWith(origin);
		if (!own) return false;
		path = href.replace(/^(?:[a-z][a-z0-9+.-]*:)?\/\/[^/]+/i, '');
	}
	return /(^|\/)(editor|install|qa|dev)(?:[/?#]|$)/.test(path.replace(/^(?:\.{1,2}\/)+/, ''));
}

/** Story 80, decision 3: the product header and footer link nowhere into the documentation. */
export function checkNoDocsLinks(html, origin = SITE_ORIGIN) {
	const hrefs = [...hrefsIn(html, 'header', 'data-site-header'), ...hrefsIn(html, 'footer', 'site-footer')];
	return hrefs.filter((href) => isDocsHref(href, origin)).map((href) => `the header or footer links into the documentation: ${href}`);
}

/**
 * Own pages the footer does not link (footer-and-audience-pages spec): «Демо-сайт» and «Подати заявку» are on the
 * home's first screen and in the header. Each must still be linked from some product page (checked in main()).
 */
export const FOOTER_EXEMPT = ['demo', 'zaiavka'];

/**
 * Every product page is linked from the product footer, so none can be orphaned: `slugs` are the own pages'
 * slugs, `base` is `'/'` or `'/site'`; the `exempt` slugs are checked elsewhere.
 */
export function checkFooterLinks(html, slugs, base, exempt = FOOTER_EXEMPT) {
	const root = base === '/' ? '/' : `${base.replace(/\/$/, '')}/`;
	const hrefs = hrefsIn(html, 'footer', 'site-footer');
	return [...slugs]
		.filter((slug) => !exempt.includes(slug))
		.filter((slug) => !hrefs.includes(`${root}${slug}/`))
		.map((slug) => `the footer has no link to ${root}${slug}/ (the page would be orphaned)`);
}

/** One <h1> per product page. */
export function checkOneH1(html) {
	const n = (html.match(/<h1\b/gi) ?? []).length;
	return n === 1 ? [] : [`${n} <h1> elements, expected exactly one`];
}

/** The content of <meta name="description">, entities left as written, or null. */
export function metaDescription(html) {
	const m = html.match(/<meta\b[^>]*\bname="description"[^>]*>/i);
	const c = m && m[0].match(/\bcontent="([^"]*)"/i);
	return c ? c[1] : null;
}

/** Spec decision 12: one CTA name, «Подати заявку»; «Залишити заявку» appears on no product page. */
export function checkCtaName(html) {
	return /Залишити\s+заявку/.test(htmlText(html)) ? ['«Залишити заявку» — the CTA is called «Подати заявку» (decision 12)'] : [];
}

/** A documentation (Starlight) page: no site navigation, no request button, a link to the product home. */
export function checkDocChrome(html, base) {
	const problems = [];
	if (/aria-label="Основна навігація"/.test(html)) problems.push('the documentation header still has the site navigation');
	if (/(Подати|Залишити)\s+заявку/.test(htmlText(extractHeader(html)))) problems.push('the documentation header has a request button');
	const root = base === '/' ? '/' : `${base.replace(/\/$/, '')}/`;
	const home = anchorsOf(html).find((a) => a.text === 'На головну Tabula');
	if (!home) problems.push('no footer link «На головну Tabula»');
	else if (home.href !== root) problems.push(`«На головну Tabula» points at "${home.href}", expected "${root}"`);
	return problems;
}

function extractHeader(html) {
	const m = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i);
	return m ? m[1] : '';
}

const MONTHS = 'січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня';

/** Visible-ish text with entities left as written (`&#160;` stays), for the no-break space rule. */
export function rawText(html) {
	return html
		.replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ');
}

/** HTML with the entity spellings of an apostrophe turned into characters (Astro writes `'` as `&#39;`). */
export function decodeApostrophes(html) {
	return html
		.replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
		.replace(/&#0*8217;|&#x0*2019;|&rsquo;/gi, '’')
		.replace(/&#0*8216;|&#x0*2018;|&lsquo;/gi, '‘')
		.replace(/&#0*700;|&#x0*2bc;/gi, 'ʼ');
}

/** Problems with the apostrophe in built HTML (scripts and styles ignored, entities decoded first). */
export function checkBuiltApostrophe(html) {
	const bare = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
	return BAD_APOSTROPHE.test(decodeApostrophes(bare))
		? ["a ' or ’ between Cyrillic letters — use ʼ (U+02BC)"]
		: [];
}

const CYR = 'А-Яа-яҐЄІЇґєії';
const NOT_CYR_AFTER = `(?![${CYR}])`;
// A space that is not a no-break one: ASCII whitespace only; U+00A0, U+202F, `&nbsp;`, `&#160;` pass.
const PLAIN = '[ \\t\\r\\n]';
const NB = `(?:[\\u00a0\\u202f]|&nbsp;|&#160;|&#xa0;)`;

/**
 * A plain space where the copy rules want a no-break one: between a number and ₴ / «року» / «грн»,
 * as the thousands separator of a sum before ₴ / «грн» («4 800 ₴»), and between the day and the
 * month of a date («31 грудня»), and between the month and the year («січня 2027»). Works on rawText().
 */
export function checkNoBreakSpaces(text) {
	const problems = [];
	const show = (s) => s.replace(/\s+/g, '␠');
	const unit = new RegExp(`\\d${PLAIN}+(?:₴|року${NOT_CYR_AFTER}|грн${NOT_CYR_AFTER})`, 'g');
	for (const m of text.matchAll(unit)) problems.push(`a plain space in "${show(m[0])}"`);
	const thousands = new RegExp(`\\d${PLAIN}\\d{3}(?!\\d)(?=(?:${PLAIN}|${NB})*(?:₴|грн${NOT_CYR_AFTER}))`, 'g');
	for (const m of text.matchAll(thousands)) problems.push(`a plain space as the thousands separator in "${show(m[0])}"`);
	const date = new RegExp(`\\d{1,2}${PLAIN}+(?:${MONTHS})${NOT_CYR_AFTER}`, 'g');
	for (const m of text.matchAll(date)) problems.push(`a plain space in the date "${show(m[0])}"`);
	const monthYear = new RegExp(`(?:${MONTHS})${PLAIN}+\\d{4}(?!\\d)`, 'g');
	for (const m of text.matchAll(monthYear)) problems.push(`a plain space in the date "${show(m[0])}"`);
	return problems;
}

/**
 * «ШІ-помічник» spelled so: no «помічник ШІ» in any case (помічника ШІ, помічником ШІ…), no «ШІ помічник»,
 * no «ШI» with a Latin I, no standalone «AI».
 */
export function checkAssistantSpelling(text) {
	const problems = [];
	if (new RegExp(`помічник[${CYR}]*\\s+Ш[ІI]${NOT_CYR_AFTER}`, 'i').test(text)) problems.push('«помічник ШІ» — write «ШІ-помічник»');
	if (/Ш[ІI][\s ‐-―−]+помічник/i.test(text)) problems.push('«ШІ помічник» — write «ШІ-помічник»');
	if (/Ш[Ii](?![A-Za-z])/.test(text)) problems.push('«ШI» with a Latin I — write «ШІ»');
	if (/(^|[^A-Za-zА-Яа-яҐЄІЇґєії])AI(?![A-Za-zА-Яа-я])/.test(text)) problems.push('a standalone «AI»');
	return problems;
}

/** The first `<section id="…">…</section>` of a page, or null. */
export function sectionById(html, id) {
	const m = html.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</section>`, 'i'));
	return m ? m[1] : null;
}

/**
 * The «Випробовуємо» chip must stand in the assistant section (#assistant) of the home while
 * `assistantStatus` is 'testing', with a real space between its two parts.
 */
export function checkAssistantChip(html, status) {
	if (status !== 'testing') return [];
	const section = sectionById(html, 'assistant');
	if (section === null) return ['no <section id="assistant"> to hold the «Випробовуємо» chip'];
	// Tags removed without adding a space: a missing real space between the parts must show.
	const flat = section.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
	return flat.includes('Випробовуємо у школах ще не ввімкнено')
		? []
		: ['the assistant section lacks «Випробовуємо у школах ще не ввімкнено» (with a real space after «Випробовуємо»)'];
}

/**
 * The two law claims of the home (spec decision 14). Each lives in its own block and must carry its own
 * link to «Закон і сайт школи» inside that block:
 *  - «Розділи за статтею 30 уже створені» -> the enclosing <section>;
 *  - «15 алергенів за постановою № 305» -> the enclosing <li>.
 * Any other law or procurement word on a product page is an uncited law mention and fails; the link text
 * «Закон і сайт школи» itself does not count as one.
 */
export const LAW_CLAIMS = [
	{ name: '«Розділи за статтею 30 уже створені»', phrase: /Розділи за статтею 30 уже створені/, tag: 'section' },
	{ name: '«15 алергенів за постановою № 305»', phrase: /15 алергенів за постановою № 305/, tag: 'li' },
];
export const LAW_LINK_TEXT = 'Закон і сайт школи';

const foldSpaces = (text) => text.replace(/&nbsp;|&#160;|&#xa0;|[  ]/gi, ' ').replace(/\s+/g, ' ');

export function checkLawClaims(html, { requireClaims = false } = {}) {
	const problems = [];
	const linkRe = new RegExp(`href="[^"]*${LAW_PAGE_SLUG}/`);
	let text = foldSpaces(htmlText(extractMain(html)));
	for (const claim of LAW_CLAIMS) {
		const blocks = [...html.matchAll(new RegExp(`<${claim.tag}\\b[\\s\\S]*?</${claim.tag}>`, 'gi'))]
			.map((m) => m[0])
			.filter((block) => claim.phrase.test(foldSpaces(htmlText(block))));
		if (blocks.length === 0) {
			if (requireClaims) problems.push(`the claim ${claim.name} is missing from the page`);
			continue;
		}
		// The innermost block: the last one when blocks nest (a <section> never nests in this layout).
		for (const block of blocks) {
			if (!linkRe.test(block)) problems.push(`the claim ${claim.name} has no link to ${LAW_PAGE_SLUG}/ in its own <${claim.tag}>`);
		}
		text = text.replace(new RegExp(claim.phrase.source, 'g'), ' ');
	}
	text = text.split(LAW_LINK_TEXT).join(' ');
	if (LAW_PATTERN.test(text)) {
		problems.push('names a law or a procurement rule outside the two cited claims (spec decision 14)');
	}
	return problems;
}

/**
 * Decision 9 (no framework JS): a product page loads only its own two bundles, tabs and header. Each
 * <script> must be an inline module, or a `src` whose file (read through `readSrc`), that contains
 * `data-tabs` or `data-site-header`. `readSrc(src)` returns the file's text or null.
 */
export function checkProductScripts(html, readSrc = () => null) {
	const problems = [];
	const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
	let m;
	while ((m = re.exec(html))) {
		const src = m[1].match(/\bsrc="([^"]*)"/i);
		const code = src ? readSrc(src[1]) : m[2];
		if (code === null || code === undefined) problems.push(`a script (${src[1]}) that cannot be identified`);
		else if (!/data-tabs|data-site-header/.test(code)) {
			problems.push(`a script that is neither the tabs nor the header bundle: ${src ? src[1] : code.slice(0, 40)}`);
		}
	}
	return problems;
}

/** Every product-page rule on one built page's HTML; `isHome` adds the chip and the claims, `allowUcoz` is the law page's. */
export function checkProductPage(
	html,
	{ isHome = false, allowUcoz = false, assistantStatus = offer.assistantStatus, readSrc = () => null, slugs = null, base = '/site' } = {},
) {
	const problems = [];
	problems.push(...checkProductHeader(html));
	problems.push(...checkNoStarlight(html));
	problems.push(...checkNoDocsLinks(html));
	problems.push(...checkCtaName(html));
	const text = htmlText(html);
	for (const phrase of findForbidden(text, { allowUcoz })) problems.push(`forbidden phrase «${phrase}»`);
	problems.push(...checkBuiltApostrophe(html));
	problems.push(...checkNoBreakSpaces(rawText(html)));
	problems.push(...checkNoBreakSpaces(metaDescription(html) ?? '').map((p) => `meta description: ${p}`));
	problems.push(...checkOneH1(html));
	problems.push(...checkAssistantSpelling(text));
	problems.push(...checkClosedService(text));
	problems.push(...checkClosedService(metaDescription(html) ?? '').map((p) => `meta description: ${p}`));
	if (isHome) problems.push(...checkAssistantChip(html, assistantStatus));
	// Spec decision 14 exempts the home only (two cited claims); the other pages name their sources and say «станом на».
	if (isHome) problems.push(...checkLawClaims(html, { requireClaims: true }));
	problems.push(...checkProductScripts(html, readSrc));
	if (slugs) problems.push(...checkFooterLinks(html, slugs, base));
	return problems;
}

/** Problems every built page can have: an <img> without `alt`, a request to Google Fonts. */
export function checkEveryPage(html) {
	const problems = [];
	for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
		if (!/\salt(?=[\s=/>])/i.test(tag)) problems.push(`an <img> without alt: ${tag.slice(0, 80)}`);
	}
	if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html)) problems.push('refers to Google Fonts');
	return problems;
}

/** The demo's address in a page: `127.0.0.1` or `localhost` (text, attributes, image alts). */
export function checkDemoAddress(html) {
	return /127\.0\.0\.1|localhost/i.test(html) ? ['the demo address (127.0.0.1 / localhost) is in the page'] : [];
}

// ---------------------------------------------------------------------------------------------
// The checks over the files.

const IMPORTED_DIRS = new Set(['editor', 'install', 'qa', 'dev']);

/** An Astro redirect page: `<meta http-equiv="refresh">`. */
export function isRedirectPage(html) {
	return /<meta\b[^>]*http-equiv="refresh"/i.test(html);
}

/** The first path segment (an own page's slug) a product page's href leads to, relative to `rel` in dist/; '' otherwise. */
function resolveHref(href, rel) {
	if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') || href.startsWith('#')) return '';
	const base = (process.env.SITE_BASE ?? '/site').replace(/\/$/, '');
	const from = `/${rel.split(path.sep).join('/')}`;
	const url = new URL(href, `https://x${base}${from}`);
	const p = url.pathname.startsWith(`${base}/`) ? url.pathname.slice(base.length + 1) : url.pathname.slice(1);
	return p.split('/')[0];
}

function walkSources(dir) {
	return readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
		.map((entry) => ({ full: path.join(dir, entry.name), rel: entry.name }));
}

function distFileFor(distDir, rel) {
	const slug = rel.replace(/\.mdx?$/, '');
	return slug === 'index'
		? path.join(distDir, 'index.html')
		: path.join(distDir, slug, 'index.html');
}

function walkHtml(dir) {
	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...walkHtml(full));
		else if (entry.name.endsWith('.html')) files.push(full);
	}
	return files;
}

/** The text of a built asset named by a `src` of a page (base-aware), or null when it is not in dist/. */
function readBuilt(distDir, base, src) {
	const prefix = base === '/' ? '/' : `${base.replace(/\/$/, '')}/`;
	if (!src.startsWith(prefix)) return null;
	const file = path.join(distDir, src.slice(prefix.length).split(/[?#]/)[0]);
	return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

function walkFiles(dir, ext) {
	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...walkFiles(full, ext));
		else if (entry.name.endsWith(ext)) files.push(full);
	}
	return files;
}

function main() {
	const root = fileURLToPath(new URL('../', import.meta.url));
	const distDir = path.join(root, 'dist');
	const pagesDir = path.join(root, 'src', 'content', 'pages');
	const base = process.env.SITE_BASE ?? '/site';
	const skipped = process.env.DOCS_IMPORT_SKIPPED === 'true';
	const ownSlugs = new Set();

	if (!existsSync(distDir)) {
		console.error(`check-built: ${distDir} not found — run "npm run build" first`);
		process.exit(1);
	}

	const failures = [];
	const fail = (where, what) => failures.push(`${where}: ${what}`);
	const asOfText = formatDate(offer.asOf);

	const pages = walkSources(pagesDir);
	for (const { full, rel } of pages) {
		const name = rel.replace(/\.mdx?$/, '');
		const text = readFileSync(full, 'utf8');
		ownSlugs.add(name);
		for (const problem of checkOwnSource(name, text)) fail(`src/content/pages/${rel}`, problem);

		const builtFile = distFileFor(distDir, rel);
		if (!existsSync(builtFile)) {
			fail(`src/content/pages/${rel}`, `no built page at ${path.relative(root, builtFile)}`);
			continue;
		}
		const html = readFileSync(builtFile, 'utf8');
		const body = htmlText(extractMain(html));
		for (const problem of checkAsOfDate(body, asOfText)) fail(`dist (${rel})`, problem);
		for (const problem of checkBuiltAsOf(name, body)) fail(`dist (${rel})`, problem);
		for (const phrase of findForbidden(body, { allowUcoz: name === UCOZ_PAGE })) {
			fail(`dist (${rel})`, `forbidden phrase «${phrase}»`);
		}
		if (name === 'zaiavka') {
			for (const problem of checkScripts(extractMain(html))) fail('dist (zaiavka) <main>', problem);
		}
	}

	// The footer line is the site's chrome: held on every page, imported or not. Product pages have
	// their own rules; every other page is the documentation (Starlight) and has its own.
	const htmlFiles = walkHtml(distDir);
	let productPages = 0;
	const linkedFromProduct = new Set();
	for (const file of htmlFiles) {
		const html = readFileSync(file, 'utf8');
		const rel = path.relative(distDir, file);
		const first = rel.split(path.sep)[0];
		// An Astro redirect page (astro.config.mjs `redirects`): a meta refresh and a link, no chrome.
		if (isRedirectPage(html)) continue;
		if (isProductPage(html)) {
			for (const a of anchorsOf(html)) linkedFromProduct.add(resolveHref(a.href, rel));
			productPages += 1;
			for (const problem of checkProductPage(html, {
					isHome: rel === 'index.html',
					allowUcoz: rel === path.join(UCOZ_PAGE, 'index.html'),
					readSrc: (src) => readBuilt(distDir, base, src),
					slugs: ownSlugs,
					base,
				})) fail(`dist/${rel}`, problem);
		} else {
			for (const problem of checkDocChrome(html, base)) fail(`dist/${rel} header/footer`, problem);
		}
		for (const problem of checkFooterLine(html, footerLine)) fail(`dist/${rel}`, problem);
		for (const problem of checkEveryPage(html)) fail(`dist/${rel}`, problem);
		if (!IMPORTED_DIRS.has(first)) {
			for (const problem of checkDemoAddress(html)) fail(`dist/${rel}`, problem);
		}
	}
	for (const css of walkFiles(distDir, '.css')) {
		if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(readFileSync(css, 'utf8'))) {
			fail(`dist/${path.relative(distDir, css)}`, 'the built CSS refers to Google Fonts');
		}
	}

	// The own pages the footer does not link must still be linked from some product page.
	for (const slug of FOOTER_EXEMPT) {
		if (ownSlugs.has(slug) && !linkedFromProduct.has(slug)) {
			fail(`dist/${slug}/index.html`, 'not linked from the footer nor from any product page (orphaned)');
		}
	}

	// Every own page must be rendered in the product layout (and so under the product rules above).
	for (const slug of ownSlugs) {
		const file = path.join(distDir, slug, 'index.html');
		if (existsSync(file) && !isProductPage(readFileSync(file, 'utf8'))) {
			fail(`dist/${slug}/index.html`, 'an own page that is not in the product layout');
		}
	}

	if (failures.length > 0) {
		console.error(`check-built: ${failures.length} problem(s):`);
		for (const failure of failures) console.error(`  - ${failure}`);
		process.exit(1);
	}
	console.log(
		`check-built: ${pages.length} own pages, ${productPages} product page(s) and ${htmlFiles.length} html pages OK (base ${base}${skipped ? ', docs import skipped' : ''})`,
	);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
