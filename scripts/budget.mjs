#!/usr/bin/env node
// The performance budget of the home page (story 80, «Checks»): run after `npm run build`
// (`npm run budget`). Serves dist/ like scripts/a11y.mjs, loads the home at 390x844 in Chromium
// and fails when
//   - the bytes transferred on first load (no scrolling) exceed 600 KB,
//   - an <img> that starts below the first viewport lacks `loading="lazy"`,
//   - the hero (LCP) image has no matching `<link rel="preload" as="image">`.
// It prints the numbers either way.

import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist, distDir, baseNoSlash } from './lib/serve-dist.mjs';

const LIMIT_BYTES = 600 * 1000;
const VIEWPORT = { width: 390, height: 844 };

async function main() {
	if (!existsSync(distDir)) {
		console.error('budget: dist/ not found — run "npm run build" first');
		process.exit(1);
	}
	const { server, origin } = await serveDist();
	const browser = await chromium.launch();
	const problems = [];
	try {
		const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
		const page = await context.newPage();
		// Transferred bytes: the body size of every response (the local server sends no compression, so
		// this is an upper bound of what a compressing host sends).
		let bytes = 0;
		const requests = [];
		page.on('response', async (response) => {
			try {
				const size = (await response.body()).length;
				bytes += size;
				requests.push({ url: response.url(), size });
			} catch {
				// A response without a body (a redirect) counts as zero.
			}
		});
		await page.goto(`${origin}${baseNoSlash}/`, { waitUntil: 'networkidle' });

		const images = await page.evaluate(() =>
			[...document.images].map((img) => ({
				src: img.currentSrc || img.src,
				top: img.getBoundingClientRect().top + window.scrollY,
				display: getComputedStyle(img).display,
				loading: img.getAttribute('loading'),
				fetchpriority: img.getAttribute('fetchpriority'),
				srcset: img.getAttribute('srcset'),
				sizes: img.getAttribute('sizes'),
				inTab: !!img.closest('.tabpanel[hidden]'),
			})),
		);
		const preloads = await page.evaluate(() =>
			[...document.querySelectorAll('link[rel="preload"][as="image"]')].map((l) => ({
				srcset: l.getAttribute('imagesrcset'),
				sizes: l.getAttribute('imagesizes'),
				href: l.getAttribute('href'),
			})),
		);

		const kb = (n) => `${(n / 1000).toFixed(1)} KB`;
		console.log(`budget: first load at ${VIEWPORT.width}x${VIEWPORT.height}: ${kb(bytes)} in ${requests.length} requests (limit ${kb(LIMIT_BYTES)})`);
		const byType = {};
		for (const { url, size } of requests) {
			const ext = (url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] ?? 'html').toLowerCase();
			byType[ext] = (byType[ext] ?? 0) + size;
		}
		console.log(`budget: by type — ${Object.entries(byType).map(([k, v]) => `${k} ${kb(v)}`).join(', ')}`);
		if (bytes > LIMIT_BYTES) problems.push(`first load is ${kb(bytes)}, over the ${kb(LIMIT_BYTES)} budget`);

		// Images in a hidden tab panel have no box yet, but they load the moment the panel opens: they count as below the fold.
		const below = images.filter((img) => img.inTab || img.top >= VIEWPORT.height);
		const notLazy = below.filter((img) => img.loading !== 'lazy');
		console.log(`budget: ${images.length} <img>, ${below.length} below the first viewport, ${notLazy.length} of them not lazy`);
		for (const img of notLazy) problems.push(`an <img> below the first viewport is not loading="lazy": ${img.src}`);

		const hero = images.find((img) => img.fetchpriority === 'high');
		if (!hero) problems.push('no <img fetchpriority="high"> (the LCP image)');
		else {
			if (hero.loading === 'lazy') problems.push('the LCP image is lazy');
			const matched = preloads.some((p) => p.srcset && p.srcset === hero.srcset && p.sizes === hero.sizes);
			console.log(`budget: LCP image ${hero.src.split('/').pop()} — preload ${matched ? 'matches' : 'MISSING'}`);
			if (!matched) problems.push('the LCP image has no <link rel="preload" as="image"> with the same imagesrcset and imagesizes');
		}
	} finally {
		await browser.close();
		server.close();
	}
	if (problems.length > 0) {
		console.error(`budget: ${problems.length} problem(s):`);
		for (const problem of problems) console.error(`  - ${problem}`);
		process.exit(1);
	}
	console.log('budget: OK');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
