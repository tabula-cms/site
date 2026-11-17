import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SHOTS, OUT_DIR, selectRows, orderRows, parseArgs, VIEWPORTS, demoAddresses, ALLERGEN_DISHES, countMealPhotos, findMealDays } from '../scripts/shots.mjs';

test('SHOTS: unique file names, a known kind, viewport and template where they apply', () => {
	const names = SHOTS.map((row) => row.file);
	assert.equal(new Set(names).size, names.length);
	for (const row of SHOTS) {
		assert.ok(['page', 'photo'].includes(row.kind), row.file);
		assert.ok(row.template === null || typeof row.template === 'string', row.file);
		if (row.kind === 'page') {
			assert.ok(row.path.startsWith('/'), row.file);
			assert.ok(row.viewport in VIEWPORTS, row.file);
		}
	}
});

test('SHOTS: every listed shot exists in src/assets/shots/ and is a WebP file', () => {
	for (const row of SHOTS) {
		const file = path.join(OUT_DIR, `${row.file}.webp`);
		assert.ok(existsSync(file), `${row.file}.webp is missing — run npm run shots`);
		const head = readFileSync(file).subarray(0, 12);
		assert.equal(head.subarray(0, 4).toString('latin1'), 'RIFF', row.file);
		assert.equal(head.subarray(8, 12).toString('latin1'), 'WEBP', row.file);
	}
});

test('facts.json: the figure the home shows, read from the demo', () => {
	const facts = JSON.parse(readFileSync(path.join(OUT_DIR, 'facts.json'), 'utf8'));
	assert.ok(Number.isInteger(facts.lawFilled) && Number.isInteger(facts.lawTotal));
	assert.ok(facts.lawFilled >= 0 && facts.lawFilled <= facts.lawTotal);
	assert.ok(!Number.isNaN(Date.parse(facts.takenAt)));
});

test('facts.json: mealDay is the real ISO date of the day on phone-meal-day', () => {
	const facts = JSON.parse(readFileSync(path.join(OUT_DIR, 'facts.json'), 'utf8'));
	assert.match(facts.mealDay, /^\d{4}-\d{2}-\d{2}$/);
	assert.equal(new Date(`${facts.mealDay}T00:00:00Z`).toISOString().slice(0, 10), facts.mealDay);
	const row = SHOTS.find((r) => r.file === 'phone-meal-day');
	assert.equal(row.facts, 'mealDay');
});

test('SHOTS: the meal rows find their day on the demo (no hard-coded date)', () => {
	for (const file of ['phone-meal-day', 'phone-meal-allergens']) {
		const row = SHOTS.find((r) => r.file === file);
		assert.ok(row.path.includes('{day}') && ['photos', 'allergens'].includes(row.day), file);
		assert.ok(!/\d{4}-\d{2}-\d{2}/.test(row.path), file);
	}
});

test('countMealPhotos / findMealDays: the day with three photos and the day with the allergen dishes', async () => {
	assert.equal(countMealPhotos('<img src="/a.webp" class="logo"><img src="/u/x.thumb.webp" loading="lazy"><img src="/u/y.thumb.webp">'), 2);
	const dishes = ALLERGEN_DISHES.map((d) => d.name).join(' ');
	const pages = {
		'/kharchuvannya': '<a href="/kharchuvannya/2026-11-10"></a><a href="/kharchuvannya/2026-11-16"></a><a href="/kharchuvannya/2026-11-17"></a><a href="/kharchuvannya/2026-11-09"></a><a href="/kharchuvannya">',
		// Two older days with three photos: one with other dishes, one with the chat card's dishes. The newest wins.
		'/kharchuvannya/2026-11-10': '<main>Каша пшоняна</main><img src="/u/a.thumb.webp"><img src="/u/b.thumb.webp"><img src="/u/c.thumb.webp"><img src="/u/d.thumb.webp">',
		'/kharchuvannya/2026-11-09': '<main>Каша вівсяна з яблуком, Борщ український, Котлета куряча з пюре</main><img src="/u/a.thumb.webp"><img src="/u/b.thumb.webp"><img src="/u/c.thumb.webp">',
		'/kharchuvannya/2026-11-16': `<main>${dishes}</main><img src="/u/a.thumb.webp">`,
		'/kharchuvannya/2026-11-17': '<main>Каша вівсяна з яблуком, Борщ український, Котлета куряча з пюре</main><img src="/u/a.thumb.webp"><img src="/u/b.thumb.webp"><img src="/u/c.thumb.webp">',
	};
	const days = await findMealDays(async (p) => pages[p]);
	assert.deepEqual(days, { photos: '2026-11-17', allergens: '2026-11-16' });
	await assert.rejects(findMealDays(async (p) => (p === '/kharchuvannya' ? pages[p] : '<main></main>')), /no day with three photos and the dishes/);
});

test('selectRows: --only takes several rows, in the table order', () => {
	assert.deepEqual(selectRows(SHOTS, { only: 'admin-law,admin-m-meals' }).map((r) => r.file), ['admin-m-meals', 'admin-law']);
	assert.throws(() => selectRows(SHOTS, { only: 'admin-law,nope' }));
});

test('selectRows: --template takes that template and the template-free rows; --only takes one', () => {
	const panorama = selectRows(SHOTS, { template: 'panorama' });
	assert.ok(panorama.some((r) => r.file === 'tpl-panorama'));
	assert.ok(panorama.some((r) => r.file === 'admin-law'), 'template-free rows work under any template');
	assert.ok(!panorama.some((r) => r.file === 'tpl-vitryna'));
	assert.deepEqual(selectRows(SHOTS, { only: 'kep-line' }).map((r) => r.file), ['kep-line']);
	assert.throws(() => selectRows(SHOTS, { only: 'nope' }));
	assert.equal(selectRows(SHOTS, {}).length, SHOTS.length);
});

test('parseArgs: --template x, --template=x, --only y', () => {
	assert.deepEqual(parseArgs(['--template', 'stend']), { template: 'stend', only: null });
	assert.deepEqual(parseArgs(['--template=stend', '--only', 'admin-law']), { template: 'stend', only: 'admin-law' });
	assert.deepEqual(parseArgs([]), { template: null, only: null });
});

test('demoAddresses: origin, host:port and localhost come from the demo URL', () => {
	assert.deepEqual(demoAddresses('http://127.0.0.1:3100/'), ['http://127.0.0.1:3100', '127.0.0.1:3100', 'localhost']);
	assert.deepEqual(demoAddresses('http://localhost:4000'), ['http://localhost:4000', 'localhost:4000', 'localhost']);
});

test('orderRows: rows with a setup come last, the others keep their order', () => {
	const rows = [{ file: 'a', setup: 'x' }, { file: 'b' }, { file: 'c', setup: 'y' }, { file: 'd' }];
	assert.deepEqual(orderRows(rows).map((r) => r.file), ['b', 'd', 'a', 'c']);
	const all = orderRows(SHOTS);
	const first = all.findIndex((r) => r.setup);
	assert.ok(first > -1 && all.slice(first).every((r) => r.setup), 'every setup row is after every other row');
});
