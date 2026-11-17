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
	storedFields,
	sameAttempt,
	tokenVerdict,
	within,
	ATTEMPT_MS,
	RESEND_S,
	TICK_WAIT_MS,
	TOKEN_WAIT_MS,
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

test('liveAttempt: stored fields are kept when a plain object of strings, dropped otherwise', () => {
	const base = { attempt: 'a'.repeat(22), email: 'x@example.org', sentAt: 1000 };
	const fields = { email: 'x@example.org', kind: 'school', role: '' };
	const withFields = { ...base, fields };
	assert.equal(liveAttempt(withFields, 2000), withFields);
	assert.equal(liveAttempt(base, 2000), base); // an older tab stored none
	for (const bad of [[], 'x', 5, { a: 1 }, { a: null }]) {
		const live = liveAttempt({ ...base, fields: bad }, 2000);
		assert.deepEqual(live, base, JSON.stringify(bad));
		assert.equal(storedFields(bad), null);
	}
	assert.equal(liveAttempt({ ...withFields, sentAt: 0 }, ATTEMPT_MS + 1), null);
	assert.equal(storedFields(fields), fields);
	assert.equal(storedFields(undefined), null);
});

test('sameAttempt: the same address inside the minute gives the attempt back', () => {
	const prev = { attempt: 'a'.repeat(22), email: 'Ann@Example.org', sentAt: 10_000 };
	assert.equal(sameAttempt(prev, ' ann@example.ORG ', 10_000 + 59_000), prev);
	assert.equal(sameAttempt(prev, 'ann@example.org', 10_000 + RESEND_S * 1000), null);
	assert.equal(sameAttempt(prev, 'other@example.org', 11_000), null);
	assert.equal(sameAttempt(prev, '', 11_000), null);
	assert.equal(sameAttempt(null, 'ann@example.org', 11_000), null);
	assert.equal(sameAttempt({ ...prev, sentAt: 0 }, 'ann@example.org', ATTEMPT_MS + 1), null); // not live
});

test('tokenVerdict: send, ask for the tick, or say Turnstile failed', () => {
	assert.equal(tokenVerdict({ token: 'tok', needsTick: false }), 'send');
	assert.equal(tokenVerdict({ token: 'tok', needsTick: true }), 'send');
	assert.equal(tokenVerdict({ token: null, needsTick: true }), 'tick');
	assert.equal(tokenVerdict({ token: null, needsTick: false }), 'turnstile');
	assert.equal(TICK_WAIT_MS, 120_000);
	assert.equal(TOKEN_WAIT_MS, 20_000);
});

test('TEXTS.tick: the approved line, no straight quote or apostrophe', () => {
	assert.equal(TEXTS.tick, 'Спершу поставте позначку над кнопкою. Код надішлемо одразу.');
	assert.ok(!/['"]/.test(TEXTS.tick));
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

// ---- the code field (#64): the letter shows the code grouped, «123 456» ----

import { cleanCode, bindCodeInput, CODE_DIGITS } from '../src/scripts/demo-try.js';

test('cleanCode: digits only, six at most', () => {
	for (const raw of ['123 456', ' 123456 ', '123-456', '123 456', '1.2.3.4.5.6', '123456\n', 'Код: 123 456']) {
		assert.equal(cleanCode(raw).value, '123456', JSON.stringify(raw));
	}
	assert.equal(cleanCode('1234567').value, '123456');
	assert.equal(cleanCode('12a').value, '12');
	assert.equal(cleanCode('').value, '');
	assert.equal(cleanCode(null).value, '');
	assert.equal(CODE_DIGITS, 6);
});

test('cleanCode: the caret stays after the same digits', () => {
	assert.deepEqual(cleanCode('123 456', 7), { value: '123456', caret: 6 });
	assert.deepEqual(cleanCode('123 456', 4), { value: '123456', caret: 3 });
	assert.deepEqual(cleanCode('12x34', 3), { value: '1234', caret: 2 }); // a letter typed in the middle
	assert.deepEqual(cleanCode('1234', 2), { value: '1234', caret: 2 }); // a digit deleted in the middle
	assert.deepEqual(cleanCode(' 123456 ', 0), { value: '123456', caret: 0 });
	assert.deepEqual(cleanCode('123456789', 9), { value: '123456', caret: 6 });
});

function fakeInput(value = '', start = value.length, end = start) {
	const handlers = {};
	const input = {
		value,
		selectionStart: start,
		selectionEnd: end,
		addEventListener: (type, fn) => (handlers[type] = fn),
		setSelectionRange(a, b) {
			this.selectionStart = a;
			this.selectionEnd = b;
		},
	};
	bindCodeInput(input);
	/** What the browser does: change the value, move the caret after the inserted text, fire `input`. */
	const insert = (text, inputType) => {
		const before = { defaultPrevented: false, inputType, data: text, preventDefault() { this.defaultPrevented = true; } };
		handlers.beforeinput(before);
		if (before.defaultPrevented) return input;
		input.value = input.value.slice(0, input.selectionStart) + text + input.value.slice(input.selectionEnd);
		input.selectionStart = input.selectionEnd = input.selectionStart + text.length;
		handlers.input({ inputType });
		return input;
	};
	return { input, type: (text) => insert(text, 'insertText'), paste: (text) => insert(text, 'insertFromPaste') };
}

test('bindCodeInput: a pasted grouped code is whole', () => {
	for (const text of ['123 456', ' 123456 ', '123-456']) {
		const { input } = (() => {
			const f = fakeInput();
			f.paste(text);
			return f;
		})();
		assert.equal(input.value, '123456', JSON.stringify(text));
		assert.equal(input.selectionStart, 6);
	}
	const over = fakeInput('999999', 0, 6); // a paste over the selected old code
	assert.equal(over.paste('123 456').value, '123456');
});

test('bindCodeInput: typing takes digits only, six at most, and keeps the caret', () => {
	const f = fakeInput();
	for (const ch of '12a3 4-56') f.type(ch);
	assert.equal(f.input.value, '123456');
	f.type('7');
	assert.equal(f.input.value, '123456'); // the seventh digit is refused, as maxlength did
	const mid = fakeInput('123456', 2);
	assert.equal(mid.type('9').value, '123456'); // nor does one in the middle push the last digit out
	assert.equal(mid.input.selectionStart, 2);
	const sel = fakeInput('123456', 2, 3);
	assert.equal(sel.type('9').value, '129456'); // typing over a selected digit replaces it
	assert.equal(sel.input.selectionStart, 3);
	const short = fakeInput('1256', 2);
	short.type('x');
	assert.deepEqual([short.input.value, short.input.selectionStart], ['1256', 2]);
	short.type('3');
	assert.deepEqual([short.input.value, short.input.selectionStart], ['12356', 3]);
});

test('bindCodeInput: a whole code inserted as one text replaces what the field held; a composition is cleaned at its end', () => {
	assert.equal(fakeInput('999999').type('123 456').value, '123456');
	assert.equal(fakeInput('999').type('123456').value, '123456');
	const handlers = {};
	const input = { value: '12 34', selectionStart: 5, selectionEnd: 5, addEventListener: (t, fn) => (handlers[t] = fn), setSelectionRange() {} };
	bindCodeInput(input);
	handlers.input({ isComposing: true });
	assert.equal(input.value, '12 34');
	handlers.compositionend({});
	assert.equal(input.value, '1234');
});
