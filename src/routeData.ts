import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import guide from 'virtual:tabula/guide';

// The site is a single Starlight locale (`uk`), but developer docs (imported with
// `lang: en` in frontmatter — see src/content.config.ts) are English. Starlight's own
// locale routing can't express "one folder is a different language" without turning that
// folder into a second locale, which then renders every other page a second time as
// "untranslated fallback content" under it (tried and rejected — see CLAUDE.md). Route data
// middleware is the supported extension point for overriding a page's computed route data,
// so this sets `lang` (and `entryMeta.lang`, used for the `lang` attribute Starlight puts on
// `<main>`) straight from the frontmatter field when present. This runs after Starlight has
// already built the page's <head> tags, so it does NOT change `og:locale` (still the site's
// `uk`) — a known, accepted gap; see CLAUDE.md.
//
// The two-layer guide (issue #57, round 2), only when the imported guide has short articles: the landing (/editor/) has
// no «На цій сторінці» (it would list the forty anchors of the README), and a short article has no «Назад / Далі» cards
// (its «Інші статті розділу» and «← <topic>» already lead on; the sidebar order would send a reader into another topic).
export const onRequest = defineRouteMiddleware((context) => {
	const { starlightRoute } = context.locals;
	const lang = starlightRoute.entry.data.lang;
	if (lang) {
		starlightRoute.lang = lang;
		starlightRoute.entryMeta = { ...starlightRoute.entryMeta, lang };
	}
	if (!guide?.hasArticles) return;
	const slug = starlightRoute.id === 'editor' ? 'index' : starlightRoute.id.replace(/^editor\//, '');
	if (slug === 'index') starlightRoute.toc = undefined;
	else if (guide.pages[slug]?.short) starlightRoute.pagination = { prev: undefined, next: undefined };
});
