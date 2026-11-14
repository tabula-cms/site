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
import { offer, requestFormOpen, footerLine, formatDate, formatDateLongYear, formatGrn, checkedOnFor, SERVICE_SLUGS } from '../src/config/offer.mjs';
import { refNumbers } from '../src/lib/refs.mjs';

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
// Allowed only in the law page's sentence about МОН's letter (decision 8) and, since spec 84, in «Як це працює»'s card
// «Сайт на іншій системі (наприклад, uCoz, …)».
export const UCOZ_PAGE = 'zakon-i-sait-shkoly';
export const UCOZ_PAGES = [UCOZ_PAGE, 'yak-tse-pratsiuie'];
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
	for (const phrase of findForbidden(text, { allowUcoz: UCOZ_PAGES.includes(name) })) {
		problems.push(`forbidden phrase «${phrase}»`);
	}
	// Spec 83: a page with `hero` says «Перевірено {checkedOn}» in its hero (RolePage.astro) instead of «станом на».
	// Spec 84 §8: a page that names a law only to send the reader to «Закон і сайт школи» (a link to it) needs neither.
	if (LAW_PATTERN.test(text) && !/станом на/i.test(text) && !/^hero:/m.test(text) && !LAW_PAGE_LINK.test(text)) {
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

// Spec 84 §8: a link to «Закон і сайт школи» (in the MDX source or the built HTML).
export const LAW_PAGE_LINK = new RegExp(`${LAW_PAGE_SLUG}/`);

/** The law-pattern rule on a built page's <main> text: a law or procurement rule needs «станом на». */
export function checkBuiltAsOf(_name, bodyText, mainHtml = '') {
	if (LAW_PATTERN.test(bodyText) && !/станом на|Перевірено/i.test(bodyText) && !LAW_PAGE_LINK.test(mainHtml)) {
		return ['the built page names a law or a procurement rule but has neither «станом на» nor «Перевірено»'];
	}
	return [];
}

/**
 * Spec 83: every «Перевірено …» (and «перевірено …») of a built page is followed by the checked date of offer.mjs,
 * `formatDateLongYear(checkedOn)` («9 листопада 2026 року»); `checkedText` is that text with plain spaces.
 */
export function checkCheckedDate(bodyText, checkedText) {
	const problems = [];
	const folded = bodyText.replace(/[\u00a0\u202f]/g, ' ');
	for (const m of folded.matchAll(/[Пп]еревірено\s+(\d{1,2} \S+ \d{4} року)/g)) {
		if (m[1] !== checkedText) problems.push(`«Перевірено» is followed by "${m[1]}", expected "${checkedText}"`);
	}
	return problems;
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

/**
 * The header's anchors of a product page, in order: text and the anchor id each one must point at. «Контакти» is only in
 * the «Меню» panel (CONTACT_LINK), not in the desktop row.
 */
export const PRODUCT_LINKS = [
	['ШІ-помічник', 'assistant'],
	['Харчування', 'meals'],
	['Документи', 'docs'],
	['Шаблони', 'look'],
	['Ціна', 'price'],
	['Запитання', 'faq'],
];
export const CONTACT_LINK = ['Контакти', 'contact'];
/** The «Для кого» dropdown (and the first group of the «Меню» panel): text and the page slug, in order. */
export const FOR_LINKS = [
	['Директору', 'dlia-dyrektora'],
	['Тому, хто веде сайт', 'dlia-vidpovidalnoho'],
	['Бухгалтерії', 'dlia-bukhhalterii'],
	['Як це працює', 'yak-tse-pratsiuie'],
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
/** A page link: `{base}{slug}/`. */
const pointsAtPage = (href, slug) => href === `/${slug}/` || href.endsWith(`/${slug}/`);

/**
 * Problems with a product page's header: the «Для кого» dropdown (four pages), the six anchors, «Спробувати» (only while
 * `offer.demoOpen`), the button «Подати заявку» (`requestHref`: #request, or the page `zaiavka/` while the form is open)
 * and the «Меню» panel («Для кого» with its four links, the seven anchors, «Звʼязатися»).
 */
export function checkProductHeader(html, { requestOpen = requestFormOpen(), demoOpen = offer.demoOpen } = {}) {
	const header = html.match(/<header\b[^>]*data-site-header[^>]*>([\s\S]*?)<\/header>/i);
	if (!header) return ['no <header data-site-header>'];
	const problems = [];
	const inline = header[1].match(/<nav\b[^>]*class="[^"]*nav-links[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
	if (!inline) problems.push('no inline nav (.nav-links)');
	else {
		if (!/<details\b[^>]*class="[^"]*nav-for[^"]*"/i.test(inline[1])) problems.push('no <details class="nav-for"> dropdown «Для кого»');
		const got = anchorsOf(inline[1]);
		const want = [...FOR_LINKS, ...PRODUCT_LINKS];
		const wantText = want.map(([text]) => text).join(' | ');
		if (got.map((a) => a.text).join(' | ') !== wantText) {
			problems.push(`inline nav is "${got.map((a) => a.text).join(' | ')}", expected "${wantText}"`);
		}
		FOR_LINKS.forEach(([text, slug], i) => {
			if (got[i] && !pointsAtPage(got[i].href, slug)) problems.push(`«${text}» points at "${got[i].href}", expected …/${slug}/`);
		});
		PRODUCT_LINKS.forEach(([text, id], i) => {
			const link = got[FOR_LINKS.length + i];
			if (link && !pointsAt(link.href, id)) problems.push(`«${text}» points at "${link.href}", expected #${id}`);
		});
	}
	const actions = header[1].match(/<div\b[^>]*class="[^"]*site-header__actions[^"]*"[^>]*>([\s\S]*)/i);
	const buttons = [...(actions ? actions[1] : '').matchAll(/<a\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi)].map((m) => ({
		cls: m[0].match(/class="([^"]*)"/i)[1],
		...anchorsOf(m[0])[0],
	}));
	const tryButton = buttons.find((b) => /\bbtn-try\b/.test(b.cls));
	if (demoOpen) {
		if (!tryButton || tryButton.text !== 'Спробувати' || !pointsAtPage(tryButton.href, TRY_SLUG)) {
			problems.push('the secondary button «Спробувати» -> sprobuvaty/ is missing while offer.demoOpen is true');
		} else if (buttons.indexOf(tryButton) !== 0) problems.push('«Спробувати» is not before «Подати заявку»');
	} else if (tryButton) problems.push('the button «Спробувати» is in the header while offer.demoOpen is false');
	const main = buttons.find((b) => /\bbtn-main\b/.test(b.cls));
	const mainOk = main && main.text === 'Подати заявку' && (requestOpen ? pointsAtPage(main.href, REQUEST_SLUG) : pointsAt(main.href, 'request'));
	if (!mainOk) problems.push(`the button «Подати заявку» -> ${requestOpen ? `${REQUEST_SLUG}/` : '#request'} is missing`);
	const panel = header[1].match(/<nav\b[^>]*class="[^"]*nav-menu__panel[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
	if (!/<details\b[^>]*class="[^"]*nav-menu/i.test(header[1]) || !panel) {
		problems.push('no <details class="nav-menu"> panel');
	} else {
		if (!/<p\b[^>]*class="[^"]*nav-menu__heading[^"]*"[^>]*>\s*Для кого\s*<\/p>/i.test(panel[1])) problems.push('the «Меню» panel has no «Для кого» group heading');
		const got = anchorsOf(panel[1]);
		const want = [...FOR_LINKS, ...PRODUCT_LINKS, CONTACT_LINK];
		const wantText = [...want.map(([text]) => text), 'Звʼязатися'].join(' | ');
		if (got.map((a) => a.text).join(' | ') !== wantText) {
			problems.push(`«Меню» panel is "${got.map((a) => a.text).join(' | ')}", expected "${wantText}"`);
		}
		FOR_LINKS.forEach(([text, slug], i) => {
			if (got[i] && !pointsAtPage(got[i].href, slug)) problems.push(`«Меню» panel: «${text}» points at "${got[i].href}", expected …/${slug}/`);
		});
		[...PRODUCT_LINKS, CONTACT_LINK].forEach(([text, id], i) => {
			const link = got[FOR_LINKS.length + i];
			if (link && !pointsAt(link.href, id)) problems.push(`«Меню» panel: «${text}» points at "${link.href}", expected #${id}`);
		});
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

/**
 * Story 80, decision 3: the product header and footer link nowhere into the documentation — except, since spec 83 §9,
 * the footer's «Посібник редактора», which is exactly `{base}/editor/` (GUIDE_SLUG).
 */
export const GUIDE_SLUG = 'editor';
export function checkNoDocsLinks(html, origin = SITE_ORIGIN, base = process.env.SITE_BASE ?? '/site') {
	const root = base === '/' ? '/' : `${base.replace(/\/$/, '')}/`;
	const guide = `${root}${GUIDE_SLUG}/`;
	const hrefs = [
		...hrefsIn(html, 'header', 'data-site-header'),
		...hrefsIn(html, 'footer', 'site-footer').filter((href) => href !== guide),
	];
	return hrefs.filter((href) => isDocsHref(href, origin)).map((href) => `the header or footer links into the documentation: ${href}`);
}

/**
 * Own pages the footer does not link (footer-and-audience-pages spec): «Демо-сайт» and «Подати заявку» are on the
 * home's first screen and in the header. Each must still be linked from some product page (checked in main()).
 */
export const FOOTER_EXEMPT = ['demo', 'zaiavka', 'dohovir'];

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
 * The home's first screen (2026-11-14). While `offer.demoOpen` is false: «Подати заявку» (the primary button) and the
 * outlined «Подивитися приклад сайту», and no link to «Спробувати». Once it is true: «Спробувати демо» -> sprobuvaty/
 * first, «Подати заявку» second, «Подивитися приклад сайту» a quiet link under them. «Подати заявку» is `requestHref`.
 */
export function checkHeroButtons(html, { demoOpen = offer.demoOpen, requestOpen = requestFormOpen() } = {}) {
	const hero = sectionById(html, 'top');
	if (hero === null) return ['no <section id="top"> (the hero)'];
	const problems = [];
	const links = [...hero.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((m) => ({ cls: m[0].match(/\bclass="([^"]*)"/i)?.[1] ?? '', ...anchorsOf(m[0])[0] }));
	const buttons = links.filter((l) => /(^|\s)btn(\s|$)/.test(l.cls));
	const request = (b) => b && b.text === 'Подати заявку' && (requestOpen ? pointsAtPage(b.href, REQUEST_SLUG) : pointsAt(b.href, 'request'));
	const example = links.find((l) => l.text === 'Подивитися приклад сайту');
	if (!example) problems.push('the hero has no «Подивитися приклад сайту»');
	if (demoOpen) {
		const [first, second] = buttons;
		if (!first || first.text !== 'Спробувати демо' || !/\bbtn-main\b/.test(first.cls) || !pointsAtPage(first.href, TRY_SLUG)) {
			problems.push('the first (primary) hero button is not «Спробувати демо» -> sprobuvaty/ while offer.demoOpen is true');
		}
		if (!request(second) || !/\bbtn-line\b/.test(second.cls)) problems.push('the second hero button is not the secondary «Подати заявку»');
		if (buttons.length !== 2) problems.push(`the hero has ${buttons.length} buttons, expected 2 (the example site is a quiet link)`);
		if (example && /(^|\s)btn(\s|$)/.test(example.cls)) problems.push('«Подивитися приклад сайту» is a button, expected a quiet link');
	} else {
		const [first, second] = buttons;
		if (!request(first) || !/\bbtn-main\b/.test(first.cls)) problems.push('the first (primary) hero button is not «Подати заявку»');
		if (!second || second.text !== 'Подивитися приклад сайту') problems.push('the second hero button is not «Подивитися приклад сайту»');
		if (links.some((l) => pointsAtPage(l.href, TRY_SLUG))) problems.push('the hero links to sprobuvaty/ while offer.demoOpen is false');
	}
	return problems;
}

/** The home's «З чого почати» (id `start`): the four cards, each a link to its page, right after the four things. */
export function checkHomeRoles(html) {
	const section = sectionById(html, 'start');
	if (section === null) return ['no <section id="start"> («З чого почати»)'];
	const want = [...FOR_LINKS];
	const got = anchorsOf(section).map((a) => ({ ...a, text: a.text.replace(/\s*→$/, '').replace(/Читати$/, '').trim() }));
	const problems = [];
	if (got.length !== want.length) problems.push(`«З чого почати» has ${got.length} links, expected ${want.length}`);
	want.forEach(([text, slug], i) => {
		if (!got[i] || !got[i].text.startsWith(text) || !pointsAtPage(got[i].href, slug)) problems.push(`«З чого почати»: card ${i + 1} is not «${text}» -> ${slug}/`);
	});
	if (!/<h2\b[^>]*>З чого почати<\/h2>/.test(section)) problems.push('«З чого почати» has no such H2');
	if (html.indexOf('id="start"') > html.indexOf('id="kinds"')) problems.push('«З чого почати» is not before «Для шкіл, садочків і коледжів»');
	return problems;
}

/**
 * The assistant section's three blocks under the tabs. The link to the guide's page on data is rendered only when that
 * page was imported (the released guide may not have it yet), so it is check-links' to hold, not this rule's.
 */
export function checkAssistantMore(html) {
	const section = sectionById(html, 'assistant');
	if (section === null) return ['no <section id="assistant">'];
	const problems = [];
	for (const heading of ['Як це виглядає в роботі', 'Ще помічник уміє', 'Що відбувається з даними']) {
		if (!new RegExp(`<h3\\b[^>]*>${heading}</h3>`).test(section)) problems.push(`the assistant section has no H3 «${heading}»`);
	}
	if ((section.match(/class="assist-flow__step"/g) ?? []).length !== 3) problems.push('the assistant section does not have three numbered steps');
	return problems;
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
 * `data-tabs` or `data-site-header`. `readSrc(src)` returns the file's text or null. The page «Спробувати»
 * (story 82, S1b; `allowTry`) also loads its own script, the one that contains `data-demo-try`.
 */
export function checkProductScripts(html, readSrc = () => null, { allowTry = false, allowTools = false, allowTurnstile = false } = {}) {
	const marks = ['data-tabs', 'data-site-header', ...(allowTry ? ['data-demo-try'] : []), ...(allowTools ? ['data-page-tools'] : [])];
	const ours = new RegExp(marks.join('|'));
	const problems = [];
	const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
	let m;
	while ((m = re.exec(html))) {
		const src = m[1].match(/\bsrc="([^"]*)"/i);
		// The request form's widget (story 78, W2): Cloudflare's script, on the page «Подати заявку» only.
		if (allowTurnstile && src && src[1] === TURNSTILE_SRC) continue;
		const code = src ? readSrc(src[1]) : m[2];
		if (code === null || code === undefined) problems.push(`a script (${src[1]}) that cannot be identified`);
		else if (!ours.test(code)) {
			problems.push(`a script that is neither the tabs nor the header bundle: ${src ? src[1] : code.slice(0, 40)}`);
		}
	}
	return problems;
}

/** Every product-page rule on one built page's HTML; `isHome` adds the chip and the claims, `allowUcoz` is the law page's. */
export function checkProductPage(
	html,
	{
		isHome = false,
		isTry = false,
		allowUcoz = false,
		assistantStatus = offer.assistantStatus,
		readSrc = () => null,
		slugs = null,
		base = '/site',
		checkedIso = offer.checkedOn,
		service = false,
		isRequest = false,
	} = {},
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
	if (isHome) problems.push(...checkHeroButtons(html), ...checkHomeRoles(html), ...checkAssistantMore(html));
	// Spec decision 14 exempts the home only (two cited claims); the other pages name their sources and say «станом на».
	if (isHome) problems.push(...checkLawClaims(html, { requireClaims: true }));
	// Spec 83: a role page (RolePage.astro, `data-role-page`) also loads src/scripts/page-tools.js (copy, print).
	problems.push(...checkProductScripts(html, readSrc, { allowTry: isTry, allowTools: /\bdata-role-page\b/.test(html), allowTurnstile: isRequest }));
	problems.push(...checkOfferNumbers(text, offer, checkedIso));
	if (service) problems.push(...checkServicePage(html));
	problems.push(...checkTypography(visibleText(extractMain(html))).map((p) => `<main>: ${p}`));
	problems.push(...checkTypography(visibleText(footerHtml(html))).map((p) => `footer: ${p}`));
	if (slugs) problems.push(...checkFooterLinks(html, slugs, base));
	return problems;
}

// ---------------------------------------------------------------------------------------------
// Spec 83, «Перевірки».

/** Placeholders of the spec that must never reach a built page: «[уточнити», «{рішення», «{дані». */
export const PLACEHOLDERS = ['[уточнити', '{рішення', '{дані'];

export function checkPlaceholders(html) {
	const lower = html.toLowerCase();
	return PLACEHOLDERS.filter((mark) => lower.includes(mark)).map((mark) => `a placeholder of the spec is left in the page: «${mark}»`);
}

const fold = (text) => text.replace(/[  ]/g, ' ').replace(/\s+/g, ' ');

/**
 * Spec 83: the price, the dates and the reply times are the same on every page — the ones of offer.mjs. In the text of
 * a product page: a sum «… грн/₴ на рік» is the year's price (unless it is a limit: «менше ніж», «від», «понад»,
 * «разом»); «… грн/₴ щокварталу / за квартал» the quarter's; «безкоштовно до …» and «до … безкоштовно» the end of the
 * pilot; «Перевірено …» the checked date; «відповідаємо протягом N» / «відповімо протягом N» the reply times.
 */
export function checkOfferNumbers(text, o = offer, checkedIso = o.checkedOn) {
	const t = fold(text);
	const problems = [];
	const want = (what, got, expected) => {
		if (got !== expected) problems.push(`${what} is "${got}", offer.mjs says "${expected}"`);
	};
	const sum = (n) => fold(formatGrn(n)).replace(/ грн$/, '');
	const limit = /(?:ніж|менше|від|понад|разом|більше) $/;
	for (const m of t.matchAll(/(\d{1,3}(?: \d{3})*) ?(?:грн|₴)(?: \/)? (?:на рік|за рік|рік)(?![А-Яа-яіїєґ])/g)) {
		if (!limit.test(t.slice(Math.max(0, m.index - 12), m.index))) want('the year price', m[1], sum(o.priceYearUah));
	}
	for (const m of t.matchAll(/(\d{1,3}(?: \d{3})*) ?(?:грн|₴) (?:щокварталу|за квартал|на квартал)/g)) {
		want('the quarter price', m[1], sum(o.priceQuarterUah));
	}
	const pilotEnd = fold(formatDateLongYear(o.pilotUntil)).replace(/ року$/, '');
	for (const m of t.matchAll(/[Бб]езкоштовно до (\d{1,2} [а-яії]+ \d{4})/g)) want('the end of the free period', m[1], pilotEnd);
	for (const m of t.matchAll(/[Дд]о (\d{1,2} [а-яії]+ \d{4}) року[^.]{0,40}?безкоштовно/g)) want('the end of the free period', m[1], pilotEnd);
	const checked = fold(formatDateLongYear(checkedIso)).replace(/ року$/, '');
	for (const m of t.matchAll(/[Пп]еревірено (\d{1,2} [а-яії]+ \d{4})/g)) want('the checked date', m[1], checked);
	for (const m of t.matchAll(/відповідаємо протягом (\d+) робоч/g)) want('the support reply time', Number(m[1]), o.supportReplyDays);
	for (const m of t.matchAll(/відповімо протягом (\d+) робоч/g)) want('the request reply time', Number(m[1]), o.requestReplyDays);
	return problems;
}

/** The text of an HTML fragment for the typography rules: tags removed, entities decoded, U+00A0 kept. */
export function visibleText(html) {
	return decodeApostrophes(rawText(html))
		.replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
		.replace(/&quot;|&#34;|&#x22;/gi, '"')
		.replace(/&laquo;/gi, '«')
		.replace(/&raquo;/gi, '»')
		.replace(/&amp;/gi, '&');
}

/** The product footer and the band above it, for the typography rules. */
function footerHtml(html) {
	const footer = html.match(/<footer\b[^>]*site-footer[^>]*>[\s\S]*?<\/footer>/i);
	const band = html.match(/<section\b[^>]*prefooter[^>]*>[\s\S]*?<\/section>/i);
	return `${band ? band[0] : ''} ${footer ? footer[0] : ''}`;
}

/**
 * Spec 83 §3 and §11, typography of the visitor's text: no straight quotes (" ') — «ялинки», „лапки“ and ʼ instead;
 * every „ has its “ and every « its »; digit groups are separated by a no-break space (U+00A0), never a plain one.
 */
export function checkTypography(text) {
	const problems = [];
	if (text.includes('"')) problems.push('a straight double quote " — use «» or „“');
	if (text.includes("'")) problems.push("a straight apostrophe ' — use ʼ (U+02BC)");
	const count = (ch) => text.split(ch).length - 1;
	if (count('„') !== count('“')) problems.push(`„ without its “ (${count('„')} „, ${count('“')} “)`);
	if (count('«') !== count('»')) problems.push(`« without its » (${count('«')} «, ${count('»')} »)`);
	for (const m of text.matchAll(/\d[  ]\d{3}(?!\d)/g)) problems.push(`a digit group without U+00A0 in "${m[0]}"`);
	return problems;
}

// ---------------------------------------------------------------------------------------------
// Spec 84, «Перевірки»: the pages of the group «Про сервіс».

// Not in the visitor's text of the group (spec 84 §1, §3, §11): the old date line, the word «пілот», «Джерело:» after a
// line, and the names that decisions 7, 8 and 17 keep off these pages.
export const SERVICE_FORBIDDEN = [
	{ re: /[Сс]таном на/, what: '«Станом на» (the group says «Перевірено …» in the hero)' },
	{ re: /пілот/i, what: '«пілот» (spec 83: «пробний період»)' },
	{ re: /Джерело:/, what: '«Джерело:» in the text (sources are [n] and «Джерела»)' },
	{ re: /Anthropic|Resend|Cloudflare|Telegram/i, what: 'the name of a supplier (decisions 7 and 17)' },
	{ re: /ШІ-помічник/i, what: '«ШІ-помічник» (decision 8)' },
];
// Sources only from official sites of public authorities: no legal press or code aggregators (spec 84 §3, §11).
export const UNOFFICIAL_SOURCES = /legalaid\.wiki|kodeksy\.com\.ua|telegraf\.com\.ua|ligazakon\.net|yur-gazeta\.com/i;

/** „ used as the outer quote: a „ that is not inside «…» (spec 83 §3: «…» outside, „…“ inside). */
export function outerLowQuotes(text) {
	let depth = 0;
	let found = 0;
	for (const ch of text) {
		if (ch === '«') depth += 1;
		else if (ch === '»') depth = Math.max(0, depth - 1);
		else if (ch === '„' && depth === 0) found += 1;
	}
	return found;
}

/** Every [n] of the page has its line in «Джерела», and every line is cited (spec 84 §11). */
export function checkRefs(html) {
	const { cited, listed } = refNumbers(html);
	const problems = [];
	for (const n of cited) if (!listed.has(n)) problems.push(`[${n}] is cited but «Джерела» has no line ${n}`);
	for (const n of listed) if (!cited.has(n)) problems.push(`«Джерела» line ${n} is never cited in the text`);
	return problems;
}

export function checkServicePage(html) {
	const main = extractMain(html);
	const text = visibleText(main);
	const problems = [];
	for (const rule of SERVICE_FORBIDDEN) if (rule.re.test(text)) problems.push(`spec 84: ${rule.what}`);
	if (outerLowQuotes(text) > 0) problems.push('spec 84: „ as the outer quote (use «…» outside, „…“ inside)');
	for (const m of main.matchAll(/href="([^"]+)"/g)) {
		if (UNOFFICIAL_SOURCES.test(m[1])) problems.push(`spec 84: a link to an unofficial source (${m[1]})`);
	}
	problems.push(...checkRefs(main).map((p) => `spec 84: ${p}`));
	return problems;
}

// ---------------------------------------------------------------------------------------------
// Story 82, slice S1b: the page «Спробувати».

export const TRY_SLUG = 'sprobuvaty';

/**
 * The page «Спробувати»: it never asks for `no-referrer` (the broker needs the site's Origin, decision 32) and sets
 * `strict-origin-when-cross-origin` itself; the pass goes in a hidden POST form to `{demoUrl}/__demo/start`; the
 * code field is numeric with `one-time-code`; the no-JavaScript line is there; Consent 1 is the spec's phase-2 text
 * (the code and the demo copy kept `offer.demoKeepDays` days); it is `noindex` exactly while the demo is not public.
 */
export function checkTryPage(html, { demoOpen = offer.demoOpen, demoUrl = offer.demoUrl, keepDays = offer.demoKeepDays } = {}) {
	const problems = [];
	if (/no-referrer(?!-)/i.test(html)) problems.push('asks for no-referrer: the broker would get no Origin (decision 32)');
	if (!/<meta name="referrer" content="strict-origin-when-cross-origin"/.test(html)) {
		problems.push('no <meta name="referrer" content="strict-origin-when-cross-origin">');
	}
	const action = `${demoUrl.replace(/\/+$/, '')}/__demo/start`;
	const pass = html.match(/<form\b[^>]*\bdata-try-pass\b[^>]*>([\s\S]*?)<\/form>/i);
	if (!pass) problems.push('no pass form (data-try-pass)');
	else {
		if (!pass[0].includes(`action="${action}"`)) problems.push(`the pass form does not post to ${action}`);
		if (!/method="post"/i.test(pass[0])) problems.push('the pass form is not method="post"');
		if (!/<input\b[^>]*name="pass"/.test(pass[1])) problems.push('the pass form has no field "pass"');
	}
	const code = html.match(/<input\b[^>]*\bdata-try-code-input\b[^>]*>/i);
	if (!code || !/inputmode="numeric"/.test(code[0]) || !/autocomplete="one-time-code"/.test(code[0])) {
		problems.push('the code field is not inputmode="numeric" autocomplete="one-time-code"');
	}
	const text = htmlText(html);
	if (!text.includes('Демо працює лише з увімкненим JavaScript.')) problems.push('no no-JavaScript line');
	const consent = `Погоджуюся, щоб Tabula надіслала мені код для входу і ${keepDays} днів зберігала мою демо-копію. Докладно — на сторінці «Обробка персональних даних».`;
	const mainText = htmlText(extractMain(html)).replace(/ /g, ' ').replace(/ ([.,])/g, '$1');
	if (!mainText.includes(consent)) problems.push('Consent 1 is not the spec\'s phase-2 text');
	const noindex = /<meta name="robots" content="noindex/.test(html);
	if (!demoOpen && !noindex) problems.push('not noindex while offer.demoOpen is false');
	if (demoOpen && noindex) problems.push('noindex although offer.demoOpen is true');
	return problems;
}

/** Story 82, decision 24: while the demo is not public no page links to «Спробувати»; once it is, the footer does. */
export function checkTryLinks(html, { demoOpen = offer.demoOpen, base = '/site', product = true } = {}) {
	const root = base === '/' ? '/' : `${base.replace(/\/$/, '')}/`;
	const target = `${root}${TRY_SLUG}/`;
	const linked = new RegExp(`href="(?:[^"]*/)?${TRY_SLUG}/(?:#[^"]*)?"`).test(html);
	if (!demoOpen) return linked ? [`links to ${target} while offer.demoOpen is false`] : [];
	if (product && !hrefsIn(html, 'footer', 'site-footer').includes(target)) return [`the footer has no link to ${target}`];
	return [];
}

// ---------------------------------------------------------------------------------------------
// Story 78, W2 / story 80, S3: the request form and its result pages.

export const REQUEST_SLUG = 'zaiavka';
export const REQUEST_ERROR_CODES = ['invalid', 'bot', 'limit', 'server', 'closed'];
export const REQUEST_SIGNERS = ['school', 'department', 'accounting', 'founder', 'unknown'];
// name -> [maxlength, required]: the spec's W2 table, the same numbers as cloud/control/src/requestForm.js FIELDS.
// `edrpou`, `signer` and `consent` have their own rules below.
export const REQUEST_FIELDS = Object.freeze({
	school: [200, true],
	place: [120, true],
	name: [120, true],
	position: [120, true],
	email: [254, true],
	phone: [30, false],
	current_site: [200, false],
	wanted: [40, false],
	comment: [1000, false],
});

const controlTag = (html, name) =>
	html.match(new RegExp(`<(?:input|textarea)\\b[^>]*\\bname="${name}"[^>]*>`, 'i'))?.[0] ?? null;

/**
 * The page «Подати заявку». Open (`open`: requests open and the Turnstile key set): exactly one form, posting to
 * `{cpUrl}/v1/requests` (urlencoded, utf-8), with every field of the spec's W2 table at the server's limits, the
 * required consent checkbox with value="yes", the honeypot, the Turnstile widget with the site key, the notice line and the
 * noscript line, and no script but Cloudflare's. Closed: no form, no widget, the support address.
 */
export function checkRequestPage(html, { open, cpUrl = offer.cpUrl, siteKey = offer.turnstileSiteKey, supportEmail = offer.supportEmail } = {}) {
	const main = extractMain(html);
	const problems = [];
	if (!open) {
		if (/<form\b/i.test(main)) problems.push('a <form> while the request form is closed');
		if (/cf-turnstile|challenges\.cloudflare\.com/i.test(main)) problems.push('the Turnstile widget while the request form is closed');
		if (!main.includes(`mailto:${supportEmail}`)) problems.push(`no mailto: link to ${supportEmail} while the request form is closed`);
		return problems;
	}
	const forms = main.match(/<form\b[^>]*>/gi) ?? [];
	if (forms.length !== 1) return [`${forms.length} <form> elements, expected exactly one`];
	const form = forms[0];
	if (!form.includes(`action="${cpUrl.replace(/\/+$/, '')}/v1/requests"`)) problems.push(`the form does not post to ${cpUrl}/v1/requests`);
	if (!/\bmethod="post"/i.test(form)) problems.push('the form is not method="post"');
	if (!/\baccept-charset="utf-8"/i.test(form)) problems.push('the form has no accept-charset="utf-8"');
	for (const [name, [max, required]] of Object.entries(REQUEST_FIELDS)) {
		const tag = controlTag(main, name);
		if (!tag) problems.push(`no field "${name}"`);
		else {
			if (!tag.includes(`maxlength="${max}"`)) problems.push(`field "${name}" has no maxlength="${max}"`);
			if (/\brequired\b/.test(tag) !== required) problems.push(`field "${name}" is${required ? ' not' : ''} required, the server says it is${required ? '' : ' not'}`);
		}
	}
	const email = controlTag(main, 'email');
	if (email && !/\btype="email"/.test(email)) problems.push('field "email" is not type="email"');
	const edrpou = controlTag(main, 'edrpou');
	if (!edrpou) problems.push('no field "edrpou"');
	else {
		if (!/\brequired\b/.test(edrpou)) problems.push('field "edrpou" is not required');
		if (!edrpou.includes('pattern="\\d{8}"')) problems.push('field "edrpou" has no pattern="\\d{8}"');
		if (!/\binputmode="numeric"/.test(edrpou)) problems.push('field "edrpou" is not inputmode="numeric"');
	}
	const phone = controlTag(main, 'phone');
	if (phone && !/\bpattern="/.test(phone)) problems.push('field "phone" has no pattern');
	const radios = main.match(/<input\b[^>]*\bname="signer"[^>]*>/gi) ?? [];
	const values = radios.map((tag) => tag.match(/\bvalue="([^"]*)"/)?.[1]);
	if (values.join(',') !== REQUEST_SIGNERS.join(',')) problems.push(`the signer radios are "${values.join(',')}", expected "${REQUEST_SIGNERS.join(',')}"`);
	if (radios.some((tag) => !/\btype="radio"/.test(tag) || !/\brequired\b/.test(tag))) problems.push('a signer radio is not required');
	const consent = controlTag(main, 'consent');
	if (!consent) problems.push('no consent checkbox');
	else {
		if (!/\btype="checkbox"/.test(consent)) problems.push('"consent" is not a checkbox');
		if (!/\brequired\b/.test(consent)) problems.push('the consent checkbox is not required');
		if (!/\bvalue="yes"/.test(consent)) problems.push('the consent checkbox has no value="yes"');
	}
	const trap = controlTag(main, 'website');
	if (!trap) problems.push('no honeypot "website"');
	else {
		if (!/\btabindex="-1"/.test(trap) || !/\bautocomplete="off"/.test(trap)) problems.push('the honeypot needs tabindex="-1" and autocomplete="off"');
		if (/\brequired\b/.test(trap)) problems.push('the honeypot is required');
		if (!/aria-hidden="true"[^>]*>(?:(?!<\/div>)[\s\S])*name="website"/.test(main)) problems.push("the honeypot's wrapper has no aria-hidden=\"true\"");
	}
	const widget = main.match(/<div\b[^>]*class="[^"]*\bcf-turnstile\b[^"]*"[^>]*>/i)?.[0];
	if (!widget) problems.push('no Turnstile widget (div.cf-turnstile)');
	else if (!widget.includes(`data-sitekey="${siteKey}"`)) problems.push('the Turnstile widget has not the site key of offer.mjs');
	if (!main.includes(`src="${TURNSTILE_SRC}"`)) problems.push("Cloudflare's Turnstile script is missing");
	problems.push(...checkScripts(main));
	const text = fold(htmlText(main));
	if (!/<button\b[^>]*type="submit"[^>]*>\s*Надіслати заявку\s*<\/button>/.test(main)) problems.push('no submit button «Надіслати заявку»');
	if (/<button\b[^>]*\bdisabled\b/.test(main)) problems.push('the submit button is disabled');
	if (!text.includes('Дані з форми отримує фізична особа — підприємець, що надає послуги Tabula')) problems.push('no notice line above the button');
	if (!text.includes(`напишіть нам на ${supportEmail}`)) problems.push('the noscript line does not name the support address');
	return problems;
}

/** A result page of the form (`/zaiavka/diakuiemo/`, `/zaiavka/pomylka/<code>/`) is `noindex`. */
export function checkResultPage(html) {
	return /<meta name="robots" content="noindex/.test(html) ? [] : ['a result page of the request form that is not noindex'];
}

/** No page but the result pages themselves links to them (the control plane's redirect is the only way in). */
export function checkResultLinks(html) {
	return /href="[^"]*\/zaiavka\/(?:diakuiemo|pomylka)\//.test(html) ? ['links to a result page of the request form'] : [];
}

/** The sitemap lists no result page of the form. */
export function checkSitemapResults(xml) {
	return /\/zaiavka\/(?:diakuiemo|pomylka)\//.test(xml) ? ['the sitemap lists a result page of the request form'] : [];
}

/** True for the built file of a result page of the request form (`rel` is relative to dist/). */
export function isResultRel(rel) {
	const parts = rel.split(path.sep);
	return parts[0] === REQUEST_SLUG && (parts[1] === 'diakuiemo' || parts[1] === 'pomylka');
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
	const checkedTextFor = (slug) => formatDateLongYear(checkedOnFor(slug)).replace(/\u00a0/g, ' ');

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
		for (const problem of checkBuiltAsOf(name, body, extractMain(html))) fail(`dist (${rel})`, problem);
		for (const problem of checkCheckedDate(body, checkedTextFor(name))) fail(`dist (${rel})`, problem);
		for (const phrase of findForbidden(body, { allowUcoz: UCOZ_PAGES.includes(name) })) {
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
					isTry: rel === path.join(TRY_SLUG, 'index.html'),
					isRequest: rel === path.join(REQUEST_SLUG, 'index.html'),
					allowUcoz: UCOZ_PAGES.some((slug) => rel === path.join(slug, 'index.html')),
					checkedIso: checkedOnFor(first),
					service: SERVICE_SLUGS.includes(first) && rel === path.join(first, 'index.html'),
					readSrc: (src) => readBuilt(distDir, base, src),
					slugs: ownSlugs,
					base,
				})) fail(`dist/${rel}`, problem);
		} else {
			for (const problem of checkDocChrome(html, base)) fail(`dist/${rel} header/footer`, problem);
		}
		if (rel === path.join(REQUEST_SLUG, 'index.html')) {
			for (const problem of checkRequestPage(html, { open: requestFormOpen() })) fail(`dist/${rel}`, problem);
		}
		if (isResultRel(rel)) {
			for (const problem of checkResultPage(html)) fail(`dist/${rel}`, problem);
		} else {
			for (const problem of checkResultLinks(html)) fail(`dist/${rel}`, problem);
		}
		if (rel === path.join(TRY_SLUG, 'index.html')) {
			for (const problem of checkTryPage(html)) fail(`dist/${rel}`, problem);
		} else {
			for (const problem of checkTryLinks(html, { base, product: isProductPage(html) })) fail(`dist/${rel}`, problem);
		}
		for (const problem of checkFooterLine(html, footerLine)) fail(`dist/${rel}`, problem);
		for (const problem of checkEveryPage(html)) fail(`dist/${rel}`, problem);
		for (const problem of checkPlaceholders(html)) fail(`dist/${rel}`, problem);
		if (!IMPORTED_DIRS.has(first)) {
			for (const problem of checkDemoAddress(html)) fail(`dist/${rel}`, problem);
		}
	}
	for (const css of walkFiles(distDir, '.css')) {
		if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(readFileSync(css, 'utf8'))) {
			fail(`dist/${path.relative(distDir, css)}`, 'the built CSS refers to Google Fonts');
		}
	}

	// Every result page of the request form is built, and the sitemap lists none of them.
	for (const rel of ['diakuiemo', ...REQUEST_ERROR_CODES.map((code) => path.join('pomylka', code))]) {
		if (!existsSync(path.join(distDir, REQUEST_SLUG, rel, 'index.html'))) {
			fail(`dist/${REQUEST_SLUG}/${rel}/index.html`, 'the result page is not built');
		}
	}
	for (const file of readdirSync(distDir).filter((name) => /^sitemap.*\.xml$/.test(name))) {
		for (const problem of checkSitemapResults(readFileSync(path.join(distDir, file), 'utf8'))) fail(`dist/${file}`, problem);
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
