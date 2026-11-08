#!/usr/bin/env node
// Checks the built site against the rules of story 78 (W1). Runs after `npm run build` (npm's
// `postbuild` hook, after check-links) and on its own as `npm run check:built`.
//
// What it holds:
//   1. The header: the five links and the "Залишити заявку" button, base-aware, in both the inline
//      nav and the "Меню" panel (button first there). «Документація» points at `editor/` until W3
//      adds `dokumentatsiia/`; its target must exist in dist/ unless DOCS_IMPORT_SKIPPED=true.
//   2. The site's own pages (src/content/docs/*.md(x) outside the imported editor/install/qa/dev):
//      none of decision 8's forbidden phrases («uCoz» is allowed only on the law page), «станом на»
//      on every page that names a law or a procurement rule, and the apostrophe ʼ (U+02BC) — never
//      ' or ’ between Cyrillic letters.
//   3. In the built own pages every «станом на» is followed by the formatted `asOf` date of
//      offer.mjs (a stale date fails), and the law-pattern/«станом на» rule is applied again to the
//      text of <main> as built, so text that comes from offer.mjs or a component is covered.
//   4. `zaiavka`'s <main> has no inline <script> and no script `src` other than Cloudflare
//      Turnstile's api.js.
//   5. The header (item 1) and the footer's operator line (decision 5, verbatim) on EVERY html page
//      of dist/, imported docs included. Forbidden phrases stay on the own pages: the imported docs
//      are tabula's text.
//
// The rules are pure functions exported for test/check-built.test.mjs; the checks over the files
// run only when this file is invoked directly.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { offer, operatorLine, formatDate } from '../src/config/offer.mjs';

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

/** Problems with the footer's operator line (decision 5, verbatim) on one built page. */
export function checkOperatorLine(html, line) {
	const footer = html.match(/<footer\b[^>]*site-footer[^>]*>([\s\S]*?)<\/footer>/i);
	if (!footer) return ['no <footer class="site-footer">'];
	return htmlText(footer[1]).includes(line) ? [] : ['the footer lacks the operator line (decision 5)'];
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

/** The anchors of the first `<nav aria-label="Основна навігація">`: `{ href, text, inPanel }`. */
export function headerAnchors(html) {
	const nav = html.match(/<nav\b[^>]*aria-label="Основна навігація"[^>]*>([\s\S]*?)<\/nav>/i);
	if (!nav) return null;
	const inner = nav[1];
	const split = inner.search(/<details\b/i);
	const anchors = [];
	const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
	let match;
	while ((match = re.exec(inner))) {
		const href = match[1].match(/\bhref="([^"]*)"/i);
		anchors.push({
			href: href ? href[1] : '',
			text: htmlText(match[2]),
			inPanel: split !== -1 && match.index > split,
		});
	}
	return anchors;
}

/** The header's expected links for `base` (`'/'` or `'/site'`), in nav order. */
export function expectedHeader(base) {
	const prefix = base === '/' ? '/' : `${base.replace(/\/$/, '')}/`;
	return {
		links: [
			['Як це працює', `${prefix}yak-tse-pratsiuie/`],
			['Хостинг і ціна', `${prefix}khostynh-i-tsina/`],
			['Для бухгалтерії', `${prefix}dlia-bukhhalterii/`],
			['Документація', `${prefix}editor/`],
			['Підтримка', `${prefix}pidtrymka/`],
		],
		button: ['Залишити заявку', `${prefix}zaiavka/`],
	};
}

/** Problems with one page's header: five links and the button, inline and in the panel. */
export function checkHeader(html, base) {
	const anchors = headerAnchors(html);
	if (!anchors) return ['no <nav aria-label="Основна навігація">'];
	const { links, button } = expectedHeader(base);
	const fmt = (list) => list.map((a) => `${a.text} -> ${a.href}`).join(' | ');
	const want = (pairs) => pairs.map(([text, href]) => `${text} -> ${href}`).join(' | ');
	const problems = [];
	const inline = anchors.filter((a) => !a.inPanel);
	const panel = anchors.filter((a) => a.inPanel);
	const inlineWant = [...links, button];
	const panelWant = [button, ...links];
	if (fmt(inline) !== want(inlineWant)) {
		problems.push(`inline nav is "${fmt(inline)}", expected "${want(inlineWant)}"`);
	}
	if (fmt(panel) !== want(panelWant)) {
		problems.push(`"Меню" panel is "${fmt(panel)}", expected "${want(panelWant)}"`);
	}
	return problems;
}

// ---------------------------------------------------------------------------------------------
// The checks over the files.

const IMPORTED_DIRS = new Set(['editor', 'install', 'qa', 'dev']);

function walkSources(dir, rel = '') {
	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (rel === '' && entry.isDirectory() && IMPORTED_DIRS.has(entry.name)) continue;
		const full = path.join(dir, entry.name);
		const relPath = rel ? `${rel}/${entry.name}` : entry.name;
		if (entry.isDirectory()) files.push(...walkSources(full, relPath));
		else if (/\.mdx?$/.test(entry.name)) files.push({ full, rel: relPath });
	}
	return files;
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

function main() {
	const root = fileURLToPath(new URL('../', import.meta.url));
	const distDir = path.join(root, 'dist');
	const docsDir = path.join(root, 'src', 'content', 'docs');
	const base = process.env.SITE_BASE ?? '/site';
	const skipped = process.env.DOCS_IMPORT_SKIPPED === 'true';

	if (!existsSync(distDir)) {
		console.error(`check-built: ${distDir} not found — run "npm run build" first`);
		process.exit(1);
	}

	const failures = [];
	const fail = (where, what) => failures.push(`${where}: ${what}`);
	const asOfText = formatDate(offer.asOf);

	const pages = walkSources(docsDir);
	for (const { full, rel } of pages) {
		const name = rel.replace(/\.mdx?$/, '');
		const text = readFileSync(full, 'utf8');
		for (const problem of checkOwnSource(name, text)) fail(`src/content/docs/${rel}`, problem);

		const builtFile = distFileFor(distDir, rel);
		if (!existsSync(builtFile)) {
			fail(`src/content/docs/${rel}`, `no built page at ${path.relative(root, builtFile)}`);
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

	// The header and the operator line are the site's chrome: held on every page, imported or not.
	const htmlFiles = walkHtml(distDir);
	for (const file of htmlFiles) {
		const html = readFileSync(file, 'utf8');
		const rel = path.relative(distDir, file);
		for (const problem of checkHeader(html, base)) fail(`dist/${rel} header`, problem);
		for (const problem of checkOperatorLine(html, operatorLine)) fail(`dist/${rel}`, problem);
	}

	if (!skipped && !existsSync(path.join(distDir, 'editor', 'index.html'))) {
		fail('dist', '"Документація" points at editor/, but dist/editor/ is missing');
	}

	if (failures.length > 0) {
		console.error(`check-built: ${failures.length} problem(s):`);
		for (const failure of failures) console.error(`  - ${failure}`);
		process.exit(1);
	}
	console.log(
		`check-built: ${pages.length} own pages and ${htmlFiles.length} html pages OK (base ${base}${skipped ? ', docs import skipped' : ''})`,
	);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
