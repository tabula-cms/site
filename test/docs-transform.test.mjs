import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	rewriteLink,
	transformLinks,
	relativeHref,
	pageUrl,
	extractTitle,
	removeBackLink,
	computeOrder,
	buildFrontmatter,
	buildPageFrontmatter,
	githubEditUrl,
	outputFileName,
	resolveRepoPath,
	classifyRepoPath,
	IMPORTED_FOLDERS,
	PUBLISHED_FOLDERS,
	insertClips,
	clipFigure,
	CLIPS_URL,
	CLIP_CREDIT_TEXT,
} from '../scripts/lib/docs-transform.mjs';

const REF = 'main';
const alwaysExists = () => true;

test('link rewriting: folder index -> leaf (docs/editor/README.md -> bekapy.md)', () => {
	const result = rewriteLink('bekapy.md', {
		fromRepoPath: 'docs/editor/README.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(result.href, 'bekapy/');
	assert.equal(result.kind, 'relative');
});

test('link rewriting: leaf -> leaf (docs/editor/novyny.md -> bekapy.md)', () => {
	const result = rewriteLink('bekapy.md', {
		fromRepoPath: 'docs/editor/novyny.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(result.href, '../bekapy/');
});

test('link rewriting: cross-folder (docs/dev/README.md -> ../install/README.md)', () => {
	const result = rewriteLink('../install/README.md', {
		fromRepoPath: 'docs/dev/README.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(result.href, '../install/');
});

test('link rewriting: cross-folder with a Cyrillic anchor', () => {
	// docs/install/vstanovlennia.md -> ../editor/korystuvachi.md#перше-налаштування-нового-сайту
	const result = rewriteLink('../editor/korystuvachi.md#перше-налаштування-нового-сайту', {
		fromRepoPath: 'docs/install/vstanovlennia.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(result.href, '../../editor/korystuvachi/#перше-налаштування-нового-сайту');
});

test('link rewriting: a link leaving docs/ becomes an absolute GitHub link', () => {
	// docs/install/vstanovlennia.md -> ../../SECURITY.md
	const result = rewriteLink('../../SECURITY.md', {
		fromRepoPath: 'docs/install/vstanovlennia.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(result.href, 'https://github.com/tabula-cms/tabula/blob/main/SECURITY.md');
	assert.equal(result.kind, 'github');
});

test('link rewriting: a link into docs/INDEX.md also becomes an absolute GitHub link (not published)', () => {
	// docs/qa/README.md -> ../INDEX.md
	const result = rewriteLink('../INDEX.md', {
		fromRepoPath: 'docs/qa/README.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(result.href, 'https://github.com/tabula-cms/tabula/blob/main/docs/INDEX.md');
	assert.equal(result.kind, 'github');
});

test('link rewriting: a link into docs/issues/ becomes an absolute GitHub link', () => {
	const result = rewriteLink('../issues/cms/_PARENT.md', {
		fromRepoPath: 'docs/dev/README.md',
		ref: 'develop',
		fileExists: alwaysExists,
	});
	assert.equal(
		result.href,
		'https://github.com/tabula-cms/tabula/blob/develop/docs/issues/cms/_PARENT.md',
	);
});

test('link rewriting: http(s) and mailto links are left untouched', () => {
	const http = rewriteLink('https://github.com/tabula-cms/tabula', {
		fromRepoPath: 'docs/install/vstanovlennia.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(http.href, 'https://github.com/tabula-cms/tabula');
	assert.equal(http.kind, 'unchanged');

	const mailto = rewriteLink('mailto:admin@example.test', {
		fromRepoPath: 'docs/install/vstanovlennia.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(mailto.kind, 'unchanged');

	const anchorOnly = rewriteLink('#decision', {
		fromRepoPath: 'docs/dev/licensing.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(anchorOnly.href, '#decision');
	assert.equal(anchorOnly.kind, 'unchanged');
});

test('link rewriting: a link into docs/audits/ or docs/design/ is a warned GitHub link, not just a plain one', () => {
	const audits = rewriteLink('../audits/2026-09-26-global-review.md', {
		fromRepoPath: 'docs/dev/README.md',
		ref: 'develop',
		fileExists: alwaysExists,
	});
	assert.equal(
		audits.href,
		'https://github.com/tabula-cms/tabula/blob/develop/docs/audits/2026-09-26-global-review.md',
	);
	assert.equal(audits.kind, 'github');
	assert.match(audits.warning, /docs\/audits\//);

	const design = rewriteLink('../design/redesign-2026/README.md', {
		fromRepoPath: 'docs/dev/README.md',
		ref: 'develop',
		fileExists: alwaysExists,
	});
	assert.match(design.warning, /docs\/design\//);

	// A plain out-of-docs link (SECURITY.md, tested above) gets no such warning.
	const security = rewriteLink('../../SECURITY.md', {
		fromRepoPath: 'docs/install/vstanovlennia.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(security.warning, undefined);
});

test('resolveRepoPath: a target starting with "/" resolves from the repository root, ignoring the current directory', () => {
	assert.equal(resolveRepoPath('docs/editor/novyny.md', '/SECURITY.md'), 'SECURITY.md');
	assert.equal(resolveRepoPath('docs/dev/architecture.md', '/docs/install/README.md'), 'docs/install/README.md');
});

test('classifyRepoPath: only a ".md" file in one of the four folders is a page', () => {
	assert.deepEqual(classifyRepoPath('docs/editor/novyny.md'), {
		published: true,
		folder: 'editor',
		fileName: 'novyny.md',
	});
	// A non-Markdown file in one of the four folders (none exist today) is not a page — it must
	// become a GitHub link like anything else outside the published set, not be treated as a
	// page with a nonsensical slug.
	assert.deepEqual(classifyRepoPath('docs/editor/screenshot.png'), { published: false });
});

test('link rewriting: a non-.md file in an imported folder becomes a GitHub link, not a page', () => {
	const result = rewriteLink('screenshot.png', {
		fromRepoPath: 'docs/editor/novyny.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(result.kind, 'github');
	assert.equal(result.href, 'https://github.com/tabula-cms/tabula/blob/main/docs/editor/screenshot.png');
});

test('link rewriting: warns when the internal target does not exist in the source', () => {
	const result = rewriteLink('nema-takoi.md', {
		fromRepoPath: 'docs/editor/novyny.md',
		ref: REF,
		fileExists: () => false,
	});
	assert.equal(result.kind, 'relative');
	assert.match(result.warning, /does not exist in source/);
	assert.match(result.warning, /docs\/editor\/nema-takoi\.md/);
});

test('transformLinks: a link inside a fenced code block is left untouched', () => {
	const body = [
		'Some text with [a link](bekapy.md).',
		'',
		'```md',
		'Not a real link: [text](bekapy.md)',
		'```',
		'',
		'More text.',
	].join('\n');
	const rewrite = (target) =>
		rewriteLink(target, { fromRepoPath: 'docs/editor/novyny.md', ref: REF, fileExists: alwaysExists });
	const result = transformLinks(body, rewrite);
	assert.match(result, /\[a link\]\(\.\.\/bekapy\/\)/);
	assert.match(result, /\[text\]\(bekapy\.md\)/); // untouched inside the fence
});

test('transformLinks: a fenced code block indented inside a list item is left untouched', () => {
	const body = [
		'- Item text:',
		'  ```md',
		'  [fake link](bekapy.md)',
		'  ```',
		'- Next item.',
	].join('\n');
	const rewrite = (target) =>
		rewriteLink(target, { fromRepoPath: 'docs/editor/novyny.md', ref: REF, fileExists: alwaysExists });
	const result = transformLinks(body, rewrite);
	assert.equal(result, body); // nothing to rewrite outside the fence, fence itself untouched
});

test('transformLinks: a link inside inline code is left untouched, even one that looks like an image', () => {
	// The real case from docs/editor/storinky.md: an example line wrapped in inline code.
	const body = 'Рядок `![Підпис до фото](адреса)` — замініть підпис.';
	const rewrite = (target) =>
		rewriteLink(target, { fromRepoPath: 'docs/editor/storinky.md', ref: REF, fileExists: alwaysExists });
	const result = transformLinks(body, rewrite);
	assert.equal(result, body);
});

test('transformLinks: counts links rewritten to GitHub and collects warnings via the stats accumulator', () => {
	const body = '[a](bekapy.md) and [b](../../SECURITY.md) and [c](nema-takoi.md)';
	const rewrite = (target) =>
		rewriteLink(target, { fromRepoPath: 'docs/editor/novyny.md', ref: REF, fileExists: () => false });
	const stats = { githubRewrites: 0, warnings: [] };
	transformLinks(body, rewrite, stats);
	assert.equal(stats.githubRewrites, 1);
	assert.equal(stats.warnings.length, 2); // bekapy.md and nema-takoi.md both "don't exist" here
});

test('extractTitle: removes the first # heading and returns its text', () => {
	const markdown = '# Users, passwords\n\n[← Back](README.md)\n\nBody text.\n';
	const { title, body } = extractTitle(markdown);
	assert.equal(title, 'Users, passwords');
	assert.equal(body, '[← Back](README.md)\n\nBody text.\n');
});

test('link rewriting: a title and angle brackets in the target are parsed correctly and a query string is handled', () => {
	const withTitle = rewriteLink('bekapy.md "See backups"', {
		fromRepoPath: 'docs/editor/novyny.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(withTitle.href, '../bekapy/ "See backups"');

	const withBrackets = rewriteLink('<../../SECURITY.md>', {
		fromRepoPath: 'docs/install/vstanovlennia.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(withBrackets.href, 'https://github.com/tabula-cms/tabula/blob/main/SECURITY.md');

	// A query string is kept on a GitHub link (meaningful there) but dropped from a page link
	// (no real page has one to preserve).
	const githubQuery = rewriteLink('../../SECURITY.md?plain=1', {
		fromRepoPath: 'docs/install/vstanovlennia.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(githubQuery.href, 'https://github.com/tabula-cms/tabula/blob/main/SECURITY.md?plain=1');

	const pageQuery = rewriteLink('bekapy.md?foo=1', {
		fromRepoPath: 'docs/editor/novyny.md',
		ref: REF,
		fileExists: alwaysExists,
	});
	assert.equal(pageQuery.href, '../bekapy/');
});

test('transformLinks: a reference-style link definition outside code is warned about, not rewritten', () => {
	const body = '[label]: bekapy.md "Title"\n\nSome text [inline](bekapy.md).\n';
	const rewrite = (target) =>
		rewriteLink(target, { fromRepoPath: 'docs/editor/novyny.md', ref: REF, fileExists: alwaysExists });
	const stats = { githubRewrites: 0, warnings: [] };
	const result = transformLinks(body, rewrite, stats);
	assert.match(result, /^\[label\]: bekapy\.md "Title"$/m); // untouched
	assert.match(result, /\[inline\]\(\.\.\/bekapy\/\)/); // normal link still rewritten
	assert.ok(stats.warnings.some((w) => /reference-style link definition/.test(w)));
});

test('extractTitle: strips a closing "#" run from "# Title #" but not a word genuinely ending in "#"', () => {
	assert.equal(extractTitle('# Title #\n\nBody.\n').title, 'Title');
	assert.equal(extractTitle('# Title ###\n\nBody.\n').title, 'Title');
	assert.equal(extractTitle('# C#\n\nBody.\n').title, 'C#');
});

test('removeBackLink: a back-link alone drops the whole line and the blank line(s) it leaves', () => {
	const body = '[← До змісту посібника](README.md)\n\n## Навіщо\n\nText.\n';
	assert.equal(removeBackLink(body), '## Навіщо\n\nText.\n');
});

test('removeBackLink: real multi-segment navigation line (docs/install/vstanovlennia.md) drops entirely', () => {
	// [← back] · [contents -> README.md] · [Далі: next ->] — every segment is pure navigation,
	// so nothing survives and the whole line goes, unlike the old rule which only stripped the
	// first segment and left "[До змісту](README.md) · Далі: [...→](...)" behind.
	const body =
		'[← Домен і сервер](domen-i-server.md) · [До змісту](README.md) · Далі: [Бекапи і відновлення →](bekapy-i-vidnovlennia.md)\n\n## Крок 1\n';
	assert.equal(removeBackLink(body), '## Крок 1\n');
});

test('removeBackLink: real dev "Deep reference" line (docs/dev/architecture.md) keeps the non-navigation segment', () => {
	// The back-link's own line wraps onto a second raw line (soft-wrapped prose); removeBackLink
	// only ever touches the first line, so the wrapped continuation is untouched either way.
	const body =
		'[← Developer docs](README.md) · Deep reference: [`CLAUDE.md`](../../CLAUDE.md) (sections\n"Routing", "The admin panel", "Content-Security-Policy")\n';
	assert.equal(
		removeBackLink(body),
		'Deep reference: [`CLAUDE.md`](../../CLAUDE.md) (sections\n"Routing", "The admin panel", "Content-Security-Policy")\n',
	);
});

test('removeBackLink: back-link + " · " + trailing text with a link keeps the remainder, not the whole line', () => {
	// Real case, docs/dev/public-snapshot.md: the checklist cross-reference must survive so the
	// normal link rewriter still turns it into a proper relative link.
	const body =
		'[← Developer docs](README.md) · Checklist: [publishing-checklist.md](publishing-checklist.md)\n\n## Heading\n';
	assert.equal(
		removeBackLink(body),
		'Checklist: [publishing-checklist.md](publishing-checklist.md)\n\n## Heading\n',
	);
});

test('removeBackLink: also strips a " — " or " | " separator, not just " · "', () => {
	assert.equal(
		removeBackLink('[← Back](README.md) — See also: [x](x.md)\n'),
		'See also: [x](x.md)\n',
	);
	assert.equal(removeBackLink('[← Back](README.md) | [x](x.md)\n'), '[x](x.md)\n');
});

test('removeBackLink: a "Далі: [... →](...)" segment is dropped even though its target is not README.md', () => {
	const body = '[← До змісту](README.md) · Далі: [Встановлення →](vstanovlennia.md)\n';
	assert.equal(removeBackLink(body), '');
});

test('removeBackLink: a line that does not start with "[←" is left untouched', () => {
	const body = '## Heading\n\nText with [a link](x.md).\n';
	assert.equal(removeBackLink(body), body);
});

test('computeOrder: orders pages by first appearance in docs/INDEX.md, index.md excluded', () => {
	const indexMd = [
		'| [`editor/`](editor/README.md) | ... |',
		'',
		'### Editor guide',
		'',
		'| [README.md](editor/README.md) | ... |',
		'| [novyny.md](editor/novyny.md) | ... |',
		'| [storinky.md](editor/storinky.md) | ... |',
	].join('\n');
	const order = computeOrder(indexMd, 'editor', ['README.md', 'novyny.md', 'storinky.md']);
	// README.md's own first-appearance rank (1, from the overview table) is not returned — the
	// caller always uses order 0 for index.md, overriding whatever rank it computes to here.
	assert.equal(order.has('README.md'), false);
	// novyny.md and storinky.md keep their natural rank in the full appearance sequence (2, 3),
	// leaving a gap at 1 where README.md was — harmless for sidebar.order, which only needs a
	// consistent relative ordering, not a dense 1..N range.
	assert.equal(order.get('novyny.md'), 2);
	assert.equal(order.get('storinky.md'), 3);
});

test('computeOrder: pages missing from INDEX.md go after the known ones, alphabetically', () => {
	const indexMd = '| [novyny.md](editor/novyny.md) | ... |\n| [storinky.md](editor/storinky.md) | ... |';
	const order = computeOrder(indexMd, 'editor', ['novyny.md', 'storinky.md', 'zzz.md', 'aaa.md']);
	assert.equal(order.get('novyny.md'), 1);
	assert.equal(order.get('storinky.md'), 2);
	assert.equal(order.get('aaa.md'), 3);
	assert.equal(order.get('zzz.md'), 4);
});

test('editUrl mapping: index.md maps back to README.md', () => {
	assert.equal(outputFileName('README.md'), 'index.md');
	const url = githubEditUrl('main', 'editor', 'README.md');
	assert.equal(url, 'https://github.com/tabula-cms/tabula/edit/main/docs/editor/README.md');
	assert.match(url, /\/README\.md$/);
});

test('frontmatter serialisation: a title with a colon and quotes stays valid, unambiguous YAML', () => {
	const block = buildPageFrontmatter({
		title: 'Users: "roles" and access',
		order: 3,
		editUrl: 'https://github.com/tabula-cms/tabula/edit/main/docs/editor/korystuvachi.md',
	});
	assert.equal(
		block,
		'---\n' +
			'title: "Users: \\"roles\\" and access"\n' +
			'sidebar:\n' +
			'  order: 3\n' +
			'editUrl: "https://github.com/tabula-cms/tabula/edit/main/docs/editor/korystuvachi.md"\n' +
			'---\n\n',
	);
});

test('frontmatter serialisation: lang is only included when given (dev/ pages)', () => {
	const withLang = buildPageFrontmatter({ title: 'Architecture', lang: 'en', order: 1, editUrl: 'x' });
	assert.match(withLang, /^lang: "en"$/m);
	const withoutLang = buildPageFrontmatter({ title: 'Сторінки', order: 1, editUrl: 'x' });
	assert.doesNotMatch(withoutLang, /^lang:/m);
});

test('pageUrl and relativeHref agree on the same-page case (./ when equal)', () => {
	const url = pageUrl('editor', 'README.md');
	assert.equal(relativeHref(url, url), './');
});

test('buildFrontmatter preserves field order as given', () => {
	const block = buildFrontmatter([
		['title', 'X'],
		['lang', 'en'],
		['sidebar', { order: 0 }],
		['editUrl', 'https://example.test'],
	]);
	const lines = block.split('\n');
	assert.equal(lines[1], 'title: "X"');
	assert.equal(lines[2], 'lang: "en"');
	assert.equal(lines[3], 'sidebar:');
	assert.equal(lines[4], '  order: 0');
	assert.equal(lines[5], 'editUrl: "https://example.test"');
});

test('unlinkOutside: a link into an unpublished folder or out of docs/ keeps its text and loses the link', () => {
	const ctx = {
		fromRepoPath: 'docs/editor/korystuvachi.md',
		ref: REF,
		fileExists: alwaysExists,
		folders: PUBLISHED_FOLDERS,
		unlinkOutside: true,
	};
	assert.deepEqual(rewriteLink('../install/shcho-robyty-yakshcho.md', ctx), { href: '', kind: 'unlinked' });
	assert.equal(rewriteLink('../../SECURITY.md', ctx).kind, 'unlinked');
	assert.equal(rewriteLink('novyny.md', ctx).href, '../novyny/');
	assert.equal(rewriteLink('https://example.org/', ctx).kind, 'unchanged');
	const stats = { githubRewrites: 0, warnings: [] };
	const body = 'Див. [Встановлення › Що робити](../install/shcho-robyty-yakshcho.md) і [Новини](novyny.md).';
	const result = transformLinks(body, (target) => rewriteLink(target, ctx), stats);
	assert.equal(result, 'Див. Встановлення › Що робити і [Новини](../novyny/).');
	assert.equal(stats.unlinked, 1);
	assert.equal(stats.githubRewrites, 0);
});

test('PUBLISHED_FOLDERS: only the editor guide is published', () => {
	assert.deepEqual(PUBLISHED_FOLDERS, ['editor']);
	assert.ok(PUBLISHED_FOLDERS.every((folder) => IMPORTED_FOLDERS.includes(folder)));
});

test('extractTitle: an HTML comment marker in the heading is not part of the title', () => {
	assert.equal(extractTitle('# Сайт на хостингу<!-- hosted -->\n\nBody.\n').title, 'Сайт на хостингу');
});

// The guide's clips (issue #55).
const CLIPS = new Set(['novyny-napysaty', 'nalashtuvannia-vyhliad']);
const clipCtx = { title: 'Як написати й опублікувати новину', fromUrl: pageUrl('editor', 'novyny-napysaty.md'), clips: CLIPS };

test('insertClips: a marker with an existing clip becomes one player with its poster, source and credit', () => {
	const body = '**Де знайти:** меню › «Новини».\n\n<!-- video: novyny-napysaty -->\n\n1. Відкрийте «Новини».\n';
	const result = insertClips(body, clipCtx);
	assert.deepEqual(result.shown, ['novyny-napysaty']);
	assert.deepEqual(result.missing, []);
	const lines = result.body.split('\n');
	assert.equal(lines.length, body.split('\n').length, 'the player takes the marker\'s line and nothing else moves');
	assert.equal(
		lines[2],
		'<figure class="guide-clip">' +
			'<video controls preload="none" playsinline poster="../../guide/clips/novyny-napysaty.webp" width="1280" height="720" aria-label="Відео: Як написати й опублікувати новину">' +
			'<source src="../../guide/clips/novyny-napysaty.mp4" type="video/mp4"></video>' +
			'<figcaption>Музика: «Easy Lemon» — Kevin MacLeod (incompetech.com), ліцензія <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0</a>. Трек скорочено й приглушено.</figcaption>' +
			'</figure>',
	);
	assert.doesNotMatch(result.body, /<!--|autoplay/);
	assert.equal((result.body.match(/<video\b/g) ?? []).length, 1);
	assert.equal((result.body.match(/<source\b/g) ?? []).length, 1);
});

test('insertClips: a marker whose clip is missing gives no player, stays as written and is reported', () => {
	const body = 'Текст.\n\n<!-- video: foto-albom -->\n\n1. Крок.\n';
	const result = insertClips(body, clipCtx);
	assert.equal(result.body, body);
	assert.deepEqual(result.shown, []);
	assert.deepEqual(result.missing, ['foto-albom']);
});

test('insertClips: a page without a marker is returned unchanged', () => {
	const body = 'Текст.\n\n<!-- screenshot: novyny/forma -->\n\n## Свій домен<!-- hosted -->\n\nСлово video: novyny-napysaty у реченні.\n';
	const result = insertClips(body, clipCtx);
	assert.equal(result.body, body);
	assert.deepEqual([result.shown, result.missing], [[], []]);
});

test('insertClips: the files are linked relative to the page, so any base works; the folder index is one level up', () => {
	assert.match(clipFigure({ name: 'a', title: 'T', fromUrl: pageUrl('editor', 'README.md') }), /poster="\.\.\/guide\/clips\/a\.webp".*src="\.\.\/guide\/clips\/a\.mp4"/);
	assert.match(clipFigure({ name: 'a', title: 'T', fromUrl: pageUrl('editor', 'x.md') }), /poster="\.\.\/\.\.\/guide\/clips\/a\.webp"/);
	assert.equal(CLIPS_URL, '/guide/clips/');
});

test('insertClips: the title is escaped in the accessible name; without a title the name is «Відео»', () => {
	assert.match(clipFigure({ name: 'a', title: 'Теги <b> & "лапки"', fromUrl: '/editor/x/' }), /aria-label="Відео: Теги &lt;b&gt; &amp; &quot;лапки&quot;"/);
	assert.match(clipFigure({ name: 'a', title: '', fromUrl: '/editor/x/' }), /aria-label="Відео"/);
});

test('insertClips: a marker in a fenced code block or inside a line is not a marker; an indented one keeps its indent', () => {
	const fenced = '```html\n<!-- video: novyny-napysaty -->\n```\n';
	assert.equal(insertClips(fenced, clipCtx).body, fenced);
	const inline = 'Пишіть `<!-- video: novyny-napysaty -->` окремим рядком.\n';
	assert.equal(insertClips(inline, clipCtx).body, inline);
	const indented = insertClips('1. Крок.\n\n   <!-- video: novyny-napysaty -->\n', clipCtx);
	assert.match(indented.body, /\n {3}<figure class="guide-clip">/);
	// A name is a slug: nothing that could be a path is taken for a clip.
	const odd = '<!-- video: ../novyny-napysaty -->\n';
	assert.deepEqual(insertClips(odd, clipCtx), { body: odd, shown: [], missing: [] });
});

test('insertClips: one clip may be marked on several pages; each marker of a page is counted', () => {
	const result = insertClips('<!-- video: nalashtuvannia-vyhliad -->\n\n<!--video:novyny-napysaty-->\n', clipCtx);
	assert.deepEqual(result.shown, ['nalashtuvannia-vyhliad', 'novyny-napysaty']);
	assert.equal(CLIP_CREDIT_TEXT, 'Музика: «Easy Lemon» — Kevin MacLeod (incompetech.com), ліцензія Creative Commons Attribution 4.0. Трек скорочено й приглушено.');
});
