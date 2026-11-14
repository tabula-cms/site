import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sep } from 'node:path';
import {
	findForbidden,
	checkOwnSource,
	checkAsOfDate,
	checkBuiltAsOf,
	checkFooterLine,
	checkClosedService,
	FOOTER_EXEMPT,
	isRedirectPage,
	checkScripts,
	extractMain,
	TURNSTILE_SRC,
	checkRequestPage,
	checkResultPage,
	checkResultLinks,
	checkSitemapResults,
	isResultRel,
	REQUEST_FIELDS,
	REQUEST_SIGNERS,
} from '../scripts/check-built.mjs';

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

test('checkFooterLine: the footer carries the footer line verbatim', () => {
	const line = 'Tabula зробили вчителі з досвідом програмування — для інших шкіл.';
	const page = (text) => `<main>x</main><footer class="site-footer not-content"><p>${text}</p></footer>`;
	assert.deepEqual(checkFooterLine(page(line), line), []);
	assert.equal(checkFooterLine(page('Послуги надає ФОП.'), line).length, 1);
	assert.equal(checkFooterLine('<main>x</main>', line).length, 1);
	// the line outside the site footer does not count
	assert.equal(checkFooterLine(`<p>${line}</p><footer class="site-footer"></footer>`, line).length, 1);
});

test('checkClosedService: no open code, licence, GitHub or self-hosting; ordinary words pass', () => {
	for (const bad of [
		'Код відкритий під ліцензією AGPL-3.0',
		'Репозиторій на GitHub',
		'https://github.com/tabula-cms/tabula',
		'Система вільна й безкоштовна назавжди',
		'Установити на власний сервер',
		'Встановити самостійно',
		'Відкритий код: сайт можна забрати',
	]) {
		assert.ok(checkClosedService(bad).length > 0, bad);
	}
	for (const ok of [
		'Цей сайт розміщено на GitHub Pages.',
		'Відкрити приклад сайту',
		'Прозорість та інформаційна відкритість',
		'Документи, фото й новини віддаємо архівом — вставите в будь-який сайт',
	]) {
		assert.deepEqual(checkClosedService(ok), [], ok);
	}
});

test('isRedirectPage: an Astro redirect page is recognised', () => {
	assert.ok(isRedirectPage('<meta http-equiv="refresh" content="0;url=/site/khostynh-i-tsina/">'));
	assert.ok(!isRedirectPage('<meta charset="utf-8">'));
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
	checkNoDocsLinks,
	checkDocChrome,
	checkCtaName,
	checkFooterLinks,
	checkOneH1,
	metaDescription,
	isDocsHref,
	rawText,
	PRODUCT_LINKS,
	FOR_LINKS,
	CONTACT_LINK,
	checkHeroButtons,
	checkHomeRoles,
	checkAssistantMore,
} from '../scripts/check-built.mjs';

function productHeader({ prefix = '', dropLink, button, demoOpen = false, requestOpen = false, tryHref } = {}) {
	const links = PRODUCT_LINKS.filter(([text]) => text !== dropLink);
	const a = ([text, id]) => `<a href="${prefix}#${id}">${text}</a>`;
	const forA = ([text, slug]) => `<a href="${prefix || '/'}${slug}/">${text}</a>`;
	const requestTo = button ?? (requestOpen ? `${prefix || '/'}zaiavka/` : `${prefix}#request`);
	const tryButton = demoOpen ? `<a class="btn btn-line btn-try" href="${tryHref ?? `${prefix || '/'}sprobuvaty/`}">Спробувати</a>` : '';
	return `<header class="site-header" data-site-header><div>
<nav class="nav-links" aria-label="Головне меню"><details class="nav-for"><summary>Для кого</summary><ul class="nav-for__panel">${FOR_LINKS.map((l) => `<li>${forA(l)}</li>`).join('')}</ul></details>${links.map(a).join('')}</nav>
<div class="site-header__actions">${tryButton}<a class="btn btn-main" href="${requestTo}">Подати заявку</a>
<details class="nav-menu"><summary>Меню</summary><nav class="nav-menu__panel" aria-label="Меню сторінки"><p class="nav-menu__heading" id="menu-for">Для кого</p><ul>${FOR_LINKS.map((l) => `<li>${forA(l)}</li>`).join('')}</ul><ul>${[...links, CONTACT_LINK].map((l) => `<li>${a(l)}</li>`).join('')}<li><a href="mailto:support@tabula.org.ua">Звʼязатися</a></li></ul></nav></details></div>
</div></header>`;
}
const productPage = (body = '', header = productHeader()) =>
	`<!doctype html><html lang="uk" data-product-page><body>${header}<main><h1>Т</h1>${body}</main></body></html>`;

test('isProductPage: only <html data-product-page>', () => {
	assert.ok(isProductPage('<!doctype html><html lang="uk" data-product-page><head>'));
	assert.ok(!isProductPage('<html lang="uk" data-theme="dark"><body data-product-page>'));
});

test('checkProductHeader: «Для кого», six anchors, the button, the «Меню» panel', () => {
	const closed = { requestOpen: false, demoOpen: false };
	assert.deepEqual(checkProductHeader(productPage(), closed), []);
	assert.deepEqual(checkProductHeader(productPage('', productHeader({ prefix: '/site/' })), closed), []);
	assert.ok(checkProductHeader(productPage('', productHeader({ dropLink: 'Ціна' })), closed).length > 0);
	assert.ok(checkProductHeader(productPage('', productHeader({ button: '#price' })), closed).length > 0);
	assert.ok(checkProductHeader('<html data-product-page><body></body></html>', closed).length > 0);
	const swapped = productHeader().replace('href="#price"', 'href="#faq"');
	assert.ok(checkProductHeader(productPage('', swapped), closed).some((p) => p.includes('«Ціна» points at')));
});

test('checkProductHeader: «Контакти» is in the panel only, and the dropdown links are held in order', () => {
	const closed = { requestOpen: false, demoOpen: false };
	const inRow = productHeader().replace('<a href="#faq">Запитання</a></nav>', '<a href="#faq">Запитання</a><a href="#contact">Контакти</a></nav>');
	assert.ok(checkProductHeader(productPage('', inRow), closed).some((p) => p.startsWith('inline nav is')));
	const noContact = productHeader().replace('<li><a href="#contact">Контакти</a></li>', '');
	assert.ok(checkProductHeader(productPage('', noContact), closed).some((p) => p.includes('«Меню» panel is')));
	const noDropdown = productHeader().replace('<details class="nav-for">', '<details class="x">');
	assert.ok(checkProductHeader(productPage('', noDropdown), closed).some((p) => p.includes('nav-for')));
	const wrongPage = productHeader().replace('href="/dlia-dyrektora/"', 'href="/dlia-bukhhalterii/"');
	assert.ok(checkProductHeader(productPage('', wrongPage), closed).some((p) => p.includes('«Директору» points at')));
	const noHeading = productHeader().replace('<p class="nav-menu__heading" id="menu-for">Для кого</p>', '');
	assert.ok(checkProductHeader(productPage('', noHeading), closed).some((p) => p.includes('group heading')));
});

test('checkProductHeader: the button follows requestHref (the form open: zaiavka/, else #request)', () => {
	assert.deepEqual(checkProductHeader(productPage('', productHeader({ requestOpen: true })), { requestOpen: true, demoOpen: false }), []);
	assert.ok(checkProductHeader(productPage('', productHeader({ requestOpen: true })), { requestOpen: false, demoOpen: false }).length > 0);
	assert.ok(checkProductHeader(productPage('', productHeader({ requestOpen: false })), { requestOpen: true, demoOpen: false }).length > 0);
});

test('checkProductHeader: «Спробувати» is in the header exactly while the demo is open, before «Подати заявку»', () => {
	assert.deepEqual(checkProductHeader(productPage('', productHeader({ demoOpen: true })), { requestOpen: false, demoOpen: true }), []);
	assert.ok(checkProductHeader(productPage('', productHeader({ demoOpen: false })), { requestOpen: false, demoOpen: true }).length > 0);
	assert.ok(checkProductHeader(productPage('', productHeader({ demoOpen: true })), { requestOpen: false, demoOpen: false }).length > 0);
	assert.ok(checkProductHeader(productPage('', productHeader({ demoOpen: true, tryHref: '/x/' })), { requestOpen: false, demoOpen: true }).length > 0);
	const after = productHeader({ demoOpen: true }).replace(/(<a class="btn btn-line btn-try"[^>]*>Спробувати<\/a>)(<a class="btn btn-main"[^>]*>Подати заявку<\/a>)/, '$2$1');
	assert.ok(checkProductHeader(productPage('', after), { requestOpen: false, demoOpen: true }).some((p) => p.includes('not before')));
});

function hero({ demoOpen = false, requestOpen = false, swap = false } = {}) {
	const request = `<a class="btn ${demoOpen ? 'btn-line' : 'btn-main'} btn-lg" href="${requestOpen ? '/site/zaiavka/' : '#request'}">Подати заявку</a>`;
	const demo = '<a class="btn btn-main btn-lg" href="/site/sprobuvaty/">Спробувати демо</a>';
	const example = demoOpen ? '</div><p class="hero__kinds hero__example"><a href="/site/demo/">Подивитися приклад сайту</a></p>' : '<a class="btn btn-line btn-lg" href="/site/demo/">Подивитися приклад сайту</a></div>';
	const buttons = demoOpen ? (swap ? request + demo : demo + request) : request;
	return `<section id="top" class="hero"><div class="hero__buttons">${buttons}${example}</section>`;
}

test('checkHeroButtons: demo closed — «Подати заявку» first, the example outlined, no link to «Спробувати»', () => {
	assert.deepEqual(checkHeroButtons(hero(), { demoOpen: false, requestOpen: false }), []);
	assert.deepEqual(checkHeroButtons(hero({ requestOpen: true }), { demoOpen: false, requestOpen: true }), []);
	assert.ok(checkHeroButtons(hero({ requestOpen: true }), { demoOpen: false, requestOpen: false }).length > 0);
	assert.ok(checkHeroButtons(hero({ demoOpen: true }), { demoOpen: false, requestOpen: false }).length > 0);
	assert.ok(checkHeroButtons('<section id="top"></section>', { demoOpen: false }).length > 0);
});

test('checkHeroButtons: demo open — «Спробувати демо» primary first, «Подати заявку» secondary, the example a quiet link', () => {
	assert.deepEqual(checkHeroButtons(hero({ demoOpen: true }), { demoOpen: true, requestOpen: false }), []);
	assert.deepEqual(checkHeroButtons(hero({ demoOpen: true, requestOpen: true }), { demoOpen: true, requestOpen: true }), []);
	assert.ok(checkHeroButtons(hero({ demoOpen: true, swap: true }), { demoOpen: true, requestOpen: false }).length > 0);
	assert.ok(checkHeroButtons(hero({ demoOpen: false }), { demoOpen: true, requestOpen: false }).length > 0);
});

function rolesSection({ order = true } = {}) {
	const cards = FOR_LINKS.map(([text, slug]) => `<a class="kinds__tile roles__card" href="/site/${slug}/"><h3>${text}</h3><p>x</p><span>Читати <span aria-hidden="true">→</span></span></a>`).join('');
	const roles = `<section id="start"><h2 class="h2" id="start-title">З чого почати</h2>${cards}</section>`;
	return order ? `${roles}<section id="kinds"></section>` : `<section id="kinds"></section>${roles}`;
}

test('checkHomeRoles: four cards in order, the H2, before «kinds»', () => {
	assert.deepEqual(checkHomeRoles(rolesSection()), []);
	assert.ok(checkHomeRoles(rolesSection({ order: false })).some((p) => p.includes('not before')));
	assert.ok(checkHomeRoles(rolesSection().replace('/site/dlia-bukhhalterii/', '/site/pidtrymka/')).length > 0);
	assert.ok(checkHomeRoles('<section id="kinds"></section>').length > 0);
});

test('checkAssistantMore: three H3, three steps; the link to the guide is optional', () => {
	const ok = `<section id="assistant"><h3>Як це виглядає в роботі</h3><ol><li class="assist-flow__step"></li><li class="assist-flow__step"></li><li class="assist-flow__step"></li></ol><h3>Ще помічник уміє</h3><h3>Що відбувається з даними</h3><a href="/site/editor/pomichnyk-i-dani/">x</a></section>`;
	assert.deepEqual(checkAssistantMore(ok), []);
	assert.ok(checkAssistantMore(ok.replace('Ще помічник уміє', 'Інше')).length > 0);
	assert.deepEqual(checkAssistantMore(ok.replace('/editor/pomichnyk-i-dani/', '/')), []);
	assert.ok(checkAssistantMore(ok.replace('<li class="assist-flow__step"></li>', '')).length > 0);
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
	assert.equal(checkNoBreakSpaces('31 грудня 2026').length, 2);
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
	const assistantFull = ASSISTANT.replace('</section>', '<h3>Як це виглядає в роботі</h3><li class="assist-flow__step"></li><li class="assist-flow__step"></li><li class="assist-flow__step"></li><h3>Ще помічник уміє</h3><h3>Що відбувається з даними</h3><a href="/site/editor/pomichnyk-i-dani/">x</a></section>');
	const clean = homeBody(hero({ demoOpen: offerForRules.demoOpen }), rolesSection(), assistantFull, CLAIM_SECTION, CLAIM_LI, '<p>4&#160;800&#160;₴ ШІ-помічник</p>');
	assert.deepEqual(checkProductPage(clean, { isHome: true, assistantStatus: 'testing' }), []);
	const bad = (body) => checkProductPage(productPage(body), { isHome: false });
	assert.ok(bad('<p>Ми гарантуємо відповідність закону.</p>').length > 0);
	assert.ok(bad('<p>з&#39;єднання</p>').length > 0);
	assert.ok(bad('<p>4 800 ₴</p>').length > 0);
	assert.ok(bad('<p>помічник ШІ</p>').length > 0);
	assert.ok(bad('<p class="sl-flex">x</p>').length > 0);
	assert.ok(bad('<script type="module" src="/a.js"></script>').length > 0);
});

test('checkProductPage: the home alone is exempt from the two-claims rule; the law page may name uCoz', () => {
	const lawBody = '<p>Закон «Про освіту». Станом на 08.11.2026.</p>';
	assert.ok(checkProductPage(productPage(lawBody), { isHome: true, assistantStatus: 'on' }).length > 0);
	assert.deepEqual(checkProductPage(productPage(lawBody), { isHome: false }), []);
	assert.ok(checkProductPage(productPage('<p>сайти на uCoz</p>'), { isHome: false }).length > 0);
	assert.deepEqual(checkProductPage(productPage('<p>сайти на uCoz</p>'), { isHome: false, allowUcoz: true }), []);
});

test('checkNoDocsLinks: the product header and footer do not link into the documentation', () => {
	const footer = (...hrefs) => `<footer class="site-footer">${hrefs.map((h) => `<a href="${h}">x</a>`).join('')}</footer>`;
	const page = (f) => productPage('', productHeader()) + f;
	assert.deepEqual(checkNoDocsLinks(page(footer('/site/dlia-bukhhalterii/', '/site/vstanovyty-samostiino/', 'https://example.org/editor/'))), []);
	for (const bad of ['/site/editor/zmist/', '/site/install/vstanovlennia/', '../qa/', '/dev/', '/site/editor']) {
		assert.equal(checkNoDocsLinks(page(footer(bad)), undefined, '/site').length, 1, bad);
	}
	// spec 83 §9: the footer's «Посібник редактора» is exactly {base}/editor/
	assert.deepEqual(checkNoDocsLinks(page(footer('/site/editor/')), undefined, '/site'), []);
	assert.deepEqual(checkNoDocsLinks(page(footer('/editor/')), undefined, '/'), []);
	// a body link into the docs is text, not navigation
	assert.deepEqual(checkNoDocsLinks(productPage('<a href="../editor/">посібник</a>') + footer('/site/')), []);
	const headerLink = productHeader().replace('href="#price"', 'href="/site/editor/"');
	assert.equal(checkNoDocsLinks(productPage('', headerLink), undefined, '/site').length, 1);
});

test('checkDocChrome: no site navigation or request button, a footer link to the product home', () => {
	const doc = (extra = '', home = '/site/') =>
		`<html lang="uk"><body><header class="header"><a href="/site/">Tabula</a>${extra}</header><footer class="site-footer"><a href="${home}">На головну Tabula</a></footer></body></html>`;
	assert.deepEqual(checkDocChrome(doc(), '/site'), []);
	assert.deepEqual(checkDocChrome(doc('', '/'), '/'), []);
	assert.equal(checkDocChrome(doc('<nav aria-label="Основна навігація"></nav>'), '/site').length, 1);
	assert.equal(checkDocChrome(doc('<a class="btn" href="/site/zaiavka/">Подати заявку</a>'), '/site').length, 1);
	assert.equal(checkDocChrome(doc('', '/site/editor/'), '/site').length, 1);
	assert.equal(checkDocChrome(doc('<a class="btn" href="/site/zaiavka/">Залишити заявку</a>'), '/site').length, 1);
	assert.equal(checkDocChrome('<html><body><header></header></body></html>', '/site').length, 1);
});

test('checkCtaName: «Залишити заявку» is on no product page', () => {
	assert.deepEqual(checkCtaName(productPage('<a href="#request">Подати заявку</a>')), []);
	assert.equal(checkCtaName(productPage('<a class="btn" href="../zaiavka/">Залишити  заявку</a>')).length, 1);
});

test('isDocsHref: relative, root-relative, own-origin absolute and slash-less hrefs; not other origins', () => {
	const origin = 'https://example.test';
	for (const bad of ['/site/editor/', '../install/x/', '/site/dev', 'qa', 'editor/#a', 'https://example.test/site/editor/', 'https://example.test/site/dev', '//example.test/site/qa/']) {
		assert.ok(isDocsHref(bad, origin), bad);
	}
	for (const ok of ['/site/zaiavka/', '/site/vstanovyty-samostiino/', 'https://github.com/x/editor/', 'https://other.test/site/dev/', '/site/#faq', 'mailto:a@b.c', '/site/developers/']) {
		assert.ok(!isDocsHref(ok, origin), ok);
	}
	assert.equal(checkNoDocsLinks(productPage('') + '<footer class="site-footer"><a href="https://example.test/site/editor">x</a></footer>', origin).length, 1);
});

test('checkFooterLinks: every own page is linked from the footer', () => {
	const footer = (...slugs) => `<footer class="site-footer">${slugs.map((s) => `<a href="/site/${s}/">x</a>`).join('')}</footer>`;
	assert.deepEqual(checkFooterLinks(footer('a', 'b'), ['a', 'b'], '/site'), []);
	assert.equal(checkFooterLinks(footer('a'), ['a', 'b'], '/site').length, 1);
	assert.equal(checkFooterLinks('<a href="/site/b/">in the body</a>' + footer('a'), ['a', 'b'], '/site').length, 1);
	assert.deepEqual(checkFooterLinks('<footer class="site-footer"><a href="/a/">x</a></footer>', ['a'], '/'), []);
	// «Демо-сайт» and «Подати заявку» are not in the footer by design (main() checks they are linked elsewhere)
	assert.deepEqual(FOOTER_EXEMPT, ['demo', 'zaiavka']);
	assert.deepEqual(checkFooterLinks(footer('a'), ['a', 'demo', 'zaiavka'], '/site'), []);
});

test('checkOneH1 and metaDescription', () => {
	assert.deepEqual(checkOneH1('<h1>a</h1><h2>b</h2>'), []);
	assert.equal(checkOneH1('<p>none</p>').length, 1);
	assert.equal(checkOneH1('<h1>a</h1><h1 id="x">b</h1>').length, 1);
	assert.equal(metaDescription('<meta name="description" content="межа 50&#160;000 грн">'), 'межа 50&#160;000 грн');
	assert.equal(metaDescription('<meta charset="utf-8">'), null);
	assert.ok(checkProductPage('<!doctype html><html lang="uk" data-product-page><head><meta name="description" content="50 000 грн"></head><body>' + productHeader() + '<main><h1>x</h1></main></body></html>').filter((p) => p.startsWith('meta description')).length > 0);
	assert.ok(checkProductPage(productPage('<h1>y</h1>')).some((p) => p.includes('<h1>')));
});

test('checkNoBreakSpaces: month and year', () => {
	assert.equal(checkNoBreakSpaces('з 1\u00a0січня 2027').length, 1);
	assert.deepEqual(checkNoBreakSpaces('1\u00a0січня\u00a02027'), []);
	assert.deepEqual(checkNoBreakSpaces('1&#160;січня&nbsp;2027'), []);
});

// ---- story 82, slice S1b: «Спробувати» ----

import { checkTryPage, checkTryLinks } from '../scripts/check-built.mjs';

const CONSENT_1 = 'Погоджуюся, щоб Tabula надіслала мені код для входу і 14 днів зберігала мою демо-копію. Докладно — на сторінці <a href="/site/personalni-dani/#demo">«Обробка персональних даних»</a>.';
const tryPage = ({ referrer = 'strict-origin-when-cross-origin', robots = true, action = 'https://demo.example.org/__demo/start', consent = CONSENT_1, extra = '' } = {}) =>
	`<html><head><meta name="referrer" content="${referrer}">${robots ? '<meta name="robots" content="noindex, nofollow">' : ''}</head><body><main>
<p data-try-nojs>Демо працює лише з увімкненим JavaScript.</p>
<input id="try-code" inputmode="numeric" autocomplete="one-time-code" data-try-code-input>
<form data-try-pass method="post" action="${action}" hidden><input type="hidden" name="pass" value=""></form>
<label>${consent}</label>${extra}
</main></body></html>`;

test('checkTryPage: the referrer policy, the pass form, the code field, noindex while closed', () => {
	const opts = { demoOpen: false, demoUrl: 'https://demo.example.org' };
	assert.deepEqual(checkTryPage(tryPage(), opts), []);
	assert.ok(checkTryPage(tryPage({ referrer: 'no-referrer' }), opts).some((p) => p.includes('no-referrer')));
	assert.ok(checkTryPage(tryPage({ action: 'https://evil.example/__demo/start' }), opts).some((p) => p.includes('does not post')));
	assert.ok(checkTryPage(tryPage({ robots: false }), opts).some((p) => p.includes('noindex')));
	assert.ok(checkTryPage(tryPage(), { ...opts, demoOpen: true }).some((p) => p.includes('noindex although')));
	assert.deepEqual(checkTryPage(tryPage({ robots: false }), { ...opts, demoOpen: true }), []);
	assert.deepEqual(checkTryPage(tryPage({ extra: '<p>Робота збережеться сама.</p>' }), opts), []);
	const phase1 = 'Погоджуюся, щоб Tabula надіслала мені код для входу. Докладно — на сторінці «Обробка персональних даних».';
	assert.ok(checkTryPage(tryPage({ consent: phase1 }), opts).some((p) => p.includes('Consent 1')));
	assert.ok(checkTryPage(tryPage(), { ...opts, keepDays: 7 }).some((p) => p.includes('Consent 1')));
	assert.deepEqual(checkTryPage(tryPage({ consent: CONSENT_1.replace('14 днів', '14 днів') }), opts), []);
	assert.ok(checkTryPage(tryPage().replace('one-time-code', 'off'), opts).some((p) => p.includes('one-time-code')));
});

test('checkTryLinks: no link while the demo is not public, the footer link once it is', () => {
	const footer = (links) => `<footer class="site-footer">${links}</footer>`;
	assert.deepEqual(checkTryLinks(footer(''), { demoOpen: false }), []);
	assert.equal(checkTryLinks(footer('<a href="/site/sprobuvaty/">x</a>'), { demoOpen: false }).length, 1);
	assert.equal(checkTryLinks('<p><a href="../sprobuvaty/">x</a></p>', { demoOpen: false, product: false }).length, 1);
	assert.deepEqual(checkTryLinks(footer('<a href="/site/sprobuvaty/">x</a>'), { demoOpen: true }), []);
	assert.equal(checkTryLinks(footer(''), { demoOpen: true }).length, 1);
	assert.deepEqual(checkTryLinks('<p>docs</p>', { demoOpen: true, product: false }), []);
});

test('checkProductScripts: the try page\'s own bundle only where allowed', () => {
	const own = '<script type="module" src="/site/_astro/t.js"></script>';
	const read = () => 'document.querySelector("[data-demo-try]")';
	assert.equal(checkProductScripts(own, read).length, 1);
	assert.deepEqual(checkProductScripts(own, read, { allowTry: true }), []);
});

import {
	checkPlaceholders,
	checkOfferNumbers,
	checkTypography,
	checkCheckedDate,
	visibleText,
} from '../scripts/check-built.mjs';
import { offer as offerForRules } from '../src/config/offer.mjs';

test('spec 83: a placeholder of the spec fails the page', () => {
	assert.deepEqual(checkPlaceholders('<p>Готово</p>'), []);
	for (const bad of ['[уточнити: перелік]', '{рішення: хто}', '{дані: ПІБ}', '{Дані}']) {
		assert.equal(checkPlaceholders(`<p>${bad}</p>`).length, 1, bad);
	}
});

test('spec 83: the price, the dates and the reply times are the ones of offer.mjs', () => {
	const nb = '\u00a0';
	const good = `Безкоштовно до 31${nb}грудня${nb}2026 року. 4${nb}800${nb}грн на рік, 1${nb}200 грн щокварталу. Перевірено 9 листопада 2026 року. Ми відповімо протягом 2 робочих днів; відповідаємо протягом 2 робочих днів. Послуги вартістю менше ніж 200 000 грн на рік. До 31 грудня 2026 року сайт працює безкоштовно.`;
	assert.deepEqual(checkOfferNumbers(good), []);
	assert.equal(checkOfferNumbers('4 900 грн на рік').length, 1);
	assert.equal(checkOfferNumbers('4 800 ₴ / рік').length, 0);
	assert.equal(checkOfferNumbers('1 500 грн щокварталу').length, 1);
	assert.equal(checkOfferNumbers('безкоштовно до 30 грудня 2026 року').length, 1);
	assert.equal(checkOfferNumbers('до 1 січня 2027 року сайт працює безкоштовно').length, 1);
	assert.equal(checkOfferNumbers('Перевірено 8 листопада 2026 року').length, 1);
	assert.equal(checkOfferNumbers('ми відповімо протягом 3 робочих днів').length, 1);
	assert.equal(checkOfferNumbers('відповідаємо протягом 5 робочих днів').length, 1);
	// a different offer: the same text then fails
	assert.equal(checkOfferNumbers('4 800 грн на рік', { ...offerForRules, priceYearUah: 6000 }).length, 1);
});

test('spec 83: «Перевірено» is followed by checkedOn', () => {
	assert.deepEqual(checkCheckedDate('Перевірено 9\u00a0листопада 2026 року.', '9 листопада 2026 року'), []);
	assert.equal(checkCheckedDate('Перевірено 1 листопада 2026 року.', '9 листопада 2026 року').length, 1);
});

test('spec 83: typography — no straight quotes, paired quotes, U+00A0 in digit groups', () => {
	assert.deepEqual(checkTypography('«Про освіту», „так“, 4\u00a0800\u00a0грн, обовʼязок'), []);
	assert.equal(checkTypography('"так"').length, 1);
	assert.equal(checkTypography("обов'язок").length, 1);
	assert.equal(checkTypography('„так').length, 1);
	assert.equal(checkTypography('«так').length, 1);
	assert.equal(checkTypography('4 800 грн').length, 1);
	assert.equal(checkTypography('4\u202f800 грн').length, 1);
	assert.equal(checkTypography('з 2026 року, № 305, КЕКВ 2240').length, 0);
	// entities are decoded first
	assert.equal(checkTypography(visibleText('<p>&quot;так&quot;</p>')).length, 1);
	assert.equal(checkTypography(visibleText('<p>4&nbsp;800</p>')).length, 0);
});

// ---------------------------------------------------------------------------------------------
// Story 78, W2: the request form.

const CP = 'https://cp.example.test';
const KEY = '1x00000000000000000000AA';
const SUPPORT = 'support@tabula.example';

// A minimal built page with a form that satisfies every rule; the tests break it one way at a time.
function formPage({ drop = [], extra = '' } = {}) {
	const field = (name, max, req) => (drop.includes(name) ? '' : `<input name="${name}" type="text" ${req ? 'required ' : ''}maxlength="${max}"${name === 'phone' ? ' pattern="[0-9 +\\(\\)\\-]*"' : ''}>`);
	const fields = Object.entries(REQUEST_FIELDS)
		.filter(([name]) => name !== 'comment' && name !== 'email')
		.map(([name, [max, req]]) => field(name, max, req))
		.join('');
	return `<html><body><main>
<form method="post" action="${CP}/v1/requests" accept-charset="utf-8">
<noscript><p>Форма перевіряє, що ви не бот, за допомогою JavaScript. Якщо він вимкнений, напишіть нам на <a href="mailto:${SUPPORT}">${SUPPORT}</a>.</p></noscript>
${fields}
<input name="email" type="email" required maxlength="254">
<textarea name="comment" maxlength="1000"></textarea>
<input name="edrpou" type="text" required pattern="\\d{8}" inputmode="numeric">
${REQUEST_SIGNERS.map((v) => `<input name="signer" type="radio" value="${v}" required>`).join('')}
<input name="consent" type="checkbox" value="yes" required>
<div aria-hidden="true"><input name="website" type="text" tabindex="-1" autocomplete="off"></div>
<div class="cf-turnstile" data-sitekey="${KEY}"></div>
<script async defer src="${TURNSTILE_SRC}"></script>
<p>Дані з форми отримує фізична особа — підприємець, що надає послуги Tabula, щоб звʼязатися з вами.</p>
<button class="btn" type="submit">Надіслати заявку</button>
${extra}
</form></main></body></html>`;
}
const check = (html) => checkRequestPage(html, { open: true, cpUrl: CP, siteKey: KEY, supportEmail: SUPPORT });

test('checkRequestPage (open): a complete form passes', () => {
	assert.deepEqual(check(formPage()), []);
});

test('checkRequestPage (open): every missing piece is reported', () => {
	for (const name of Object.keys(REQUEST_FIELDS).filter((n) => n !== 'email' && n !== 'comment')) {
		assert.ok(check(formPage({ drop: [name] })).some((p) => p.includes(`"${name}"`)), name);
	}
	assert.ok(check(formPage().replace('<input name="email"', '<input name="e"')).some((p) => p.includes('"email"')));
	assert.ok(check(formPage().replace('<textarea name="comment"', '<textarea name="c"')).some((p) => p.includes('"comment"')));
	assert.ok(check(formPage().replace('value="yes" ', '')).some((p) => p.includes('value="yes"')));
	assert.ok(check(formPage().replace(/(name="consent" type="checkbox" value="yes") required/, '$1')).some((p) => p.includes('consent checkbox is not required')));
	assert.ok(check(formPage().replace('maxlength="200"', 'maxlength="20"')).length > 0);
	assert.ok(check(formPage().replace('value="unknown"', 'value="x"')).some((p) => p.includes('signer radios')));
	assert.ok(check(formPage().replace('tabindex="-1" ', '')).some((p) => p.includes('honeypot')));
	assert.ok(check(formPage().replace('<div aria-hidden="true">', '<div>')).some((p) => p.includes('wrapper')));
	assert.ok(check(formPage().replace(KEY, 'other')).some((p) => p.includes('site key')));
	assert.ok(check(formPage().replace('accept-charset="utf-8"', '')).some((p) => p.includes('accept-charset')));
	assert.ok(check(formPage().replace(CP, 'https://elsewhere.example')).some((p) => p.includes('does not post')));
	assert.ok(check(formPage().replace('method="post"', 'method="get"')).some((p) => p.includes('method')));
	assert.ok(check(formPage().replace('напишіть нам на', 'пишіть')).some((p) => p.includes('noscript')));
	assert.ok(check(formPage().replace('Дані з форми отримує', 'Дані отримує')).some((p) => p.includes('notice')));
});

test('checkRequestPage (open): one form only, no other script, a button that is enabled', () => {
	assert.ok(check(formPage().replace('</main>', '<form action="x"></form></main>')).some((p) => p.includes('exactly one')));
	assert.ok(check(formPage({ extra: '<script>alert(1)</script>' })).some((p) => p.includes('inline')));
	assert.ok(check(formPage({ extra: '<script src="https://evil.example/a.js"></script>' })).length > 0);
	assert.ok(check(formPage().replace('<button class="btn"', '<button disabled class="btn"')).length > 0);
});

test('checkRequestPage (closed): no form, no widget, the support address', () => {
	const closed = (html) => checkRequestPage(html, { open: false, supportEmail: SUPPORT });
	assert.deepEqual(closed(`<main><p><a href="mailto:${SUPPORT}">x</a></p></main>`), []);
	assert.equal(closed('<main><p>no address</p></main>').length, 1);
	assert.ok(closed(formPage()).some((p) => p.includes('<form>')));
});

test('checkProductScripts: Turnstile\'s script only where allowTurnstile', () => {
	const html = `<script async defer src="${TURNSTILE_SRC}"></script>`;
	assert.equal(checkProductScripts(html).length, 1);
	assert.deepEqual(checkProductScripts(html, () => null, { allowTurnstile: true }), []);
	assert.equal(checkProductScripts('<script src="https://evil.example/a.js"></script>', () => null, { allowTurnstile: true }).length, 1);
});

test('result pages: noindex, linked from nowhere, out of the sitemap', () => {
	assert.deepEqual(checkResultPage('<meta name="robots" content="noindex, nofollow">'), []);
	assert.equal(checkResultPage('<title>x</title>').length, 1);
	assert.deepEqual(checkResultLinks('<a href="/site/zaiavka/">form</a>'), []);
	assert.equal(checkResultLinks('<a href="/site/zaiavka/diakuiemo/">x</a>').length, 1);
	assert.equal(checkResultLinks('<a href="../zaiavka/pomylka/bot/">x</a>').length, 1);
	assert.deepEqual(checkSitemapResults('<loc>https://x.test/site/zaiavka/</loc>'), []);
	assert.equal(checkSitemapResults('<loc>https://x.test/site/zaiavka/pomylka/bot/</loc>').length, 1);
	assert.ok(isResultRel('zaiavka/diakuiemo/index.html'.split('/').join(sep)));
	assert.ok(!isResultRel('zaiavka/index.html'.split('/').join(sep)));
});

