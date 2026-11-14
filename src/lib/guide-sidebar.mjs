// The sidebar of the school guide (the imported docs/editor/), grouped by topic. Pure: pages in, Starlight
// sidebar items out, so test/guide-sidebar.test.mjs can run it on fixtures; astro.config.mjs reads the
// imported files and calls it (`readGuidePages` + `buildGuideSidebar`).
//
// The guide has long topic pages (`novyny.md`) and, beside them, short how-to articles that share a file-name
// prefix (`novyny-napysaty.md`, `novyny-kartka.md` …). A flat list of ninety links cannot be searched by eye, so
// each topic becomes one collapsed group: the topic page first, then its how-tos in `sidebar.order` (the order of
// docs/INDEX.md). Starlight opens the group that holds the current page.
//
// The live site imports the CMS's `main`, whose guide may be older or newer than any checkout: the groups
// below are matched against the files that really exist, a group that finds fewer than two of its pages is
// not made, and what no group claims goes to «Інше». With the old guide (no how-tos at all) nothing groups
// and the result is the single open group «Посібник редактора», a flat list in INDEX order, as before.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** The guide's own front matter: the index first, then the pages a newcomer reads in order. */
const START = {
	label: 'Початок',
	// `slug` is a file name without `.md` (`index` is README.md).
	pages: ['index', 'pershi-kroky', 'yak-vlashtovana', 'maister', 'yak-pysaty'],
	prefixes: ['pochatok'],
};

/** What the index (README.md) is called in the sidebar and in the pagination. */
export const INDEX_LABEL = 'Зміст посібника';

/**
 * The topics, in no particular order (groups are sorted by where their first page stands in INDEX.md).
 * `topic`: the topic page, shown first in its group under its own title. `prefixes`: file-name prefixes
 * (`novyny` matches `novyny-*.md`). `include`: further pages that belong to the group whatever their name.
 * `label`: the group's name, short (a page title is often a sentence).
 *
 * Prefixes whose topic page has another name, and prefixes of sections still on the CMS's guide branches
 * (`panel`, `profil`, `kopii`, `adresy`, `sait`, `zakon`, `sluzhbove`, `pochatok` …), are here so that when
 * those sections reach `main` they land in the right group with no change in this repository.
 */
export const TOPICS = [
	{ label: 'Сторінки', topic: 'storinky', prefixes: ['storinky'] },
	{ label: 'Текст сторінки', prefixes: ['redaktor'] },
	{ label: 'Головна сторінка', prefixes: ['holovna'] },
	{ label: 'Меню сайту', topic: 'menu', prefixes: ['menu'] },
	{ label: 'Старі адреси', topic: 'perenapravlennia', prefixes: ['adresy'] },
	{ label: 'Пошук і Google', topic: 'poshuk-i-seo', prefixes: ['sait'] },
	{ label: 'Новини', topic: 'novyny', prefixes: ['novyny'] },
	{ label: 'Події', topic: 'podii', prefixes: ['podii'] },
	{ label: 'Автори', topic: 'avtory', prefixes: ['avtory'] },
	{ label: 'Документи', topic: 'dokumenty', prefixes: ['dokumenty'], include: ['pidpys-kep'] },
	{ label: 'Інформація за законом', topic: 'prozorist', prefixes: ['zakon'] },
	{ label: 'Записи на сторінці', topic: 'zapysy', prefixes: ['zapysy'] },
	{ label: 'Фото й альбоми', topic: 'foto', prefixes: ['foto'] },
	{ label: 'Харчування', topic: 'kharchuvannia', prefixes: ['kharchuvannia'], include: ['tekhnolohichni-kartky'] },
	{ label: 'Люди на сторінках', topic: 'kolektyv', prefixes: ['liudy'] },
	{ label: 'Користувачі й профіль', topic: 'korystuvachi', prefixes: ['korystuvachi', 'profil'] },
	{ label: 'Панель', prefixes: ['panel'] },
	{ label: 'Помічник', topic: 'pomichnyk', prefixes: ['pomichnyk'] },
	{ label: 'Налаштування', topic: 'nalashtuvannia', prefixes: ['nalashtuvannia'], include: ['poshta-nalashtuvaty'] },
	{ label: 'Резервні копії', topic: 'bekapy', prefixes: ['kopii'] },
	{ label: 'Імпорт', topic: 'import', prefixes: ['import'] },
	{ label: 'Експорт', topic: 'eksport', prefixes: ['eksport'], include: ['arkhiv-saitu'] },
	{ label: 'Перевірка посилань', topic: 'perevirka-posylan', prefixes: ['posylannia'] },
	{ label: 'Службове', prefixes: ['sluzhbove'] },
];

/** @typedef {{ slug: string, title: string, order: number }} GuidePage */

const byOrder = (a, b) => a.order - b.order || a.slug.localeCompare(b.slug);

const item = (page) => {
	const entry = { slug: page.slug === 'index' ? 'editor' : `editor/${page.slug}` };
	if (page.slug === 'index') entry.label = INDEX_LABEL;
	return entry;
};

const firstSegment = (slug) => slug.split('-')[0];

/**
 * The sidebar items of the guide.
 * @param {GuidePage[]} pages every imported page of docs/editor/ (slug `index` for README.md)
 * @param {{ warn?: (message: string) => void }} [options] called for a prefix with several pages and no group of its own
 * @returns {object[]} Starlight sidebar items (a flat «Посібник редактора» group when nothing groups)
 */
export function buildGuideSidebar(pages, { warn = () => {} } = {}) {
	const sorted = [...pages].sort(byOrder);
	const claimed = new Set();
	const bySlug = new Map(sorted.map((page) => [page.slug, page]));

	/** @type {{ label: string, pages: GuidePage[], first: number }[]} */
	const groups = [];

	for (const topic of TOPICS) {
		const members = sorted.filter(
			(page) =>
				!claimed.has(page.slug) &&
				(page.slug === topic.topic ||
					topic.include?.includes(page.slug) ||
					topic.prefixes.some((prefix) => page.slug.startsWith(`${prefix}-`))),
		);
		// A topic page alone is not a group, and neither is one how-to with no page above it: the pair is the minimum.
		if (members.length < 2) continue;
		for (const page of members) claimed.add(page.slug);
		// The topic page leads its group whatever its order; the group stands where its earliest page stands.
		const lead = members.filter((page) => page.slug === topic.topic);
		groups.push({
			label: topic.label,
			pages: [...lead, ...members.filter((page) => page.slug !== topic.topic)],
			first: members[0].order,
		});
	}

	// A prefix no entry above knows: two or more pages and a topic page named after it make a group labelled by
	// that page's title. Without a topic page it cannot be labelled, so it goes to «Інше» (and the build says so).
	const inStart = (page) => START.pages.includes(page.slug) || START.prefixes.some((prefix) => page.slug.startsWith(`${prefix}-`));
	const unclaimed = sorted.filter((page) => !claimed.has(page.slug) && !inStart(page));
	const prefixes = new Map();
	for (const page of unclaimed) {
		const prefix = firstSegment(page.slug);
		if (!prefixes.has(prefix)) prefixes.set(prefix, []);
		prefixes.get(prefix).push(page);
	}
	for (const [prefix, members] of prefixes) {
		const topicPage = bySlug.get(prefix);
		const grouped = members.filter((page) => page.slug === prefix || page.slug.startsWith(`${prefix}-`));
		if (grouped.length < 2) continue;
		if (!topicPage || !grouped.includes(topicPage)) {
			warn(`guide sidebar: prefix "${prefix}" has ${grouped.length} pages but no topic page and no entry in TOPICS; they go to «Інше»`);
			continue;
		}
		for (const page of grouped) claimed.add(page.slug);
		groups.push({ label: topicPage.title, pages: grouped, first: grouped[0].order });
	}

	// Nothing grouped: the old guide, a flat list in INDEX order under one open group, as the sidebar was before.
	if (groups.length === 0) {
		return [{ label: 'Посібник редактора', items: sorted.map(item) }];
	}

	const start = sorted.filter((page) => !claimed.has(page.slug) && inStart(page));
	for (const page of start) claimed.add(page.slug);
	const rest = sorted.filter((page) => !claimed.has(page.slug));

	const result = [];
	if (start.length === 1) {
		result.push(item(start[0]));
	} else if (start.length > 1) {
		result.push({ label: START.label, items: start.map(item) });
	}
	for (const group of groups.sort((a, b) => a.first - b.first)) {
		result.push({ label: group.label, collapsed: true, items: group.pages.map(item) });
	}
	if (rest.length > 0) result.push({ label: 'Інше', collapsed: true, items: rest.map(item) });
	return result;
}

/**
 * Reads the imported pages of `docs/editor/` (`src/content/docs/editor/`): slug, title and `sidebar.order`
 * from the front matter written by scripts/fetch-docs.mjs (a JSON string for `title`, a bare number for `order`).
 * @param {string} dir
 * @returns {GuidePage[]}
 */
export function readGuidePages(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((name) => name.endsWith('.md'))
		.map((name) => {
			const text = readFileSync(path.join(dir, name), 'utf8');
			const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
			const rawTitle = /^title:\s*(.+)$/m.exec(front)?.[1];
			let title = name;
			try {
				if (rawTitle) title = JSON.parse(rawTitle);
			} catch {
				title = rawTitle ?? name;
			}
			const order = Number(/^\s+order:\s*(\d+)/m.exec(front)?.[1] ?? Number.MAX_SAFE_INTEGER);
			return { slug: name.replace(/\.md$/, ''), title, order };
		});
}
