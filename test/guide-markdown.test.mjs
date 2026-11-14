import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml } from 'satteri';
import { guideHastPlugin } from '../src/lib/guide-markdown.mjs';

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
