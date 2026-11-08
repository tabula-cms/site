#!/usr/bin/env node
// WCAG 2.2 AA check of the built site with axe-core in headless Chromium (story 78, W1; story 80).
// Run after `npm run build`: `npm run a11y`. Serves dist/ itself with the tiny static server of
// scripts/lib/serve-dist.mjs that maps the base path (SITE_BASE, default /site as in
// astro.config.mjs), so it needs no dependency beyond playwright and @axe-core/playwright.
//
// Pages: every product page — the home and the eleven reading pages of src/content/pages/ (slice S2) —
// each at 1280 and 320 px, in a context with `reducedMotion: 'reduce'` (so revealed content is measured,
// not its first frame). On the home every tab of both tablists is also clicked in turn and axe runs after
// each. The documentation (Starlight) is not scanned. Prints the violation count and the time per page
// and width; exits 1 on any violation.

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

// The live header (story 80): after a long anchor jump, a deep link and a programmatic focus the header must be
// visible and the page must not move. Motion allowed here (the other contexts use reduced motion, where the
// header never hides). Returns the number of problems.
async function liveHeader(browser, origin) {
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
	const tab = await context.newPage();
	const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const hidden = () => tab.evaluate(() => document.querySelector('[data-site-header]').classList.contains('is-hidden'));
	const root = `${origin}${baseNoSlash}/`;
	let problems = 0;
	const expect = (ok, what) => {
		console.log(`a11y: live header — ${what}: ${ok ? 'ok' : 'FAILED'}`);
		if (!ok) problems += 1;
	};
	await tab.goto(`${root}#faq`, { waitUntil: 'load' });
	await wait(1800);
	expect(!(await hidden()), 'deep link /#faq ends with the header shown');
	await tab.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await wait(300);
	await tab.click('.nav-links a[href="#faq"]');
	await wait(2200);
	expect(!(await hidden()), 'a long jump to #faq ends with the header shown');
	await tab.evaluate(() => window.scrollTo({ top: 3000, behavior: 'instant' }));
	await wait(300);
	await tab.mouse.move(600, 500);
	for (let i = 0; i < 4; i += 1) {
		await tab.mouse.wheel(0, 200);
		await wait(120);
	}
	await wait(400);
	expect(await hidden(), 'reading downwards hides the header');
	const before = await tab.evaluate(() => window.scrollY);
	await tab.evaluate(() => document.querySelector('.nav-links a').focus());
	await wait(300);
	const after = await tab.evaluate(() => window.scrollY);
	expect(before === after && !(await hidden()), 'focusing a link in the hidden header shows it without scrolling the page');
	await context.close();
	return problems;
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

				// The home: every tab of both tablists, opened in turn, then scanned.
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
		violations += await liveHeader(browser, origin);
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
