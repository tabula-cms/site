// Spec 83 (2026-11-09): the three pages for the roles of an institution and «Ціна й оплата». Their bodies are MDX
// (src/content/pages/<slug>.mdx, frontmatter `hero: <key>`); what stands around the body — the label, the H1, the
// lead, the four «Коротко» facts, the buttons, the note and the end of the page — is here, so RolePage.astro can
// place the table of contents between the hero and the body. Every number, date and address comes from offer.mjs.
// Texts are the spec's, verbatim; `typo()` puts the no-break spaces when the components render them.
import { offer, authorsLine, formatDateLongYear, formatGrn, nextDay, yearOf } from './offer.mjs';

const pilotEnd = formatDateLongYear(offer.pilotUntil);
const paidYear = yearOf(nextDay(offer.pilotUntil));

/** The three role pages, in the switcher's order. `about` is the line under the card in «Інші сторінки». */
export const ROLES = Object.freeze([
	{ slug: 'dlia-dyrektora', title: 'Для директора', about: 'що дає Tabula закладу й чи це безпечно', share: 'Переслати директорові' },
	{
		slug: 'dlia-vidpovidalnoho',
		title: 'Для того, хто веде сайт',
		about: 'що зробити в перший тиждень і що робити щотижня',
		share: null,
	},
	{ slug: 'dlia-bukhhalterii', title: 'Для бухгалтерії', about: 'ціна, коди, документи й порядок оплати', share: 'Переслати бухгалтерові' },
]);

export function roleBySlug(slug) {
	const role = ROLES.find((r) => r.slug === slug);
	if (!role) throw new Error(`audience: no role page "${slug}"`);
	return role;
}

// Actions: `{ kind: 'link', text, href, primary }` (href relative to the site's root, or mailto:), `{ kind: 'share',
// to }` (ShareButton: a mail with the address of the role page `to`), `{ kind: 'print', mode }` (shown only with
// JavaScript).
const request = { kind: 'link', text: 'Подати заявку', href: 'zaiavka/', primary: true };
const guide = { kind: 'link', text: 'Відкрити посібник', href: 'editor/', primary: true };
const writeUs = { kind: 'link', text: 'Написати нам', href: `mailto:${offer.supportEmail}` };
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
