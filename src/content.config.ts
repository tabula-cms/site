import { defineCollection, z } from 'astro:content';
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
};
