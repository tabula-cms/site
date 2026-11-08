// The one source of the offer's numbers and dates for this site (story 78, decision 9 and 24).
//
// No page types a price, a date of the offer, a reply time or a contact by hand: every page that
// shows one is an `.mdx` page that imports this module. The control plane keeps its own copies
// (`plans.year_uah` <-> priceYearUah, `pilot.defaultUntil` <-> pilotUntil, `requests.replyDays`
// <-> requestReplyDays); the coordinator checks they agree in each PR that touches either side.
//
// The operator is never named here or anywhere else on the site (decision 5): pages say
// «фізична особа — підприємець» and nothing more.

export const offer = Object.freeze({
	// Decision 2: the last day of the free pilot (ISO date). The paid period starts the next day.
	pilotUntil: '2026-12-31',
	// Decision 3: the public price per site, without VAT, in hryvnias.
	priceYearUah: 4800,
	// Decision 3: the quarterly instalment; must equal priceYearUah / 4 (test/offer.test.mjs).
	priceQuarterUah: 1200,
	// Decision 24: the value of the pilot's free services for the institution's books. The owner
	// sets it; pages show it only when it is a number.
	pilotValueUah: null,
	// Decision 8: the date the law and procurement texts were last checked against their sources.
	asOf: '2026-11-08',
	// Decision 24: the usual reply time to a request, in working days. Pages always write
	// «зазвичай протягом N робочих днів», never a promise.
	requestReplyDays: 2,
	// Decision 24: the usual reply time to a support e-mail, in working days.
	supportReplyDays: 2,
	// Decision 24: the public address for requests and support.
	contactEmail: 'support@tabula.org.ua',
	// Decision 24: an optional public phone number; pages show it only when set.
	contactPhone: null,
	// Decision 5 and 24: a role mailbox for the controller's details. Null until the owner sets
	// it; see privacyEmail() for what the pages use meanwhile.
	operatorEmail: null,
	// Decision 24: the control plane's address; TABULA_CP_URL overrides it at build time for a
	// manual check against a local control plane.
	cpUrl: process.env.TABULA_CP_URL || 'https://cp.tabula.org.ua',
	// Decision 24: Cloudflare Turnstile's public site key; TABULA_TURNSTILE_SITEKEY overrides it.
	turnstileSiteKey: process.env.TABULA_TURNSTILE_SITEKEY || '',
	// Decision 24: false until the control plane accepts requests (C1 live); W2 reads it.
	requestsOpen: false,
	// Decision 19: where the encrypted copies of the schools' sites are kept today.
	copiesWhere: 'Backblaze, Амстердам',
});

// Decision 5: the operator line, verbatim, for the footer and the pages that name the supplier.
export const operatorLine =
	'Послуги надає фізична особа — підприємець, платник єдиного податку 3-ї групи, без ПДВ. Повні реквізити — у договорі та на запит.';

// Decision 17: what the institution gets, said once and the same everywhere (the home page and
// «Хостинг і ціна» render this list). The titles repeat the control plane's `plans.includes`
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
		title: 'Відкритий код: сайт можна забрати',
		text: 'Заклад може поставити свій сайт на власний сервер.',
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
 * «…на запит на {operatorEmail}» uses `contactEmail`, so it always names an address that works. */
export function privacyEmail() {
	return offer.operatorEmail || offer.contactEmail;
}
