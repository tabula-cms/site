import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typo, typoHtml, slugUk, NBSP } from '../src/lib/typo.mjs';

const nb = (s) => s.replaceAll('_', NBSP);

test('typo: no-break spaces in numbers, before units, after abbreviations, in dates, before a dash', () => {
	assert.equal(typo('4 800 грн'), nb('4_800_грн'));
	assert.equal(typo('1 000 000 євро'), nb('1_000_000_євро'));
	assert.equal(typo('ставка 5 %'), nb('ставка 5_%'));
	assert.equal(typo('4 800 ₴'), nb('4_800_₴'));
	assert.equal(typo('4 800'), nb('4_800'));
	assert.equal(typo('постанова № 305, ст. 30, ч. 3, п. 177.8'), nb('постанова №_305, ст._30, ч._3, п._177.8'));
	assert.equal(typo('до 31 грудня 2026 року'), nb('до 31_грудня_2026_року'));
	assert.equal(typo('Сайт — ваш'), nb('Сайт_— ваш'));
	// what must stay as it is
	assert.equal(typo('з 2026 року ми'), nb('з 2026_року ми'));
	assert.equal(typo('КЕКВ 2240 «Оплата»'), 'КЕКВ 2240 «Оплата»');
	assert.equal(typo('3–4 години'), '3–4 години');
	assert.equal(typo(''), '');
});

test('typoHtml: text only — not tags, attributes, scripts, styles or code', () => {
	assert.equal(typoHtml('<a title="4 800 грн">4 800 грн</a>'), nb('<a title="4 800 грн">4_800_грн</a>'));
	assert.equal(typoHtml('<code>a — b</code> a — b'), nb('<code>a — b</code> a_— b'));
	assert.equal(typoHtml('<script>x = "4 800 грн"</script>'), '<script>x = "4 800 грн"</script>');
	assert.equal(typoHtml('<pre><b>1 000</b></pre><p>1 000</p>'), nb('<pre><b>1 000</b></pre><p>1_000</p>'));
});

test('slugUk: the national transliteration, word-initial forms, «зг»', () => {
	assert.equal(slugUk('Хто ми'), 'khto-my');
	assert.equal(slugUk('Як оформити: від пробного періоду до оплати'), 'yak-oformyty-vid-probnoho-periodu-do-oplaty');
	assert.equal(slugUk('Що має зʼявлятися на сайті вчасно'), 'shcho-maie-ziavliatysia-na-saiti-vchasno');
	assert.equal(slugUk('Згода'), 'zghoda');
	assert.equal(slugUk('Їжа й Європа'), 'yizha-y-yevropa');
	assert.equal(slugUk('Джерела'), 'dzherela');
});
