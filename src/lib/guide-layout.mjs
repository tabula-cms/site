// The two-layer guide's page structure (issue #57), applied by the Sätteri hast plugin of src/lib/guide-markdown.mjs
// in its `before` hook, from the guide's structure (src/lib/guide-structure.mjs). It moves and wraps the guide's own
// HTML and adds only short labels («Почніть тут», «Інші статті розділу», the hosted line, «відео»); it never writes
// guide text. With no short articles (the old guide) only the hosted line is added; nothing else changes.
//
//   - The landing (README.md, `/editor/`): the lead's first paragraph is the lead of the page, the rest of the lead a
//     quieter note; the lead's list of the panel's articles leaves (its articles are the «Панель» topic of the areas);
//     «Найчастіше» becomes task cards; the README's «Ще не налаштували сайт?» paragraph becomes «Почніть тут», its
//     articles as numbered cards; «Зміст» loses its paragraph and its long table and shows the areas as cards with their
//     topics and the number of short articles. The sections below stay as they are (other pages link their anchors).
//   - A long page with short articles: its list of them above the first `##` becomes the task block
//     (`nav.guide-tasks`), with the clip mark on the articles that have a clip.
//   - A short article: «← <topic>» and, for a hosted-only article, «Лише на сайтах, що працюють на хостингу Tabula» before
//     its text; «Інші статті розділу» (the topic's other articles) after it. A hosted-only long page gets the same line
//     (also with the old guide: it is the page's own mark, not part of the two layers).

import { articlesCount, guideHref } from './guide-structure.mjs';

export const HOSTED_LINE = 'Лише на сайтах, що працюють на хостингу Tabula';
export const SIBLINGS_HEADING = 'Інші статті розділу';
export const START_HEADING = 'Почніть тут';
export const SIBLINGS_ID = 'inshi-statti-rozdilu';
export const START_ID = 'pochnit-tut';

const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const isEl = (node, name) => node?.type === 'element' && (!name || node.tagName === name);
const elements = (node) => (node.children ?? []).filter((child) => child.type === 'element');

/** The guide slug a relative href written by the import (`../novyny/`, `novyny/` from the index) points at, or null. */
export function slugOfHref(href, fromSlug) {
	if (typeof href !== 'string') return null;
	const pathPart = href.split('#')[0];
	const re = fromSlug === 'index' ? /^([a-z0-9]+(?:-[a-z0-9]+)*)\/$/ : /^\.\.\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/;
	if (fromSlug !== 'index' && pathPart === '../') return 'index';
	return re.exec(pathPart)?.[1] ?? null;
}

/** The small «відео» mark beside an article that has a clip. */
export function clipMark() {
	return el('span', { className: ['guide-clip-mark'] }, [
		el('svg', { ariaHidden: 'true', width: '14', height: '14', viewBox: '0 0 24 24', fill: 'currentColor' }, [el('path', { d: 'M8 5.5v13l11-6.5z' })]),
		text('відео'),
	]);
}

/** The list items of a topic's articles (the task block, «Інші статті розділу»). */
function articleItems(guide, fromSlug, slugs) {
	return slugs.map((slug) => {
		const page = guide.pages[slug];
		return el('li', {}, [el('a', { href: guideHref(fromSlug, slug) }, [text(page.title)]), ...(page.clip ? [text(' '), clipMark()] : [])]);
	});
}

/** The top-level sections of a page: the lead (before the first h2) and each h2 with what follows it. */
function sections(root) {
	const result = [{ heading: null, nodes: [] }];
	for (const node of elements(root)) {
		if (isEl(node, 'h2')) result.push({ heading: node, nodes: [] });
		else result.at(-1).nodes.push(node);
	}
	return result;
}

const linksIn = (ctx, node, fromSlug) => {
	const found = [];
	const walk = (n) => {
		if (isEl(n, 'a')) found.push({ slug: slugOfHref(n.properties?.href, fromSlug), href: n.properties?.href, label: ctx.textContent(n).trim() });
		else for (const child of elements(n)) walk(child);
	};
	walk(node);
	return found;
};

const endsWithColon = (ctx, node) => isEl(node, 'p') && /:\s*$/.test(ctx.textContent(node));

/** The task block of a long page. */
function longPage(root, ctx, guide, slug) {
	const topic = guide.topics[slug];
	if (!topic || topic.articles.length === 0) return;
	const lead = sections(root)[0].nodes;
	const articles = new Set(topic.articles);
	const index = lead.findIndex((node) => isEl(node, 'ul') && linksIn(ctx, node, slug).some((link) => articles.has(link.slug)));
	if (index === -1) return;
	const list = lead[index];
	const before = lead[index - 1];
	const titled = before && endsWithColon(ctx, before);
	const title = titled ? ctx.textContent(before).trim().replace(/:\s*$/, '') : 'Короткі статті';
	const items = elements(list).map((li) => {
		const link = linksIn(ctx, li, slug)[0];
		const page = link?.slug ? guide.pages[link.slug] : null;
		if (!link || !page) return el('li', {}, [text(ctx.textContent(li).trim())]);
		return el('li', {}, [el('a', { href: link.href }, [text(link.label)]), ...(page.clip ? [text(' '), clipMark()] : [])]);
	});
	if (titled) ctx.removeNode(before);
	ctx.replaceNode(
		list,
		el('nav', { className: ['guide-tasks', 'not-content'], ariaLabel: title }, [
			el('p', { className: ['guide-tasks__title'] }, [text(title)]),
			el('ul', { className: ['guide-tasks__list'] }, items),
		]),
	);
}

/** The back link, the hosted line and «Інші статті розділу» of a short article. */
function shortArticle(root, ctx, guide, slug) {
	const parent = guide.parentOf[slug];
	const page = guide.pages[slug];
	const before = [];
	if (parent) {
		const topic = guide.topics[parent];
		before.push(el('p', { className: ['guide-topic', 'not-content'] }, [el('a', { href: guideHref(slug, parent) }, [text(`← ${topic.label}`)])]));
	}
	if (page.hosted) before.push(hostedLine());
	if (before.length > 0) ctx.prependChild(root, before);
	const others = parent ? guide.topics[parent].articles.filter((other) => other !== slug) : [];
	if (others.length === 0) return;
	ctx.appendChild(
		root,
		el('section', { className: ['guide-siblings'], ariaLabelledby: SIBLINGS_ID }, [
			el('h2', { id: SIBLINGS_ID }, [text(SIBLINGS_HEADING)]),
			el('ul', { className: ['guide-tasks__list'] }, articleItems(guide, slug, others)),
		]),
	);
}

/** The line of a page that exists on hosted sites only. */
const hostedLine = () => el('p', { className: ['guide-hosted', 'not-content'] }, [text(HOSTED_LINE)]);

/** The topic label shown on a «Найчастіше» card: the topic of the article (or of the long page) it opens. */
function topicOf(guide, slug) {
	if (!slug) return null;
	return guide.topics[guide.parentOf[slug] ?? slug]?.label ?? null;
}

/** The landing: the guide's README rearranged. */
function landing(root, ctx, guide) {
	const all = sections(root);
	const lead = all[0].nodes;

	// The lead: its first paragraph leads the page; the panel's article list (and the line that introduces it) leaves.
	const firstP = lead.find((node) => isEl(node, 'p'));
	for (const [i, node] of lead.entries()) {
		if (isEl(node, 'ul') && linksIn(ctx, node, 'index').every((link) => guide.pages[link.slug]?.short)) {
			ctx.removeNode(node);
			if (endsWithColon(ctx, lead[i - 1])) ctx.removeNode(lead[i - 1]);
		} else if (node === firstP) {
			ctx.setProperty(node, 'className', ['guide-lead']);
		} else if (isEl(node, 'p') && !endsWithColon(ctx, node)) {
			ctx.setProperty(node, 'className', ['guide-intro-note']);
		}
	}

	const frequent = all.find((s) => s.heading && ctx.textContent(s.heading).trim() === 'Найчастіше');
	if (frequent) {
		ctx.setProperty(frequent.heading, 'className', ['guide-landing-h2']);
		const list = frequent.nodes.find((node) => isEl(node, 'ul'));
		if (list) {
			const cards = elements(list).map((li) => {
				const link = linksIn(ctx, li, 'index')[0];
				if (!link) return el('li', {}, [text(ctx.textContent(li).trim())]);
				const topic = topicOf(guide, link.slug);
				const page = link.slug ? guide.pages[link.slug] : null;
				return el('li', {}, [
					el('a', { className: ['guide-card'], href: link.href }, [
						...(topic ? [el('span', { className: ['guide-card__topic'] }, [text(topic)])] : []),
						el('span', { className: ['guide-card__title'] }, [text(link.label)]),
						...(page?.clip ? [clipMark()] : []),
					]),
				]);
			});
			ctx.replaceNode(list, el('ul', { className: ['guide-cards', 'not-content'] }, cards));
		}
		// «Ще не налаштували сайт? Почніть із …»: the paragraph after the list that links short articles.
		const start = frequent.nodes.find((node) => isEl(node, 'p') && node !== list && linksIn(ctx, node, 'index').some((link) => guide.pages[link.slug]?.short));
		if (start) {
			const links = linksIn(ctx, start, 'index').filter((link) => link.slug && guide.pages[link.slug]);
			const steps = links.filter((link) => guide.pages[link.slug].short);
			const more = links.filter((link) => !guide.pages[link.slug].short);
			ctx.replaceNode(start, [
				el('h2', { id: START_ID, className: ['guide-landing-h2'] }, [text(START_HEADING)]),
				el(
					'ol',
					{ className: ['guide-start', 'not-content'] },
					steps.map((link) =>
						el('li', {}, [
							el('a', { className: ['guide-card'], href: link.href }, [
								el('span', { className: ['guide-card__title'] }, [text(link.label)]),
								...(guide.pages[link.slug].clip ? [clipMark()] : []),
							]),
						]),
					),
				),
				...(more.length > 0
					? [el('p', { className: ['guide-start__more', 'not-content'] }, more.flatMap((link, i) => [...(i > 0 ? [text(' · ')] : []), el('a', { href: link.href }, [text(`${link.label} →`)])]))]
					: []),
			]);
		}
	}

	const contents = all.find((s) => s.heading && ctx.textContent(s.heading).trim() === 'Зміст');
	if (contents) {
		ctx.setProperty(contents.heading, 'className', ['guide-landing-h2']);
		for (const node of contents.nodes) ctx.removeNode(node);
		ctx.insertAfter(contents.heading, areasGrid(guide));
	}
}

/** The areas as cards: each with its topics and the number of short articles. */
export function areasGrid(guide) {
	return el(
		'div',
		{ className: ['guide-areas', 'not-content'] },
		guide.areas.map((area) => {
			const total = area.topics.reduce((sum, slug) => sum + guide.topics[slug].articles.length, 0);
			return el('section', { className: ['guide-area'], ariaLabelledby: `area-${area.id}` }, [
				el('h3', { id: `area-${area.id}`, className: ['guide-area__title'] }, [text(area.label)]),
				...(total > 0 ? [el('p', { className: ['guide-area__count'] }, [text(articlesCount(total))])] : []),
				el(
					'ul',
					{ className: ['guide-area__topics'] },
					area.topics.map((slug) => {
						const topic = guide.topics[slug];
						// README's own topic has no page besides the landing: it opens its first article.
						const target = slug === 'index' ? topic.articles[0] : slug;
						const n = topic.articles.length;
						return el('li', {}, [
							el('a', { href: guideHref('index', target) }, [text(topic.label)]),
							...(n > 0 ? [el('span', { className: ['guide-area__n'] }, [text(articlesCount(n))])] : []),
						]);
					}),
				),
			]);
		}),
	);
}

/**
 * Applies the structure to one page of the guide (the plugin's `before` hook).
 * @param {object} root the hast root
 * @param {object} ctx Sätteri's visitor context
 * @param {ReturnType<import('./guide-structure.mjs').buildGuideStructure> | null} guide
 * @param {string | null} slug the page (file name without `.md`, `index` for README.md); null outside docs/editor/
 */
export function applyGuideLayout(root, ctx, guide, slug) {
	const page = slug ? guide?.pages[slug] : null;
	if (!page) return;
	// The hosted line is the page's own fact: it is shown whatever the guide's shape (a long page can be hosted-only too).
	if (!guide.hasArticles || !page.short) {
		if (page.hosted) ctx.prependChild(root, hostedLine());
		if (!guide.hasArticles) return;
	}
	if (slug === 'index') landing(root, ctx, guide);
	else if (page.short) shortArticle(root, ctx, guide, slug);
	else longPage(root, ctx, guide, slug);
}
