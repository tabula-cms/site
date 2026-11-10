// Spec 84 §9: the sources the pages cite, with their full names and requisites, so one act has the same name on every
// page. Only official texts (spec 84 §3): zakon.rada.gov.ua for laws, resolutions and registered orders, eo.gov.ua
// for the education ombudsman. `ACTS` is the catalogue; `PAGE_SOURCES` the numbered list «Джерела» of each page, in
// the order of the spec (laws and resolutions first, then orders and letters). An entry is an act and the articles the
// page cites; `sourceList()` makes SourceList.astro's items of it.
//
// Every URL below was opened on 2026-11-10 and its title checked against the act's requisites, except where `search`
// is set: the official text was not found, so the link is zakon.rada.gov.ua's search by the act's number.

const RADA = 'https://zakon.rada.gov.ua/laws/show/';

export const ACTS = Object.freeze({
	osvita: { title: 'Закон України «Про освіту» від 05.09.2017 № 2145-VIII', url: `${RADA}2145-19` },
	pzso: { title: 'Закон України «Про повну загальну середню освіту» від 16.01.2020 № 463-IX', url: `${RADA}463-20` },
	dobrochesnist: { title: 'Закон України «Про академічну доброчесність» від 18.12.2025 № 4742-IX', url: `${RADA}4742-20` },
	nasylstvo: {
		title:
			'Закон України «Про внесення змін до деяких законів України щодо запобігання насильству та унеможливлення жорстокого поводження з дітьми» від 06.06.2024 № 3792-IX',
		url: `${RADA}3792-20`,
	},
	kharchuvannia: {
		title:
			'Постанова Кабінету Міністрів України від 24.03.2021 № 305 «Про затвердження норм та Порядку організації харчування у закладах освіти та дитячих закладах оздоровлення та відпочинку»',
		url: `${RADA}305-2021-%D0%BF`,
	},
	kvalifikatsiia: {
		title:
			'Постанова Кабінету Міністрів України від 21.08.2019 № 800 «Деякі питання підвищення кваліфікації педагогічних і науково-педагогічних працівників»',
		url: `${RADA}800-2019-%D0%BF`,
	},
	mova: {
		title: 'Закон України «Про забезпечення функціонування української мови як державної» від 25.04.2019 № 2704-VIII',
		url: `${RADA}2704-19`,
	},
	dostupnist: {
		title:
			'Постанова Кабінету Міністрів України від 21.07.2023 № 757 «Деякі питання доступності інформаційно-комунікаційних систем та документів в електронній формі»',
		url: `${RADA}757-2023-%D0%BF`,
	},
	publichniKoshty: {
		title: 'Закон України «Про відкритість використання публічних коштів» від 11.02.2015 № 183-VIII',
		url: `${RADA}183-19`,
	},
	tsyvilnyi: { title: 'Цивільний кодекс України від 16.01.2003 № 435-IV', url: `${RADA}435-15` },
	audyt: {
		title:
			'Наказ Міністерства освіти і науки України від 17.08.2026 № 1440, яким викладено в новій редакції Порядок проведення інституційного аудиту закладів загальної середньої освіти, затверджений наказом МОН від 09.01.2019 № 17',
		// The order of 17.08.2026 № 1440 as registered with the Ministry of Justice (z1207-26); the Порядок itself is
		// z0250-19.
		url: `${RADA}z1207-26`,
	},
	pravylaDostupu: {
		title:
			'Наказ Міністерства освіти і науки України від 11.02.2026 № 243 «Про затвердження Типових правил доступу і перебування учасників освітнього процесу та інших осіб на території та в приміщеннях закладів загальної середньої освіти»',
		url: `${RADA}z0436-26`,
	},
	lystUcoz: {
		title: 'Лист Міністерства освіти і науки України від 05.01.2024 № 1/228-24',
		// Not found on zakon.rada.gov.ua nor on mon.gov.ua: the search by its number.
		url: 'https://zakon.rada.gov.ua/laws/find/a?num=1%2F228-24',
		search: true,
	},
	kupap: { title: 'Кодекс України про адміністративні правопорушення від 07.12.1984 № 8073-X', url: `${RADA}80731-10` },
	personalniDani: { title: 'Закон України «Про захист персональних даних» від 01.06.2010 № 2297-VI', url: `${RADA}2297-17` },
	ombudsmanFoto: {
		title: 'Розʼяснення освітнього омбудсмена щодо фотографування дітей у закладах освіти, 1 травня 2025 року',
		url: 'https://eo.gov.ua/pravomirnist-fotohrafuvannia-videozyomky-ta-publikuvannia-zakladamy-osvity-svitlyn-i-video-z-ditmy/2025/05/01/',
	},
});

/** The «Джерела» of each page: `[act key, the articles cited (or null)]`, numbered from 1 in this order. */
export const PAGE_SOURCES = Object.freeze({
	'bezpeka-i-dani': [['personalniDani', 'статті 2, 4 (частини 4 і 5), 9 і 24']],
	'zakon-i-sait-shkoly': [
		['osvita', 'статті 26 і 30'],
		['pzso', 'стаття 41<sup>1</sup> (додана Законом України від 18.09.2025 № 4609-IX)'],
		['dobrochesnist', 'стаття 12, частина 5'],
		['nasylstvo', null],
		['kharchuvannia', 'пункти 34 і 49 Порядку'],
		['kvalifikatsiia', 'пункт 17 Порядку'],
		['mova', 'стаття 27'],
		['dostupnist', 'пункти 3 і 4'],
		['publichniKoshty', null],
		['tsyvilnyi', 'статті 307 і 308'],
		['audyt', null],
		['pravylaDostupu', null],
		['lystUcoz', null],
		['kupap', 'стаття 212<sup>3</sup>'],
		['personalniDani', 'статті 2 і 11'],
		['ombudsmanFoto', null],
	],
});

/** SourceList.astro's items for a page: `{ title, url }`, the title in HTML (an index is `<sup>`). */
export function sourceList(slug) {
	const list = PAGE_SOURCES[slug];
	if (!list) throw new Error(`sources: no list for "${slug}"`);
	return list.map(([key, part]) => {
		const act = ACTS[key];
		if (!act) throw new Error(`sources: no act "${key}"`);
		return { title: part ? `${act.title}, ${part}.` : `${act.title}.`, url: act.url, search: Boolean(act.search) };
	});
}
