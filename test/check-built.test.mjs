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

test('checkOwnSource: no page is exempt from «станом на»; the uCoz page', () => {
	assert.equal(checkOwnSource('pro-proiekt', 'Закон каже.').length, 1);
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
	assert.equal(checkBuiltAsOf('pro-proiekt', 'Закон').length, 1);
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

// ---------------------------------------------------------------------------------------------
// Story 80: product pages.

import {
	isProductPage,
	checkProductHeader,
	checkNoStarlight,
	checkNoBreakSpaces,
	checkAssistantSpelling,
	checkAssistantChip,
	checkLawClaims,
	checkProductPage,
	checkProductScripts,
	checkBuiltApostrophe,
	decodeApostrophes,
	LAW_CLAIMS,
	checkEveryPage,
	checkDemoAddress,
	rawText,
	PRODUCT_LINKS,
} from '../scripts/check-built.mjs';

function productHeader({ prefix = '', dropLink, button = `${prefix}#request` } = {}) {
	const links = PRODUCT_LINKS.filter(([text]) => text !== dropLink);
	const a = ([text, id]) => `<a href="${prefix}#${id}">${text}</a>`;
	return `<header class="site-header" data-site-header><div>
<nav class="nav-links" aria-label="Головне меню">${links.map(a).join('')}</nav>
<div class="site-header__actions"><a class="btn btn-main" href="${button}">Подати заявку</a>
<details class="nav-menu"><summary>Меню</summary><nav class="nav-menu__panel" aria-label="Меню сторінки"><ul>${links.map((l) => `<li>${a(l)}</li>`).join('')}<li><a href="mailto:support@tabula.org.ua">Звʼязатися</a></li></ul></nav></details></div>
</div></header>`;
}
const productPage = (body = '', header = productHeader()) =>
	`<!doctype html><html lang="uk" data-product-page><body>${header}<main>${body}</main></body></html>`;

test('isProductPage: only <html data-product-page>', () => {
	assert.ok(isProductPage('<!doctype html><html lang="uk" data-product-page><head>'));
	assert.ok(!isProductPage('<html lang="uk" data-theme="dark"><body data-product-page>'));
});

test('checkProductHeader: seven links in order, the button, the «Меню» panel', () => {
	assert.deepEqual(checkProductHeader(productPage()), []);
	assert.deepEqual(checkProductHeader(productPage('', productHeader({ prefix: '/site/' }))), []);
	assert.ok(checkProductHeader(productPage('', productHeader({ dropLink: 'Ціна' }))).length > 0);
	assert.ok(checkProductHeader(productPage('', productHeader({ button: '#price' }))).length > 0);
	assert.ok(checkProductHeader('<html data-product-page><body></body></html>').length > 0);
	const swapped = productHeader().replace('href="#price"', 'href="#faq"');
	assert.ok(checkProductHeader(productPage('', swapped)).some((p) => p.includes('«Ціна» points at')));
});

test('checkNoStarlight: sl- classes, the search box, the theme select', () => {
	assert.deepEqual(checkNoStarlight('<div class="site-header">'), []);
	assert.equal(checkNoStarlight('<div class="a sl-flex">').length, 1);
	assert.equal(checkNoStarlight('<site-search>').length, 1);
	assert.equal(checkNoStarlight('<starlight-theme-select>').length, 1);
});

test('checkNoBreakSpaces: a plain space between a number and ₴ / року / грн, and inside a date', () => {
	assert.deepEqual(checkNoBreakSpaces('4\u00a0800\u00a0₴ на рік, 2027\u00a0року, 31\u00a0грудня\u00a02026'), []);
	assert.deepEqual(checkNoBreakSpaces('4&#160;800&#160;₴, 2027&nbsp;року, 31&#160;грудня&#160;2026'), []);
	assert.deepEqual(checkNoBreakSpaces('1\u202f200\u202f₴'), []);
	assert.equal(checkNoBreakSpaces('1\u00a0200 ₴').length, 1);
	assert.equal(checkNoBreakSpaces('до 2026 року').length, 1);
	assert.equal(checkNoBreakSpaces('300 грн').length, 1);
	assert.equal(checkNoBreakSpaces('31 грудня 2026').length, 1);
});

test('rawText keeps entities, so the no-break rule sees &#160; as written', () => {
	assert.equal(rawText('<p>4&#160;800&nbsp;₴</p><script>x</script>').trim(), '4&#160;800&nbsp;₴');
});

test('checkAssistantSpelling: «ШІ-помічник», never «помічник ШІ» or a standalone «AI»', () => {
	assert.deepEqual(checkAssistantSpelling('ШІ-помічник готує чернетку. Помічник зі штучним інтелектом.'), []);
	assert.equal(checkAssistantSpelling('помічник ШІ').length, 1);
	assert.equal(checkAssistantSpelling('ШІ помічник').length, 1);
	assert.equal(checkAssistantSpelling('the AI helper').length, 1);
	assert.deepEqual(checkAssistantSpelling('MAIN CAIRO'), []);
});




test('checkEveryPage: every <img> has alt (also bare or empty), no Google Fonts', () => {
	assert.deepEqual(checkEveryPage('<img src="a" alt="x"><img src="b" alt=""><img src="c" alt sizes="1">'), []);
	assert.equal(checkEveryPage('<img src="a">').length, 1);
	assert.equal(checkEveryPage('<img data-alt="x" src="a">').length, 1);
	assert.equal(checkEveryPage('<link href="https://fonts.googleapis.com/css2">').length, 1);
});

test('checkDemoAddress: 127.0.0.1 and localhost', () => {
	assert.deepEqual(checkDemoAddress('<p>licey0.tabula.org.ua</p>'), []);
	assert.equal(checkDemoAddress('<a href="http://127.0.0.1:3100/">x</a>').length, 1);
	assert.equal(checkDemoAddress('<img alt="localhost">').length, 1);
});

const CLAIM_SECTION = '<section id="law"><h2>Розділи за статтею&#160;30 уже створені</h2><a href="/site/zakon-i-sait-shkoly/">Закон і сайт школи</a></section>';
const CLAIM_LI = '<ul><li><b>Алергени</b> біля страви: 15 алергенів за <a href="/site/zakon-i-sait-shkoly/">постановою №&#160;305</a>.</li></ul>';
const ASSISTANT = '<section id="assistant"><p><span>Випробовуємо</span> у школах ще не ввімкнено</p></section>';
const homeBody = (...parts) => productPage(parts.join(''));

test('checkAssistantChip: the chip must stand in #assistant, with a real space, while "testing"', () => {
	assert.deepEqual(checkAssistantChip(productPage(ASSISTANT), 'testing'), []);
	assert.deepEqual(checkAssistantChip(productPage('nothing'), 'on'), []);
	assert.equal(checkAssistantChip(productPage('nothing'), 'testing').length, 1);
	// the chip somewhere else on the page does not count
	assert.equal(checkAssistantChip(productPage('<section id="price">Випробовуємо у школах ще не ввімкнено</section>'), 'testing').length, 1);
	// no real space between the two parts
	const glued = '<section id="assistant"><p><span>Випробовуємо</span>у школах ще не ввімкнено</p></section>';
	assert.equal(checkAssistantChip(productPage(glued), 'testing').length, 1);
});

test('checkLawClaims: each claim needs its own link in its own block', () => {
	assert.deepEqual(checkLawClaims(homeBody(CLAIM_SECTION, CLAIM_LI), { requireClaims: true }), []);
	// the meals link removed: the section's link must not cover it
	const noMealsLink = CLAIM_LI.replace(/<a [^>]*>(.*?)<\/a>/, '$1');
	const out = checkLawClaims(homeBody(CLAIM_SECTION, noMealsLink), { requireClaims: true });
	assert.ok(out.some((m) => m.includes('15 алергенів')), out.join('; '));
	// the law band's link removed
	const noBandLink = CLAIM_SECTION.replace(/<a [^>]*>.*?<\/a>/, '');
	assert.ok(checkLawClaims(homeBody(noBandLink, CLAIM_LI), { requireClaims: true }).some((m) => m.includes('Розділи за статтею')));
	// a missing claim fails on the home only
	assert.equal(checkLawClaims(homeBody(CLAIM_SECTION), { requireClaims: true }).length, 1);
	assert.deepEqual(checkLawClaims(homeBody(CLAIM_SECTION)), []);
	assert.equal(LAW_CLAIMS.length, 2);
});

test('checkLawClaims: the link text «Закон і сайт школи» is not an uncited mention; another law word is', () => {
	assert.deepEqual(checkLawClaims(homeBody('<p><a href="/site/zakon-i-sait-shkoly/">Закон і сайт школи</a></p>')), []);
	assert.equal(checkLawClaims(homeBody('<p>за постановою № 1</p><a href="/site/zakon-i-sait-shkoly/">x</a>')).length, 1);
	assert.equal(checkLawClaims(homeBody('<p>Закон каже</p>')).length, 1);
});

test('checkProductScripts: only the tabs and header bundles', () => {
	const tabs = '<script type="module">/* data-tabs */ x()</script>';
	const header = '<script type="module" src="/site/_astro/h.js"></script>';
	const read = (src) => (src.endsWith('h.js') ? 'document.querySelector("[data-site-header]")' : null);
	assert.deepEqual(checkProductScripts(tabs + header, read), []);
	assert.equal(checkProductScripts('<script type="module" src="/site/_astro/page.js"></script>', () => 'prefetch()').length, 1);
	assert.equal(checkProductScripts('<script type="module" src="/x.js"></script>', () => null).length, 1);
	assert.equal(checkProductScripts('<script>alert(1)</script>').length, 1);
});

test('decodeApostrophes / checkBuiltApostrophe: Astro writes \' as &#39;', () => {
	assert.equal(decodeApostrophes('з&#39;єднання &#x27; &rsquo; &#8217;'), "з'єднання ' ’ ’");
	assert.equal(checkBuiltApostrophe('<p>з&#39;єднання</p>').length, 1);
	assert.equal(checkBuiltApostrophe('<p>з&#x27;єднання</p>').length, 1);
	assert.equal(checkBuiltApostrophe('<p>з&rsquo;єднання</p>').length, 1);
	assert.equal(checkBuiltApostrophe('<p>з&#8217;єднання</p>').length, 1);
	assert.deepEqual(checkBuiltApostrophe('<p>зʼєднання, don&#39;t</p>'), []);
	assert.deepEqual(checkBuiltApostrophe("<script>a'б'в</script>"), []);
});

test('checkAssistantSpelling: inflected forms and a Latin I', () => {
	for (const bad of ['помічника ШІ', 'помічнику ШІ', 'помічником ШІ', 'помічники ШІ', 'ШI-помічник', 'ШI']) {
		assert.ok(checkAssistantSpelling(bad).length > 0, bad);
	}
	assert.deepEqual(checkAssistantSpelling('ШІ-помічника, помічником зі штучним інтелектом'), []);
});

test('checkNoBreakSpaces: a plain space as the thousands separator, and day + month', () => {
	assert.equal(checkNoBreakSpaces('4 800\u00a0₴').length, 1);
	assert.equal(checkNoBreakSpaces('1 200&#160;грн').length, 1);
	assert.deepEqual(checkNoBreakSpaces('4\u00a0800\u00a0₴ 4&#160;800&nbsp;₴'), []);
	assert.equal(checkNoBreakSpaces('до 31 грудня').length, 1);
	assert.deepEqual(checkNoBreakSpaces('31\u00a0грудня'), []);
	assert.deepEqual(checkNoBreakSpaces('кошторис 2026 грудень'), []);
});

test('checkProductPage: a clean home passes; each family of rule fails on its own', () => {
	const clean = homeBody(ASSISTANT, CLAIM_SECTION, CLAIM_LI, '<p>4&#160;800&#160;₴ ШІ-помічник</p>');
	assert.deepEqual(checkProductPage(clean, { isHome: true, assistantStatus: 'testing' }), []);
	const bad = (body) => checkProductPage(productPage(body), { isHome: false });
	assert.ok(bad('<p>Ми гарантуємо відповідність закону.</p>').length > 0);
	assert.ok(bad('<p>з&#39;єднання</p>').length > 0);
	assert.ok(bad('<p>4 800 ₴</p>').length > 0);
	assert.ok(bad('<p>помічник ШІ</p>').length > 0);
	assert.ok(bad('<p class="sl-flex">x</p>').length > 0);
	assert.ok(bad('<script type="module" src="/a.js"></script>').length > 0);
});
