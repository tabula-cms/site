// The structure of the school guide (the imported docs/editor/): which pages are short how-to articles, which long
// page each belongs to, and how the long pages (the topics) are arranged under a few areas. Pure: the imported
// files' text in, a plain JSON-able object out, so test/guide-structure.test.mjs runs it on fixtures. astro.config.mjs
// reads the files once (`readGuideFiles`), builds the structure once (`buildGuideStructure`) and hands it to the
// sidebar (src/lib/guide-sidebar.mjs), to the Markdown plugin (src/lib/guide-markdown.mjs) and, as the virtual module
// `virtual:tabula/guide`, to the components (src/components/PageTitle.astro).
//
// The rule is the CMS's own (tabula's scripts/guide-index.js): a page is a SHORT ARTICLE when its lead (what comes
// before its first `##`/`###`) holds a numbered list and it has a `## Докладніше` section; every other page is a LONG
// PAGE. A short article belongs to the first long page, in file-name order (README.md first), that links it with no
// anchor anywhere in its lead. The guide says where an article belongs; this repository only says how a topic is
// labelled and in which area it stands (`TOPIC_LABELS`, `AREAS`: presentation).
//
// The live site imports the CMS's `main`, whose guide may be older: with no short article at all `hasArticles` is
// false and every consumer falls back to the old, flat behaviour.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** What the index (README.md, the guide's landing) is called in the sidebar and in the pagination. */
export const INDEX_LABEL = 'Зміст посібника';

/** Short labels of the long pages (a title is often a sentence). A long page without one is labelled by its title. */
export const TOPIC_LABELS = {
	index: 'Панель',
	'pershi-kroky': 'Перші кроки',
	'yak-vlashtovana': 'Як влаштована панель',
	maister: 'Майстер налаштування',
	'yak-pysaty': 'Як писати',
	storinky: 'Сторінки',
	menu: 'Меню сайту',
	novyny: 'Новини',
	podii: 'Події',
	avtory: 'Автори',
	foto: 'Фото й альбоми',
	kolektyv: 'Люди',
	zapysy: 'Записи на сторінці',
	dokumenty: 'Документи',
	'pidpys-kep': 'Підпис КЕП',
	prozorist: 'Інформація за законом',
	kharchuvannia: 'Харчування',
	'tekhnolohichni-kartky': 'Технологічні картки',
	nalashtuvannia: 'Налаштування',
	perenapravlennia: 'Старі адреси',
	'poshuk-i-seo': 'Пошук і Google',
	'perevirka-posylan': 'Перевірка посилань',
	bekapy: 'Резервні копії',
	import: 'Імпорт',
	eksport: 'Експорт',
	'arkhiv-saitu': 'Архів сайту',
	korystuvachi: 'Користувачі й профіль',
	'media-i-koshyk': 'Файли, кошик і журнал',
	khostynh: 'Хостинг Tabula',
	pomichnyk: 'Помічник',
	'pomichnyk-i-dani': 'Помічник і дані',
};

/**
 * The areas of the sidebar and of the landing, in order; `topics` are long pages (file names without `.md`, `index`
 * is README.md, whose lead lists the panel's own articles). A long page no area names goes to the last area, with a
 * warning; a slug here that the imported guide does not have is skipped.
 */
export const AREAS = [
	{ id: 'pochaty', label: 'Почати', topics: ['pershi-kroky', 'yak-vlashtovana', 'maister', 'yak-pysaty'] },
	{
		id: 'vmist',
		label: 'Вміст сайту',
		topics: ['storinky', 'menu', 'novyny', 'podii', 'avtory', 'foto', 'kolektyv', 'zapysy'],
	},
	{ id: 'dokumenty', label: 'Документи й закон', topics: ['dokumenty', 'pidpys-kep', 'prozorist'] },
	{ id: 'kharchuvannia', label: 'Харчування', topics: ['kharchuvannia', 'tekhnolohichni-kartky'] },
	{
		id: 'nalashtuvannia',
		label: 'Налаштування й службове',
		topics: ['nalashtuvannia', 'perenapravlennia', 'poshuk-i-seo', 'perevirka-posylan', 'bekapy', 'import', 'eksport', 'arkhiv-saitu'],
	},
	{ id: 'korystuvachi', label: 'Користувачі й панель', topics: ['korystuvachi', 'index', 'media-i-koshyk'] },
	{ id: 'khostynh', label: 'Сайт на хостингу Tabula', topics: ['khostynh', 'pomichnyk', 'pomichnyk-i-dani'] },
];

/** The label of the group of articles no long page lists. */
export const OTHER_LABEL = 'Інше';

/** «1 стаття», «3 статті», «12 статей». */
export function articlesCount(n) {
	const mod10 = n % 10;
	const mod100 = n % 100;
	const word = mod10 === 1 && mod100 !== 11 ? 'стаття' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'статті' : 'статей';
	return `${n} ${word}`;
}

/** The front matter fields the import writes (title as a JSON string, `sidebar.order`, `hosted: true`). */
export function readFrontMatter(text) {
	const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
	const rawTitle = /^title:\s*(.+)$/m.exec(front)?.[1];
	let title = null;
	if (rawTitle) {
		try {
			title = JSON.parse(rawTitle);
		} catch {
			title = rawTitle;
		}
	}
	const order = Number(/^\s+order:\s*(\d+)/m.exec(front)?.[1] ?? Number.MAX_SAFE_INTEGER);
	const hosted = /^hosted:\s*true\s*$/m.test(front);
	return { title, order, hosted };
}

/**
 * One imported page: whether it is a short article, the pages its lead links (no anchor), whether it shows a clip.
 * Links are read in the form the import writes them: `](../<slug>/)` from a page, `](<slug>/)` from the index.
 * @param {string} slug the file name without `.md` (`index` for README.md)
 * @param {string} text the imported file (front matter and body)
 */
export function analyseGuidePage(slug, text) {
	const { title, order, hosted } = readFrontMatter(text);
	const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
	const lead = [];
	const headings = [];
	let fenced = false;
	let inLead = true;
	for (const line of body.split('\n')) {
		if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
		const heading = !fenced && /^(#{2,3})[ \t]+(.+?)[ \t]*$/.exec(line);
		if (heading) {
			inLead = false;
			headings.push({ level: heading[1].length, text: heading[2].replace(/<!--[\s\S]*?-->/g, '').trim() });
		} else if (inLead) {
			lead.push(fenced ? '' : line);
		}
	}
	const leadText = lead.join('\n');
	const hasSteps = /(^|\n)[ \t]{0,3}1\.[ \t]/.test(leadText);
	const short = hasSteps && headings.some((h) => h.level === 2 && h.text === 'Докладніше');
	const linkRe = slug === 'index' ? /\]\(([a-z0-9]+(?:-[a-z0-9]+)*)\/\)/g : /\]\(\.\.\/([a-z0-9]+(?:-[a-z0-9]+)*)\/\)/g;
	const listed = [...new Set([...leadText.matchAll(linkRe)].map((m) => m[1]))];
	const clip = /<figure class="guide-clip">/.test(body);
	return { slug, title: title ?? slug, order, hosted, short, listed, clip };
}

/**
 * The guide's structure.
 * @param {ReturnType<typeof analyseGuidePage>[]} pages every imported page of docs/editor/
 * @param {{ warn?: (message: string) => void }} [options]
 */
export function buildGuideStructure(pages, { warn = () => {} } = {}) {
	const bySlug = Object.fromEntries(pages.map((page) => [page.slug, page]));
	const sortedByOrder = [...pages].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
	const hasArticles = pages.some((page) => page.short);
	const meta = Object.fromEntries(
		pages.map((page) => [page.slug, { slug: page.slug, title: page.title, order: page.order, hosted: page.hosted, clip: page.clip, short: page.short }]),
	);
	if (!hasArticles) {
		return { hasArticles: false, pages: meta, order: sortedByOrder.map((p) => p.slug), topics: {}, parentOf: {}, areas: [], orphans: [] };
	}

	// The CMS's order: file names sorted as strings, so README.md (here `index`) comes before every lower-case name.
	const fileName = (slug) => (slug === 'index' ? 'README.md' : `${slug}.md`);
	const longPages = pages.filter((page) => !page.short).sort((a, b) => (fileName(a.slug) < fileName(b.slug) ? -1 : 1));
	const parentOf = {};
	const topics = {};
	for (const long of longPages) {
		const articles = long.listed.filter((slug) => bySlug[slug]?.short && !(slug in parentOf));
		for (const slug of articles) parentOf[slug] = long.slug;
		topics[long.slug] = { slug: long.slug, label: TOPIC_LABELS[long.slug] ?? long.title, title: long.title, articles, area: null };
	}

	const orphans = sortedByOrder.filter((page) => page.short && !(page.slug in parentOf)).map((page) => page.slug);
	for (const slug of orphans) warn(`guide: ${fileName(slug)} is a short article that no long page lists above its first ##; it is shown under «${OTHER_LABEL}»`);

	const areas = AREAS.map((area) => ({ id: area.id, label: area.label, topics: [] }));
	const placed = new Set();
	AREAS.forEach((area, i) => {
		for (const slug of area.topics) {
			const topic = topics[slug];
			// README is a topic only through the articles its lead lists; without them it is just the landing.
			if (!topic || placed.has(slug) || (slug === 'index' && topic.articles.length === 0)) continue;
			placed.add(slug);
			topic.area = area.id;
			areas[i].topics.push(slug);
		}
	});
	const last = areas[areas.length - 1];
	for (const long of [...longPages].sort((a, b) => a.order - b.order)) {
		if (placed.has(long.slug) || (long.slug === 'index' && topics.index.articles.length === 0)) continue;
		warn(`guide: the long page ${fileName(long.slug)} is in no area of src/lib/guide-structure.mjs AREAS; it is shown under «${last.label}»`);
		topics[long.slug].area = last.id;
		last.topics.push(long.slug);
	}

	return {
		hasArticles: true,
		pages: meta,
		order: sortedByOrder.map((p) => p.slug),
		topics,
		parentOf,
		areas: areas.filter((area) => area.topics.length > 0),
		orphans,
	};
}

/** The imported files of `dir` (src/content/docs/editor/), analysed. Missing folder: none. */
export function readGuideFiles(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((name) => name.endsWith('.md'))
		.map((name) => analyseGuidePage(name.replace(/\.md$/, ''), readFileSync(path.join(dir, name), 'utf8')));
}

/** The site URL path of a guide page, without `base` (`/editor/`, `/editor/novyny/`). */
export function guideUrl(slug) {
	return slug === 'index' ? '/editor/' : `/editor/${slug}/`;
}

/** The href from one guide page to another, relative (the site's link convention: any `base` works). */
export function guideHref(fromSlug, toSlug, anchor = '') {
	if (fromSlug === toSlug) return `./${anchor}`;
	if (fromSlug === 'index') return `${toSlug}/${anchor}`;
	return `${toSlug === 'index' ? '../' : `../${toSlug}/`}${anchor}`;
}
