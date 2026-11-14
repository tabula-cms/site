// A Sätteri hast plugin for the school guide (the imported docs/editor/ pages under src/content/docs/). Astro 7's
// Markdown engine is Sätteri, not unified, so this is the equivalent of a rehype plugin: it restructures the HTML
// of a page, never its text, so the documentation stays the CMS's own; the look is src/styles/guide.css.
//
// Registered by the integration in astro.config.mjs (`guideMarkdown`), which pushes it onto the processor's
// `hastPlugins` before Starlight's own. `guideHastPlugin` is a factory: it returns nothing for a file outside
// src/content/docs/, so the product pages (src/content/pages/) are not touched.
//
// What it does:
//   1. Drops HTML comments (`<!-- video: … -->`, `<!-- screenshot: … -->`, `<!-- hosted -->`): the CMS's markers for
//      clips and screenshots not in the repository yet. They are not text and must not reach the page.
//   2. A paragraph that holds only one image becomes `<figure class="guide-shot">` with the image and a
//      `<figcaption>` of its alt text. The image then gets `alt=""`: the caption already says what the picture
//      shows, and keeping the same sentence as alt would make a screen reader read it twice (HTML allows an empty
//      alt when the figure's caption is the text alternative). A paragraph with several images is left as it is.
//   3. The paragraph that starts with the bold «Де знайти:» gets `guide-where`; the italic role note
//      («Може адміністратор і редактор…») at the top of the page gets `guide-role`.
//   4. Ordered lists at the top level of a page get `guide-steps` (numbers in teal circles). Lists nested in a list
//      or in another block are left alone.
//   5. A table is wrapped in `div.guide-table` (a focusable, labelled scroll region), so a wide table scrolls inside
//      its box on a phone instead of dragging the page sideways.

import { fileURLToPath } from 'node:url';

const COMMENT = /^\s*<!--[\s\S]*?-->\s*$/;
const DOCS_DIR = '/src/content/docs/';

const isElement = (node, name) => node?.type === 'element' && (name ? node.tagName === name : true);
const isBlank = (node) => node.type === 'text' && node.value.trim() === '';
const meaningful = (node) => node.children.filter((child) => !isBlank(child) && !(child.type === 'raw' && COMMENT.test(child.value)));

/** The text under a node. */
export function textOf(node) {
	if (node.type === 'text') return node.value;
	return (node.children ?? []).map(textOf).join('');
}

/** What a paragraph shows when it holds one image and nothing else, else null. */
function singleImage(paragraph) {
	const parts = meaningful(paragraph);
	return parts.length === 1 && isElement(parts[0], 'img') ? parts[0] : null;
}

/** @returns {import('satteri').HastPluginDefinition} */
function createPlugin() {
	// The heading above the table being visited, for its region's label. Visitors run in document order.
	let heading = '';

	return {
		name: 'tabula-guide',

		// The italic role note under the title: the first block of the page, when it is only emphasis.
		before(root, ctx) {
			const first = root.children.find((child) => child.type === 'element');
			if (!isElement(first, 'p')) return;
			const parts = meaningful(first);
			if (parts.length === 1 && isElement(parts[0], 'em')) ctx.setProperty(first, 'className', ['guide-role']);
		},

		raw(node, ctx) {
			if (COMMENT.test(node.value)) ctx.removeNode(node);
		},
		comment(node, ctx) {
			ctx.removeNode(node);
		},

		element: {
			filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ol', 'table'],
			visit(node, ctx) {
				const parent = ctx.parent(node);
				if (/^h[1-6]$/.test(node.tagName)) {
					heading = ctx.textContent(node).replace(/<!--[\s\S]*?-->/g, '').trim();
					return;
				}
				if (node.tagName === 'p') {
					const image = singleImage(node);
					if (image) {
						const caption = String(image.properties?.alt ?? '').trim();
						const figure = {
							type: 'element',
							tagName: 'figure',
							properties: { className: ['guide-shot'] },
							children: [
								{ type: 'element', tagName: 'img', properties: { ...image.properties, alt: '' }, children: [] },
								...(caption
									? [{ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: caption }] }]
									: []),
							],
						};
						ctx.replaceNode(node, figure);
						return;
					}
					const first = meaningful(node)[0];
					if (isElement(first, 'strong') && /^Де знайти\s*:/.test(textOf(first).trim())) {
						ctx.setProperty(node, 'className', ['guide-where']);
					}
					return;
				}
				if (node.tagName === 'ol') {
					if (parent?.type === 'root') ctx.setProperty(node, 'className', ['guide-steps']);
					return;
				}
				if (node.tagName === 'table') {
					ctx.wrapNode(node, {
						type: 'element',
						tagName: 'div',
						properties: {
							className: ['guide-table'],
							role: 'region',
							tabIndex: 0,
							ariaLabel: heading ? `Таблиця: ${heading}` : 'Таблиця',
						},
						children: [],
					});
				}
			},
		},
	};
}

/**
 * The plugin factory for `hastPlugins`: the plugin for a file under src/content/docs/, nothing for any other.
 * @param {{ fileURL?: URL }} context
 */
export function guideHastPlugin({ fileURL }) {
	if (!fileURL) return false;
	const where = fileURLToPath(fileURL).replaceAll('\\', '/');
	return where.includes(DOCS_DIR) ? createPlugin() : false;
}

/** An Astro integration that registers the plugin on the Markdown processor (as Starlight does for its own). */
export function guideMarkdown() {
	return {
		name: 'tabula-guide-markdown',
		hooks: {
			'astro:config:setup': ({ config, logger }) => {
				const hastPlugins = config.markdown?.processor?.options?.hastPlugins;
				if (!Array.isArray(hastPlugins)) {
					logger.warn('the Markdown processor is not Sätteri: the guide keeps its plain look (no figures, steps, comment removal)');
					return;
				}
				hastPlugins.push(guideHastPlugin);
			},
		},
	};
}
