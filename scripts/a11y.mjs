#!/usr/bin/env node
// WCAG 2.2 AA check of the built site with axe-core in headless Chromium (story 78, W1).
// Run after `npm run build`: `npm run a11y`. Serves dist/ itself with a tiny node:http static
// server that maps the base path (SITE_BASE, default /site as in astro.config.mjs), so it needs
// no dependency beyond playwright and @axe-core/playwright.
//
// Pages: the home page, «Хостинг і ціна», «Для бухгалтерії» and «Заявка», each at 1280 and
// 320 px. Prints the violation count and the time per page and width; exits 1 on any violation.

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const distDir = path.join(root, 'dist');
const base = process.env.SITE_BASE ?? '/site';
const baseNoSlash = base === '/' ? '' : base.replace(/\/$/, '');

const PAGES = ['', 'khostynh-i-tsina/', 'dlia-bukhhalterii/', 'zaiavka/'];
const WIDTHS = [1280, 320];
// Starlight's own search button (visible "Пошук Ctrl K", accessible name "Пошук") fails axe's
// label-content-name-mismatch on every page of the site, imported docs included. It is the
// framework's component, not ours; only this rule on only this element is ignored, and the
// number of ignored nodes is printed for every run. Temporary: tracked in
// https://github.com/tabula-cms/site/issues/22 — remove this entry when that issue is closed.
const KNOWN = [{ rule: 'label-content-name-mismatch', target: 'button[data-open-modal=""]' }];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.png': 'image/png',
	'.woff2': 'font/woff2',
	'.wasm': 'application/wasm',
};

function serve() {
	const server = createServer((req, res) => {
		let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
		if (baseNoSlash && !pathname.startsWith(`${baseNoSlash}/`)) pathname = '/__outside__';
		else pathname = pathname.slice(baseNoSlash.length) || '/';
		let file = path.join(distDir, path.normalize(pathname));
		if (!file.startsWith(distDir)) file = '';
		if (file && existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
		if (!file || !existsSync(file)) {
			res.writeHead(404, { 'content-type': 'text/plain' });
			res.end('not found');
			return;
		}
		res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
		res.end(readFileSync(file));
	});
	return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
	if (!existsSync(distDir)) {
		console.error('a11y: dist/ not found — run "npm run build" first');
		process.exit(1);
	}
	const server = await serve();
	const origin = `http://127.0.0.1:${server.address().port}`;
	const browser = await chromium.launch();
	let violations = 0;
	try {
		for (const page of PAGES) {
			for (const width of WIDTHS) {
				const started = Date.now();
				const context = await browser.newContext({ viewport: { width, height: 900 } });
				const tab = await context.newPage();
				const url = `${origin}${baseNoSlash}/${page}`;
				const response = await tab.goto(url, { waitUntil: 'load' });
				if (!response || response.status() !== 200) {
					console.error(`a11y: ${url} answered ${response?.status()}`);
					violations += 1;
				}
				const result = await new AxeBuilder({ page: tab }).withTags(TAGS).analyze();
				const isKnown = (v) =>
					KNOWN.some((k) => k.rule === v.id && v.nodes.every((n) => n.target.join(' ') === k.target));
				const ignored = result.violations.filter(isKnown).reduce((sum, v) => sum + v.nodes.length, 0);
				result.violations = result.violations.filter((v) => !isKnown(v));
				const ms = Date.now() - started;
				console.log(`a11y: /${page} @ ${width}px — ${result.violations.length} violation(s), ${ignored} known node(s) ignored, ${ms} ms`);
				for (const violation of result.violations) {
					violations += 1;
					console.error(`  - ${violation.id} (${violation.impact}): ${violation.help}`);
					for (const node of violation.nodes.slice(0, 5)) console.error(`      ${node.target.join(' ')}`);
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
