import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	// `lang` is not part of Starlight's default frontmatter schema; it is read by
	// src/routeData.ts to set the page's <html lang> (and <main lang>) independently of the
	// site's single `uk` locale — see astro.config.mjs and CLAUDE.md. The import script
	// (#3) sets it to `en` on pages under docs/dev/.
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({ extend: z.object({ lang: z.string().optional() }) }),
	}),
	// Story 80, slice S2: the site's own reading pages (src/content/pages/<slug>.md(x)), rendered
	// at /<slug>/ by src/pages/[slug].astro in the product layout. Not part of Starlight's `docs`.
	pages: defineCollection({
		loader: glob({ pattern: '*.{md,mdx}', base: './src/content/pages' }),
		// Spec 83: `hero` names the page's hero in src/config/audience.mjs (the role pages and «Ціна й оплата»).
		schema: z.object({ title: z.string(), description: z.string(), hero: z.string().optional() }),
	}),
};
