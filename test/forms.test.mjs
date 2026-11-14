import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENTS, TERMS } from '../scripts/lib/document-templates.mjs';
import { FORMS, renderForm } from '../scripts/lib/documents/forms.mjs';
import { documentHtml } from '../scripts/lib/documents/print.mjs';
import { writeEdition } from '../scripts/documents-edition.mjs';

const expected = JSON.parse(readFileSync(new URL('./fixtures/forms-3613e9f.json', import.meta.url), 'utf8')).docs;
const kinds = Object.keys(FORMS);
const MARK = 'ЗНАЧЕННЯ-ТЕСТУ';
const normalise = (html) => html.replace(/<span class="(?:blank|filled)">.*?<\/span>/g, '<B>');

test('forms: the seven public files carry the very text origin/main produced, byte for byte', () => {
	assert.equal(DOCUMENTS.length, expected.length);
	DOCUMENTS.forEach((doc, i) => {
		assert.equal(doc.file, expected[i].file);
		assert.equal(doc.title, expected[i].title);
		assert.equal(!!doc.compact, expected[i].compact);
		assert.equal(doc.html, expected[i].html, doc.file);
	});
});

test('forms: the nine kinds, the samples take no data', () => {
	assert.deepEqual(kinds, [
		'trial-application', 'trial-act', 'annual-application', 'act', 'invoice',
		'order-free-services', 'protocol', 'order-keeper', 'consent',
	]);
	for (const kind of kinds.slice(5)) assert.deepEqual(FORMS[kind].fields, [], kind);
});

test('forms: a declared field replaces a blank, exactly where it stood, and leaves none for itself', () => {
	for (const kind of kinds) {
		const base = renderForm(kind, TERMS);
		for (const key of FORMS[kind].fields.filter((k) => k !== 'paidYear')) {
			const out = renderForm(kind, TERMS, { [key]: MARK });
			const filled = out.split(`<span class="filled">${MARK}</span>`).length - 1;
			assert.ok(filled >= 1, `${kind}.${key} is not printed`);
			const blanks = (html) => html.split('<span class="blank">').length - 1;
			assert.equal(blanks(base) - blanks(out), filled, `${kind}.${key}`);
			assert.equal(normalise(out), normalise(base), `${kind}.${key} moved something else`);
		}
	}
});

test('forms: paidYear replaces the year of the yearly application in every sentence, default as today', () => {
	const base = renderForm('annual-application', TERMS);
	const out = renderForm('annual-application', TERMS, { paidYear: MARK });
	assert.ok(base.includes('на 2027 рік'));
	assert.equal(out.split(MARK).length - 1, base.split('2027').length - 1);
	assert.equal(out.replaceAll(MARK, '2027'), base);
});

test('forms: only declared keys are read, and every declared key is read', () => {
	for (const kind of kinds) {
		const read = new Set();
		const data = new Proxy({}, { get: (_, key) => (typeof key === 'string' && read.add(key), undefined) });
		renderForm(kind, TERMS, data);
		assert.deepEqual([...read].sort(), [...FORMS[kind].fields].sort(), kind);
	}
});

test('forms: a value is escaped, a term is not escaped twice', () => {
	const out = renderForm('invoice', TERMS, { customerName: `<script>alert("x")</script> & 'o'` });
	assert.ok(!out.includes('<script>'));
	assert.ok(out.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;o&#39;'));
	assert.ok(!renderForm('annual-application', TERMS).includes('&amp;'));
	assert.ok(!renderForm('annual-application', TERMS, { paidYear: '<i>' }).includes('<i>'));
});

test('forms: the printed document embeds the serif face and falls back to Times New Roman', () => {
	const html = documentHtml(DOCUMENTS[0]);
	assert.equal(html.split('@font-face').length - 1, 4);
	assert.match(html, /font-family: 'Form Serif'; font-weight: 700/);
	assert.match(html, /'Form Serif', 'Times New Roman'/);
	assert.ok(html.length < 400 * 1024);
});

function files(dir, base = dir) {
	return readdirSync(dir).flatMap((n) => {
		const f = path.join(dir, n);
		return statSync(f).isDirectory() ? files(f, base) : [path.relative(base, f).split(path.sep).join('/')];
	});
}

test('documents:edition: a folder whose manifest matches its files, importing nothing outside itself and loading alone', () => {
	const out = mkdtempSync(path.join(tmpdir(), 'edition-'));
	try {
		const { dir, manifest } = writeEdition(out);
		assert.equal(path.basename(dir), TERMS.contractEdition);
		assert.equal(manifest.edition, TERMS.contractEdition);
		assert.deepEqual(Object.keys(manifest.forms), kinds);
		assert.deepEqual(manifest.forms.invoice.fields, FORMS.invoice.fields);
		assert.deepEqual(JSON.parse(readFileSync(path.join(dir, 'terms.json'), 'utf8')), TERMS);
		const onDisk = files(dir).filter((f) => f !== 'manifest.json').sort();
		assert.deepEqual(Object.keys(manifest.files).sort(), onDisk);
		for (const [rel, sum] of Object.entries(manifest.files)) {
			assert.equal(createHash('sha256').update(readFileSync(path.join(dir, rel))).digest('hex'), sum, rel);
		}
		assert.deepEqual(JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')), manifest);
		for (const rel of onDisk.filter((f) => f.endsWith('.mjs'))) {
			const text = readFileSync(path.join(dir, rel), 'utf8');
			for (const [, spec] of text.matchAll(/(?:from\s+|import\()\s*'([^']+)'/g)) {
				if (spec.startsWith('node:')) continue;
				assert.ok(spec.startsWith('./'), `${rel} imports ${spec}`);
				assert.ok(path.resolve(dir, path.dirname(rel), spec).startsWith(dir + path.sep), `${rel} imports ${spec}`);
			}
		}
		const loaded = execFileSync(process.execPath, ['-e', "import('./forms.mjs').then((m) => console.log(Object.keys(m.FORMS).length))"], { cwd: dir }).toString().trim();
		assert.equal(loaded, String(kinds.length));
		const printed = execFileSync(process.execPath, ['--input-type=module', '-e', "const p = await import('./print.mjs'); console.log(p.documentHtml({ title: 't', html: '' }).includes('@font-face'))"], { cwd: dir }).toString().trim();
		assert.equal(printed, 'true');
	} finally {
		rmSync(out, { recursive: true, force: true });
	}
});
