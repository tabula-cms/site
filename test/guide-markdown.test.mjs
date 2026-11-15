import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml } from 'satteri';
import { createGuideHastPlugin, guideHastPlugin } from '../src/lib/guide-markdown.mjs';
import { buildGuideStructure } from '../src/lib/guide-structure.mjs';
import { HOSTED_LINE } from '../src/lib/guide-layout.mjs';

const docs = new URL('file:///repo/src/content/docs/editor/x.md');
const pages = new URL('file:///repo/src/content/pages/x.md');
const render = (md, fileURL = docs) => markdownToHtml(md, { hastPlugins: [guideHastPlugin], fileURL }).html;

test('a paragraph with one image becomes a figure; the alt text is the caption and the image gets alt=""', () => {
	const html = render('![Форма «Нова публікація».](img/a.webp)\n');
	assert.match(html, /<figure class="guide-shot"><img src="img\/a\.webp" alt=""><figcaption>Форма «Нова публікація»\.<\/figcaption><\/figure>/);
});

test('an image with an empty alt gets no caption; a paragraph with text and an image stays a paragraph', () => {
	assert.doesNotMatch(render('![](img/a.webp)\n'), /figcaption/);
	assert.match(render('Текст ![Опис](img/a.webp) ще.\n'), /<p>Текст <img[^>]*alt="Опис"/);
});

test('HTML comments are dropped, in blocks and in headings', () => {
	const html = render('<!-- video: x -->\n\n## Свій домен<!-- hosted -->\n\nТекст\n');
	assert.doesNotMatch(html, /<!--/);
	assert.match(html, /<h2>Свій домен<\/h2>/);
});

test('inline code showing a comment is not touched', () => {
	assert.match(render('Пишіть `<!-- hosted -->` у заголовку.\n'), /<code>&lt;!-- hosted --&gt;<\/code>/);
});

test('«Де знайти:» and the italic role note get their classes', () => {
	const html = render('*Може адміністратор.*\n\n**Де знайти:** меню › «Новини».\n\nЗвичайний абзац.\n');
	assert.match(html, /<p class="guide-role"><em>/);
	assert.match(html, /<p class="guide-where"><strong>Де знайти:<\/strong>/);
	assert.match(html, /<p>Звичайний абзац\.<\/p>/);
	// An emphasis paragraph further down is not a role note.
	assert.doesNotMatch(render('Текст.\n\n*Курсив.*\n'), /guide-role/);
});

test('only the top-level ordered list becomes steps', () => {
	const html = render('1. Один\n2. Два\n   1. вкладений\n\n- маркер\n   1. не крок\n');
	assert.equal((html.match(/guide-steps/g) ?? []).length, 1);
	assert.match(html, /<ol class="guide-steps">/);
});

test('a table is wrapped in a labelled, focusable scroll region named after the heading above it', () => {
	const html = render('## Зміст\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
	assert.match(html, /<div class="guide-table" role="region" tabindex="0" aria-label="Таблиця: Зміст"><table>/);
	assert.match(render('| a |\n|---|\n| 1 |\n'), /aria-label="Таблиця"/);
});

test('a file outside src/content/docs/ is left alone', () => {
	const md = '*Нотатка.*\n\n![Опис](a.webp)\n\n<!-- x -->\n';
	assert.doesNotMatch(render(md, pages), /guide-/);
	assert.match(render(md, pages), /<!-- x -->/);
});

// The two layers (issue #57): src/lib/guide-layout.mjs through the plugin, on a small structure.
const p = (slug, order, extra = {}) => ({ slug, title: `Т ${slug}`, order, hosted: false, short: false, listed: [], clip: false, ...extra });
const guide = buildGuideStructure([
	p('index', 0, { listed: ['panel-ohliad'] }),
	p('panel-ohliad', 1, { short: true }),
	p('pershi-kroky', 2, { listed: ['pochatok-vkhid'] }),
	p('pochatok-vkhid', 3, { short: true, clip: true }),
	p('foto', 10, { listed: ['foto-albom', 'foto-pidpys', 'foto-avtor'] }),
	p('foto-albom', 11, { short: true, clip: true }),
	p('foto-pidpys', 12, { short: true }),
	p('foto-avtor', 13, { short: true }),
	p('pomichnyk', 20, { hosted: true, listed: ['pomichnyk-novyna'] }),
	p('pomichnyk-novyna', 21, { short: true, hosted: true }),
]);
const page = (slug, md, g = guide) =>
	markdownToHtml(md, { hastPlugins: [createGuideHastPlugin(g)], fileURL: new URL(`file:///repo/src/content/docs/editor/${slug}.md`) }).html;

test('a short article: «← topic» first, «Інші статті розділу» last without the article itself, the clip mark', () => {
	const html = page('foto-pidpys', '*Може адміністратор.*\n\n1. Крок.\n\n## Докладніше\n\nТак.\n');
	assert.match(html, /^<p class="guide-topic not-content"><a href="\.\.\/foto\/">← Фото й альбоми<\/a><\/p><p class="guide-role">/);
	const siblings = html.slice(html.indexOf('guide-siblings'));
	assert.match(siblings, /<h2 id="inshi-statti-rozdilu">Інші статті розділу<\/h2>/);
	assert.match(siblings, /href="\.\.\/foto-albom\/">Т foto-albom<\/a> <span class="guide-clip-mark">/);
	assert.match(siblings, /href="\.\.\/foto-avtor\/"/);
	assert.doesNotMatch(siblings, /foto-pidpys/);
	assert.doesNotMatch(html, /guide-hosted/);
});

test('a hosted-only page carries the hosted line, a short article under its back link; an article alone has no «Інші статті»', () => {
	const html = page('pomichnyk-novyna', '1. Крок.\n\n## Докладніше\n\nТак.\n');
	assert.match(html, new RegExp(`^<p class="guide-topic[^"]*"><a href="\\.\\./pomichnyk/">← Помічник</a></p><p class="guide-hosted not-content">${HOSTED_LINE}</p>`));
	assert.doesNotMatch(html, /guide-siblings/);
	assert.match(page('pomichnyk', 'Текст.\n'), /^<p class="guide-hosted not-content">/);
});

test('a long page: the list of its articles above the first ## becomes the task block, titled by the line before it', () => {
	const html = page('foto', 'Короткі статті на одне завдання:\n\n- [Альбом](../foto-albom/)\n- [Підпис](../foto-pidpys/)\n\n## Навіщо\n\n- [Альбом](../foto-albom/)\n');
	assert.match(html, /<nav class="guide-tasks not-content" aria-label="Короткі статті на одне завдання"><p class="guide-tasks__title">Короткі статті на одне завдання<\/p><ul class="guide-tasks__list">/);
	assert.match(html, /<li><a href="\.\.\/foto-albom\/">Альбом<\/a> <span class="guide-clip-mark"><svg aria-hidden="true"/);
	assert.doesNotMatch(html, /<p>Короткі статті/);
	// The list under «Навіщо» stays a plain list.
	assert.match(html, /<h2>Навіщо<\/h2>\n<ul>/);
});

const README = [
	'Вступ посібника.',
	'Назви кнопок.',
	'Короткі статті про панель:',
	'- [Огляд](panel-ohliad/)',
	'## Найчастіше',
	'Шість завдань:',
	'- [Додати фото](foto-albom/)',
	'- [Розділ](foto/#розділ)',
	'Ще не налаштували сайт? Почніть із [Входу](pochatok-vkhid/). Усі — на сторінці [Перші кроки](pershi-kroky/).',
	'## Зміст',
	'Розділи панелі:',
	'| a | b |\n|---|---|\n| 1 | [x](foto/) |',
	'## Огляд',
	'Текст огляду.',
].join('\n\n');

test('the landing: the lead, «Найчастіше» as cards, «Почніть тут», the areas instead of the contents table', () => {
	const html = page('index', README);
	assert.match(html, /<p class="guide-lead">Вступ посібника\.<\/p>/);
	assert.match(html, /<p class="guide-intro-note">Назви кнопок\.<\/p>/);
	assert.doesNotMatch(html, /Короткі статті про панель|panel-ohliad\/">Огляд/);
	assert.match(html, /<ul class="guide-cards not-content"><li><a class="guide-card" href="foto-albom\/"><span class="guide-card__topic">Фото й альбоми<\/span><span class="guide-card__title">Додати фото<\/span><span class="guide-clip-mark">/);
	assert.match(html, /href="foto\/#[^"]+"><span class="guide-card__topic">Фото й альбоми<\/span>/);
	assert.match(html, /<h2 id="pochnit-tut" class="guide-landing-h2">Почніть тут<\/h2><ol class="guide-start not-content"><li><a class="guide-card" href="pochatok-vkhid\/">/);
	assert.match(html, /<p class="guide-start__more not-content"><a href="pershi-kroky\/">Перші кроки →<\/a><\/p>/);
	assert.doesNotMatch(html, /<table>|Розділи панелі/);
	assert.match(html, /<h2 class="guide-landing-h2">Зміст<\/h2><div class="guide-areas not-content">/);
	assert.match(html, /<h3 id="area-pochaty" class="guide-area__title">Почати<\/h3><p class="guide-area__count">1\u00a0стаття<\/p>/);
	// README's own topic (the panel's articles) opens its first article.
	assert.match(html, /<a href="panel-ohliad\/">Панель<\/a>/);
	assert.match(html, /<h2>Огляд<\/h2>\n<p>Текст огляду\.<\/p>/);
});

test('the old guide (no short articles): the landing and the pages are left as they are', () => {
	const old = buildGuideStructure([p('index', 0), p('foto', 1), p('khostynh', 2, { hosted: true })]);
	const html = page('index', README, old);
	assert.doesNotMatch(html, /guide-(cards|areas|lead|start)/);
	assert.match(html, /<table>/);
	assert.doesNotMatch(page('foto', '- [A](../a/)\n\n## B\n', old), /guide-tasks/);
	// The hosted line is the page's own mark: shown with the old guide too.
	assert.match(page('khostynh', 'Текст.\n', old), /^<p class="guide-hosted/);
});
