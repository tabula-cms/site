#!/usr/bin/env node
// Validates internal links in the built site (`npm run build` must run first — it now also runs
// this automatically via package.json's "postbuild").
//
// Why this exists instead of starlight-links-validator (see issue #3): that plugin's
// `errorOnRelativeLinks` option is all-or-nothing — set to `true` it errors on every relative
// link (which is all of them here, by deliberate convention, see CLAUDE.md), set to `false` it
// silently skips validating every relative link and its anchor entirely (confirmed by reading
// its source, libs/validation.ts, and by building with a deliberately broken relative link and
// a broken anchor under `errorOnRelativeLinks: false`: the build reported "All internal links
// are valid."). Since our whole link convention is relative, that plugin cannot validate this
// site's links, so this script walks the built `dist/` HTML directly instead.
//
// Algorithm: walk dist/**/*.html, collect every `<a href="...">` that isn't a URI scheme
// (http(s):, mailto:, tel:, ...) or a protocol-relative `//host/...` URL, resolve each against
// the page's own URL — imported pages' body links are relative (see CLAUDE.md/astro.config.mjs:
// Starlight does not prefix Markdown body links with `base`), so this resolution step is what
// actually maps them onto a file — map the result onto a file under dist/ (respecting SITE_BASE
// the same way astro.config.mjs does), and when a `#fragment` is present (including a bare
// same-page `#fragment`, checked against the page's own ids), require an element with that `id`
// in the target page. Exits 1 and lists every page -> broken link on failure.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distDir = path.join(projectRoot, 'dist');

// Same default as astro.config.mjs, so `npm run check:links` matches the build that just ran
// with the same environment.
const base = process.env.SITE_BASE ?? '/site';
const baseNoSlash = base === '/' ? '' : base.replace(/\/$/, '');

function main() {
	if (!existsSync(distDir)) {
		console.error(`check-links: ${distDir} not found — run "npm run build" first`);
		process.exit(1);
	}

	const htmlFiles = walk(distDir).filter((file) => file.endsWith('.html'));
	const pages = new Map(); // urlPath ('/base/foo/') -> { ids: Set<string> }

	for (const file of htmlFiles) {
		const html = readFileSync(file, 'utf8');
		const urlPath = fileToUrlPath(file);
		pages.set(urlPath, { file, ids: collectIds(html) });
	}

	const failures = [];

	for (const file of htmlFiles) {
		const html = readFileSync(file, 'utf8');
		const fromUrl = fileToUrlPath(file);

		for (const href of collectHrefs(html)) {
			if (isSkipped(href)) continue;

			const { pathPart, fragment } = splitFragment(href);
			const pathWithoutQuery = pathPart.split('?')[0];
			const resolvedPath = resolveHref(pathWithoutQuery, fromUrl);

			const target = findPage(resolvedPath, pages);
			if (!target) {
				failures.push({ from: fromUrl, href: displayHref(href), reason: `no page found for "${resolvedPath}"` });
				continue;
			}

			if (fragment) {
				const decoded = decodeFragment(fragment);
				if (!target.ids.has(decoded)) {
					failures.push({
						from: fromUrl,
						href: displayHref(href),
						reason: `no element with id "${decoded}" on "${target.urlPath}"`,
					});
				}
			}
		}
	}

	if (failures.length > 0) {
		console.error(`check-links: ${failures.length} broken internal link(s):`);
		for (const failure of failures) {
			console.error(`  ${failure.from} -> ${failure.href} (${failure.reason})`);
		}
		process.exit(1);
	}

	console.log(`check-links: ${htmlFiles.length} page(s) checked, all internal links resolve.`);
}

function walk(dir) {
	const entries = readdirSync(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...walk(full));
		else files.push(full);
	}
	return files;
}

/** dist/editor/novyny/index.html -> /site/editor/novyny/ (respecting SITE_BASE); dist/404.html -> /site/404.html. */
function fileToUrlPath(file) {
	const rel = path.relative(distDir, file).split(path.sep).join('/');
	const withoutIndex = rel === 'index.html' ? '' : rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
	const prefixed = baseNoSlash ? `${baseNoSlash}/${withoutIndex}` : `/${withoutIndex}`;
	return prefixed.replace(/\/+/g, '/');
}

const HREF_RE = /<a\b[^>]*\shref="([^"]*)"/gi;

function collectHrefs(html) {
	return [...html.matchAll(HREF_RE)].map((match) => decodeHtmlEntities(match[1]));
}

const ID_RE = /\bid="([^"]*)"/g;

function collectIds(html) {
	return new Set([...html.matchAll(ID_RE)].map((match) => decodeHtmlEntities(match[1])));
}

function decodeHtmlEntities(text) {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

/** Any URI scheme (http:, https:, mailto:, tel:, ...) and protocol-relative `//host/...` URLs
 * are never checked — everything else, including a bare `#fragment`, is. */
function isSkipped(href) {
	if (href === '') return true;
	if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return true;
	if (href.startsWith('//')) return true;
	return false;
}

function splitFragment(href) {
	const hashIndex = href.indexOf('#');
	if (hashIndex === -1) return { pathPart: href, fragment: '' };
	return { pathPart: href.slice(0, hashIndex), fragment: href.slice(hashIndex + 1) };
}

function decodeFragment(fragment) {
	try {
		return decodeURIComponent(fragment);
	} catch {
		return fragment;
	}
}

/** The href as it should read in a failure message: percent-decoded (e.g. a Cyrillic anchor
 * readable instead of `%D0%BF...`), falling back to the raw string if it isn't valid percent-
 * encoding. */
function displayHref(href) {
	try {
		return decodeURIComponent(href);
	} catch {
		return href;
	}
}

function resolveHref(pathPart, fromUrl) {
	if (pathPart === '') return fromUrl;
	if (pathPart.startsWith('/')) return pathPart;
	// A relative href (the normal case: imported pages' body links are relative, not
	// base-prefixed) is resolved against the directory of the page it was found on.
	const fromDir = fromUrl.endsWith('/') ? fromUrl : `${path.posix.dirname(fromUrl)}/`;
	return path.posix.normalize(`${fromDir}${pathPart}`);
}

/** Maps a resolved URL path onto a known page, trying the directory (`/x/` -> index.html) and
 * exact-file (`/x.xml`) forms. */
function findPage(urlPath, pages) {
	const withTrailingSlash = urlPath.endsWith('/') ? urlPath : `${urlPath}/`;
	if (pages.has(withTrailingSlash)) return { urlPath: withTrailingSlash, ...pages.get(withTrailingSlash) };
	if (pages.has(urlPath)) return { urlPath, ...pages.get(urlPath) };

	// Non-page static assets under dist/ (sitemap, pagefind data, etc.) that a link might point
	// at directly rather than through the `pages` map of *.html files.
	const candidate = path.join(distDir, stripBase(urlPath));
	if (existsSync(candidate) && statSync(candidate).isFile()) return { urlPath, ids: new Set() };

	return null;
}

function stripBase(urlPath) {
	if (baseNoSlash && urlPath.startsWith(`${baseNoSlash}/`)) return urlPath.slice(baseNoSlash.length);
	if (baseNoSlash && urlPath === baseNoSlash) return '/';
	return urlPath;
}

main();
