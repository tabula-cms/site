// Spec 84 §7 and §9: the list «Що оприлюднити» of «Закон і сайт школи» (ChecklistTable.astro) — the items of article 30
// of the Law «Про освіту» in the spec's groups, then the financial documents (article 30, part 3) and the duties of
// other acts. The texts are the spec's, verbatim (they are written for the visitor and differ from the panel's).
//
// The panel of Tabula has its own machine list of the same items: `TRANSPARENCY_ITEMS` in tabula's
// src/config/transparency.js (the checklist of /admin/transparency). It is code, not documentation, so docs:fetch does
// not import it; until the panel and this site share one file, `panelKey` names the panel's item each row matches (a
// key there is permanent), and `inTabula` was filled in from that list and tabula's src/config/recommendedPages.js on
// 2026-11-10: 'section' — the site has a ready section (a recommended page) for the item; 'document' — the item has no
// section of its own and is added as a document; null — not verified.
//
// Fields: `group` (a key of GROUPS), `item` (the text for the visitor), `basis` (the number of the source in
// «Джерела» of the page, src/data/sources.mjs), `deadline` («Коли оновлювати», a practical hint; the law's own term is
// one: 10 working days after approval or a change), `appliesTo` ('all' · 'school' · 'funded' · 'licensed' · 'some' —
// the code) and `applies` (the text of «Кого стосується»), `who` («Хто зазвичай готує документ», null when the spec
// names nobody), `inTabula`, `panelKey`.

/** The groups, in the order of the page; `section` is the H2 anchor of the page they belong to. */
export const GROUPS = Object.freeze([
	{ key: 'ustanovchi', title: 'Установчі документи й управління', section: 'stattia-30' },
	{ key: 'osvitnia', title: 'Освітня діяльність', section: 'stattia-30' },
	{ key: 'kadry', title: 'Кадри', section: 'stattia-30' },
	{ key: 'umovy', title: 'Умови навчання й послуги', section: 'stattia-30' },
	{ key: 'bezpeka', title: 'Безпека й доступність', section: 'stattia-30' },
	{ key: 'finansy', title: 'Фінансові документи', section: 'finansy' },
	{ key: 'inshi', title: 'Інші закони', section: 'inshi-zakony' },
]);

export const IN_TABULA_TEXT = Object.freeze({ section: 'Є розділ', document: 'Додаєте документом' });

const ALL = 'усі';
const art30 = (group, item, applies, deadline, who, inTabula, panelKey, appliesTo = applies === ALL ? 'all' : 'some') =>
	Object.freeze({ group, item, basis: 1, deadline, appliesTo, applies, who, inTabula, panelKey });

export const ARTICLE30 = Object.freeze([
	art30('ustanovchi', 'Статут закладу', ALL, 'після змін', 'директор', 'section', 'statut'),
	art30('ustanovchi', 'Ліцензії на провадження освітньої діяльності', ALL, 'після змін', 'директор', 'section', 'litsenzii', 'licensed'),
	art30(
		'ustanovchi',
		'Сертифікати про акредитацію освітніх програм',
		'заклади з акредитованими програмами (зокрема коледжі)',
		'після акредитації',
		'директор',
		'section',
		'akredytatsiia',
	),
	art30(
		'ustanovchi',
		'Структура й органи управління закладу (схема або опис: директор, заступники, педагогічна рада, рада закладу)',
		ALL,
		'після змін',
		'директор',
		'section',
		'struktura-i-organy',
	),
	art30(
		'osvitnia',
		'Освітні програми й перелік освітніх компонентів, які вони передбачають',
		ALL,
		'щороку',
		'заступник директора (затверджує директор)',
		'section',
		'osvitni-prohramy',
	),
	art30('osvitnia', 'Мова (мови) освітнього процесу', ALL, 'після змін', 'директор', 'section', 'mova-osvity'),
	art30(
		'osvitnia',
		'Ліцензований обсяг (скільки здобувачів освіти дозволяє ліцензія) і фактична кількість здобувачів',
		ALL,
		'щороку',
		'секретар',
		'section',
		'kilkist-zdobuvachiv',
	),
	art30(
		'osvitnia',
		'Територія обслуговування, закріплена засновником',
		'садочки й школи',
		'після змін',
		'директор',
		'section',
		'terytoriia-obsluhovuvannia',
	),
	art30('osvitnia', 'Правила прийому', ALL, 'після змін', 'директор', 'section', 'pravyla-pryiomu'),
	art30(
		'osvitnia',
		'Результати моніторингу якості освіти (наприклад, звіт про самооцінювання)',
		ALL,
		'після кожного моніторингу',
		'заступник директора (затверджує директор)',
		'section',
		'monitorynh-iakosti',
	),
	art30('osvitnia', 'Річний звіт про діяльність закладу', ALL, 'щороку', 'директор', 'section', 'richnyi-zvit'),
	// The panel's item has no recommended page of its own (the staff page is a seeded one): not verified.
	art30('kadry', 'Кадровий склад згідно з ліцензійними умовами', ALL, 'після змін', 'секретар або кадровик', null, 'kadrovyi-sklad'),
	art30(
		'kadry',
		'Вакантні посади, порядок і умови конкурсу на них (якщо конкурс проводять)',
		ALL,
		'після змін',
		'директор',
		'section',
		'vakansii',
	),
	art30(
		'umovy',
		'Матеріально-технічне забезпечення згідно з ліцензійними умовами (довідка про приміщення, кабінети й обладнання)',
		ALL,
		'щороку',
		'заступник із господарської роботи',
		'section',
		'materialno-tekhnichne',
	),
	art30(
		'umovy',
		'Гуртожитки, вільні місця в них і плата за проживання',
		'заклади з гуртожитками',
		'після змін',
		'директор',
		'section',
		'hurtozhytky',
	),
	art30('umovy', 'Розмір плати за навчання', 'заклади, що беруть плату', 'після змін', 'бухгалтерія', 'section', 'plata-za-navchannia'),
	art30(
		'umovy',
		'Додаткові освітні та інші послуги, їхня вартість, порядок надання й оплати',
		'заклади, що надають такі послуги',
		'після змін',
		'бухгалтерія',
		'section',
		'platni-posluhy',
	),
	art30(
		'bezpeka',
		'Правила поведінки здобувача освіти',
		ALL,
		'після змін',
		'заступник директора (затверджує директор)',
		'section',
		'pravyla-povedinky',
	),
	art30(
		'bezpeka',
		'Положення про запобігання і протидію насильству та жорстокому поводженню з дітьми',
		ALL,
		'після змін',
		'директор',
		'section',
		'zapobihannia-nasylstvu',
	),
	art30(
		'bezpeka',
		'Умови доступності закладу для навчання осіб з особливими освітніми потребами',
		ALL,
		'після змін',
		'директор',
		'section',
		'dostupnist-oop',
	),
]);

// Article 30, part 3: the institutions that get public money (the section «Які фінансові документи оприлюднити»).
const FUNDED = 'заклади, що отримують публічні кошти';
const FUNDED_TERM = 'протягом 10 робочих днів після затвердження чи змін';
const funded = (item, inTabula, panelKey, deadline = FUNDED_TERM) =>
	Object.freeze({ group: 'finansy', item, basis: 1, deadline, appliesTo: 'funded', applies: FUNDED, who: 'бухгалтерія', inTabula, panelKey });

export const FINANCE = Object.freeze([
	funded('Кошторис', 'section', 'koshtorys-i-finzvit'),
	funded('Фінансовий звіт про надходження й використання всіх отриманих коштів', 'section', 'koshtorys-i-finzvit'),
	funded(
		'Перелік товарів, робіт і послуг, отриманих як благодійна допомога, із зазначенням їхньої вартості',
		'section',
		'blahodiina-dopomoha',
		'радимо протягом 10 робочих днів після підписання акта',
	),
	funded('Відомості про кошти, отримані з інших джерел, не заборонених законодавством', 'section', 'blahodiina-dopomoha'),
]);

// The duties of other acts (the section «Що вимагають інші закони»): the spec names no one who prepares them.
const other = (item, basis, deadline, appliesTo, applies, inTabula, panelKey) =>
	Object.freeze({ group: 'inshi', item, basis, deadline, appliesTo, applies, who: null, inTabula, panelKey });

export const OTHER_LAWS = Object.freeze([
	other(
		'Меню на кожен день із позначенням алергенів',
		5,
		'щодня; на стенді, на сайті (якщо він є) або іншим способом',
		'some',
		'заклади, де харчуються діти',
		'section',
		null,
	),
	other(
		'План підвищення кваліфікації педагогічних працівників',
		6,
		'протягом 2 робочих днів після затвердження, але не пізніше 25 грудня',
		'all',
		'усі',
		'section',
		'pidvyshchennia-kvalifikatsii',
	),
	other(
		'Внутрішні акти про академічну доброчесність',
		3,
		'закон окремого строку не встановлює',
		'all',
		'заклади освіти',
		'section',
		'akademichna-dobrochesnist',
	),
	other(
		'Правила доступу й перебування на території та в приміщеннях',
		2,
		'як для документів за статтею 30',
		'school',
		'лише школи',
		'section',
		'pravyla-dostupu',
	),
]);

/** Every row of the printed list, grouped in the order of GROUPS. */
export function checklistGroups() {
	const rows = [...ARTICLE30, ...FINANCE, ...OTHER_LAWS];
	return GROUPS.map((group) => ({ ...group, rows: rows.filter((row) => row.group === group.key) }));
}
