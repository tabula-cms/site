#!/usr/bin/env node
// WCAG 2.2 AA check of the built site with axe-core in headless Chromium (story 78, W1; story 80).
// Run after `npm run build`: `npm run a11y`. Serves dist/ itself with the tiny static server of
// scripts/lib/serve-dist.mjs that maps the base path (SITE_BASE, default /site as in
// astro.config.mjs), so it needs no dependency beyond playwright and @axe-core/playwright.
//
// Pages: every product page — the home and the twelve reading pages of src/content/pages/ (slice S2) —
// each at 1280 and 320 px, in a context with `reducedMotion: 'reduce'` (so revealed content is measured,
// not its first frame). On the home every tab of every tablist is also clicked in turn and axe runs after
// each. The documentation (Starlight) is not scanned. Prints the violation count and the time per page
// and width; exits 1 on any violation. Spec 83 adds: no product page scrolls sideways at 360 px, and the summary print
// of «Для бухгалтерії» fits one A4 sheet.

import { existsSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { fileURLToPath } from 'node:url';
import { serveDist, distDir, baseNoSlash } from './lib/serve-dist.mjs';

const pagesDir = fileURLToPath(new URL('../src/content/pages/', import.meta.url));
const PAGES = [
	'',
	...readdirSync(pagesDir)
		.filter((name) => /\.mdx?$/.test(name))
		.map((name) => `${name.replace(/\.mdx?$/, '')}/`)
		.sort(),
	'sprobuvaty/',
	// The request form's result pages (story 78, W2): always built, noindex. The form itself is /zaiavka/, scanned open
	// when the site is built with the form open (the default; TABULA_REQUESTS_OPEN=0 closes it).
	'zaiavka/diakuiemo/',
	...['invalid', 'bot', 'limit', 'server', 'closed'].map((code) => `zaiavka/pomylka/${code}/`),
];
const WIDTHS = [1280, 320];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// What axe reports for `tab`, counted and printed.
async function scan(tab, label, started) {
	const result = await new AxeBuilder({ page: tab }).withTags(TAGS).analyze();
	const violations = result.violations;
	console.log(`a11y: ${label} — ${violations.length} violation(s), ${Date.now() - started} ms`);
	for (const violation of violations) {
		console.error(`  - ${violation.id} (${violation.impact}): ${violation.help}`);
		for (const node of violation.nodes.slice(0, 5)) console.error(`      ${node.target.join(' ')}`);
	}
	return violations.length;
}

// The home with motion ALLOWED (1280 px): scrolled to the bottom in steps (so every section enters the
// viewport and its effects play, the assistant's sequence and the scroll story included) and left for 3 s, so
// the end state of every effect is measured by axe too. Returns the number of violations.
async function homeWithMotion(browser, origin, started) {
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
	const tab = await context.newPage();
	await tab.goto(`${origin}${baseNoSlash}/`, { waitUntil: 'load' });
	const height = await tab.evaluate(() => document.documentElement.scrollHeight);
	for (let y = 0; y < height; y += 600) {
		await tab.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
		await new Promise((resolve) => setTimeout(resolve, 80));
	}
	await tab.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
	await new Promise((resolve) => setTimeout(resolve, 3000));
	const count = await scan(tab, '/ @ 1280px, motion allowed, scrolled to the bottom + 3 s', started);
	await context.close();
	return count;
}

// The hero while it appears (issue #71): with motion allowed the load animations of the hero (laptop, phone, card, the
// typed words of the card's title) are frozen by the Web Animations API at several moments of the first 2 s and axe's
// color-contrast rule runs on the hero at each one, so a word at partial opacity would be caught. Scroll-linked
// animations have no time and are left alone. Also fails when an animation of the hero is still running 5 s after
// load (no idle loops: decorative motion stops). Returns the number of problems.
async function heroWhileAppearing(browser, origin) {
	let problems = 0;
	const moments = [0, 200, 400, 600, 800, 1000, 1200, 1500, 2000];
	for (const width of [1280]) {
		const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
		const tab = await context.newPage();
		await tab.goto(`${origin}${baseNoSlash}/`, { waitUntil: 'load' });
		const hero = '.hero';
		const timed = await tab.evaluate((sel) => {
			const animations = document.querySelector(sel).getAnimations({ subtree: true }).filter((a) => a.timeline instanceof DocumentTimeline);
			for (const a of animations) a.pause();
			return animations.length;
		}, hero);
		console.log(`a11y: hero while appearing — ${timed} timed animation(s) frozen for sampling`);
		for (const ms of moments) {
			await tab.evaluate(
				({ sel, ms }) => {
					for (const a of document.querySelector(sel).getAnimations({ subtree: true })) if (a.timeline instanceof DocumentTimeline) a.currentTime = ms;
				},
				{ sel: hero, ms },
			);
			const result = await new AxeBuilder({ page: tab }).include(hero).withRules(['color-contrast']).analyze();
			const bad = result.violations.flatMap((v) => v.nodes.map((n) => n.any.map((c) => `${c.data?.contrastRatio} ${n.target.join(' ')}`).join(' ')));
			console.log(`a11y: hero at ${ms} ms — ${bad.length} color-contrast violation(s)${bad.length ? `: ${bad.slice(0, 4).join('; ')}` : ''}`);
			problems += bad.length;
		}
		await context.close();
	}
	// Nothing in the hero idles: 5 s after load no animation of it is running (infinite or long).
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
	const tab = await context.newPage();
	await tab.goto(`${origin}${baseNoSlash}/`, { waitUntil: 'load' });
	await new Promise((resolve) => setTimeout(resolve, 5000));
	const running = await tab.evaluate(() =>
		document.querySelector('.hero').getAnimations({ subtree: true }).filter((a) => a.timeline instanceof DocumentTimeline && a.playState === 'running').map((a) => a.animationName ?? a.id ?? '?'),
	);
	console.log(`a11y: hero 5 s after load — ${running.length} running timed animation(s)${running.length ? `: ${running.join(', ')}` : ''}`);
	problems += running.length;
	await context.close();
	return problems;
}

// The header is always visible (story 80): after scrolling down 2000 px and after a long anchor jump it is in the
// viewport and fully shown, at a desktop and a phone width. Motion allowed here (the other contexts use reduced
// motion). Returns the number of problems.
async function visibleHeader(browser, origin) {
	let problems = 0;
	const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const expect = (ok, what) => {
		console.log(`a11y: header always visible — ${what}: ${ok ? 'ok' : 'FAILED'}`);
		if (!ok) problems += 1;
	};
	for (const width of [1280, 390]) {
		const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'no-preference' });
		const tab = await context.newPage();
		const shown = () =>
			tab.evaluate(() => {
				const box = document.querySelector('[data-site-header]').getBoundingClientRect();
				return box.top >= 0 && box.bottom > 0 && box.bottom <= innerHeight && getComputedStyle(document.querySelector('[data-site-header]')).clipPath === 'none';
			});
		await tab.goto(`${origin}${baseNoSlash}/`, { waitUntil: 'load' });
		await tab.evaluate(() => window.scrollTo({ top: 2000, behavior: 'instant' }));
		await tab.mouse.move(600, 500);
		await tab.mouse.wheel(0, 200);
		await wait(500);
		expect(await shown(), `@${width} after scrolling down 2000 px`);
		await tab.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await wait(300);
		await tab.evaluate(() => {
			location.hash = 'faq';
		});
		await wait(2500);
		expect(await shown(), `@${width} after a long jump to #faq`);
		await context.close();
	}
	return problems;
}

// Spec 83 §11: no product page scrolls sideways at 360 px. Returns the number of pages that do.
async function noSideScroll(browser, origin) {
	let problems = 0;
	const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
	const tab = await context.newPage();
	for (const page of PAGES) {
		await tab.goto(`${origin}${baseNoSlash}/${page}`, { waitUntil: 'load' });
		const extra = await tab.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		console.log(`a11y: /${page} @ 360px — ${extra > 0 ? `scrolls sideways by ${extra} px: FAILED` : 'no sideways scroll'}`);
		if (extra > 0) problems += 1;
	}
	await context.close();
	return problems;
}

// Spec 83 §11: «Роздрукувати» on «Для бухгалтерії» prints «Коротко», the details and the plan line on ONE A4 sheet
// (the class `print-summary` the button sets, then the print media). Returns 1 when it takes more.
async function accountingSummaryPrint(browser, origin) {
	const context = await browser.newContext();
	const tab = await context.newPage();
	await tab.goto(`${origin}${baseNoSlash}/dlia-bukhhalterii/`, { waitUntil: 'load' });
	await tab.evaluate(() => document.documentElement.classList.add('print-summary'));
	await tab.emulateMedia({ media: 'print' });
	const pdf = await tab.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
	const sheets = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
	await context.close();
	console.log(`a11y: «Для бухгалтерії» printed by «Роздрукувати» — ${sheets} A4 sheet(s)${sheets === 1 ? '' : ': FAILED, expected 1'}`);
	return sheets === 1 ? 0 : 1;
}

async function main() {
	if (!existsSync(distDir)) {
		console.error('a11y: dist/ not found — run "npm run build" first');
		process.exit(1);
	}
	const { server, origin } = await serveDist();
	const browser = await chromium.launch();
	let violations = 0;
	try {
		for (const page of PAGES) {
			for (const width of WIDTHS) {
				const started = Date.now();
				const context = await browser.newContext({
					viewport: { width, height: 900 },
					reducedMotion: 'reduce',
				});
				const tab = await context.newPage();
				const url = `${origin}${baseNoSlash}/${page}`;
				const response = await tab.goto(url, { waitUntil: 'load' });
				if (!response || response.status() !== 200) {
					console.error(`a11y: ${url} answered ${response?.status()}`);
					violations += 1;
				}
				violations += await scan(tab, `/${page} @ ${width}px`, started);

				// «Спробувати» (story 82, S1b): every state of the page at once — the form, the code step, the closed
				// and full states — so the markup the script shows later is scanned too.
				if (page === 'sprobuvaty/') {
					const started = Date.now();
					await tab.evaluate(() => {
						for (const el of document.querySelectorAll('[data-demo-try] [hidden]:not([data-try-pass])')) el.hidden = false;
					});
					violations += await scan(tab, `/${page} @ ${width}px, every state shown`, started);
				}

				// The home: every tab of every tablist, opened in turn, then scanned.
				if (page === '') {
					const tablists = await tab.locator('[role="tablist"]').count();
					for (let list = 0; list < tablists; list += 1) {
						const tabs = tab.locator('[role="tablist"]').nth(list).locator('[role="tab"]');
						const count = await tabs.count();
						for (let i = 0; i < count; i += 1) {
							const started = Date.now();
							const handle = tabs.nth(i);
							const name = (await handle.textContent()).trim();
							await handle.click();
							violations += await scan(tab, `/ @ ${width}px, tablist ${list + 1}, tab «${name}»`, started);
						}
					}
				}
				await context.close();
			}
		}
		violations += await homeWithMotion(browser, origin, Date.now());
		violations += await heroWhileAppearing(browser, origin);
		violations += await visibleHeader(browser, origin);
		violations += await noSideScroll(browser, origin);
		violations += await accountingSummaryPrint(browser, origin);
	} finally {
		await browser.close();
		server.close();
	}
	if (violations > 0) {
		console.error(`a11y: ${violations} problem(s)`);
		process.exit(1);
	}
	console.log('a11y: no violations');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
