// The page «Спробувати» (story 82, slice S1b; spec «The sign-in, step by step»): the only script of that page.
//
//   1. The form posts `application/x-www-form-urlencoded` (a simple request, no preflight, no credentials) to
//      `{cp}/v1/demo/signin`: email, kind, role, institution, consent_save, consent_contact, source (the referrer's
//      domain only) and the Turnstile token (action `demo-signin`) → 200 { attempt } | 400 | 403 | 429 | 502 | 503.
//   2. The code step, on the same page: `{cp}/v1/demo/code` with the attempt id and the code → 200 { pass, saved } |
//      400 { left } | 410. The attempt id is kept in sessionStorage (decision 26: a code works only with its attempt, in
//      the browser that asked), so a reload of the tab keeps the code step.
//   3. The pass goes in a hidden form POSTed to `{demo}/__demo/start` (never in a URL). The broker checks the request's
//      `Origin`, so the page must never be `no-referrer` (the page sets `strict-origin-when-cross-origin` itself).
//
// Without JavaScript the page shows one line («Демо працює лише з увімкненим JavaScript.») and no form: this script
// removes the line and shows the form. Turnstile's script is loaded from here, so without JavaScript nothing reaches
// Cloudflare. Without a Turnstile site key (not configured yet) the page shows the closed state.
//
// The logic that decides what the page says is pure and exported for `node --test` (test/demo-try.test.mjs);
// `initTry` touches the DOM.

export const TURNSTILE_API = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const ACTION = 'demo-signin';
export const RESEND_S = 60; // the CP sends no new code to the same address sooner (decision 18)
export const ATTEMPT_MS = 10 * 60_000; // a code lives 10 minutes
export const TOKEN_WAIT_MS = 20_000; // Turnstile blocked or never answering: the page says so instead of waiting forever
export const TICK_WAIT_MS = 120_000; // a challenge that waits for the visitor's tick gets longer
const STORE_KEY = 'tabula-demo-attempt';
const DOMAIN_LIKE = /^[a-z0-9]([a-z0-9.-]{0,98}[a-z0-9])?$/;

export const TEXTS = Object.freeze({
	turnstile: 'Не вдалося перевірити, що ви не робот. Оновіть сторінку або відкрийте її в іншому браузері.',
	expired: 'Цей код уже не діє: він живе 10 хвилин. Надішліть новий.',
	noTriesLeft: 'Код не підходить. Спроб більше немає: надішліть новий код.',
	invalid: 'Перевірте адресу пошти й позначку згоди.',
	server: 'Не вдалося звʼязатися з сервером. Спробуйте ще раз за хвилину.',
	resend: 'Надіслати ще раз',
	tick: 'Спершу поставте позначку над кнопкою. Код надішлемо одразу.',
});

/** Ukrainian plural: 1 спроба, 2–4 спроби, 0 / 5–20 спроб; 21 спроба, 22 спроби… */
export function plural(n, [one, few, many]) {
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) return one;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
	return many;
}

/** The spec's «Wrong code» line; with no tries left the attempt is dead, so the page asks for a new code. */
export function wrongCodeText(left) {
	if (!Number.isInteger(left) || left <= 0) return TEXTS.noTriesLeft;
	return `Код не підходить. Перевірте цифри: лишилося ${left} ${plural(left, ['спроба', 'спроби', 'спроб'])}.`;
}

export const CODE_DIGITS = 6;

/**
 * The code field's value as the control plane wants it: digits only, six at most. The letter shows the code grouped
 * («123 456»), so a paste may carry a space, and the control plane drops white space only: a hyphen or a dot must go
 * here. `caret` is a position in the raw value; the answer's caret stands after the same digits.
 */
export function cleanCode(raw, caret = String(raw ?? '').length) {
	const text = String(raw ?? '');
	const digits = (s) => s.replace(/[^0-9]/g, '');
	const value = digits(text).slice(0, CODE_DIGITS);
	return { value, caret: Math.min(digits(text.slice(0, Math.max(0, caret))).length, value.length) };
}

/**
 * Keeps the code field clean while the person types, pastes or the phone fills the code in. The field has no
 * `maxlength` (it would cut a pasted «123 456» to «123 45» before this runs), so a seventh typed digit is refused here.
 */
export function bindCodeInput(input) {
	const set = (value, caret) => {
		input.value = value;
		try {
			input.setSelectionRange(caret, caret);
		} catch {
			/* a field that is not focused may refuse a selection: the value is what matters */
		}
	};
	const clean = () => {
		const { value, caret } = cleanCode(input.value, input.selectionStart ?? input.value.length);
		if (value !== input.value) set(value, caret);
	};
	input.addEventListener('beforeinput', (event) => {
		if (event.inputType !== 'insertText' || event.isComposing) return;
		// A keyboard's chip may insert the whole code as one piece of text: it replaces whatever the field held.
		const whole = cleanCode(event.data).value;
		if (whole.length === CODE_DIGITS) {
			event.preventDefault();
			set(whole, CODE_DIGITS);
			return;
		}
		const selected = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
		if (cleanCode(input.value).value.length - selected >= CODE_DIGITS) event.preventDefault();
	});
	input.addEventListener('input', (event) => {
		if (!event.isComposing) clean();
	});
	input.addEventListener('compositionend', clean); // the last `input` of a composition still says isComposing
}

/** «0:45»: minutes and two-digit seconds. */
export function formatWait(seconds) {
	const s = Math.max(0, Math.ceil(seconds));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The resend button's text: the spec's «while disabled» line, or «Надіслати ще раз». */
export function resendText(secondsLeft) {
	return secondsLeft > 0 ? `Надіслати ще раз можна через ${formatWait(secondsLeft)}` : TEXTS.resend;
}

/** The referrer's domain only (lower case, no path), or '' for none, our own host or anything that is not a domain. */
export function sourceDomain(referrer, ownHost) {
	if (!referrer) return '';
	let host;
	try {
		host = new URL(referrer).hostname.toLowerCase();
	} catch {
		return '';
	}
	if (!host || host === String(ownHost || '').toLowerCase()) return '';
	return DOMAIN_LIKE.test(host) ? host : '';
}

/** What the page does with the answer of /v1/demo/signin. */
export function signinOutcome(status, body) {
	if (status === 200 && body && typeof body.attempt === 'string' && body.attempt) return 'code';
	if (status === 503) return 'closed';
	if (status === 429) return 'full'; // the CP's address limit; the broker shows the same page on its own (decision 18)
	if (status === 403) return 'turnstile';
	if (status === 400) return 'invalid';
	return 'server';
}

/** What the page does with the answer of /v1/demo/code. */
export function codeOutcome(status, body) {
	if (status === 200 && body && typeof body.pass === 'string' && body.pass) return { kind: 'pass', pass: body.pass };
	if (status === 400) return { kind: 'error', text: wrongCodeText(body ? body.left : undefined) };
	if (status === 410) return { kind: 'error', text: TEXTS.expired, gone: true };
	return { kind: 'error', text: TEXTS.server };
}

/** `promise`, or `fallback` once `ms` have passed. */
export function within(promise, ms, fallback = null, timers = globalThis) {
	return new Promise((resolve) => {
		const t = timers.setTimeout(() => resolve(fallback), ms);
		promise.then((value) => {
			timers.clearTimeout(t);
			resolve(value);
		});
	});
}

/** `fields` of a stored attempt: a plain object of strings, else null (older tabs stored none). */
export function storedFields(fields) {
	if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null;
	return Object.values(fields).every((v) => typeof v === 'string') ? fields : null;
}

/** A stored attempt that is still worth showing the code step for, or null. A bad `fields` is dropped, not fatal. */
export function liveAttempt(stored, nowMs) {
	if (!stored || typeof stored !== 'object') return null;
	const { attempt, email, sentAt } = stored;
	if (typeof attempt !== 'string' || typeof email !== 'string' || typeof sentAt !== 'number') return null;
	if (!(nowMs - sentAt < ATTEMPT_MS)) return null;
	if (!('fields' in stored) || storedFields(stored.fields)) return stored;
	const { fields: _bad, ...rest } = stored;
	return rest;
}

/**
 * The same address asked for again within the minute: the control plane would answer with an attempt that has no code
 * (one letter per address per RESEND_S), so the page shows the code step of the attempt it left. Else null.
 */
export function sameAttempt(previous, email, nowMs) {
	const live = liveAttempt(previous, nowMs);
	if (!live) return null;
	const norm = (v) => String(v ?? '').trim().toLowerCase();
	if (!norm(email) || norm(live.email) !== norm(email)) return null;
	return nowMs - live.sentAt < RESEND_S * 1000 ? live : null;
}

/** What to do with the token the page has (or waited for): send it, ask for the tick, or say Turnstile failed. */
export function tokenVerdict({ token, needsTick }) {
	if (token) return 'send';
	return needsTick ? 'tick' : 'turnstile';
}

// ---------------------------------------------------------------------------------------------
// The DOM.

function store(win) {
	try {
		return win.sessionStorage;
	} catch {
		return null;
	}
}

function readStored(win) {
	try {
		return JSON.parse(store(win)?.getItem(STORE_KEY) || 'null');
	} catch {
		return null;
	}
}

function writeStored(win, value) {
	try {
		if (value) store(win)?.setItem(STORE_KEY, JSON.stringify(value));
		else store(win)?.removeItem(STORE_KEY);
	} catch {
		/* private mode: the code step then lives as long as the page */
	}
}

/** Loads Turnstile once; resolves with `window.turnstile`. */
function loadTurnstile(win, doc) {
	if (win.turnstile) return Promise.resolve(win.turnstile);
	return new Promise((resolve, reject) => {
		const script = doc.createElement('script');
		script.src = TURNSTILE_API;
		script.async = true;
		script.addEventListener('load', () => (win.turnstile ? resolve(win.turnstile) : reject(new Error('turnstile'))));
		script.addEventListener('error', () => reject(new Error('turnstile')));
		doc.head.append(script);
	});
}

/** One Turnstile widget in `container`: `token()` waits for a fresh token (null when Turnstile failed), `reset()` asks
 * for the next one. */
function widget(win, doc, container, siteKey, { onError = () => {}, onInteractive = () => {}, onToken = () => {} } = {}) {
	let rendered = null;
	let current = null;
	let failed = false;
	let interactive = false;
	let waiting = [];
	const wake = (value) => {
		const list = waiting;
		waiting = [];
		list.forEach((resolve) => resolve(value));
	};
	const settle = (token) => {
		current = token;
		if (token) {
			failed = false;
			interactive = false;
			onToken();
			wake(token);
		}
	};
	const fail = () => {
		failed = true;
		current = null;
		interactive = false;
		onError();
		wake(null);
	};
	const render = () =>
		loadTurnstile(win, doc).then((ts) => {
			if (rendered === null) {
				rendered = ts.render(container, {
					sitekey: siteKey,
					action: ACTION,
					language: 'uk',
					'response-field': false,
					callback: (token) => settle(token),
					'before-interactive-callback': () => {
						interactive = true;
						onInteractive();
					},
					'after-interactive-callback': () => {
						interactive = false;
					},
					'expired-callback': () => settle(null),
					'error-callback': () => {
						fail();
						return true;
					},
				});
			}
			return ts;
		});
	return {
		render: () => render().catch(fail),
		needsTick: () => interactive && !current,
		token: () => {
			if (current) return Promise.resolve(current);
			if (failed) return Promise.resolve(null);
			return new Promise((resolve) => waiting.push(resolve));
		},
		reset: () => {
			current = null;
			failed = false; // Turnstile runs again: an earlier error must not answer for the new run
			interactive = false;
			if (rendered !== null && win.turnstile) win.turnstile.reset(rendered);
		},
	};
}

export function initTry(root, { win = globalThis, doc = globalThis.document, fetchFn = globalThis.fetch } = {}) {
	const $ = (sel) => root.querySelector(sel);
	const cp = root.dataset.cp.replace(/\/+$/, '');
	const siteKey = root.dataset.sitekey || '';
	const form = $('[data-try-form]');
	const formError = $('[data-try-form-error]');
	const sendButton = $('[data-try-send]');
	const codeStep = $('[data-try-code]');
	const codeForm = $('[data-try-code-form]');
	const codeInput = $('[data-try-code-input]');
	const codeError = $('[data-try-code-error]');
	const codeButton = $('[data-try-enter]');
	const emailOut = $('[data-try-email]');
	const resendButton = $('[data-try-resend]');
	const resendBox = $('[data-try-resend-turnstile]');
	const formTick = $('[data-try-form-tick]');
	const resendTick = $('[data-try-resend-tick]');
	const passForm = $('[data-try-pass]');
	const states = { closed: $('[data-try-closed]'), full: $('[data-try-full]') };

	let attempt = null;
	let saved = null; // the live attempt as stored: { attempt, email, sentAt, fields }
	const leftBehind = new Map(); // the attempts «Змінити адресу» left, by address, in memory only
	const addressKey = (value) => String(value ?? '').trim().toLowerCase();
	let lastFields = null;
	let timer = null;

	const show = (el, on) => {
		el.hidden = !on;
	};
	const say = (el, text) => {
		el.textContent = text || '';
		show(el, Boolean(text));
	};
	const busy = (button, on) => {
		button.disabled = on;
		button.setAttribute('aria-busy', on ? 'true' : 'false');
	};

	const showState = (name) => {
		show(form, false);
		show(codeStep, false);
		stopTimer();
		for (const [key, el] of Object.entries(states)) show(el, key === name);
		states[name].focus();
	};

	function stopTimer() {
		if (timer) win.clearInterval(timer);
		timer = null;
	}
	function startTimer(sentAt) {
		stopTimer();
		const tick = () => {
			const left = RESEND_S - (Date.now() - sentAt) / 1000;
			resendButton.textContent = resendText(left);
			resendButton.disabled = left > 0;
			if (left <= 0) stopTimer();
		};
		tick();
		timer = win.setInterval(tick, 1000);
	}

	const showCodeStep = ({ email, sentAt }, { focus = true } = {}) => {
		show(form, false);
		emailOut.textContent = email;
		say(codeError, '');
		show(codeStep, true);
		// A resend left waiting for its tick belongs to the code step before this one.
		show(resendBox, false);
		resendUi.hide();
		resendWidget.reset();
		startTimer(sentAt);
		if (focus) codeInput.focus();
	};

	const showForm = () => {
		stopTimer();
		if (saved) leftBehind.set(addressKey(saved.email), saved);
		saved = null;
		attempt = null;
		writeStored(win, null);
		show(codeStep, false);
		show(form, true);
		formWidget.render(); // rendered only while the form is visible
		form.elements.email.focus();
	};

	// The tick hint of one widget. The hint is a live region that stays in the page: its text is set and cleared (an
	// empty one takes no room, try.css), so a screen reader announces it. `resume` sends once the owed tick arrives.
	const tickUi = (box, hint, errorEl, resume) => {
		const ui = {
			active: false, // a wait is running
			pending: false, // the wait ended with the tick still owed: the token, when it comes, sends by itself
			reveal() {
				hint.textContent = TEXTS.tick;
				if (typeof box.scrollIntoView === 'function') box.scrollIntoView({ block: 'nearest' });
			},
			hide() {
				hint.textContent = '';
				ui.pending = false;
			},
			// The challenge now wants a tick: during a wait, or after one that ended with the Turnstile line.
			interactive() {
				const stale = errorEl.textContent === TEXTS.turnstile;
				if (stale) {
					say(errorEl, '');
					ui.pending = true;
				}
				if (ui.active || stale) ui.reveal();
			},
			token() {
				const owed = ui.pending;
				ui.hide();
				if (errorEl.textContent === TEXTS.turnstile) say(errorEl, '');
				if (owed) resume();
			},
		};
		return ui;
	};
	const formBox = $('[data-try-turnstile]');
	const formUi = tickUi(formBox, formTick, formError, () => (form.requestSubmit ? form.requestSubmit() : sendButton.click()));
	const resendUi = tickUi(resendBox, resendTick, codeError, () => resendButton.click());
	const formWidget = widget(win, doc, formBox, siteKey, {
		onError: () => say(formError, TEXTS.turnstile),
		onInteractive: () => formUi.interactive(),
		onToken: () => formUi.token(),
	});
	const resendWidget = widget(win, doc, resendBox, siteKey, {
		onError: () => say(codeError, TEXTS.turnstile),
		onInteractive: () => resendUi.interactive(),
		onToken: () => resendUi.token(),
	});

	// Waits for a token: TOKEN_WAIT_MS, and up to TICK_WAIT_MS in all once the challenge wants a tick.
	async function waitToken(w, ui) {
		ui.active = true;
		if (w.needsTick()) ui.reveal();
		let token = await within(w.token(), TOKEN_WAIT_MS);
		if (!token && w.needsTick()) token = await within(w.token(), TICK_WAIT_MS - TOKEN_WAIT_MS);
		ui.active = false;
		return token;
	}

	const post = (path, fields) =>
		fetchFn(`${cp}${path}`, {
			method: 'POST',
			mode: 'cors',
			credentials: 'omit',
			body: new URLSearchParams(fields),
		}).then(async (res) => ({ status: res.status, body: await res.json().catch(() => null) }));

	// Step 1 (and «Надіслати ще раз»): returns true when a code went out.
	async function signin(fields, token, errorEl) {
		let answer;
		try {
			answer = await post('/v1/demo/signin', { ...fields, 'cf-turnstile-response': token });
		} catch {
			answer = { status: 0, body: null };
		}
		const outcome = signinOutcome(answer.status, answer.body);
		if (outcome === 'code') {
			attempt = answer.body.attempt;
			// Kept for «Надіслати ще раз» after a reload: what the visitor typed, not the referrer's domain.
			const { source: _source, ...typed } = fields;
			saved = { attempt, email: fields.email, sentAt: Date.now(), fields: typed };
			writeStored(win, saved);
			showCodeStep(saved);
			return true;
		}
		if (outcome === 'closed' || outcome === 'full') {
			showState(outcome);
			return false;
		}
		say(errorEl, outcome === 'turnstile' ? TEXTS.turnstile : outcome === 'invalid' ? TEXTS.invalid : TEXTS.server);
		return false;
	}

	const readFields = () => {
		const fields = {};
		for (const [key, value] of new FormData(form).entries()) if (typeof value === 'string') fields[key] = value.trim();
		fields.email = String(fields.email || '');
		return fields;
	};

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		say(formError, '');
		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}
		busy(sendButton, true);
		// The same address again within the minute: the control plane would send no new code, so show the old code step.
		const asked = readFields().email;
		const again = sameAttempt(leftBehind.get(addressKey(asked)), asked, Date.now());
		if (again) {
			saved = again;
			attempt = again.attempt;
			lastFields = storedFields(again.fields) ?? readFields();
			writeStored(win, again);
			showCodeStep(again);
			busy(sendButton, false);
			return;
		}
		const token = await waitToken(formWidget, formUi);
		const verdict = tokenVerdict({ token, needsTick: formWidget.needsTick() });
		if (verdict === 'send') {
			formUi.hide();
			// The form stays editable during the wait (the tick is inside it): send what it holds now, not what it held
			// when the button was pressed.
			if (form.checkValidity()) {
				const fields = readFields();
				lastFields = fields;
				await signin(fields, token, formError);
				formWidget.reset(); // a token works once
			} else {
				form.reportValidity();
			}
		} else if (verdict === 'turnstile') {
			formUi.hide();
			say(formError, TEXTS.turnstile);
		} else {
			formUi.pending = true; // the hint stays, no error: the tick, when it comes, sends
		}
		busy(sendButton, false);
	});

	$('[data-try-change]').addEventListener('click', showForm);

	resendButton.addEventListener('click', async () => {
		if (!lastFields) return showForm(); // a reloaded page has no form data: the form, filled in again, sends the code
		say(codeError, '');
		busy(resendButton, true);
		show(resendBox, true);
		resendWidget.render();
		const token = await waitToken(resendWidget, resendUi);
		const verdict = tokenVerdict({ token, needsTick: resendWidget.needsTick() });
		let sent = false;
		if (verdict === 'send') {
			sent = await signin(lastFields, token, codeError);
		} else if (verdict === 'turnstile') {
			say(codeError, TEXTS.turnstile);
		}
		if (verdict === 'tick') {
			resendUi.pending = true; // the box and the hint stay: the tick, when it comes, sends
		} else {
			// A code went out or the wait ended with no tick owed: the box and the hint go.
			resendWidget.reset();
			show(resendBox, false);
			resendUi.hide();
		}
		resendButton.setAttribute('aria-busy', 'false');
		if (!sent && timer === null) resendButton.disabled = false;
	});

	bindCodeInput(codeInput);
	codeForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		say(codeError, '');
		codeInput.value = cleanCode(codeInput.value).value; // a value set with no `input` event (some autofills)
		if (!codeForm.checkValidity()) {
			codeForm.reportValidity();
			return;
		}
		busy(codeButton, true);
		let answer;
		try {
			answer = await post('/v1/demo/code', { attempt: attempt || '', code: codeInput.value });
		} catch {
			answer = { status: 0, body: null };
		}
		const outcome = codeOutcome(answer.status, answer.body);
		if (outcome.kind === 'pass') {
			writeStored(win, null);
			passForm.elements.pass.value = outcome.pass;
			passForm.submit(); // a top-level POST: the broker reads the page's Origin (decision 32)
			return;
		}
		busy(codeButton, false);
		codeInput.value = '';
		say(codeError, outcome.text);
		codeInput.focus();
	});

	// The page is ready: the no-JavaScript line goes, the form (or a live code step, or the closed state) comes.
	$('[data-try-nojs]').remove();
	if (!siteKey) {
		showState('closed');
		return;
	}
	const stored = liveAttempt(readStored(win), Date.now());
	if (stored) {
		attempt = stored.attempt;
		saved = stored;
		lastFields = storedFields(stored.fields); // a reload keeps «Надіслати ще раз» going to the same address
		showCodeStep(stored, { focus: false });
	} else {
		writeStored(win, null);
		show(form, true);
		formWidget.render();
	}
	form.elements.source.value = sourceDomain(doc.referrer, win.location.hostname);
	// The counter of opened pages (`demo.landing`): the referrer's domain only, no answer read.
	post('/v1/demo/landing', { source: form.elements.source.value }).catch(() => {});
}

if (typeof document !== 'undefined') {
	const root = document.querySelector('[data-demo-try]');
	if (root) initTry(root);
}
