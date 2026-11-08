#!/usr/bin/env node
// WCAG 2.2 AA check of the built site with axe-core in headless Chromium (story 78, W1; story 80).
// Run after `npm run build`: `npm run a11y`. Serves dist/ itself with the tiny static server of
// scripts/lib/serve-dist.mjs that maps the base path (SITE_BASE, default /site as in
// astro.config.mjs), so it needs no dependency beyond playwright and @axe-core/playwright.
//
// Pages: the product pages (the home, slice S1 of story 80) and the W1 pages «Хостинг і ціна»,
// «Для бухгалтерії» and «Заявка», each at 1280 and 320 px, in a context with
// `reducedMotion: 'reduce'` (so revealed content is measured, not its first frame). On the home
// every tab of both tablists is also clicked in turn and axe runs after each. Prints the violation
// count and the time per page and width; exits 1 on any violation.

import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serveDist, distDir, baseNoSlash } from './lib/serve-dist.mjs';

const PAGES = ['', 'khostynh-i-tsina/', 'dlia-bukhhalterii/', 'zaiavka/'];
const WIDTHS = [1280, 320];
// Starlight's own search button (visible "Пошук Ctrl K", accessible name "Пошук") fails axe's
// label-content-name-mismatch on every page of the site, imported docs included. It is the
// framework's component, not ours; only this rule on only this element is ignored, and the
// number of ignored nodes is printed for every run. Temporary: tracked in
// https://github.com/tabula-cms/site/issues/22 — remove this entry when that issue is closed.
const KNOWN = [{ rule: 'label-content-name-mismatch', target: 'button[data-open-modal=""]' }];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// What axe reports for `tab`, minus the known Starlight search-button node, counted and printed.
async function scan(tab, label, started) {
	const result = await new AxeBuilder({ page: tab }).withTags(TAGS).analyze();
	const isKnown = (v) =>
		KNOWN.some((k) => k.rule === v.id && v.nodes.every((n) => n.target.join(' ') === k.target));
	const ignored = result.violations.filter(isKnown).reduce((sum, v) => sum + v.nodes.length, 0);
	const violations = result.violations.filter((v) => !isKnown(v));
	console.log(
		`a11y: ${label} — ${violations.length} violation(s), ${ignored} known node(s) ignored, ${Date.now() - started} ms`,
	);
	for (const violation of violations) {
		console.error(`  - ${violation.id} (${violation.impact}): ${violation.help}`);
		for (const node of violation.nodes.slice(0, 5)) console.error(`      ${node.target.join(' ')}`);
	}
	return violations.length;
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
