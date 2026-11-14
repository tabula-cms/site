import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGuideSidebar, INDEX_LABEL } from '../src/lib/guide-sidebar.mjs';

const pages = (...slugs) => slugs.map((slug, order) => ({ slug, title: `Title ${slug}`, order }));
const slugs = (group) => group.items.map((i) => i.slug.replace(/^editor\/?/, '') || 'index');

test('the old guide (no how-tos): one open flat group in INDEX order, the index labelled', () => {
	const out = buildGuideSidebar(pages('index', 'storinky', 'novyny', 'foto'));
	assert.equal(out.length, 1);
	assert.equal(out[0].label, 'Посібник редактора');
	assert.equal(out[0].collapsed, undefined);
	assert.deepEqual(slugs(out[0]), ['index', 'storinky', 'novyny', 'foto']);
	assert.equal(out[0].items[0].label, INDEX_LABEL);
});

test('how-tos group under their topic page, collapsed, the topic page first', () => {
	const out = buildGuideSidebar(pages('index', 'pershi-kroky', 'novyny-napysaty', 'novyny', 'novyny-kartka'));
	assert.deepEqual(out.map((g) => g.label), ['Початок', 'Новини']);
	assert.equal(out[0].collapsed, undefined);
	assert.deepEqual(slugs(out[0]), ['index', 'pershi-kroky']);
	assert.equal(out[1].collapsed, true);
	assert.deepEqual(slugs(out[1]), ['novyny', 'novyny-napysaty', 'novyny-kartka']);
});

test('prefixes whose topic page has another name', () => {
	const out = buildGuideSidebar(
		pages('index', 'pershi-kroky', 'kolektyv', 'liudy-dodaty', 'kharchuvannia', 'kharchuvannia-kartky-dodaty', 'tekhnolohichni-kartky', 'holovna-baner', 'holovna-bloky'),
	);
	const by = Object.fromEntries(out.map((g) => [g.label, slugs(g)]));
	assert.deepEqual(by['Люди на сторінках'], ['kolektyv', 'liudy-dodaty']);
	assert.deepEqual(by['Харчування'], ['kharchuvannia', 'kharchuvannia-kartky-dodaty', 'tekhnolohichni-kartky']);
	assert.deepEqual(by['Головна сторінка'], ['holovna-baner', 'holovna-bloky']);
});

test('a topic page alone is no group: it goes to «Інше», after the groups', () => {
	const out = buildGuideSidebar(pages('index', 'pershi-kroky', 'bekapy', 'menu', 'menu-dodaty'));
	assert.deepEqual(out.map((g) => g.label), ['Початок', 'Меню сайту', 'Інше']);
	assert.deepEqual(slugs(out[2]), ['bekapy']);
});

test('an unknown prefix with a topic page and two pages becomes a group labelled by the topic title', () => {
	const input = [...pages('index', 'pershi-kroky', 'novyny', 'novyny-kartka'), { slug: 'newtopic', title: 'Нова тема', order: 10 }, { slug: 'newtopic-a', title: 'A', order: 11 }];
	const out = buildGuideSidebar(input);
	const group = out.find((g) => g.label === 'Нова тема');
	assert.deepEqual(slugs(group), ['newtopic', 'newtopic-a']);
});

test('an unknown prefix without a topic page goes to «Інше» with a warning', () => {
	const warnings = [];
	const out = buildGuideSidebar(pages('index', 'pershi-kroky', 'novyny', 'novyny-kartka', 'mystery-a', 'mystery-b'), { warn: (m) => warnings.push(m) });
	assert.deepEqual(slugs(out.at(-1)), ['mystery-a', 'mystery-b']);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0], /mystery/);
});

test('the start group takes the pochatok-* pages; groups are ordered by their first page', () => {
	const out = buildGuideSidebar(pages('index', 'pochatok-zaklad', 'pershi-kroky', 'podii', 'podii-dodaty', 'menu', 'menu-dodaty'));
	assert.deepEqual(slugs(out[0]), ['index', 'pochatok-zaklad', 'pershi-kroky']);
	assert.deepEqual(out.map((g) => g.label).slice(1), ['Події', 'Меню сайту']);
});

test('every page appears exactly once', () => {
	const input = pages('index', 'pershi-kroky', 'novyny', 'novyny-a', 'foto', 'foto-a', 'bekapy', 'zapysy', 'khostynh', 'pidpys-kep', 'dokumenty', 'dokumenty-a');
	const out = buildGuideSidebar(input);
	const all = out.flatMap((g) => (g.items ? slugs(g) : [g.slug]));
	assert.equal(all.length, input.length);
	assert.equal(new Set(all).size, input.length);
});
