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

const expected = JSON.parse(readFileSync(new URL('./fixtures/forms-look-2026-11.json', import.meta.url), 'utf8')).docs;
const kinds = Object.keys(FORMS);
const MARK = 'ЗНАЧЕННЯ-ТЕСТУ';
// Keys that change the shape of a form, not only fill a blank: tested on their own.
const SWITCHES = ['paidYear', 'payerName', 'noPayer', 'wholeYear', 'thirdPartyConsent'];
// A value or a blank with the hint that stands beside a blank only, and the hint under a signature line that asks for a name.
const normalise = (html) => html
	.replace(/<span class="(?:blank|filled)">.*?<\/span>(?: <span class="hint">.*?<\/span>)?/g, '<B>')
	.replaceAll(' <span class="hint">(власне імʼя, ПРІЗВИЩЕ)</span>', '');

test('forms: the eight public files carry the text of the redesigned forms, byte for byte', () => {
	assert.equal(DOCUMENTS.length, expected.length);
	DOCUMENTS.forEach((doc, i) => {
		assert.equal(doc.file, expected[i].file);
		assert.equal(doc.title, expected[i].title);
		assert.equal(!!doc.compact, expected[i].compact);
		assert.equal(doc.html, expected[i].html, doc.file);
	});
});

test('forms: the ten kinds, the samples take no data', () => {
	assert.deepEqual(kinds, [
		'trial-application', 'trial-act', 'annual-application', 'act', 'invoice', 'third-party-consent',
		'order-free-services', 'protocol', 'order-keeper', 'consent',
	]);
	for (const kind of kinds.slice(6)) assert.deepEqual(FORMS[kind].fields, [], kind);
});

test('forms: a declared field replaces a blank, exactly where it stood, and leaves none for itself', () => {
	for (const kind of kinds) {
		const base = renderForm(kind, TERMS);
		for (const key of FORMS[kind].fields.filter((k) => !SWITCHES.includes(k))) {
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

test('forms: a hint stands only beside a blank — a filled field shows its value alone', () => {
	const hints = ['(населений пункт)', '(1 січня або перший день платного періоду)', '(власне імʼя, ПРІЗВИЩЕ)'];
	for (const kind of kinds.slice(0, 6)) {
		const filled = renderForm(kind, TERMS, Object.fromEntries(FORMS[kind].fields.map((k) => [k, MARK])));
		for (const hint of hints) assert.ok(!filled.includes(hint), kind + ' still prints ' + hint);
		assert.ok(filled.includes('<span class="hint">(підпис)</span>'), kind);
	}
	const blank = renderForm('annual-application', TERMS);
	for (const hint of hints) assert.ok(blank.includes(hint), hint);
});

test('forms: the parties stand in one block at the end of each form, two columns, the date of signing beside them', () => {
	for (const kind of kinds.slice(0, 6)) {
		const html = renderForm(kind, TERMS);
		assert.equal(html.split('<table class="req">').length - 1, 1, kind);
		assert.ok(html.indexOf('<table class="req">') > html.lastIndexOf('<p class="pt">'), kind);
	}
	const annual = renderForm('annual-application', TERMS);
	assert.ok(!annual.includes('Реквізити Замовника:') && !annual.includes('Реквізити Виконавця:'));
	assert.ok(annual.includes('Реквізити сторін наведено в кінці заяви.'));
	assert.ok(annual.includes('Дата підписання Замовником (дата договору):'));
	assert.ok(annual.includes('Електронна адреса: ' + TERMS.supportEmail));
	assert.match(renderForm('annual-application', TERMS, { performerSignatory: MARK }), /<p class="sig">.*? \/ <span class="filled">ЗНАЧЕННЯ-ТЕСТУ<\/span><br>/);
});

test('forms: the payer of the yearly application — named, none, or the blank form', () => {
	const rule = 'платник підписує заяву й акти та оплачує послуги';
	const blank = renderForm('annual-application', TERMS);
	assert.ok(blank.includes('у заяві зазначено платника: <span class="blank">') && blank.includes('Платник (якщо є)'));
	const none = renderForm('annual-application', TERMS, { noPayer: '1' });
	assert.ok(none.includes('він зазначається в заяві як платник') && none.includes(rule));
	assert.ok(!none.includes('Платник') && !none.includes('зазначено платника'));
	const blanks = (html) => html.split('class="blank"').length - 1;
	assert.equal(blanks(none), blanks(renderForm('annual-application', TERMS, { noPayer: '1', payerEdrpou: MARK })));
	const named = renderForm('annual-application', TERMS, { payerName: MARK, payerEdrpou: '00000000' });
	assert.ok(named.includes('платник — <span class="filled">' + MARK + '</span>') && named.includes(rule));
	assert.ok(named.includes('<p class="who">Платник</p>') && !named.includes('Платник (якщо є)'));
	assert.ok(!named.includes('зазначено платника'));
});

test('forms: the part-year sentence and the payer of an act follow the same three modes', () => {
	const sentence = 'Якщо платний період починається посеред року';
	assert.ok(renderForm('annual-application', TERMS).includes(sentence + ', — <span class="blank">'));
	assert.ok(renderForm('annual-application', TERMS, { partialSum: '1 000,00', partialSumWords: 'одна тисяча гривень' }).includes(sentence + ', — <span class="filled">1 000,00</span> грн (<span class="filled">одна тисяча гривень</span>)'));
	const whole = renderForm('annual-application', TERMS, { wholeYear: '1' });
	assert.ok(!whole.includes(sentence) && !whole.includes('  ') && whole.includes('(пункт 293.3 статті 293 Податкового кодексу України).</p>'));
	assert.ok(renderForm('act', TERMS).includes('Платник (якщо є)'));
	const none = renderForm('act', TERMS, { noPayer: '1' });
	assert.ok(!none.includes('Платник'));
	const named = renderForm('act', TERMS, { payerName: MARK, payerRepresentative: 'Олена ВИГАДАНА' });
	assert.ok(named.includes('<p class="who">Платник</p>') && named.includes(MARK) && !named.includes('Платник (якщо є)') && named.includes('Олена ВИГАДАНА'));
});

test('forms: the invoice names the institution\'s consent to another payer, the payment purpose and no card, only when the consent is given', () => {
	const line = 'Рахунок може бути оплачено іншою особою згідно зі згодою Замовника';
	const base = renderForm('invoice', TERMS);
	assert.ok(!base.includes(line) && !base.includes('Замовник (платник за договором)') && base.includes('<p><b>Платник:</b>'));
	assert.equal(renderForm('invoice', TERMS, { thirdPartyConsent: '' }), base);
	const consent = 'від 20.04.2027 № З-2027-1';
	const data = { thirdPartyConsent: consent, number: 'Р-2027-2', invoiceDate: '30.06.2027', customerName: 'Вигаданий ліцей № 0', customerEdrpou: '00000000' };
	const out = renderForm('invoice', TERMS, data);
	const added = [
		`<p>${line} <span class="filled">${consent}</span>. Оплата лише переказом на рахунок IBAN, зазначений у цьому рахунку; оплата на номер платіжної картки не приймається.</p>\n`,
		'<p>У призначенні платежу обовʼязково зазначте: «Оплата за рахунком № <span class="filled">Р-2027-2</span> від <span class="filled">30.06.2027</span>; Замовник — <span class="filled">Вигаданий ліцей № 0</span>, код ЄДРПОУ <span class="filled">00000000</span>; згідно зі згодою <span class="filled">' + consent + '</span>; без ПДВ».</p>\n',
	];
	for (const text of added) assert.ok(out.includes(text), text);
	// Under the institution, named as the payer under the contract; before the basis; nothing else moves.
	assert.ok(out.indexOf(added[0]) > out.indexOf('<p><b>Замовник (платник за договором):</b>') && out.indexOf(added[1]) < out.indexOf('<p><b>Підстава:</b>'));
	const { thirdPartyConsent, ...rest } = data;
	assert.equal(out.replace(added.join(''), '').replace('Замовник (платник за договором):', 'Платник:'), renderForm('invoice', TERMS, rest));
	assert.ok(thirdPartyConsent);
});

test('forms: the consent to another payer — one party, the institution, and no data of the payer', () => {
	const html = renderForm('third-party-consent', TERMS);
	assert.equal(FORMS['third-party-consent'].title(TERMS), 'Згода Замовника на оплату рахунку іншою особою');
	assert.ok(html.startsWith('<h1>ЗГОДА № '));
	assert.equal(html.split('<p class="who">').length - 1, 1);
	assert.ok(html.includes('<p class="who">Замовник</p>') && !html.includes('Виконавець</p>') && !html.includes('Платник'));
	for (const text of [
		'Відповідно до статті 528 Цивільного кодексу України Замовник покладає виконання свого обовʼязку з оплати рахунків Виконавця',
		'прийняв таку оплату як виконання зобовʼязання Замовника',
		'не змінює сторін договору',
		'оплата на номер платіжної картки не приймається',
		'У призначенні платежу обовʼязково зазначається: «Оплата за рахунком №',
		'припиняє його в сплаченій сумі',
		'Виконавець повертає на рахунок, з якого їх отримано',
		'Відкликання діє з дня, коли Виконавець його отримав',
		'7. Якщо згоду підписує уповноважена особа, до неї додано копію наказу чи довіреності.',
		'приймає за актами',
	]) {
		assert.ok(html.includes(text), text);
	}
	assert.ok(!html.includes('не зобовʼязаний повертати'));
	// The data keys are the institution's and the contract's: none names the person who pays.
	assert.ok(FORMS['third-party-consent'].fields.every((key) => !/payer|person/i.test(key)));
	const filled = renderForm('third-party-consent', TERMS, {
		customerName: 'Вигаданий ліцей № 0', number: 'З-2027-1', quarters: 'II і III квартали 2027 року', periodFrom: '01.04.2027', periodTo: '30.09.2027', invoices: '',
	});
	assert.ok(filled.includes('за <span class="filled">II і III квартали 2027 року</span> — з <span class="filled">01.04.2027</span> до <span class="filled">30.09.2027</span> — на іншу особу'));
	assert.ok(filled.includes('; Замовник — <span class="filled">Вигаданий ліцей № 0</span>, код ЄДРПОУ <span class="blank">__________</span>; згідно зі згодою від <span class="blank">„__“ ____________ 20__ р.</span> № <span class="filled">З-2027-1</span>; без ПДВ».'));
	assert.ok(filled.includes('зокрема: <span class="blank">'), 'no invoices yet: the blank stays');
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
