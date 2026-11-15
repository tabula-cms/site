import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGuideSidebar, INDEX_LABEL } from '../src/lib/guide-sidebar.mjs';
import { buildGuideStructure } from '../src/lib/guide-structure.mjs';

// A page as src/lib/guide-structure.mjs analyses it.
const page = (slug, order, extra = {}) => ({ slug, title: `Title ${slug}`, order, hosted: false, short: false, listed: [], clip: false, ...extra });
const short = (slug, order, extra = {}) => page(slug, order, { short: true, ...extra });
const slugs = (group) => group.items.map((i) => (i.items ? `[${i.label}]` : i.slug.replace(/^editor\/?/, '') || 'index'));

test('the old guide (no short articles): one open flat group in INDEX order, the index labelled', () => {
	const out = buildGuideSidebar(buildGuideStructure([page('index', 0), page('novyny', 2), page('storinky', 1), page('foto', 3)]));
	assert.equal(out.length, 1);
	assert.equal(out[0].label, 'Посібник редактора');
	assert.equal(out[0].collapsed, undefined);
	assert.deepEqual(slugs(out[0]), ['index', 'storinky', 'novyny', 'foto']);
	assert.equal(out[0].items[0].label, INDEX_LABEL);
});

const guide = () =>
	buildGuideStructure([
		page('index', 0, { listed: ['panel-ohliad', 'novyny-napysaty'] }),
		short('panel-ohliad', 1),
		page('pershi-kroky', 2, { listed: ['pochatok-vkhid'] }),
		short('pochatok-vkhid', 3),
		page('novyny', 10, { listed: ['novyny-kartka', 'novyny-napysaty', 'novyny-povtoryty'] }),
		short('novyny-napysaty', 11),
		short('novyny-kartka', 12),
		short('novyny-povtoryty', 13),
		page('bekapy', 20),
	]);

test('the landing first, then one open group per area; a topic with articles is a collapsed group, the long page first', () => {
	const out = buildGuideSidebar(guide());
	assert.deepEqual(out[0], { slug: 'editor', label: INDEX_LABEL });
	assert.deepEqual(out.slice(1).map((g) => g.label), ['Почати', 'Вміст сайту', 'Налаштування й службове', 'Користувачі й панель']);
	assert.ok(out.slice(1).every((g) => g.collapsed === undefined));
	const content = out.find((g) => g.label === 'Вміст сайту');
	const news = content.items[0];
	assert.equal(news.label, 'Новини');
	assert.equal(news.collapsed, true);
	// The articles in the order the long page lists them; the one README lists first stays README's.
	assert.deepEqual(slugs(news), ['novyny', 'novyny-kartka', 'novyny-povtoryty']);
});

test('a long page without articles is a plain link with its short label; README\'s articles are a group of their own', () => {
	const out = buildGuideSidebar(guide());
	assert.deepEqual(out.find((g) => g.label === 'Налаштування й службове').items, [{ slug: 'editor/bekapy', label: 'Резервні копії' }]);
	const panel = out.find((g) => g.label === 'Користувачі й панель').items[0];
	assert.equal(panel.label, 'Панель');
	assert.deepEqual(slugs(panel), ['panel-ohliad', 'novyny-napysaty']);
});

test('an article no long page lists closes the sidebar under «Інше»', () => {
	const pages = [page('index', 0), page('novyny', 1, { listed: ['novyny-a'] }), short('novyny-a', 2), short('zabute', 3)];
	const out = buildGuideSidebar(buildGuideStructure(pages));
	assert.equal(out.at(-1).label, 'Інше');
	assert.equal(out.at(-1).collapsed, true);
	assert.deepEqual(slugs(out.at(-1)), ['zabute']);
});

test('every page appears exactly once', () => {
	const out = buildGuideSidebar(guide());
	const all = [];
	const walk = (items) => items.forEach((i) => (i.items ? walk(i.items) : all.push(i.slug)));
	walk(out);
	assert.equal(all.length, 9);
	assert.equal(new Set(all).size, 9);
});
