import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	findForbidden,
	checkOwnSource,
	checkAsOfDate,
	checkBuiltAsOf,
	checkOperatorLine,
	checkScripts,
	checkHeader,
	extractMain,
	expectedHeader,
	TURNSTILE_SRC,
} from '../scripts/check-built.mjs';

function headerHtml(base, { dropLink, swapButton } = {}) {
	const { links, button } = expectedHeader(base);
	const a = ([text, href]) => `<a href="${href}">${text}</a>`;
	const shown = dropLink ? links.filter(([text]) => text !== dropLink) : links;
	const btn = swapButton ? [button[0], `${base}/wrong/`] : button;
	return `<nav aria-label="Основна навігація"><div class="tabula-nav">${shown.map(a).join('')}${a(btn)}</div>
<details><summary>Меню</summary><div>${a(btn)}${shown.map(a).join('')}</div></details></nav>`;
}

test('findForbidden: each phrase of decision 8, case-insensitively', () => {
	assert.deepEqual(findForbidden('Ми гарантуємо відповідність закону.'), ['гарантуємо відповідність']);
	assert.deepEqual(findForbidden('Це ВІДПОВІДАЄ ЗАКОНУ.'), ['відповідає закону']);
	assert.deepEqual(findForbidden('Оплата за рік наперед.'), ['оплата за рік наперед']);
	assert.deepEqual(findForbidden('Звичайний текст про сайт школи.'), []);
});

test('findForbidden: uCoz only where allowed', () => {
	assert.deepEqual(findForbidden('сайти на uCoz'), ['uCoz']);
	assert.deepEqual(findForbidden('сайти на uCoz', { allowUcoz: true }), []);
});

test('checkOwnSource: a law page needs «станом на»', () => {
	assert.deepEqual(checkOwnSource('x', 'Закон каже. Станом на 08.11.2026.'), []);
	assert.equal(checkOwnSource('x', 'Закон каже.').length, 1);
	assert.equal(checkOwnSource('x', 'постанова № 1').length, 1);
	assert.deepEqual(checkOwnSource('x', 'Про сайт.'), []);
});

test('checkOwnSource: the exempt page and the uCoz page', () => {
	assert.deepEqual(checkOwnSource('pro-proiekt', 'Закон каже.'), []);
	assert.deepEqual(checkOwnSource('zakon-i-sait-shkoly', 'станом на 1. Закон. uCoz'), []);
	assert.equal(checkOwnSource('other', 'станом на 1. Закон. uCoz').length, 1);
});

test('checkOwnSource: apostrophes', () => {
	assert.equal(checkOwnSource('x', "звʼязок і з'єднання").length, 1);
	assert.equal(checkOwnSource('x', 'з’єднання').length, 1);
	assert.deepEqual(checkOwnSource('x', 'зʼєднання, don\'t'), []);
});

test('checkAsOfDate: every «станом на» must carry the asOf date', () => {
	assert.deepEqual(checkAsOfDate('Станом на 08.11.2026.', '08.11.2026'), []);
	assert.equal(checkAsOfDate('Станом на 01.01.2020.', '08.11.2026').length, 1);
	assert.deepEqual(checkAsOfDate('без дати', '08.11.2026'), []);
	// one fresh and one stale occurrence on the same page: the stale one fails
	assert.equal(
		checkAsOfDate('Станом на 08.11.2026. Далі (станом на 31.12.2025) ще.', '08.11.2026').length,
		1,
	);
	assert.equal(checkAsOfDate('станом на жовтня', '08.11.2026').length, 1);
});

test('checkBuiltAsOf: the law pattern in built text needs «станом на»', () => {
	assert.equal(checkBuiltAsOf('x', 'Текст з offer.mjs: постанова № 1.').length, 1);
	assert.deepEqual(checkBuiltAsOf('x', 'постанова № 1. Станом на 08.11.2026'), []);
	assert.deepEqual(checkBuiltAsOf('x', 'Про сайт.'), []);
	assert.deepEqual(checkBuiltAsOf('pro-proiekt', 'Закон'), []);
});

test('checkOperatorLine: the footer carries the operator line verbatim', () => {
	const line = 'Послуги надає фізична особа — підприємець. Повні реквізити — у договорі.';
	const page = (text) => `<main>x</main><footer class="site-footer not-content"><p>${text}</p></footer>`;
	assert.deepEqual(checkOperatorLine(page(line), line), []);
	assert.equal(checkOperatorLine(page('Послуги надає ФОП.'), line).length, 1);
	assert.equal(checkOperatorLine('<main>x</main>', line).length, 1);
	// the line outside the site footer does not count
	assert.equal(checkOperatorLine(`<p>${line}</p><footer class="site-footer"></footer>`, line).length, 1);
});

test('checkHeader: the five links and the button, inline and in the panel', () => {
	for (const base of ['/site', '/']) {
		assert.deepEqual(checkHeader(headerHtml(base), base), []);
	}
});

test('checkHeader: a missing link, a wrong button and a wrong base fail', () => {
	assert.ok(checkHeader(headerHtml('/site', { dropLink: 'Підтримка' }), '/site').length > 0);
	assert.ok(checkHeader(headerHtml('/site', { swapButton: true }), '/site').length > 0);
	assert.ok(checkHeader(headerHtml('/site'), '/').length > 0);
	assert.deepEqual(checkHeader('<div></div>', '/site'), ['no <nav aria-label="Основна навігація">']);
});

test('checkScripts: only Turnstile\'s api.js, never inline', () => {
	assert.deepEqual(checkScripts('<form></form>'), []);
	assert.deepEqual(checkScripts(`<script src="${TURNSTILE_SRC}" async></script>`), []);
	assert.deepEqual(checkScripts('<script>alert(1)</script>'), ['an inline <script>']);
	assert.equal(checkScripts('<script src="https://evil.example/x.js"></script>').length, 1);
});

test('extractMain: the <main> content', () => {
	assert.equal(extractMain('<body><main id="a"><p>x</p></main><footer>f</footer></body>'), '<p>x</p>');
});
