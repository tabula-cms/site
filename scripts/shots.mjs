#!/usr/bin/env node
// Takes the screenshots of the home page (story 80, decision 11) from a running tabula demo
// and writes them as WebP into src/assets/shots/ (committed).
//
//   # terminal 1, in a tabula checkout:
//   npm run demo -- --seed school --template panorama
//   # terminal 2, in this repository:
//   npm run shots -- --template panorama      # the rows of that template, and the template-free rows
//   npm run shots -- --only admin-law         # one row
//
// The table SHOTS below lists every file: what it shows, at which address, in which viewport. A row
// with `template: null` works under any template; the other rows need the demo started with that
// template (the page's <body> class is checked, so a wrong template fails loudly instead of
// writing a wrong picture). Environment:
//   TABULA_DEMO_URL       the demo's address, default http://127.0.0.1:3100
//   TABULA_DEMO_LOGIN     the panel's account; default the throwaway fixture account of tabula's
//   TABULA_DEMO_PASSWORD  test/a11y/seed.js (a throwaway database's only account, not a secret)
//   TABULA_DIR            a tabula checkout, default ../tabula: the CC0 photos and the КЕП fixtures
//
// Before every shot the demo's own address in the page (its origin and host:port, taken from
// TABULA_DEMO_URL, and localhost) is replaced by licey0.tabula.org.ua in text nodes and attributes, so the demo's
// address never reaches a picture. Needs `npx playwright install chromium` once.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
export const OUT_DIR = path.join(root, 'src', 'assets', 'shots');
export const VIEWPORTS = Object.freeze({
	desktop: { width: 1440, height: 900 },
	phone: { width: 390, height: 844 },
});
const SCALE = 2;
const QUALITY = 80;
// Pages are written at their real pixel size (scale 2: 2880 or 780 px wide, a clip twice its size); astro:assets
// makes the responsive widths when the site is built.
const PHOTO_MAX = 900;
export const PUBLIC_HOST = 'licey0.tabula.org.ua';

/**
 * One row per file in src/assets/shots/.
 *  - kind 'page': a screenshot of `path` in `viewport`; `template` is the demo's template or null
 *    (any); `clip` is a rectangle in CSS pixels of the viewport; `panel: true` signs in first;
 *    `waitFor` is a selector to wait for; `facts: 'law'` also writes facts.json from the page;
 *    `runner: 'kep'` hands the row to scripts/lib/shot-kep-line.cjs (it needs a site of its own).
 *  - kind 'photo': a CC0 photo copied from tabula's test/fixtures/school-seed/photos/<file>.webp.
 */
// The eight templates of the home's «Такий вигляд матиме ваш сайт», in the order of its tabs.
export const TEMPLATES = Object.freeze(['panorama', 'vitryna', 'stend', 'shkilna', 'hazeta', 'afisha', 'portal', 'zoshyt']);

export const SHOTS = Object.freeze([
	...TEMPLATES.map((template) => ({
		file: `tpl-${template}`,
		kind: 'page',
		template,
		path: '/',
		viewport: 'desktop',
	})),
	...TEMPLATES.map((template) => ({
		file: `phone-${template}`,
		kind: 'page',
		template,
		path: '/',
		viewport: 'phone',
	})),
	{
		file: 'phone-meal-day',
		kind: 'page',
		template: 'panorama',
		// A seeded day with three photos and the «Поділитися» buttons.
		path: '/kharchuvannya/2026-11-06',
		viewport: 'phone',
		waitFor: 'main',
	},
	{
		// The home's «Харчування» story, step 3: a day with the allergen marks and the legend. The seed's dishes
		// carry none, so `setup: 'allergens'` first turns the marks on and marks the dishes of this day (see
		// SETUPS: it CHANGES the demo's throwaway database, so only this row runs it). The day is the seed's second
		// day, 2026-11-06 while the seed's «today» is Monday 2026-11-09; with another day the dishes below are not
		// there and the row fails loudly. It CHANGES the demo's throwaway database (the marks stay on), so it is
		// always taken last in a full run (orderRows); restart the demo (fresh seed) before re-running any other row. `scrollTo` is a number (CSS pixels) or `{ selector, nth, offset }`.
		file: 'phone-meal-allergens',
		kind: 'page',
		template: 'panorama',
		path: '/kharchuvannya/2026-11-06',
		viewport: 'phone',
		waitFor: '.meals-marks',
		setup: 'allergens',
		scrollTo: { selector: '.meals-dayblock', nth: 1, offset: 290 },
	},
	{
		file: 'admin-m-meals',
		kind: 'page',
		template: null,
		path: '/admin/kharchuvannia',
		viewport: 'phone',
		panel: true,
	},
	{
		file: 'admin-law',
		kind: 'page',
		template: null,
		path: '/admin/transparency',
		viewport: 'desktop',
		panel: true,
		facts: 'law',
	},
	{
		file: 'crop-overview',
		kind: 'page',
		template: null,
		path: '/admin',
		viewport: 'desktop',
		panel: true,
		clip: { x: 281, y: 70, width: 994, height: 710 },
	},
	{
		file: 'kep-line',
		kind: 'page',
		// A public page: its look depends on the template, so it is pinned like phone-meal-day.
		template: 'panorama',
		path: '/ustanovchi-dokumenty',
		viewport: 'desktop',
		runner: 'kep',
	},
	{ file: 'classroom-3', kind: 'photo', template: null },
	{ file: 'stage-3', kind: 'photo', template: null },
	{ file: 'food-2', kind: 'photo', template: null },
]);

/** The rows to take for the command line: `only` wins, else `template` (plus the template-free rows). */
export function selectRows(rows, { template = null, only = null } = {}) {
	if (only) {
		const row = rows.find((r) => r.file === only);
		if (!row) throw new Error(`shots: no row named "${only}"`);
		return [row];
	}
	return rows.filter((row) => !template || row.template === null || row.template === template);
}

/**
 * The order the rows are taken in: rows with a `setup` come last (stable otherwise). A setup changes the demo's
 * throwaway database (the allergens row turns the marks on), so every row that does not run one is shot first, on the
 * seeded data. After a full run the demo is no longer as seeded: restart it (a fresh seed) before shooting any other row.
 */
export function orderRows(rows) {
	return [...rows].sort((a, b) => Number(Boolean(a.setup)) - Number(Boolean(b.setup)));
}

/** `--template x`, `--only y` (also `--template=x`). */
export function parseArgs(argv) {
	const out = { template: null, only: null };
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		for (const key of ['template', 'only']) {
			if (arg === `--${key}`) out[key] = argv[(i += 1)] ?? null;
			else if (arg.startsWith(`--${key}=`)) out[key] = arg.slice(key.length + 3);
		}
	}
	return out;
}

const demoUrl = (process.env.TABULA_DEMO_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const tabulaDir = path.resolve(process.env.TABULA_DIR || path.join(root, '..', 'tabula'));
// The fixture account of tabula's test/a11y/seed.js (ADMIN): a throwaway database's only account.
const login = process.env.TABULA_DEMO_LOGIN || 'a11y-admin@example.com';
const password = process.env.TABULA_DEMO_PASSWORD || 'a11y-fixture-password';

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The strings to replace: the demo's origin, its host:port (from TABULA_DEMO_URL) and `localhost`. */
export function demoAddresses(url) {
	const { origin, host } = new URL(url);
	return [origin, host, 'localhost'];
}

async function maskDemoAddress(page) {
	const sources = demoAddresses(demoUrl).map(escapeRe);
	await page.evaluate(({ host, sources }) => {
		const patterns = sources.map((source) => new RegExp(source, 'g'));
		const swap = (text) => patterns.reduce((acc, re) => acc.replace(re, host), text);
		const walker = globalThis.document.createTreeWalker(globalThis.document.body, 4);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const parent = node.parentElement?.tagName;
			if (parent === 'SCRIPT' || parent === 'STYLE') continue;
			const next = swap(node.nodeValue);
			if (next !== node.nodeValue) node.nodeValue = next;
		}
		for (const el of globalThis.document.body.querySelectorAll('*')) {
			for (const attr of el.getAttributeNames()) {
				const value = el.getAttribute(attr);
				if (value && patterns.some((re) => ((re.lastIndex = 0), re.test(value)))) {
					el.setAttribute(attr, swap(value));
				}
			}
		}
	}, { host: PUBLIC_HOST, sources });
}

async function signIn(page) {
	await page.goto(`${demoUrl}/admin/login`, { waitUntil: 'networkidle' });
	await page.fill('#email', login);
	await page.fill('#password', password);
	await Promise.all([page.waitForURL(`${demoUrl}/admin`), page.click('button[type="submit"]')]);
}

async function toWebp(png) {
	return sharp(png)
		.webp({ quality: QUALITY, effort: 6 })
		.toBuffer();
}

// The dishes of the shot's day and what the screen «Страви й алергени» gets for each: the codes of додаток 13
// (Г глютен, Л лактоза, Я яйця, МП молочні продукти …), `none` for «Без алергенів», kcal from a technological card.
export const ALLERGEN_DISHES = Object.freeze([
	{ name: 'Оладки зі сметаною', codes: ['Г', 'Л', 'Я'], kcal: 310 },
	{ name: 'Какао', codes: ['Л'], kcal: 120 },
	{ name: 'Суп гороховий', none: true, kcal: 180 },
	{ name: 'Гречка з тушкованою куркою', none: true, kcal: 290 },
	{ name: 'Огірок свіжий', none: true, kcal: 15 },
	{ name: 'Узвар', none: true, kcal: 70 },
]);

/** Turns on «Позначати алергени й калорійність у меню» and marks ALLERGEN_DISHES on «Страви й алергени». */
async function setupAllergens(browser) {
	const context = await browser.newContext({ viewport: VIEWPORTS.desktop, locale: 'uk-UA', reducedMotion: 'reduce' });
	try {
		const page = await context.newPage();
		await signIn(page);
		await page.goto(`${demoUrl}/admin/settings/kharchuvannia`, { waitUntil: 'networkidle' });
		await page.locator('input[name="allergens"]').check();
		await Promise.all([page.waitForLoadState('networkidle'), page.locator('form[action="/admin/settings/kharchuvannia"] button[type="submit"]').last().click()]);

		const todo = new Map(ALLERGEN_DISHES.map((dish) => [dish.name, dish]));
		let url = `${demoUrl}/admin/kharchuvannia/stravy`;
		for (let pageNo = 1; pageNo <= 20 && url; pageNo += 1) {
			await page.goto(url, { waitUntil: 'networkidle' });
			let touched = 0;
			for (const fieldset of await page.locator('form[action="/admin/kharchuvannia/stravy"] fieldset').all()) {
				const name = ((await fieldset.locator('legend').innerText()).split('\n')[0] ?? '').replace(/Перевірте алергени$/, '').trim();
				const dish = todo.get(name);
				if (!dish) continue;
				if (dish.none) await fieldset.locator('input[data-dish-none]').check();
				else {
					for (const box of await fieldset.locator('input[name^="a_"]').all()) {
						if (dish.codes.includes(await box.getAttribute('value'))) await box.check();
					}
				}
				await fieldset.locator('input[inputmode="numeric"]').first().fill(String(dish.kcal));
				todo.delete(name);
				touched += 1;
			}
			if (touched > 0) {
				await Promise.all([page.waitForLoadState('networkidle'), page.locator('form[action="/admin/kharchuvannia/stravy"] button[type="submit"]').last().click()]);
			}
			const next = page.locator('a', { hasText: 'Далі' });
			url = (await next.count()) > 0 ? new URL(await next.first().getAttribute('href'), demoUrl).href : null;
			if (todo.size === 0) break;
		}
		if (todo.size > 0) throw new Error(`allergens setup: dishes not found on «Страви й алергени»: ${[...todo.keys()].join(', ')}`);
	} finally {
		await context.close();
	}
}

/** The named setup steps of the rows (`row.setup`); each gets the browser and may change the demo's database. */
const SETUPS = { allergens: setupAllergens };

// A number is a scroll position in CSS pixels; `{ selector, nth, offset }` puts that element `offset` px below the top.
async function scrollPage(page, to) {
	if (typeof to === 'number') {
		await page.evaluate((y) => globalThis.scrollTo(0, y), to);
		return;
	}
	const box = page.locator(to.selector).nth(to.nth ?? 0);
	const top = await box.evaluate((el) => el.getBoundingClientRect().top + globalThis.scrollY);
	await page.evaluate((y) => globalThis.scrollTo(0, y), Math.max(0, top - (to.offset ?? 0)));
}

async function takePage(browser, row) {
	if (row.setup) await SETUPS[row.setup](browser);
	const viewport = VIEWPORTS[row.viewport];
	const context = await browser.newContext({
		viewport,
		deviceScaleFactor: SCALE,
		locale: 'uk-UA',
		colorScheme: 'light',
		reducedMotion: 'reduce',
	});
	try {
		const page = await context.newPage();
		if (row.panel) await signIn(page);
		await page.goto(`${demoUrl}${row.path}`, { waitUntil: 'networkidle' });
		if (row.template) {
			const cls = await page.evaluate(() => globalThis.document.body.className);
			if (!cls.split(/\s+/).includes(`${row.template}-body`)) {
				throw new Error(
					`${row.file}: the demo is not in the "${row.template}" template (body class "${cls}"); restart it with --template ${row.template}`,
				);
			}
		}
		if (row.waitFor) await page.waitForSelector(row.waitFor);
		await page.evaluate(() => globalThis.document.fonts.ready);
		await page.evaluate(() => globalThis.document.activeElement?.blur?.());
		if (row.facts === 'law') await writeLawFacts(page);
		if (row.scrollTo) await scrollPage(page, row.scrollTo);
		await maskDemoAddress(page);
		const png = await page.screenshot({ type: 'png', ...(row.clip ? { clip: row.clip } : {}) });
		return toWebp(png);
	} finally {
		await context.close();
	}
}

// «Заповнено: 23 з 24» on the panel's «Інформація за законом» is the figure the home shows
// (decision 15): read from the screen, never typed.
async function writeLawFacts(page) {
	const text = await page.locator('main').innerText();
	const match = text.match(/Заповнено:\s*(\d+)\s*з\s*(\d+)/);
	if (!match) throw new Error('admin-law: no «Заповнено: N з M» on the screen');
	const facts = { lawFilled: Number(match[1]), lawTotal: Number(match[2]), takenAt: new Date().toISOString() };
	writeFileSync(path.join(OUT_DIR, 'facts.json'), `${JSON.stringify(facts, null, '\t')}\n`);
	console.log(`shots: facts.json — ${facts.lawFilled} of ${facts.lawTotal}`);
}

async function takePhoto(row) {
	const source = path.join(tabulaDir, 'test', 'fixtures', 'school-seed', 'photos', `${row.file}.webp`);
	const buffer = await sharp(readFileSync(source))
		.resize({ width: PHOTO_MAX, height: PHOTO_MAX, fit: 'inside', withoutEnlargement: true })
		.webp({ quality: QUALITY, effort: 6 })
		.toBuffer();
	return buffer;
}

async function main() {
	const rows = orderRows(selectRows(SHOTS, parseArgs(process.argv.slice(2))));
	mkdirSync(OUT_DIR, { recursive: true });
	const pageRows = rows.filter((r) => r.kind === 'page' && r.runner !== 'kep');
	const browser = pageRows.length > 0 ? await chromium.launch() : null;
	try {
		for (const row of rows) {
			const out = path.join(OUT_DIR, `${row.file}.webp`);
			if (row.runner === 'kep') {
				const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'lib', 'shot-kep-line.cjs'), out], {
					stdio: 'inherit',
					env: { ...process.env, TABULA_DIR: tabulaDir },
				});
				if (result.status !== 0) throw new Error(`${row.file}: the КЕП helper failed`);
				continue;
			}
			const webp = row.kind === 'photo' ? await takePhoto(row) : await takePage(browser, row);
			writeFileSync(out, webp);
			const meta = await sharp(webp).metadata();
			console.log(`shots: ${row.file}.webp ${meta.width}x${meta.height}, ${webp.length} bytes`);
		}
	} finally {
		if (browser) await browser.close();
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
