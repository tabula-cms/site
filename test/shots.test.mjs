import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SHOTS, OUT_DIR, selectRows, orderRows, parseArgs, VIEWPORTS, demoAddresses } from '../scripts/shots.mjs';

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
