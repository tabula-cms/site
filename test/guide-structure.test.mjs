import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyseGuidePage, articlesCount, AREAS, buildGuideStructure, guideHref, readFrontMatter, TOPIC_LABELS } from '../src/lib/guide-structure.mjs';

const front = (title, order, hosted = false) => `---\ntitle: ${JSON.stringify(title)}\nsidebar:\n  order: ${order}\neditUrl: "x"\n${hosted ? 'hosted: true\n' : ''}---\n\n`;
const LONG = `${front('Новини й публікації', 41)}**Де знайти:** меню.\n\nКороткі статті на одне завдання:\n\n- [Як написати](../novyny-napysaty/)\n- [Картка](../novyny-kartka/)\n- [Розділ](../storinky/#розділ)\n\n## Навіщо\n\nТекст [ще](../novyny-zvit/).\n`;
const SHORT = `${front('Як написати', 42)}*Може адміністратор.*\n\n**Де знайти:** меню.\n\n<figure class="guide-clip"><video></video></figure>\n\n1. Відкрийте.\n2. Натисніть.\n\n## Що побачить відвідувач\n\nНовину.\n\n## Докладніше\n\n[Новини](../novyny/#як)\n`;

test('readFrontMatter: the title, the order, hosted', () => {
	assert.deepEqual(readFrontMatter(front('А: «б»', 7, true)), { title: 'А: «б»', order: 7, hosted: true });
	assert.equal(readFrontMatter(front('А', 7)).hosted, false);
});

test('analyseGuidePage: a long page lists the pages its lead links with no anchor; a short article has steps and «Докладніше»', () => {
	const long = analyseGuidePage('novyny', LONG);
	assert.equal(long.short, false);
	assert.deepEqual(long.listed, ['novyny-napysaty', 'novyny-kartka']);
	const article = analyseGuidePage('novyny-napysaty', SHORT);
	assert.equal(article.short, true);
	assert.equal(article.clip, true);
	assert.equal(article.title, 'Як написати');
	// Steps without «Докладніше», or «Докладніше» without steps in the lead: a long page (the CMS's rule).
	assert.equal(analyseGuidePage('x', SHORT.replace('## Докладніше', '## Інше')).short, false);
	assert.equal(analyseGuidePage('x', `${front('X', 1)}Текст.\n\n## Кроки\n\n1. Один.\n\n## Докладніше\n\nТак.\n`).short, false);
});

test('analyseGuidePage: the index links without ../; a heading inside a fence does not end the lead', () => {
	const index = analyseGuidePage('index', `${front('Посібник', 0)}- [Огляд](panel-ohliad/)\n- [Чужа](../x/)\n\n## Найчастіше\n\n- [Новина](novyny-napysaty/)\n`);
	assert.deepEqual(index.listed, ['panel-ohliad']);
	const fenced = analyseGuidePage('x', `${front('X', 1)}\`\`\`\n## не заголовок\n\`\`\`\n\n- [A](../a/)\n\n## Так\n`);
	assert.deepEqual(fenced.listed, ['a']);
});

const page = (slug, order, extra = {}) => ({ slug, title: `Title ${slug}`, order, hosted: false, short: false, listed: [], clip: false, ...extra });

test('an article belongs to the first long page in file-name order (README.md first) that lists it', () => {
	const g = buildGuideStructure([
		page('index', 0, { listed: ['panel-a'] }),
		page('maister', 5, { listed: ['pochatok-a'] }),
		page('pershi-kroky', 2, { listed: ['pochatok-a', 'pochatok-b', 'panel-a'] }),
		page('panel-a', 1, { short: true }),
		page('pochatok-a', 3, { short: true }),
		page('pochatok-b', 4, { short: true }),
	]);
	assert.deepEqual(g.parentOf, { 'panel-a': 'index', 'pochatok-a': 'maister', 'pochatok-b': 'pershi-kroky' });
	assert.deepEqual(g.topics['pershi-kroky'].articles, ['pochatok-b']);
	assert.equal(g.topics.maister.label, TOPIC_LABELS.maister);
});

test('an article no long page lists is an orphan, with a warning that names it', () => {
	const warnings = [];
	const g = buildGuideSidebarless([page('index', 0), page('novyny', 1, { listed: ['novyny-a'] }), page('novyny-a', 2, { short: true }), page('zabute', 3, { short: true })], warnings);
	assert.deepEqual(g.orphans, ['zabute']);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /zabute\.md/);
});

test('a long page no area names goes to the last area, with a warning; a label falls back to the title', () => {
	const warnings = [];
	const g = buildGuideSidebarless([page('index', 0), page('nova', 9), page('novyny', 1, { listed: ['novyny-a'] }), page('novyny-a', 2, { short: true })], warnings);
	assert.equal(g.topics.nova.label, 'Title nova');
	assert.equal(g.areas.at(-1).label, AREAS.at(-1).label);
	assert.deepEqual(g.areas.at(-1).topics, ['nova']);
	assert.match(warnings[0], /nova\.md/);
});

test('the current guide\'s areas name each topic once', () => {
	const all = AREAS.flatMap((area) => area.topics);
	assert.equal(new Set(all).size, all.length);
	for (const slug of all) assert.ok(TOPIC_LABELS[slug], `a label for ${slug}`);
});

test('without short articles: hasArticles false, nothing grouped', () => {
	const g = buildGuideStructure([page('index', 0), page('novyny', 1, { listed: ['foto'] }), page('foto', 2)]);
	assert.equal(g.hasArticles, false);
	assert.deepEqual(g.areas, []);
	assert.deepEqual(g.order, ['index', 'novyny', 'foto']);
});

test('articlesCount and guideHref', () => {
	assert.deepEqual([1, 3, 5, 11, 12, 21, 22, 25].map(articlesCount), ['1 стаття', '3 статті', '5 статей', '11 статей', '12 статей', '21 стаття', '22 статті', '25 статей'].map((s) => s.replace(' ', ' ')));
	assert.equal(guideHref('foto-albom', 'foto'), '../foto/');
	assert.equal(guideHref('panel-a', 'index'), '../');
	assert.equal(guideHref('index', 'foto', '#x'), 'foto/#x');
	assert.equal(guideHref('foto', 'foto'), './');
});

function buildGuideSidebarless(pages, warnings) {
	return buildGuideStructure(pages, { warn: (message) => warnings.push(message) });
}
