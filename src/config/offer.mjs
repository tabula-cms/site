// The one source of the offer's numbers and dates for this site (story 78, decision 9 and 24).
//
// No page types a price, a date of the offer, a reply time or a contact by hand: every page that
// shows one is an `.mdx` page that imports this module. The control plane keeps its own copies
// (`plans.year_uah` <-> priceYearUah, `pilot.defaultUntil` <-> pilotUntil, `requests.replyDays`
// <-> requestReplyDays); the coordinator checks they agree in each PR that touches either side.
//
// The operator: decision 5 of story 78 kept the operator unnamed; spec 83 (owner's decision «Реквізити», 2026-11-09)
// publishes the details openly on «Для бухгалтерії». They live only in `offer.operator` below, filled in by the owner;
// an empty field is not shown. No real details are ever typed anywhere else.

export const offer = Object.freeze({
	// Decision 2: the last day of the free pilot (ISO date). The paid period starts the next day.
	pilotUntil: '2026-12-31',
	// Decision 3: the public price per site, without VAT, in hryvnias.
	priceYearUah: 4800,
	// Decision 3: the quarterly instalment; must equal priceYearUah / 4 (test/offer.test.mjs).
	priceQuarterUah: 1200,
	// Decision 24: the value of the pilot's free services for the institution's books, per MONTH
	// of the pilot: priceYearUah / 12 = 4 800 / 12 = 400 (test/offer.test.mjs holds this). Spec 83 uses it only
	// in the unconfirmed decision `pilotActValue` («400 грн за повний місяць, за неповний — пропорційно дням»).
	pilotValueUah: 400,
	// Decision 8: the date the law and procurement texts were last checked against their sources.
	asOf: '2026-11-08',
	// Decision 24: the usual reply time to a request, in working days. The home writes «зазвичай протягом N…»;
	// the spec-83 pages use the spec's own wording («Ми відповімо протягом N робочих днів»).
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
	// Story 82, decision 24: the public demo's button. While false (phase 1, a closed test by invitation) the page
	// «Спробувати» (/sprobuvaty/) exists but nothing links to it, it is `noindex` and out of the sitemap; the owner hands
	// out its address. True (after phase 2) adds it to the footer, the sitemap and the search engines.
	demoOpen: false,
	// Story 82, decision 30: the kinds whose golden copy exists, as tabula's `--seed` names (DEMO_KINDS below). With one
	// kind the form's field is hidden and the page says «на прикладі ліцею». Must match the CP's `demo.kinds`.
	demoKinds: Object.freeze(['school']),
	// Story 82, decision 1: the demo's origin (https, no path). The page posts the pass to `{demoUrl}/__demo/start`.
	// TABULA_DEMO_URL overrides it at build time.
	demoUrl: process.env.TABULA_DEMO_URL || 'https://demo.tabula.org.ua',
	// Story 82: the site key of the demo's own Turnstile widget (action `demo-signin`; the CP holds its secret,
	// CP_DEMO_TURNSTILE_SECRET). The owner fills it in; TABULA_DEMO_TURNSTILE_SITEKEY overrides it. While it is empty
	// the page «Спробувати» shows «Демо тимчасово закрите».
	demoTurnstileSiteKey: process.env.TABULA_DEMO_TURNSTILE_SITEKEY || '',
	// Decision 19: where the encrypted copies of the schools' sites are kept today.
	// Footer-and-audience-pages spec (2026-11-09), answer 7: the copies are on Hetzner, not Backblaze.
	copiesWhere: 'Hetzner, ЄС',
	// The same spec, answer 7: how long the encrypted copies of a school's site are kept, in days.
	backupRetentionDays: 30,
	// The same spec, «Механізм виходу»: after the paid period the site stays closed this many days, then it
	// is deleted (its copies disappear within backupRetentionDays more).
	exitClosedDays: 30,

	// ---- Spec 83 (audience pages, 2026-11-09) ------------------------------------------------------------
	// The date the four pages «Для директора», «Для того, хто веде сайт», «Для бухгалтерії» and «Ціна й оплата»
	// were checked: they say «Перевірено {formatDateLongYear(checkedOn)}» (not «станом на», which keeps `asOf`).
	checkedOn: '2026-11-09',
	// Owner's decision «Термінова допомога»: mail only; the subject «Терміново» gets a reply the same working day.
	urgentSubject: 'Терміново',
	// The subject of «Запросити документи» on «Для бухгалтерії».
	documentsSubject: 'Документи для бухгалтерії',
	// Owner's decision «Час на сайт»: the first week takes about this many hours, then about weeklyMinutes a week.
	firstWeekHours: '3–4',
	weeklyMinutes: 30,
	// «Ви нічого не зламаєте»: deleted items stay in the bin this many days.
	trashDays: 30,
	// The exit: the address on tabula.org.ua is not given to another institution for at least this many months.
	addressHoldMonths: 12,
	// Spec 83, decisions 3 and 4 (not confirmed yet, see `decisions`): the numbers their texts use.
	contractUntil: '2027-12-31',
	paymentBankDays: 10,
	graceDays: 45,
	noticeDays: 60,
	// The law's numbers the pages repeat (checked on checkedOn; the sources are listed on «Для бухгалтерії»).
	law: Object.freeze({
		// A report in Prozorro for a contract made without the e-system: from this sum a year (one subject).
		reportLimitUah: 50000,
		// The rule above holds until this day; then law № 4888-IX takes full effect.
		reportRuleUntil: '2027-03-24',
		// Open tenders for services: from this sum a year.
		tenderLimitUah: 200000,
		// From reportRuleUntil: a report from this sum in euro a year.
		newReportLimitEur: 2000,
		// Working days: the annual plan published in Prozorro; a commitment filed with the Treasury; the report.
		planPublishDays: 5,
		commitmentDays: 7,
		reportDays: 10,
		// Working days: what the institution publishes on its site under article 30 (charity, budget, documents) and
		// the qualification plan (resolution № 800).
		art30Days: 10,
		qualificationPlanDays: 2,
		// Months: the most a budget institution may pay in advance for services (resolution № 1070).
		prepayMonths: 3,
	}),
	// The codes of the purchase.
	dk021: '72410000-7',
	dk021Name: 'Послуги провайдерів',
	dk021Class: '7241',
	kekv: '2240',
	kekvName: 'Оплата послуг (крім комунальних)',

	// {дані: …} of spec 83: the operator's details, published openly on «Для бухгалтерії» (owner's decision
	// «Реквізити»). The owner fills them in; a field that is null is not shown (Requisites.astro), and a sentence that
	// needs it is left out. Never put real details anywhere but here.
	operator: Object.freeze({
		// ПІБ of the фізична особа — підприємець.
		name: null,
		// РНОКПП.
		rnokpp: null,
		address: null,
		iban: null,
		bank: null,
		// КВЕДи from the extract, e.g. ['62.01 …', '63.11 …']; the accountant advises 63.11 among them.
		kved: null,
		// From the spec's text: the 3rd group of the single tax at 5 %, not a VAT payer.
		taxGroup: 3,
		taxRatePercent: 5,
		vatPayer: false,
	}),
	// {дані: назва ліцею, місто} of «Хто ми»: the lyceum where Tabula started. Owner's decision «Хто ми»: a name, a
	// city and a link to its live site, where Tabula has worked since `since`. Shown only when filled in.
	lyceum: Object.freeze({
		name: null,
		city: null,
		url: null,
		since: 2026,
	}),
});

// The authors line (owner's decision «Хто ми», spec 83 §9): the first sentence opens «Хто ми» on «Для директора»
// and the note under its buttons; the whole line is the footer's line under the columns.
export const authorsLine = 'Tabula зробили вчителі, які вміють програмувати.';

// The footer's line under the columns (spec 83 §9, verbatim; it replaced the line of the footer-and-audience-pages
// spec): who made Tabula and why. check-built holds it on every page of the site (product pages and the documentation).
export const footerLine = `${authorsLine} Ми хотіли, щоб сайт закладу вели його власні працівники, а не найнятий програміст.`;

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

// Story 82, decision 30: the kinds of institution the demo knows (tabula's `--seed` names) and the form's labels.
export const DEMO_KINDS = Object.freeze({
	school: 'Школа, ліцей, гімназія',
	zdo: 'Садочок',
	'fakhovyi-koledzh': 'Фаховий коледж',
	'profesiinyi-koledzh': 'Професійний коледж',
});

// Story 82, «Texts»: the form's «Хто ви» choices. The CP stores the chosen text as the lead's role.
export const DEMO_ROLES = Object.freeze(['Учитель', 'Директор', 'Заступник директора', 'Інше']);

/** Story 82, decision 30: the heading of «Спробувати» — «на прикладі ліцею» while the school is the one kind. */
export function demoHeading(kinds = offer.demoKinds) {
	return kinds.length === 1 && kinds[0] === 'school' ? 'Спробуйте Tabula на прикладі ліцею' : 'Спробуйте Tabula';
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

// ---------------------------------------------------------------------------------------------
// Spec 83: the texts and lists of the audience pages (below the helpers they use).

/**
 * {рішення: …} of spec 83: texts that wait for the owner's confirmation. A page shows one only through `decided()`,
 * which returns null until `confirmed` is true, so an unconfirmed promise never reaches the site. `text: null` is a
 * decision the spec names without a wording yet (`todo` says what is missing).
 */
export const decisions = Object.freeze({
	// Decision 1: notice and the archive (Для директора, «Що буде, якщо Tabula припинить роботу?»).
	terminationNotice: Object.freeze({
		confirmed: false,
		text: `У договорі записано, що про припинення послуги ми попередимо щонайменше за ${offer.noticeDays} днів і передамо архів.`,
	}),
	// Decision 2: the monthly acts of the pilot (Для бухгалтерії, the timeline's step 2).
	pilotActs: Object.freeze({
		confirmed: false,
		text: `наприкінці кожного місяця пробного періоду надсилає акт за цей місяць; останній — ${formatDateLongYear(offer.pilotUntil)}.`,
	}),
	// Decision 2: the value of the pilot's services in the act (Для бухгалтерії, «Коротко», «Пробний період»).
	pilotActValue: Object.freeze({
		confirmed: false,
		text: `Вартість послуг в акті — ${formatGrn(offer.pilotValueUah)} за повний місяць, за неповний — пропорційно дням.`,
	}),
	// Decision 3: the contract for the paid year (Для бухгалтерії, the timeline's step 7).
	contract2027: Object.freeze({
		confirmed: false,
		text: `Ціна не змінюється протягом року, а договір діє до ${formatDateLongYear(offer.contractUntil)}. Заклад платить у межах бюджетних асигнувань протягом ${offer.paymentBankDays} банківських днів після підписання акта. Якщо асигнувань не виділили, заклад може розірвати договір. За неповний квартал оплата пропорційна дням. Штрафів за затримку бюджетного фінансування договір не містить.`,
	}),
	// Decision 4: free days from 1 January until the contract is made (Для директора, FAQ).
	januaryGrace: Object.freeze({
		confirmed: false,
		text: `Сайт працює безкоштовно, поки заклад укладає договір і реєструє зобовʼязання, — до ${offer.graceDays} календарних днів від ${formatDateLongYear(nextDay(offer.pilotUntil))}. Платити за ці дні не потрібно.`,
	}),
	// Decision 4: a late payment (Для бухгалтерії, «Довідка»; Ціна й оплата, its own section).
	latePayment: Object.freeze({
		confirmed: false,
		text: `Публічний сайт ми не вимикаємо: у закладу обовʼязок за статтею 30. Якщо оплата за актом затримується понад ${offer.graceDays} календарних днів, ми напишемо керівникові закладу й домовимося.`,
	}),
	// Decision 8: who answers when the operator is ill (Для директора, «Хто ми»). No wording yet.
	whoIfIll: Object.freeze({
		confirmed: false,
		text: null,
		todo: 'хто відповідає, якщо виконавець хворіє; «учителі» в множині, а виконавець — один ФОП',
	}),
});

/** The text of a confirmed decision, or null (unconfirmed or without a wording): the page then leaves it out. */
export function decided(key, all = decisions) {
	const d = all[key];
	if (!d) throw new Error(`offer: no decision "${key}"`);
	return d.confirmed && d.text ? d.text : null;
}

// Spec 83 §7, «Які документи ми надаємо». `status`: 'ready' | 'preparing' | 'onRequest' | 'off' (StatusBadge.astro).
// `pdf` is the address of the sample once it exists: the row then shows «Завантажити PDF» (and its status should be
// 'ready'); a 'preparing' row offers «Надішлемо, щойно буде готово».
export const documents = Object.freeze([
	{ name: 'Витяг із ЄДР', why: 'щоб не утримувати ПДФО й військовий збір', when: 'разом із договором', status: 'ready', pdf: null },
	{ name: 'Витяг із реєстру платників єдиного податку', why: 'щоб підтвердити групу єдиного податку й статус неплатника ПДВ', when: 'разом із договором', status: 'ready', pdf: null },
	{ name: 'Зразок договору про безоплатне надання послуг і акта до нього', why: 'для пробного періоду', when: 'до підписання', status: 'preparing', pdf: null },
	{ name: `Зразок договору на ${yearOf(nextDay(offer.pilotUntil))} рік`, why: 'для основної закупівлі', when: 'до підписання', status: 'preparing', pdf: null },
	{ name: 'Зразок акта й рахунку на оплату', why: 'для щоквартальної оплати', when: 'щокварталу', status: 'preparing', pdf: null },
	{ name: 'Зразок наказу про призначення працівника, який веде сайт', why: 'щоб призначити відповідального', when: 'разом із договором', status: 'preparing', pdf: null },
	{ name: 'Зразок згоди батьків на фото й відео дітей', why: 'для публікації фото', when: 'до зйомки', status: 'preparing', pdf: null },
]);

// Spec 83 §8, «Що входить у ціну» on «Ціна й оплата». `assistant: true` marks the line that carries the
// «Ще не ввімкнено» badge while `assistantStatus` is 'testing'.
export const priceIncludes = Object.freeze([
	{ text: 'Сайт за адресою ваш-заклад.tabula.org.ua або на власному домені закладу' },
	{ text: 'Усі вісім шаблонів і готові розділи за статтею 30 Закону України «Про освіту»' },
	{ text: 'Панель керування сайтом українською' },
	{ text: 'Щоденні зашифровані резервні копії' },
	{ text: 'Оновлення й захищене зʼєднання (HTTPS)' },
	{ text: 'Допомога електронною поштою' },
	{ text: 'Сайт без реклами' },
	{ text: 'Помічник зі штучним інтелектом у межах місячного ліміту', assistant: true },
]);

// Spec 83 §8, «Що буде, якщо вирішите відмовитися» (`#vykhid` of «Ціна й оплата»): the exit, step by step.
export const exitSteps = Object.freeze([
	'Усі документи, фото й новини отримаєте одним архівом. Його можна відкрити в будь-якому браузері, а матеріали — перенести на будь-який інший сайт.',
	'Сайт працює до кінця строку договору.',
	`Ще ${offer.exitClosedDays} днів після цього сайт буде закритий для відвідувачів, але ви зможете увійти й завантажити архів. Якщо назвете адресу нового сайту, стара адреса вестиме туди.`,
	'Потім ми видаляємо сайт і його резервні копії та надсилаємо лист-підтвердження.',
	`Адреса на tabula.org.ua зникає разом із сайтом і щонайменше протягом ${offer.addressHoldMonths} місяців не передається іншому закладу. Власний домен лишається вашим.`,
]);
