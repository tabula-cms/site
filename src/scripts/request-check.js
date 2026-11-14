// The request form's instant checks (owner's request, 2026-11-14): the visitor sees at once that the ЄДРПОУ code
// cannot exist (its check digit is wrong) or that there is no mail service behind the address, instead of learning it
// from the control plane's generic «Деякі поля заповнено неправильно» page after sending. The form itself stays a
// plain HTML form posted to the control plane; without JavaScript it works as before, only without these lines.
//
// What is checked, and how far it goes:
//  - ЄДРПОУ: eight digits and the check digit, the same rule as the server (cloud/control/src/requestForm.js). A wrong
//    check digit means no such code exists. A right one does NOT prove the institution exists: no registry is asked.
//  - e-mail: the server's grammar, then whether the domain after @ takes mail (its MX records, or an address record),
//    asked from Cloudflare's DNS over HTTPS. Only the domain is sent, never the address. The mailbox itself is not
//    checked: the confirmation letter does that. No answer in time means no verdict, and the form is not blocked.
//  - «Назва закладу», «Громада»: a web address in them is refused by the server, so it is said here.
// A value known to be wrong blocks the submit through the field's own validity message.
//
// The marker `data-request-check` on the form's root is how check-built knows this script.

/** The control plane's e-mail grammar (cloud/control/src/validate.js EMAIL_RE): keep the two equal. */
export const EMAIL_RE =
	/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

/** The server's «a link in a name or a place» rule (requestForm.js LINKISH). */
export const LINKISH = /:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}/i;

/** The ЄДРПОУ's check digit, as the server computes it (requestForm.js edrpouOk). */
export function edrpouOk(code) {
	if (!/^\d{8}$/.test(code)) return false;
	const d = [...code].map(Number);
	const n = Number(code);
	const shifted = n > 30_000_000 && n < 60_000_000;
	const first = shifted ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
	const second = shifted ? [9, 3, 4, 5, 6, 7, 8] : [3, 4, 5, 6, 7, 8, 9];
	const mod = (w) => w.reduce((sum, weight, i) => sum + weight * d[i], 0) % 11;
	let check = mod(first);
	if (check === 10) check = mod(second);
	if (check === 10) check = 0;
	return check === d[7];
}

/** 'empty' | 'typing' (fewer than eight digits so far) | 'bad' | 'ok'. */
export function edrpouState(value) {
	const text = String(value).trim();
	if (!text) return 'empty';
	if (/^\d{1,7}$/.test(text)) return 'typing';
	return edrpouOk(text) ? 'ok' : 'bad';
}

/** The domain of an address the server would accept, lower-cased; null when the address is not one. */
export function emailDomain(value) {
	const text = String(value).trim();
	if (text.length > 254 || !EMAIL_RE.test(text)) return null;
	return text.slice(text.lastIndexOf('@') + 1).toLowerCase();
}

// Slips of the keyboard in the mail services Ukrainian schools use most. Wrong domain -> the one that was meant.
const TYPOS = Object.freeze({
	'gmail.con': 'gmail.com',
	'gmail.co': 'gmail.com',
	'gmail.cim': 'gmail.com',
	'gmai.com': 'gmail.com',
	'gmial.com': 'gmail.com',
	'gmal.com': 'gmail.com',
	'gnail.com': 'gmail.com',
	'gmail.ua': 'gmail.com',
	'gmail.com.ua': 'gmail.com',
	'ukr.ner': 'ukr.net',
	'ukr.ne': 'ukr.net',
	'ukr.nt': 'ukr.net',
	'ukr.met': 'ukr.net',
	'ukt.net': 'ukr.net',
	'urk.net': 'ukr.net',
	'i.ia': 'i.ua',
	'meta.ia': 'meta.ua',
	'outlok.com': 'outlook.com',
	'outloook.com': 'outlook.com',
	'yaho.com': 'yahoo.com',
});

/** The address with a known slip in its domain corrected, or null when there is nothing to suggest. */
export function typoFix(value) {
	const text = String(value).trim();
	const at = text.lastIndexOf('@');
	if (at < 1) return null;
	const fixed = TYPOS[text.slice(at + 1).toLowerCase()];
	return fixed ? `${text.slice(0, at + 1)}${fixed}` : null;
}

const DNS_URL = 'https://cloudflare-dns.com/dns-query';
const TYPE_A = 1;
const TYPE_MX = 15;

/** One DNS-over-HTTPS answer → true (records of `type` exist), false (none, or the name does not exist), null (no verdict). */
export function readDnsAnswer(json, type) {
	if (!json || typeof json.Status !== 'number') return null;
	if (json.Status === 3) return false; // NXDOMAIN
	if (json.Status !== 0) return null;
	const records = (Array.isArray(json.Answer) ? json.Answer : []).filter((r) => r && r.type === type);
	// A «null MX» (RFC 7505: priority 0, target «.») says the domain takes no mail.
	if (type === TYPE_MX && records.length > 0 && records.every((r) => /^\d+\s+\.$/.test(String(r.data).trim()))) return false;
	return records.length > 0;
}

/**
 * Does `domain` take mail? true | false | null (could not find out: offline, slow, blocked). `fetchFn` is the page's
 * fetch; only the domain goes out. An MX record says yes; without one a mail server falls back to the address record.
 */
export async function domainTakesMail(domain, fetchFn, { timeoutMs = 4000 } = {}) {
	const ask = async (type) => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const res = await fetchFn(`${DNS_URL}?name=${encodeURIComponent(domain)}&type=${type === TYPE_MX ? 'MX' : 'A'}`, {
				headers: { accept: 'application/dns-json' },
				signal: controller.signal,
			});
			return res.ok ? readDnsAnswer(await res.json(), type) : null;
		} catch {
			return null;
		} finally {
			clearTimeout(timer);
		}
	};
	const mx = await ask(TYPE_MX);
	if (mx === true) return true;
	const a = await ask(TYPE_A);
	if (a === true) return true;
	// «No» only when both questions were answered; one unanswered question leaves no verdict.
	return mx === false && a === false ? false : null;
}

/** The line under a field: `state` is 'ok' | 'bad' | 'wait' | '' (nothing to say), `text` what it says. */
export function edrpouLine(state, supportEmail) {
	if (state === 'ok') return { state: 'ok', text: 'Цифри коду сходяться.' };
	if (state === 'bad') {
		return {
			state: 'bad',
			text: `Такого коду ЄДРПОУ не існує: перевірте цифри. Якщо код точно правильний, напишіть нам на ${supportEmail}.`,
		};
	}
	return { state: '', text: '' };
}

/** `verdict`: 'syntax' (not an address) | 'wait' | true | false | null, as domainTakesMail answers. */
export function emailLine(verdict, domain, supportEmail) {
	if (verdict === 'syntax') return { state: 'bad', text: 'Адреса записана неправильно: перевірте, чи є в ній @ і назва поштового сервісу латинкою.' };
	if (verdict === 'wait') return { state: 'wait', text: 'Перевіряємо адресу…' };
	if (verdict === true) return { state: 'ok', text: `Поштовий сервіс ${domain} існує. Після заявки на цю адресу прийде лист-підтвердження.` };
	if (verdict === false) {
		return { state: 'bad', text: `Поштового сервісу ${domain} не існує: перевірте адресу після @. Якщо адреса точно правильна, напишіть нам на ${supportEmail}.` };
	}
	return { state: '', text: '' };
}

/** A name or a place the server would refuse, said in words; '' when it is fine. */
export function textProblem(value) {
	return LINKISH.test(String(value)) ? 'Тут не може бути адреси сайту чи назви з крапкою латинкою (наприклад, name.ua). Запишіть назву словами.' : '';
}

function show(line, { state, text }) {
	line.textContent = text;
	if (state) line.dataset.state = state;
	else delete line.dataset.state;
	line.hidden = !text;
}

function init(root, doc, fetchFn) {
	const form = root.querySelector('form');
	const support = root.dataset.support || '';
	const field = (name) => form.querySelector(`[name="${name}"]`);
	const lineOf = (name) => root.querySelector(`[data-check-line="${name}"]`);

	const edrpou = field('edrpou');
	const edrpouOut = lineOf('edrpou');
	const checkEdrpou = () => {
		const state = edrpouState(edrpou.value);
		const line = edrpouLine(state, support);
		show(edrpouOut, line);
		edrpou.setCustomValidity(state === 'bad' ? line.text : '');
	};
	edrpou.addEventListener('input', checkEdrpou);

	const email = field('email');
	const emailOut = lineOf('email');
	const fix = root.querySelector('[data-check-fix]');
	let asked = 0;
	const suggest = () => {
		const fixed = typoFix(email.value);
		fix.hidden = !fixed;
		if (fixed) {
			fix.querySelector('[data-check-fix-text]').textContent = fixed;
			fix.dataset.value = fixed;
		}
	};
	const checkEmail = async () => {
		const value = email.value.trim();
		suggest();
		if (!value) {
			show(emailOut, { state: '', text: '' });
			email.setCustomValidity('');
			return;
		}
		const domain = emailDomain(value);
		if (!domain) {
			const line = emailLine('syntax');
			show(emailOut, line);
			email.setCustomValidity(line.text);
			return;
		}
		email.setCustomValidity('');
		const mine = ++asked;
		show(emailOut, emailLine('wait'));
		const verdict = await domainTakesMail(domain, fetchFn);
		if (mine !== asked) return; // the visitor has typed on: a newer question is out
		const line = emailLine(verdict, domain, support);
		show(emailOut, line);
		email.setCustomValidity(verdict === false ? line.text : '');
	};
	// While typing, a line that said «wrong» is taken away; the verdict comes when the field is left.
	email.addEventListener('input', () => {
		asked += 1;
		show(emailOut, { state: '', text: '' });
		email.setCustomValidity('');
		suggest();
	});
	email.addEventListener('change', checkEmail);
	fix.querySelector('button').addEventListener('click', () => {
		email.value = fix.dataset.value || email.value;
		fix.hidden = true;
		checkEmail();
		email.focus();
	});

	for (const name of ['school', 'place']) {
		const input = field(name);
		const out = lineOf(name);
		input.addEventListener('input', () => {
			const problem = textProblem(input.value);
			show(out, { state: problem ? 'bad' : '', text: problem });
			input.setCustomValidity(problem);
		});
	}

	// A required field of spaces alone passes the browser and fails the server: trim on leaving the field.
	form.addEventListener('focusout', (event) => {
		const input = event.target;
		if (input instanceof doc.defaultView.HTMLInputElement && input.type !== 'checkbox' && input.type !== 'radio' && input.value !== input.value.trim()) {
			input.value = input.value.trim();
		}
	});
}

if (typeof document !== 'undefined') {
	const root = document.querySelector('[data-request-check]');
	if (root) init(root, document, (...args) => fetch(...args));
}
