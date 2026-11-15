// The guide's structure, built once in astro.config.mjs (src/lib/guide-structure.mjs) and served to the components by
// the integration of src/lib/guide-markdown.mjs. Null when no guide was imported.
declare module 'virtual:tabula/guide' {
	const guide: {
		hasArticles: boolean;
		pages: Record<string, { slug: string; title: string; order: number; hosted: boolean; clip: boolean; short: boolean }>;
		topics: Record<string, { slug: string; label: string; title: string; articles: string[]; area: string | null }>;
		parentOf: Record<string, string>;
		areas: { id: string; label: string; topics: string[] }[];
		orphans: string[];
		order: string[];
	} | null;
	export default guide;
}
