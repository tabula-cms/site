// The request form's instant checks (src/scripts/request-check.js): the pure helpers. The DOM wiring is exercised in
// the browser; here: the ЄДРПОУ check digit (the server's rule), the e-mail grammar, the typo suggestions, the reading
// of a DNS-over-HTTPS answer and the «no verdict» cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	EMAIL_RE,
	LINKISH,
	edrpouOk,
	edrpouState,
	emailDomain,
	typoFix,
	readDnsAnswer,
	domainTakesMail,
	edrpouLine,
	emailLine,
	textProblem,
} from '../src/scripts/request-check.js';

// A valid code built from seven digits: the check digit by the same published rule, computed here independently.
function withCheckDigit(seven) {
	const d = [...seven].map(Number);
	const shifted = Number(`${seven}0`) > 30_000_000 && Number(`${seven}0`) < 60_000_000;
	const sum = (w) => w.reduce((s, x, i) => s + x * d[i], 0) % 11;
	let c = sum(shifted ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7]);
	if (c === 10) c = sum(shifted ? [9, 3, 4, 5, 6, 7, 8] : [3, 4, 5, 6, 7, 8, 9]);
	if (c === 10) c = 0;
	return `${seven}${c}`;
}

test('edrpouOk: eight digits with the right check digit, in both weight ranges', () => {
	for (const seven of ['0000000', '0123456', '2999999', '3000001', '4567890', '5999999', '6000001', '9876543']) {
		const good = withCheckDigit(seven);
		assert.equal(edrpouOk(good), true, good);
		const bad = `${seven}${(Number(good[7]) + 1) % 10}`;
		assert.equal(edrpouOk(bad), false, bad);
	}
	assert.equal(edrpouOk('1234567'), false);
	assert.equal(edrpouOk('123456789'), false);
	assert.equal(edrpouOk('1234567a'), false);
});

test('edrpouState: nothing while typing, a verdict at eight characters', () => {
	assert.equal(edrpouState(''), 'empty');
	assert.equal(edrpouState('  '), 'empty');
	assert.equal(edrpouState('1234'), 'typing');
	assert.equal(edrpouState(withCheckDigit('0123456')), 'ok');
	assert.equal(edrpouState('abcdefgh'), 'bad');
	assert.equal(edrpouState('12 45678'), 'bad');
});

test('the grammar and the link rule are the control plane\'s own, when its checkout is beside this one', () => {
	const read = (rel) => {
		try {
			return readFileSync(fileURLToPath(new URL(`../../cloud/control/src/${rel}`, import.meta.url)), 'utf8');
		} catch {
			return null;
		}
	};
	const validate = read('validate.js');
	const form = read('requestForm.js');
	if (validate === null || form === null) return; // CI has no cloud checkout
	assert.ok(validate.includes(`const EMAIL_RE = ${EMAIL_RE};`), 'EMAIL_RE differs from cloud/control/src/validate.js');
	assert.ok(form.includes(`const LINKISH = ${LINKISH};`), 'LINKISH differs from cloud/control/src/requestForm.js');
});

test('emailDomain: the domain of an address the server takes, else null', () => {
	assert.equal(emailDomain('School.Office@Example.ORG'), 'example.org');
	assert.equal(emailDomain(' a@b.co '), 'b.co');
	assert.equal(emailDomain('name@host'), null);
	assert.equal(emailDomain('.name@example.org'), null);
	assert.equal(emailDomain('школа@example.org'), null);
	assert.equal(emailDomain('no-at.example.org'), null);
	assert.equal(emailDomain(`${'a'.repeat(250)}@example.org`), null);
});

test('typoFix: a known slip in the domain is corrected, the rest of the address kept', () => {
	assert.equal(typoFix('Office@gmail.con'), 'Office@gmail.com');
	assert.equal(typoFix('lyceum@UKR.NER'), 'lyceum@ukr.net');
	assert.equal(typoFix('lyceum@ukr.net'), null);
	assert.equal(typoFix('gmail.con'), null);
});

test('readDnsAnswer: records, none, NXDOMAIN, a null MX, an error', () => {
	assert.equal(readDnsAnswer({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.org.' }] }, 15), true);
	assert.equal(readDnsAnswer({ Status: 0, Answer: [{ type: 5, data: 'alias.example.org.' }] }, 15), false);
	assert.equal(readDnsAnswer({ Status: 0 }, 15), false);
	assert.equal(readDnsAnswer({ Status: 3 }, 15), false);
	assert.equal(readDnsAnswer({ Status: 0, Answer: [{ type: 15, data: '0 .' }] }, 15), false);
	assert.equal(readDnsAnswer({ Status: 2 }, 15), null);
	assert.equal(readDnsAnswer(null, 15), null);
	assert.equal(readDnsAnswer({ Status: 0, Answer: [{ type: 1, data: '192.0.2.1' }] }, 1), true);
});

const answering = (byType) => async (url) => {
	const type = new URL(url).searchParams.get('type');
	const body = byType[type];
	if (body instanceof Error) throw body;
	return { ok: body !== 'http-error', json: async () => body };
};

test('domainTakesMail: MX says yes; no MX falls back to the address record; both «no» is no; anything unanswered is no verdict', async () => {
	const mx = { Status: 0, Answer: [{ type: 15, data: '10 mx.example.org.' }] };
	const a = { Status: 0, Answer: [{ type: 1, data: '192.0.2.1' }] };
	const none = { Status: 0 };
	const gone = { Status: 3 };
	assert.equal(await domainTakesMail('example.org', answering({ MX: mx })), true);
	assert.equal(await domainTakesMail('example.org', answering({ MX: none, A: a })), true);
	assert.equal(await domainTakesMail('example.org', answering({ MX: none, A: none })), false);
	assert.equal(await domainTakesMail('example.org', answering({ MX: gone, A: gone })), false);
	assert.equal(await domainTakesMail('example.org', answering({ MX: new Error('offline'), A: new Error('offline') })), null);
	assert.equal(await domainTakesMail('example.org', answering({ MX: none, A: 'http-error' })), null);
	assert.equal(await domainTakesMail('example.org', answering({ MX: { Status: 2 }, A: none })), null);
});

test('domainTakesMail: only the domain goes out, to Cloudflare\'s DNS, as a simple request', async () => {
	const seen = [];
	await domainTakesMail('example.org', async (url, init) => {
		seen.push([url, init.headers]);
		return { ok: true, json: async () => ({ Status: 0, Answer: [{ type: 15, data: '10 mx.example.org.' }] }) };
	});
	assert.deepEqual(seen, [['https://cloudflare-dns.com/dns-query?name=example.org&type=MX', { accept: 'application/dns-json' }]]);
});

test('the lines: what the visitor reads, with the address to write to when we say «no»', () => {
	assert.deepEqual(edrpouLine('typing', 's@example.org'), { state: '', text: '' });
	assert.equal(edrpouLine('ok', 's@example.org').state, 'ok');
	const bad = edrpouLine('bad', 's@example.org');
	assert.equal(bad.state, 'bad');
	assert.ok(bad.text.includes('s@example.org'));
	assert.equal(emailLine('syntax').state, 'bad');
	assert.equal(emailLine('wait').state, 'wait');
	assert.equal(emailLine(true, 'example.org', 's@example.org').state, 'ok');
	const no = emailLine(false, 'example.org', 's@example.org');
	assert.equal(no.state, 'bad');
	assert.ok(no.text.includes('example.org') && no.text.includes('s@example.org'));
	assert.deepEqual(emailLine(null, 'example.org', 's@example.org'), { state: '', text: '' });
	// The site's typography: no straight quote or apostrophe in a line.
	for (const line of [bad, no, emailLine('syntax'), emailLine(true, 'example.org', 's'), { text: textProblem('x.ua') }]) {
		assert.ok(!/['"]/.test(line.text), line.text);
	}
});

test('textProblem: a web address in a name or a place', () => {
	assert.equal(textProblem('Вигаданий ліцей № 0'), '');
	assert.notEqual(textProblem('Ліцей licey0.example.org'), '');
	assert.notEqual(textProblem('www.licey'), '');
});
