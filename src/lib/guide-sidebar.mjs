// The sidebar of the school guide (the imported docs/editor/), built from the guide's structure
// (src/lib/guide-structure.mjs). Pure: the structure in, Starlight sidebar items out, so test/guide-sidebar.test.mjs
// runs it on fixtures; astro.config.mjs builds the structure from the imported files and calls it.
//
// With short articles: the landing («Зміст посібника») first, then one open group per area (AREAS), and in it one
// collapsed group per topic that has articles — the long page under its own title first, then its articles in the
// order its lead lists them — or a plain link for a long page without articles. Starlight opens the group that holds
// the current page. Short articles no long page lists close the list under «Інше».
//
// Without short articles (the old guide, which the live site may still import): the single open group
// «Посібник редактора», a flat list in INDEX order, as before.

import { INDEX_LABEL, OTHER_LABEL } from './guide-structure.mjs';

export { INDEX_LABEL };

const link = (slug, label) => {
	const entry = { slug: slug === 'index' ? 'editor' : `editor/${slug}` };
	if (slug === 'index') entry.label = INDEX_LABEL;
	else if (label) entry.label = label;
	return entry;
};

/**
 * The sidebar items of the guide.
 * @param {ReturnType<import('./guide-structure.mjs').buildGuideStructure>} guide
 * @returns {object[]} Starlight sidebar items
 */
export function buildGuideSidebar(guide) {
	if (!guide.hasArticles) {
		return [{ label: 'Посібник редактора', items: guide.order.map((slug) => link(slug)) }];
	}
	const topicItem = (slug) => {
		const topic = guide.topics[slug];
		if (topic.articles.length === 0) return link(slug, topic.label);
		// README's own articles (the panel's tools) have no long page of their own to lead the group: the landing does.
		const lead = slug === 'index' ? [] : [link(slug)];
		return { label: topic.label, collapsed: true, items: [...lead, ...topic.articles.map((article) => link(article))] };
	};
	const result = [link('index')];
	for (const area of guide.areas) result.push({ label: area.label, items: area.topics.map(topicItem) });
	if (guide.orphans.length > 0) result.push({ label: OTHER_LABEL, collapsed: true, items: guide.orphans.map((slug) => link(slug)) });
	return result;
}
