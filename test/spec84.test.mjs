// Spec 84 (the group «Про сервіс»): the source numbers, the data of «Закон і сайт школи», the group's checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refParts, firstRefIds, refNumbers } from '../src/lib/refs.mjs';
import { ARTICLE30, FINANCE, OTHER_LAWS, GROUPS, checklistGroups, IN_TABULA_TEXT } from '../src/data/article30.mjs';
import { LAW_CHANGES } from '../src/data/lawChanges.mjs';
import { ACTS, PAGE_SOURCES, sourceList } from '../src/data/sources.mjs';
import { offer, checkedOnFor, SERVICE_SLUGS, responsibilities, nextDay, parseIsoDate } from '../src/config/offer.mjs';
import { SERVICE_PAGES, HEROES } from '../src/config/audience.mjs';
import { checkServicePage, checkRefs, outerLowQuotes, checkOwnSource, checkBuiltAsOf, checkOfferNumbers } from '../scripts/check-built.mjs';

test('refParts: [n] (with the space before it), article indexes, plain text', () => {
	assert.deepEqual(refParts('засновника [1].'), [{ text: 'засновника' }, { ref: 1 }, { text: '.' }]);
	assert.deepEqual(refParts('статтею 41¹ про'), [{ text: 'статтею 41' }, { sup: '1' }, { text: ' про' }]);
	assert.deepEqual(refParts('без посилань'), [{ text: 'без посилань' }]);
});

test('firstRefIds: the first link to each source gets ref-n, an existing one is kept', () => {
	const html = '<a href="#source-1">[1]</a><a href="#source-2">[2]</a><a href="#source-1">[1]</a>';
	assert.equal(
		firstRefIds(html),
		'<a href="#source-1" id="ref-1">[1]</a><a href="#source-2" id="ref-2">[2]</a><a href="#source-1">[1]</a>',
	);
	assert.equal(firstRefIds('<a href="#source-1" id="ref-1">x</a><a href="#source-1">y</a>'), '<a href="#source-1" id="ref-1">x</a><a href="#source-1">y</a>');
});

test('checkRefs: every [n] has its line and every line is cited', () => {
	const list = '<ol class="sources"><li id="source-1">a</li><li id="source-2">b</li></ol>';
	assert.deepEqual(checkRefs(`<a href="#source-1">[1]</a><a href="#source-2">[2]</a>${list}`), []);
	assert.equal(checkRefs(`<a href="#source-1">[1]</a>${list}`).length, 1);
	assert.equal(checkRefs(`<a href="#source-3">[3]</a><a href="#source-1">[1]</a><a href="#source-2">[2]</a>${list}`).length, 1);
	assert.deepEqual([...refNumbers(list).listed], [1, 2]);
});

test('outerLowQuotes: „ only inside «…»', () => {
	assert.equal(outerLowQuotes('Закон «Про освіту» і «книга „Кобзар“»'), 0);
	assert.equal(outerLowQuotes('Закон „Про освіту“'), 1);
});

test('checkServicePage: the words, names and links spec 84 keeps off the group', () => {
	const page = (body) => `<html><body><main>${body}</main></body></html>`;
	assert.deepEqual(checkServicePage(page('<p>Перевірено 10 листопада 2026 року.</p>')), []);
	for (const bad of ['Станом на 08.11.2026', 'на час пілоту', 'Джерело: закон', 'через Resend', 'Cloudflare', 'Telegram', 'Anthropic', 'ШІ-помічник']) {
		assert.equal(checkServicePage(page(`<p>${bad}</p>`)).length, 1, bad);
	}
	assert.equal(checkServicePage(page('<p>Закон „Про освіту“</p>')).length, 1);
	for (const host of ['legalaid.wiki', 'kodeksy.com.ua', 'telegraf.com.ua', 'jurliga.ligazakon.net', 'yur-gazeta.com']) {
		assert.equal(checkServicePage(page(`<a href="https://${host}/x">x</a>`)).length, 1, host);
	}
});

test('a page that names a law only to link «Закон і сайт школи» needs no «станом на» (spec 84 §8)', () => {
	assert.deepEqual(checkOwnSource('pro-proiekt', 'Стаття 30 Закону України «Про освіту». [«Закон і сайт школи»](../zakon-i-sait-shkoly/)'), []);
	assert.equal(checkOwnSource('pro-proiekt', 'Стаття 30 Закону України «Про освіту».').length, 1);
	assert.deepEqual(checkBuiltAsOf('x', 'Закон', '<a href="../zakon-i-sait-shkoly/">x</a>'), []);
	assert.equal(checkBuiltAsOf('x', 'Закон', '').length, 1);
});

test('the group has its own date «Перевірено …»', () => {
	assert.equal(offer.checkedAt.roles, offer.checkedOn);
	assert.ok(parseIsoDate(offer.checkedAt.service));
	for (const slug of SERVICE_SLUGS) assert.equal(checkedOnFor(slug), offer.checkedAt.service);
	assert.equal(checkedOnFor('dlia-dyrektora'), offer.checkedOn);
	assert.deepEqual(SERVICE_PAGES.map((p) => p.slug).sort(), [...SERVICE_SLUGS].sort());
	assert.deepEqual(checkOfferNumbers('Перевірено 10 листопада 2026 року.', offer, offer.checkedAt.service), []);
	assert.equal(checkOfferNumbers('Перевірено 10 листопада 2026 року.', offer, offer.checkedOn).length, 1);
	for (const key of ['robota', 'bezpeka', 'zakon', 'tsina']) assert.equal(HEROES[key].checkedAt, 'service', key);
});

test('the pilot goes on graceDays calendar days, until graceUntil (decision 15)', () => {
	let day = nextDay(offer.pilotUntil);
	for (let i = 1; i < offer.graceDays; i += 1) day = nextDay(day);
	assert.equal(day, offer.graceUntil);
});

test('responsibilities: both columns, plain texts, links relative to the root', () => {
	assert.ok(responsibilities.ours.length > 0 && responsibilities.school.length > 0);
	for (const item of [...responsibilities.ours, ...responsibilities.school]) {
		assert.equal(typeof item.text, 'string');
		if (item.link) assert.doesNotMatch(item.link.href, /^\//);
	}
});

test('article30: every row is complete and in a known group', () => {
	const keys = new Set(GROUPS.map((g) => g.key));
	const rows = [...ARTICLE30, ...FINANCE, ...OTHER_LAWS];
	for (const row of rows) {
		assert.ok(keys.has(row.group), row.item);
		assert.ok(row.item && row.applies && row.deadline, row.item);
		assert.ok(['all', 'school', 'funded', 'licensed', 'some'].includes(row.appliesTo), row.item);
		assert.ok(row.inTabula === null || row.inTabula in IN_TABULA_TEXT, row.item);
		assert.ok(Number.isInteger(row.basis) && row.basis >= 1 && row.basis <= PAGE_SOURCES['zakon-i-sait-shkoly'].length, row.item);
		assert.doesNotMatch(row.item, /['"]/, row.item);
	}
	assert.equal(ARTICLE30.length, 20);
	assert.equal(checklistGroups().reduce((n, g) => n + g.rows.length, 0), rows.length);
	// The old three documents about bullying were replaced by one положення (spec 84 §1, item 9).
	assert.ok(!rows.some((row) => /булінг/i.test(row.item)));
});

test('lawChanges: newest first, real dates, sources on the law page', () => {
	const dates = LAW_CHANGES.map((c) => c.date);
	assert.deepEqual([...dates].sort().reverse(), dates);
	for (const change of LAW_CHANGES) {
		assert.ok(parseIsoDate(change.date));
		assert.ok(change.text.includes(`[${change.source}]`), change.date);
	}
});

test('sources: only official sites; every page list resolves', () => {
	for (const [key, act] of Object.entries(ACTS)) {
		assert.match(act.url, /^https:\/\/(zakon\.rada\.gov\.ua|mon\.gov\.ua|www\.kmu\.gov\.ua|kmu\.gov\.ua|eo\.gov\.ua)\//, key);
	}
	for (const slug of Object.keys(PAGE_SOURCES)) {
		for (const item of sourceList(slug)) assert.ok(item.title.endsWith('.') && item.url, item.title);
	}
	assert.equal(sourceList('zakon-i-sait-shkoly').length, 16);
	assert.throws(() => sourceList('nope'));
});
