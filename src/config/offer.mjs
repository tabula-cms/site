// The one source of the offer's numbers and dates for this site (story 78, decision 9 and 24).
//
// No page types a price, a date of the offer, a reply time or a contact by hand: every page that
// shows one is an `.mdx` page that imports this module. The control plane keeps its own copies
// (`plans.year_uah` <-> priceYearUah, `pilot.defaultUntil` <-> pilotUntil, `requests.replyDays`
// <-> requestReplyDays); the coordinator checks they agree in each PR that touches either side.
//
// The operator is never named here or anywhere else on the site (decision 5): no name, no РНОКПП, no
// address. Since the footer-and-audience-pages spec (2026-11-09) the footer no longer carries an operator
// line: «ФОП на єдиному податку, без ПДВ» lives in the section «Про виконавця» of «Для бухгалтерії»
// (#vykonavets), and the full details are given on request.

export const offer = Object.freeze({
	// Decision 2: the last day of the free pilot (ISO date). The paid period starts the next day.
	pilotUntil: '2026-12-31',
	// Decision 3: the public price per site, without VAT, in hryvnias.
	priceYearUah: 4800,
	// Decision 3: the quarterly instalment; must equal priceYearUah / 4 (test/offer.test.mjs).
	priceQuarterUah: 1200,
	// Decision 24: the value of the pilot's free services for the institution's books, per MONTH
	// of the pilot: priceYearUah / 12 = 4 800 / 12 = 400 (test/offer.test.mjs holds this). Pages
	// say «— {pilotValueUah} грн за кожен місяць пілоту», never a lump sum.
	pilotValueUah: 400,
	// Decision 8: the date the law and procurement texts were last checked against their sources.
	asOf: '2026-11-08',
	// Decision 24: the usual reply time to a request, in working days. Pages always write
	// «зазвичай протягом N робочих днів», never a promise.
	requestReplyDays: 2,
	// Decision 24: the usual reply time to a support e-mail, in working days.
	supportReplyDays: 2,
	// Decision 24 and story 80, decision 13: the public address for requests and support, the one every
	// product page shows.
	supportEmail: 'support@tabula.org.ua',
	// Story 80, decision 13: 'testing' while the assistant is not on for schools (every place that
	// shows it carries the «Випробовуємо» chip); 'on' drops the chips and the FAQ entry
	// «Коли запрацює ШІ-помічник?».
	assistantStatus: 'testing',
	// Story 80, decision 12: the public demo site; null until one exists. The home's «Подивитися
	// приклад сайту» and «Відкрити приклад сайту» go there when set, else to the page «Демо-сайт»
	// (demoHref below), which then shows the «У розробці» chip; once set, that page shows a button instead.
	demoSiteUrl: null,
	// Decision 24: an optional public phone number; pages show it only when set.
	contactPhone: null,
	// Decision 5 and 24: the role mailbox for the controller's details and data-subject requests
	// (set by the owner in PR #21). privacyEmail() falls back to supportEmail if it is ever null.
	operatorEmail: 'privacy@tabula.org.ua',
	// Story 82, slice S1a: the address the privacy section «Демо» gives for complaints about the demo (someone typed
	// another person's address, the demo infringes a person's rights). The owner sets it; while it is null,
	// complaintEmail() falls back to privacyEmail().
	complaintEmail: null,
	// Decision 24: the control plane's address; TABULA_CP_URL overrides it at build time for a
	// manual check against a local control plane.
	cpUrl: process.env.TABULA_CP_URL || 'https://cp.tabula.org.ua',
	// Decision 24: Cloudflare Turnstile's public site key; TABULA_TURNSTILE_SITEKEY overrides it.
	turnstileSiteKey: process.env.TABULA_TURNSTILE_SITEKEY || '',
	// Decision 24: false until the control plane accepts requests (C1 live); W2 reads it.
	requestsOpen: false,
	// Decision 19: where the encrypted copies of the schools' sites are kept today.
	// Footer-and-audience-pages spec (2026-11-09), answer 7: the copies are on Hetzner, not Backblaze.
	copiesWhere: 'Hetzner, ЄС',
	// The same spec, answer 7: how long the encrypted copies of a school's site are kept, in days.
	backupRetentionDays: 30,
	// The same spec, «Механізм виходу»: after the paid period the site stays closed this many days, then it
	// is deleted (its copies disappear within backupRetentionDays more).
	exitClosedDays: 30,
});

// The footer's bottom line (the footer-and-audience-pages spec, answer 2, variant 1), verbatim: who made
// Tabula and for whom. It replaced the sentence about free software and the operator line; check-built
// holds it on every page of the site (product pages and the documentation).
export const footerLine =
	'Tabula зробили вчителі з досвідом програмування — для інших шкіл. Щоб сайт закладу вів його працівник, а не найнятий програміст.';

// «Механізм виходу» of the same spec: the text for the site (home FAQ, «Ціна й оплата», «Безпека й дані»,
// «Для директора»), verbatim but for the number, which comes from exitClosedDays.
export const exitText = `Документи, фото й новини заберете архівом — він відкривається в будь-якому браузері, а вміст можна перенести в будь-який сайт. Сайт працює до кінця оплаченого періоду, потім ми його закриваємо й через ${offer.exitClosedDays} днів видаляємо разом із копіями. Адреса на tabula.org.ua зникає разом із сайтом; власний домен лишається вашим.`;

// Decision 17: what the institution gets, said once and the same everywhere (the home page and
// «Ціна й оплата» render this list). The titles repeat the control plane's `plans.includes`
// (C2's migration); the lines are short explanations that add no promise of their own.
export const includes = Object.freeze([
	{
		icon: 'laptop',
		title: 'Сайт на назва.tabula.org.ua або на власному домені',
		text: 'Адресу узгоджуємо під час розмови.',
	},
	{
		icon: 'document',
		title: 'Шаблони й готові розділи за статтею 30',
		text: 'Розділи вже є. Ви наповнюєте їх змістом.',
	},
	{
		icon: 'desktop',
		title: 'Панель українською',
		text: 'Уся робота із сайтом — у браузері.',
	},
	{
		icon: 'database',
		title: 'Щоденні резервні копії',
		text: 'Копії зашифровані й лежать окремо від сайту.',
	},
	{
		icon: 'setting',
		title: 'Оновлення й захищене зʼєднання (https)',
		text: 'Систему й сертифікат оновлюємо ми.',
	},
	{
		icon: 'email',
		title: 'Допомога електронною поштою',
		text: `Зазвичай відповідаємо протягом ${offer.supportReplyDays} робочих днів.`,
	},
	{
		icon: 'comment',
		title: 'Помічник у панелі в межах тарифу',
		text: 'Помічник необовʼязковий: сайт працює і без нього.',
	},
	{
		icon: 'approve-check',
		title: 'Без реклами',
		text: 'Унизу сторінки лише рядок «Сайт створено на Tabula».',
	},
	{
		icon: 'open-book',
		title: 'Архів документів, фото й новин, якщо вирішите піти',
		text: 'Архів відкривається в будь-якому браузері, а вміст можна перенести в будь-який сайт.',
	},
]);

const MONTHS_GENITIVE = [
	'січня',
	'лютого',
	'березня',
	'квітня',
	'травня',
	'червня',
	'липня',
	'серпня',
	'вересня',
	'жовтня',
	'листопада',
	'грудня',
];

/** Parses an ISO date (`YYYY-MM-DD`) as a UTC day; returns null for anything that is not a real date. */
export function parseIsoDate(iso) {
	if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	const same =
		date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
	return same ? date : null;
}

function requireDate(iso) {
	const date = parseIsoDate(iso);
	if (!date) throw new Error(`offer: not a real ISO date: ${String(iso)}`);
	return date;
}

/** `'2026-12-31'` -> `'31.12.2026'`. */
export function formatDate(iso) {
	const date = requireDate(iso);
	const dd = String(date.getUTCDate()).padStart(2, '0');
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
	return `${dd}.${mm}.${date.getUTCFullYear()}`;
}

/** `'2027-01-01'` -> `'1 січня 2027'` (no leading zero, month in the genitive). */
export function formatDateLong(iso) {
	const date = requireDate(iso);
	return `${date.getUTCDate()} ${MONTHS_GENITIVE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** The ISO date one day after `iso` (the first day of the paid period is `nextDay(pilotUntil)`). */
export function nextDay(iso) {
	const date = requireDate(iso);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

/** `4800` -> `'4 800'`, with a narrow no-break space (U+202F) as the thousands separator. */
export function formatNumber(n) {
	if (!Number.isInteger(n) || n < 0) throw new Error(`offer: not a non-negative integer: ${String(n)}`);
	return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** The mailbox the privacy page names for the controller's full details (decision 5).
 * `operatorEmail` is empty until the owner sets a role mailbox; until then the sentence
 * «…на запит на {operatorEmail}» uses `supportEmail`, so it always names an address that works. */
export function privacyEmail() {
	return offer.operatorEmail || offer.supportEmail;
}

/** Story 82, S1a: where the privacy section «Демо» sends complaints — `complaintEmail` when the owner has set it,
 * else privacyEmail(). `email` is a parameter so both states are testable. */
export function complaintEmail(email = offer.complaintEmail) {
	return email || privacyEmail();
}

// «протягом N робочих днів» with N in words (genitive), for the sentences that give a usual reply
// time (decision 24): 1 -> «протягом одного робочого дня», 2 -> «протягом двох робочих днів».
const DAYS_IN_WORDS = {
	1: 'одного робочого дня',
	2: 'двох робочих днів',
	3: 'трьох робочих днів',
	4: 'чотирьох робочих днів',
	5: 'пʼяти робочих днів',
	6: 'шести робочих днів',
	7: 'семи робочих днів',
	8: 'восьми робочих днів',
	9: 'девʼяти робочих днів',
	10: 'десяти робочих днів',
};

export function withinWorkingDays(n) {
	const words = DAYS_IN_WORDS[n];
	if (!words) throw new Error(`offer: no words for ${String(n)} working days (1..10)`);
	return `протягом ${words}`;
}

/** `'2026-12-31'` -> `'31 грудня 2026 року'` with no-break spaces (U+00A0) inside the date. */
export function formatDateLongYear(iso) {
	return `${formatDateLong(iso)} року`.replaceAll(' ', '\u00a0');
}

/** `'2027-01-01'` -> `2027`: the year of that day. */
export function yearOf(iso) {
	return requireDate(iso).getUTCFullYear();
}

/** `4800` -> `'4 800 ₴'`: no-break spaces (U+00A0) between the thousands and before ₴ (the narrow U+202F
 * of `formatNumber` is too tight at display sizes). */
export function formatUah(n) {
	return `${formatNumber(n).replaceAll('\u202f', '\u00a0')}\u00a0₴`;
}

// Story 80: the short list on the price card of the home page. Each line says in fewer words what
// `includes` says in full; `coveredBy` lists the indexes into `includes` it summarises, so a line
// cannot promise something the full list (rendered on «Ціна й оплата») does not
// (test/offer.test.mjs checks every index is valid and the list is not empty).
export const includesShort = Object.freeze([
	{ text: 'Сайт, панель і всі вісім шаблонів', coveredBy: [1, 2] },
	{ text: 'ШІ-помічник у межах ліміту', coveredBy: [6] },
	{ text: 'Адреса на tabula.org.ua або власний домен', coveredBy: [0] },
	{ text: 'Щоденні резервні копії на серверах у ЄС', coveredBy: [3] },
	{ text: `Відповідь на листи — зазвичай ${withinWorkingDays(offer.supportReplyDays)}`, coveredBy: [5] },
]);

/** `4800` -> `'4 800 грн'`: the sum for running text, no-break spaces (U+00A0) inside and before «грн». */
export function formatGrn(n) {
	return `${formatNumber(n).replaceAll(' ', ' ')} грн`;
}

// Story 80, round 3: where the home's «Подивитися приклад сайту» / «Відкрити приклад сайту» lead. `root` is the
// site's base with a trailing slash; `url` defaults to offer.demoSiteUrl (a parameter so both states are testable).
export function demoHref(root, url = offer.demoSiteUrl) {
	return url ? url : `${root}demo/`;
}

// Story 80, round 3: what the page «Демо-сайт» shows. Without a demo site: the «У розробці» chip and the two sentences
// (`buttonHref` is null); with one: the button «Відкрити демо-сайт» to `buttonHref`, no chip. src/content/pages/demo.mdx
// reads this, so the branch is unit-tested (test/offer.test.mjs).
export function demoPageState(url = offer.demoSiteUrl) {
	return url ? { chip: false, buttonHref: url } : { chip: true, buttonHref: null };
}
