import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	plural,
	wrongCodeText,
	formatWait,
	resendText,
	sourceDomain,
	signinOutcome,
	codeOutcome,
	liveAttempt,
	within,
	ATTEMPT_MS,
	TEXTS,
	ACTION,
	TURNSTILE_API,
} from '../src/scripts/demo-try.js';

test('plural: спроба / спроби / спроб', () => {
	const forms = ['спроба', 'спроби', 'спроб'];
	assert.deepEqual([1, 2, 3, 4, 5, 0, 11, 12, 14, 21, 22, 25, 111].map((n) => plural(n, forms)), [
		'спроба', 'спроби', 'спроби', 'спроби', 'спроб', 'спроб', 'спроб', 'спроб', 'спроб', 'спроба', 'спроби', 'спроб', 'спроб',
	]);
});

test('wrongCodeText: the spec\'s line with N; no tries left asks for a new code', () => {
	assert.equal(wrongCodeText(4), 'Код не підходить. Перевірте цифри: лишилося 4 спроби.');
	assert.equal(wrongCodeText(1), 'Код не підходить. Перевірте цифри: лишилося 1 спроба.');
	assert.equal(wrongCodeText(0), TEXTS.noTriesLeft);
	assert.equal(wrongCodeText(undefined), TEXTS.noTriesLeft);
});

test('formatWait / resendText: «Надіслати ще раз можна через 0:45»', () => {
	assert.equal(formatWait(45), '0:45');
	assert.equal(formatWait(60), '1:00');
	assert.equal(formatWait(4.2), '0:05');
	assert.equal(resendText(45), 'Надіслати ще раз можна через 0:45');
	assert.equal(resendText(0), 'Надіслати ще раз');
	assert.equal(resendText(-3), 'Надіслати ще раз');
});

test('sourceDomain: the referrer\'s domain only, never our own, never a path', () => {
	assert.equal(sourceDomain('https://Mail.Example.org/inbox?x=1', 'tabula.org.ua'), 'mail.example.org');
	assert.equal(sourceDomain('https://tabula.org.ua/demo/', 'tabula.org.ua'), '');
	assert.equal(sourceDomain('', 'tabula.org.ua'), '');
	assert.equal(sourceDomain('not a url', 'tabula.org.ua'), '');
	assert.equal(sourceDomain('http://[::1]:8080/', 'tabula.org.ua'), '');
});

test('signinOutcome: each answer of /v1/demo/signin', () => {
	assert.equal(signinOutcome(200, { attempt: 'a'.repeat(22) }), 'code');
	assert.equal(signinOutcome(200, {}), 'server');
	assert.equal(signinOutcome(503, null), 'closed');
	assert.equal(signinOutcome(429, null), 'full');
	assert.equal(signinOutcome(403, null), 'turnstile');
	assert.equal(signinOutcome(400, null), 'invalid');
	assert.equal(signinOutcome(502, null), 'server');
	assert.equal(signinOutcome(0, null), 'server');
});

test('codeOutcome: the pass, a wrong code, an expired code', () => {
	assert.deepEqual(codeOutcome(200, { pass: 'p.q.r', saved: null }), { kind: 'pass', pass: 'p.q.r' });
	assert.equal(codeOutcome(400, { error: { code: 'wrong-code' }, left: 2 }).text, 'Код не підходить. Перевірте цифри: лишилося 2 спроби.');
	assert.equal(codeOutcome(410, null).text, 'Цей код уже не діє: він живе 10 хвилин. Надішліть новий.');
	assert.equal(codeOutcome(500, null).text, TEXTS.server);
});

test('liveAttempt: a stored attempt younger than 10 minutes', () => {
	const stored = { attempt: 'a'.repeat(22), email: 'x@example.org', sentAt: 1000 };
	assert.equal(liveAttempt(stored, 1000 + ATTEMPT_MS - 1), stored);
	assert.equal(liveAttempt(stored, 1000 + ATTEMPT_MS), null);
	assert.equal(liveAttempt(null, 0), null);
	assert.equal(liveAttempt({ attempt: 1 }, 0), null);
});

test('the Turnstile action and script', () => {
	assert.equal(ACTION, 'demo-signin');
	assert.ok(TURNSTILE_API.startsWith('https://challenges.cloudflare.com/turnstile/v0/api.js'));
});

test('texts: ʼ as the apostrophe', () => {
	for (const text of Object.values(TEXTS)) assert.ok(!/[А-яІіЇїЄєҐґ]['’][А-яІіЇїЄєҐґ]/.test(text), text);
});

test('within: the value, or the fallback once the time is up', async () => {
	assert.equal(await within(Promise.resolve('tok'), 50), 'tok');
	assert.equal(await within(new Promise(() => {}), 10), null);
});
