// Spec 83 (2026-11-09): the three pages for the roles of an institution and «Ціна й оплата». Their bodies are MDX
// (src/content/pages/<slug>.mdx, frontmatter `hero: <key>`); what stands around the body — the label, the H1, the
// lead, the four «Коротко» facts, the buttons, the note and the end of the page — is here, so RolePage.astro can
// place the table of contents between the hero and the body. Every number, date and address comes from offer.mjs.
// Texts are the spec's, verbatim; `typo()` puts the no-break spaces when the components render them.
import { offer, authorsLine, formatDateLongYear, formatGrn, nextDay, yearOf } from './offer.mjs';

const pilotEnd = formatDateLongYear(offer.pilotUntil);
const paidYear = yearOf(nextDay(offer.pilotUntil));

/**
 * Spec 84 §4: the four pages of the group «Про сервіс», in the order of ServiceNav.astro (the footer's column «Про
 * сервіс» lists them in its own order). `share` is the text of ShareButton.astro when a page is forwarded.
 */
export const SERVICE_PAGES = Object.freeze([
	{ slug: 'yak-tse-pratsiuie', title: 'Як це працює', about: 'етапи, строки й хто що робить', share: null },
	{ slug: 'khostynh-i-tsina', title: 'Ціна й оплата', about: 'ціна, оплата й що буде, якщо вирішите відмовитися', share: null },
	{ slug: 'bezpeka-i-dani', title: 'Безпека й дані', about: 'де зберігаються дані закладу й хто має до них доступ', share: 'Переслати директорові' },
	{ slug: 'zakon-i-sait-shkoly', title: 'Закон і сайт школи', about: 'що закон вимагає оприлюднити на сайті закладу', share: null },
]);

/** The three role pages, in the switcher's order. `about` is the line under the card in «Інші сторінки». */
export const ROLES = Object.freeze([
	{
		slug: 'dlia-dyrektora',
		title: 'Для директора',
		about: 'що дає Tabula закладу й чи це безпечно',
		serviceAbout: 'що дає Tabula закладу й чи це безпечно',
		share: 'Переслати директорові',
	},
	{
		slug: 'dlia-vidpovidalnoho',
		title: 'Для того, хто веде сайт',
		about: 'що зробити в перший тиждень і що робити щотижня',
		serviceAbout: 'що зробити в перший тиждень',
		share: null,
	},
	{
		slug: 'dlia-bukhhalterii',
		title: 'Для бухгалтерії',
		about: 'ціна, коди, документи й порядок оплати',
		serviceAbout: 'ціна, коди, документи й порядок оплати',
		share: 'Переслати бухгалтерові',
	},
]);

export function roleBySlug(slug) {
	const role = ROLES.find((r) => r.slug === slug) ?? SERVICE_PAGES.find((p) => p.slug === slug && p.share);
	if (!role) throw new Error(`audience: no role page "${slug}"`);
	return role;
}

// Actions: `{ kind: 'link', text, href, primary }` (href relative to the site's root, or mailto:), `{ kind: 'share',
// to }` (ShareButton: a mail with the address of the role page `to`), `{ kind: 'print', mode }` (shown only with
// JavaScript).
const request = { kind: 'link', text: 'Подати заявку', href: 'zaiavka/', primary: true };
const guide = { kind: 'link', text: 'Відкрити посібник', href: 'editor/', primary: true };
const writeUs = { kind: 'link', text: 'Написати нам', href: `mailto:${offer.supportEmail}` };
const templates = { kind: 'link', text: 'Подивитися шаблони', href: '#look', root: true };
const reportProblem = {
	kind: 'link',
	text: 'Повідомити про проблему',
	href: `mailto:${offer.supportEmail}?subject=${encodeURIComponent(offer.securitySubject)}`,
};
const printList = { kind: 'print', mode: 'page', text: 'Роздрукувати перелік' };
const askDocuments = {
	kind: 'link',
	text: 'Запросити документи',
	href: `mailto:${offer.supportEmail}?subject=${encodeURIComponent(offer.documentsSubject)}`,
	primary: true,
};

/**
 * The heroes, by the frontmatter key `hero`. `role` is the page's role slug (switcher, «Інші сторінки»), null for
 * «Ціна й оплата». `note` is a list of pieces: strings and `{ text, href }` links; `checked` adds «Перевірено …»,
 * `checkedFirst` puts it before the note. `toc` turns «На цій сторінці» on. `end` is «Що далі» (actions),
 * `related` the cards of the other two roles, `community` the line for the education department ('long' | 'short').
 */
export const HEROES = Object.freeze({
	dyrektor: {
		role: 'dlia-dyrektora',
		label: 'Для директора',
		heading: 'Сайт закладу, який відповідає статті 30, — і вести його може ваш працівник',
		lead: 'Tabula — це готовий сайт для школи, садочка чи коледжу. На ньому вже є розділи для всієї інформації, яку стаття 30 Закону України «Про освіту» вимагає оприлюднювати. Сервер, оновлення й резервні копії ми беремо на себе, а ваші працівники лише наповнюють сайт.',
		facts: [
			{ title: `Безкоштовно до ${pilotEnd}.`, text: `Далі — ${formatGrn(offer.priceYearUah)} на рік, оплата щокварталу після підписання акта.` },
			{ title: 'Розділи за статтею 30 уже є.', text: 'Панель керування сайтом показує, що ще не заповнено.' },
			{ title: 'Дані — на серверах у Європейському Союзі.', text: 'Жодних російських сервісів.' },
			{ title: 'Пробний період ні до чого не зобовʼязує.', text: 'Якщо не підійде, документи, фото й новини заберете одним архівом.' },
		],
		actions: [request, { kind: 'share', to: 'dlia-bukhhalterii' }],
		note: [
			authorsLine,
			...(offer.lyceum.name && offer.lyceum.city ? [`Почали з сайту власного ліцею — ${offer.lyceum.name}, ${offer.lyceum.city}.`] : []),
			{ text: 'Хто ми ↓', href: '#khto-my' },
		],
		checked: true,
		toc: true,
		end: [request, { kind: 'share', to: 'dlia-bukhhalterii' }],
		related: true,
		community: 'long',
	},
	vidpovidalnyi: {
		role: 'dlia-vidpovidalnoho',
		label: 'Для того, хто веде сайт',
		heading: 'Як вести сайт закладу в Tabula',
		lead: 'Вам доручили сайт закладу. Розділи, яких вимагає закон, уже створено, а панель керування сайтом підказує наступний крок. За сервер, оновлення й резервні копії відповідаємо ми.',
		facts: [
			{
				title: `Перший тиждень — приблизно ${offer.firstWeekHours} години.`,
				text: `Далі — близько ${offer.weeklyMinutes} хвилин на тиждень, якщо публікуєте одну новину.`,
			},
			{ title: 'Меню дня — за хвилину з телефона.', text: '' },
			{ title: 'Колеги допомагають.', text: 'Учителі пишуть новини самі, а новини учнів перевіряє вчитель або ви.' },
			{ title: 'Ви нічого не зламаєте.', text: 'Попередню версію сторінки можна повернути, а видалене — відновити з кошика.' },
		],
		actions: [guide, writeUs],
		note: [],
		checked: true,
		toc: true,
		end: [guide, writeUs],
		related: true,
		community: 'long',
		print: true,
	},
	bukhhalteriia: {
		role: 'dlia-bukhhalterii',
		label: 'Для бухгалтерії',
		heading: 'Як оформити закупівлю Tabula: ціна, коди, документи й оплата',
		lead: `На цій сторінці зібрано все, що потрібно бухгалтерії: ціну, коди, документи й порядок оформлення пробного періоду та договору на ${paidYear} рік.`,
		facts: [],
		actions: [],
		note: ['Код закупівлі погодьте з уповноваженою особою з публічних закупівель.'],
		checked: true,
		checkedFirst: true,
		toc: true,
		end: [askDocuments, { kind: 'share', to: 'dlia-dyrektora' }],
		related: true,
		community: 'long',
		print: true,
	},
	tsina: {
		role: null,
		label: null,
		heading: 'Ціна й оплата',
		lead: 'Tabula — це сервіс: ми розміщуємо, оновлюємо й підтримуємо сайт закладу, а заклад платить за нього раз на квартал. Ціну видно наперед, і за створення сайту доплачувати не треба.',
		facts: [],
		actions: [],
		note: [],
		checked: true,
		toc: false,
		end: [],
		related: false,
		community: 'short',
		// Spec 84 §8: the row of the group and the label «Про сервіс».
		service: 'khostynh-i-tsina',
		checkedAt: 'service',
	},
	// Spec 84 §5–7: the pages of the group «Про сервіс». `service` is the page's slug (ServiceNav.astro); `toc` is
	// the list of «На цій сторінці» with the spec's anchors (the H2s carry them as ids); `forWhom` adds «Для кого».
	robota: {
		role: null,
		service: 'yak-tse-pratsiuie',
		label: 'Про сервіс',
		heading: 'Як проходить запуск сайту закладу',
		lead: 'Ви подаєте заявку, ми домовляємося про деталі й підписуємо договір про пробний період. Потім ми створюємо сайт, а працівник закладу наповнює його за перший тиждень.',
		facts: [
			{ title: `Відповідаємо на заявку протягом ${offer.requestReplyDays} робочих днів.`, text: 'Заявка ні до чого не зобовʼязує.' },
			{
				title: 'Від заявки до готового сайту — зазвичай 1–2 тижні.',
				text: `Сайт створюємо протягом ${offer.siteCreateDays} робочих днів після підписання договору.`,
			},
			{
				title: `Перший тиждень — приблизно ${offer.firstWeekHours} години роботи,`,
				text: `якщо документи вже зібрано в одній папці. Далі — близько ${offer.weeklyMinutes} хвилин на тиждень.`,
			},
			{ title: 'Старий сайт працює, доки новий не буде готовий.', text: 'Перенести новини й сторінки допоможемо.' },
		],
		actions: [request, templates],
		note: [],
		checked: true,
		checkedAt: 'service',
		toc: [
			{ id: 'zapusk', text: 'Як проходить запуск' },
			{ id: 'khto-shcho-robyt', text: 'Що робимо ми, а що — заклад' },
			{ id: 'yak-perenesty', text: 'Як перенести старий сайт' },
			{ id: 'adresa', text: 'Яку адресу вибрати' },
			{ id: 'dopomoha', text: 'Як отримати допомогу' },
			{ id: 'pytannia', text: 'Часті запитання' },
		],
		end: [request, writeUs],
		forWhom: true,
		community: 'long',
	},
	bezpeka: {
		role: null,
		service: 'bezpeka-i-dani',
		label: 'Про сервіс',
		heading: 'Де зберігаються дані закладу й хто має до них доступ',
		lead: 'Сайт закладу і його резервні копії зберігаються на серверах у Європейському Союзі (ЄС). Дані на сайті належать закладу, а ми обробляємо їх лише за договором і лише для того, щоб сайт працював.',
		facts: [
			{ title: 'Сервери в ЄС.', text: 'Сайт і копії розміщено в дата-центрі компанії Hetzner у Фінляндії.' },
			{
				title: 'Дані належать закладу.',
				text: 'Заклад є володільцем персональних даних на своєму сайті, а ми — розпорядником за договором.',
			},
			{ title: 'Копії щодня.', text: `Резервні копії зашифровано, вони зберігаються ${offer.backupRetentionDays} днів.` },
			{
				title: 'Без російських сервісів.',
				text: 'Серед наших постачальників немає російських компаній, а шаблони сайту не підключають лічильників, карт чи відео з російських сервісів.',
			},
		],
		actions: [request, reportProblem],
		note: [],
		checked: true,
		checkedAt: 'service',
		toc: [
			{ id: 'de-dani', text: 'Де зберігаються сайт і дані' },
			{ id: 'dostup', text: 'Хто має доступ до даних' },
			{ id: 'zakhyst', text: 'Як ми захищаємо сайт' },
			{ id: 'vidnovlennia', text: 'Як повернути видалене' },
			{ id: 'intsydent', text: 'Що робити, якщо щось сталося' },
			{ id: 'vykhid-dani', text: 'Що буде з даними, якщо ви відмовитеся' },
			{ id: 'pytannia', text: 'Часті запитання' },
		],
		end: [request, { kind: 'share', to: 'bezpeka-i-dani' }],
		forWhom: true,
		community: 'long',
		print: true,
	},
	zakon: {
		role: null,
		service: 'zakon-i-sait-shkoly',
		label: 'Про сервіс',
		heading: 'Що закон вимагає оприлюднити на сайті закладу освіти',
		lead: 'Стаття 30 Закону України «Про освіту» визначає, які документи й відомості заклад оприлюднює на своєму сайті [1]. Тут зібрано повний перелік, строки й вимоги інших законів. Перелік можна роздрукувати й позначати виконане.',
		facts: [
			{
				title: `Строк — ${offer.law.art30Days} робочих днів.`,
				text: `Документ має зʼявитися на сайті не пізніше ніж через ${offer.law.art30Days} робочих днів після затвердження чи змін, якщо закон не встановлює іншого строку [1].`,
			},
			{ title: 'Немає власного сайту — оприлюднюють на сайті засновника [1].' },
			{ title: 'Фінанси оприлюднюють і заклад, і засновник:', text: 'кошторис, звітність, благодійну допомогу [1].' },
			{
				title: 'Відповідає заклад,',
				text: 'а організовує роботу керівник.',
				link: { text: 'Що буде, якщо документів немає', href: '#perevirky' },
			},
		],
		actions: [printList, { ...request, primary: true }],
		note: ['Сторінка пояснює закон простими словами й не замінює консультації юриста.'],
		checked: true,
		checkedFirst: true,
		checkedAt: 'service',
		toc: [
			{ id: 'stattia-30', text: 'Що оприлюднити за статтею 30' },
			{ id: 'finansy', text: 'Які фінансові документи оприлюднити' },
			{ id: 'inshi-zakony', text: 'Що вимагають інші закони' },
			{ id: 'perevirky', text: 'Хто перевіряє і що буде, якщо документів немає' },
			{ id: 'zminy', text: 'Що змінилося з 2024 року' },
			{ id: 'inshi-vymohy', text: 'Інші вимоги: мова, доступність, фото, російські сервіси' },
		],
		end: [printList, request],
		forWhom: true,
		community: 'long',
		print: 'checklist',
	},
});

/** The actions of «Для бухгалтерії» under «Коротко» (in its body). */
export const accountingActions = Object.freeze([{ kind: 'print', mode: 'summary', text: 'Роздрукувати' }, askDocuments]);

/** «На цій сторінці»: the page's H2s, the text before a colon («Як оформити: …» -> «Як оформити»). */
export function tocItems(headings, slug) {
	return headings
		.filter((h) => h.depth === 2)
		.map((h) => ({ id: slug(h), text: h.text.split(':')[0].trim() }));
}
