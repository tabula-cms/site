// Pure functions used by scripts/fetch-docs.mjs to turn tabula-cms/tabula's docs/ into
// Starlight content. Nothing here touches the filesystem or the network, so it is unit-tested
// directly with fixture strings (see test/docs-transform.test.mjs).
//
// See issue #3 ("spec: import Tabula docs into the site") for the rules this implements.

/** The four folders imported from tabula-cms/tabula's docs/, in the fixed sidebar order. */
export const IMPORTED_FOLDERS = ['editor', 'install', 'qa', 'dev'];

// Anything else under docs/ — INDEX.md itself, issues/, audits/, design/ — is internal-only and
// never copied; classifyRepoPath() below falls through to "not published" for all of it, which
// is what turns a link to any of them into an absolute GitHub link (see rewriteLink()).

const TABULA_REPO = 'tabula-cms/tabula';

/**
 * `README.md` becomes `index.md` (Starlight folder index); every other file keeps its name.
 */
export function outputFileName(fileName) {
	return fileName === 'README.md' ? 'index.md' : fileName;
}

/**
 * Starlight's slug for a page file name: the lower-cased file name without its extension.
 * Every real Tabula doc file name is already a lower-case, hyphenated, ASCII slug, so this is
 * intentionally just a lower-case + strip-extension, not a full transliterating slugifier.
 */
export function slugFromFileName(fileName) {
	return fileName.replace(/\.md$/i, '').toLowerCase();
}

/**
 * The site URL of a page, given its folder (`editor`, `install`, `qa`, `dev`) and original file
 * name (`README.md` or `name.md`). Always begins and ends with `/`, never has a leading site
 * `base` (Starlight does not prefix Markdown body links with `base` — see CLAUDE.md/astro.config.mjs
 * — so links are computed and emitted relative, never absolute-from-root).
 */
export function pageUrl(folder, fileName) {
	if (fileName === 'README.md') return `/${folder}/`;
	return `/${folder}/${slugFromFileName(fileName)}/`;
}

/**
 * The relative href from one page's URL to another, per the spec's rule:
 * `path.posix.relative(dirOf(from), dirOf(to)) + '/'` (`./` when the pages are the same),
 * with the anchor appended verbatim. Both URLs are directory-like (they end in `/`), which is
 * exactly what makes plain `path.posix.relative` do the right thing here: a page's own URL is
 * its own "directory" for the purpose of resolving a relative link from it.
 */
export function relativeHref(fromUrl, toUrl, anchor = '') {
	const relative = posixRelative(fromUrl, toUrl);
	const href = relative === '' ? './' : `${relative}/`;
	return `${href}${anchor}`;
}

// Minimal reimplementation of path.posix.relative for two slash-separated absolute paths, kept
// local so this module has zero imports and is trivially importable in tests and in the CLI.
function posixRelative(from, to) {
	const fromParts = from.split('/').filter(Boolean);
	const toParts = to.split('/').filter(Boolean);
	let common = 0;
	while (
		common < fromParts.length &&
		common < toParts.length &&
		fromParts[common] === toParts[common]
	) {
		common += 1;
	}
	const up = fromParts.length - common;
	const down = toParts.slice(common);
	return [...Array(up).fill('..'), ...down].join('/');
}

/**
 * Resolves a relative (or root-relative) link target (posix-style, may contain `..`) against
 * the directory of the repository path it was written in, and normalises `..`/`.` segments.
 * Both paths are repository paths (posix, no leading slash), e.g. `docs/editor/novyny.md` +
 * `../install/README.md` -> `docs/install/README.md`. A target starting with `/` is resolved
 * from the repository root instead of the current page's directory (e.g. `/SECURITY.md` ->
 * `SECURITY.md`, regardless of where the link was written) — no real Tabula doc link does this
 * today, but a root-relative link is valid Markdown and must not be treated as external.
 */
export function resolveRepoPath(fromRepoPath, target) {
	const trailingSlash = target.endsWith('/');
	const isRooted = target.startsWith('/');
	const fromDir = isRooted ? [] : fromRepoPath.split('/').slice(0, -1);
	const targetParts = (isRooted ? target.slice(1) : target).split('/');
	const parts = [...fromDir, ...targetParts];
	const resolved = [];
	for (const part of parts) {
		if (part === '' || part === '.') continue;
		if (part === '..') {
			resolved.pop();
			continue;
		}
		resolved.push(part);
	}
	return resolved.join('/') + (trailingSlash ? '/' : '');
}

/**
 * Splits a Markdown link/image target into its path part and its `#anchor` (kept verbatim,
 * including the `#`), e.g. `bekapy.md#anchor` -> `{ pathPart: 'bekapy.md', anchor: '#anchor' }`,
 * `#anchor` -> `{ pathPart: '', anchor: '#anchor' }`.
 */
export function splitTargetAndAnchor(target) {
	const hashIndex = target.indexOf('#');
	if (hashIndex === -1) return { pathPart: target, anchor: '' };
	return { pathPart: target.slice(0, hashIndex), anchor: target.slice(hashIndex) };
}

/**
 * Parses the raw text between `(` and `)` in `[label](target)`: an optional `"title"` (or
 * `'title'`) suffix, and the URL itself optionally wrapped in `<...>`. None of this appears in
 * the real docs today, but both forms are valid Markdown and must not be swallowed into the
 * path when resolving a link. `title` is returned with its leading whitespace intact (empty
 * string when absent) so callers can just concatenate it back onto the end of a rewritten href.
 */
export function parseLinkTarget(raw) {
	let rest = raw;
	let title = '';
	const titleMatch = /^(.*?)(\s+"[^"]*"|\s+'[^']*')$/.exec(rest);
	if (titleMatch) {
		rest = titleMatch[1];
		title = titleMatch[2];
	}
	let url = rest.trim();
	if (url.startsWith('<') && url.endsWith('>') && url.length >= 2) {
		url = url.slice(1, -1);
	}
	return { url, title };
}

/** Splits a `?query` suffix off a path (before any `#anchor` has already been removed). Returns
 * the query with its leading `?`, or `''` when absent. */
export function splitQuery(pathPart) {
	const queryIndex = pathPart.indexOf('?');
	if (queryIndex === -1) return { pathOnly: pathPart, query: '' };
	return { pathOnly: pathPart.slice(0, queryIndex), query: pathPart.slice(queryIndex) };
}

function isExternalScheme(pathPart) {
	return /^([a-z][a-z0-9+.-]*:)/i.test(pathPart) && !/^\.{0,2}\//.test(pathPart);
}

/** A repository path is "published" when it is exactly `docs/<one of the four folders>/<file>.md`
 * (no nested subfolders exist in the real docs, and none are expected). Any other file in one
 * of the four folders — none exist today, but a future non-Markdown file would — is not a page
 * and becomes a GitHub link like anything else outside the published set. */
export function classifyRepoPath(repoPath) {
	const match = /^docs\/([^/]+)\/([^/]+)$/.exec(repoPath);
	if (match && IMPORTED_FOLDERS.includes(match[1]) && /\.md$/i.test(match[2])) {
		return { published: true, folder: match[1], fileName: match[2] };
	}
	return { published: false };
}

export function githubBlobUrl(ref, repoPath, suffix = '') {
	return `https://github.com/${TABULA_REPO}/blob/${ref}/${repoPath}${suffix}`;
}

export function githubEditUrl(ref, folder, originalFileName) {
	return `https://github.com/${TABULA_REPO}/edit/${ref}/docs/${folder}/${originalFileName}`;
}

const NOT_PUBLIC_DOCS_SUBFOLDER_RE = /^docs\/(audits|design)\//;

/**
 * Rewrites a single link/image target found in an imported page.
 *
 * @param {string} target - the raw text between `(` and `)` in `[label](target)`.
 * @param {object} ctx
 * @param {string} ctx.fromRepoPath - repo path of the page being processed, e.g. `docs/editor/novyny.md`.
 * @param {string} ctx.ref - TABULA_REF, used for GitHub links.
 * @param {(folder: string, fileName: string) => boolean} ctx.fileExists - whether a candidate
 *   page exists in the source `docs/<folder>/<fileName>` (used only to warn on broken internal
 *   links; the spec puts real enforcement at build time via the link checker).
 * @param {boolean} [ctx.isImage] - `![alt](target)` links are never rewritten (see class doc),
 *   only reported so the caller can decide whether to copy a local image file.
 * @returns {{ href: string, kind: 'unchanged' | 'relative' | 'github', warning?: string }}
 */
export function rewriteLink(target, { fromRepoPath, ref, fileExists, isImage = false }) {
	const { url, title } = parseLinkTarget(target);
	const { pathPart: pathWithQuery, anchor } = splitTargetAndAnchor(url);
	const { pathOnly: pathPart, query } = splitQuery(pathWithQuery);

	// http(s)://, mailto:, and bare #anchor links are untouched — returned exactly as written,
	// title/angle-brackets included, since nothing about them needs rewriting.
	if (pathPart === '' || isExternalScheme(pathPart)) {
		return { href: target, kind: 'unchanged' };
	}

	// Images: no real relative images exist in the docs today; per the spec, if one appears its
	// path is left as-is (the CLI copies the file next to the page — see fetch-docs.mjs).
	if (isImage) {
		return { href: target, kind: 'unchanged' };
	}

	const repoPath = resolveRepoPath(fromRepoPath, pathPart);
	const classified = classifyRepoPath(repoPath);

	if (classified.published) {
		const { folder, fileName } = classified;
		const exists = fileExists ? fileExists(folder, fileName) : true;
		const fromClassified = classifyRepoPath(fromRepoPath);
		const fromUrl = pageUrl(fromClassified.folder, fromClassified.fileName);
		const toUrl = pageUrl(folder, fileName);
		// A page's own URL has no room for a query string (none exist today) — dropped rather
		// than carried onto a relative href, which has no meaningful place to put it.
		const href = relativeHref(fromUrl, toUrl, anchor) + title;
		if (!exists) {
			return {
				href,
				kind: 'relative',
				warning: `link target does not exist in source: ${repoPath} (linked from ${fromRepoPath})`,
			};
		}
		return { href, kind: 'relative' };
	}

	// Anything else — leaves docs/ entirely, or lands in docs/INDEX.md or docs/{issues,audits,design}/
	// (internal-only, not published) — becomes an absolute link into tabula-cms/tabula on GitHub.
	// A query string, unlike for a page link above, is meaningful on a GitHub URL and is kept.
	const href = githubBlobUrl(ref, repoPath, `${query}${anchor}`) + title;
	if (NOT_PUBLIC_DOCS_SUBFOLDER_RE.test(repoPath)) {
		return {
			href,
			kind: 'github',
			warning: `link points into ${repoPath.split('/')[1]}/, which isn't in the public tabula-cms/tabula tree (see issue #3) — likely a 404 on GitHub: ${repoPath} (linked from ${fromRepoPath})`,
		};
	}
	return { href, kind: 'github' };
}

// A fenced code block: opening and closing lines of 3+ backticks or 3+ tildes, optionally
// indented (e.g. inside a list item), with the closer matching the opener's indentation (or
// less, per CommonMark) and marker character/length. `[ \t]*` on the opening line's own
// indentation group is reused via `\1?` on the closer so both are allowed to differ slightly —
// good enough for every fence in the real docs and in Markdown generally; a plain 4-space
// indented code block (no fence markers at all) is not detected as code by this regex.
const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1?\2[ \t]*$/gm;
const INLINE_CODE_RE = /`[^`\n]*`/g;
const LINK_RE = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
const REFERENCE_DEFINITION_RE = /^\s*\[[^\]]+\]:\s/;

/**
 * Rewrites every Markdown link/image target in `body`, skipping fenced code blocks and inline
 * code spans entirely (their contents are never touched, even if they look like a link — e.g.
 * `` `![caption](example)` `` stays exactly as written). A link is only skipped when the whole
 * `[label](target)` (or `![...]`) sits inside a code span; a label that merely *contains* inline
 * code, like `` [`SECURITY.md`](../../SECURITY.md) ``, is still rewritten normally — only the
 * `[` that opens it decides whether the match counts as "inside code". A reference-style link
 * definition (`[label]: url "title"`) outside code is never rewritten — this transform only
 * understands inline `[label](target)` links — and is instead reported as a warning, so an
 * upstream page that starts using one doesn't silently ship a wrong link.
 *
 * @param {string} body
 * @param {(target: string, isImage: boolean) => { href: string, kind: string, warning?: string }} rewrite
 * @param {{ githubRewrites: number, warnings: string[] }} [stats] - optional accumulator; when
 *   given, mutated in place so the caller can print a summary.
 */
export function transformLinks(body, rewrite, stats) {
	const fenceRanges = [];
	const fenceRe = new RegExp(FENCE_RE.source, FENCE_RE.flags);
	let fenceMatch;
	while ((fenceMatch = fenceRe.exec(body))) {
		fenceRanges.push([fenceMatch.index, fenceMatch.index + fenceMatch[0].length]);
	}

	let result = '';
	let cursor = 0;
	for (const [start, end] of fenceRanges) {
		result += transformLinksOutsideFence(body.slice(cursor, start), rewrite, stats);
		result += body.slice(start, end); // fenced code block, untouched
		cursor = end;
	}
	result += transformLinksOutsideFence(body.slice(cursor), rewrite, stats);
	return result;
}

function transformLinksOutsideFence(text, rewrite, stats) {
	if (stats) {
		for (const line of text.split('\n')) {
			if (REFERENCE_DEFINITION_RE.test(line)) {
				stats.warnings.push(`reference-style link definition found, not rewritten: ${line.trim()}`);
			}
		}
	}

	const codeRanges = [];
	const codeRe = new RegExp(INLINE_CODE_RE.source, INLINE_CODE_RE.flags);
	let codeMatch;
	while ((codeMatch = codeRe.exec(text))) {
		codeRanges.push([codeMatch.index, codeMatch.index + codeMatch[0].length]);
	}
	const isInsideCode = (index) => codeRanges.some(([start, end]) => index >= start && index < end);

	const linkRe = new RegExp(LINK_RE.source, LINK_RE.flags);
	let result = '';
	let lastIndex = 0;
	let linkMatch;
	while ((linkMatch = linkRe.exec(text))) {
		if (isInsideCode(linkMatch.index)) continue;
		const [full, bang, label, target] = linkMatch;
		const rewritten = rewrite(target, bang === '!');
		if (stats) {
			if (rewritten.kind === 'github') stats.githubRewrites += 1;
			if (rewritten.warning) stats.warnings.push(rewritten.warning);
		}
		result += text.slice(lastIndex, linkMatch.index);
		result += `${bang}[${label}](${rewritten.href})`;
		lastIndex = linkMatch.index + full.length;
	}
	result += text.slice(lastIndex);
	return result;
}

const HEADING_RE = /^#[ \t]+(.+?)[ \t]*$/;
const CLOSING_HEADING_HASHES_RE = /[ \t]+#+$/;

/**
 * Finds the first `# ` heading (the page title) and removes its line from the body. Blank lines
 * before the heading are removed too, so the body starts cleanly at whatever followed it. A
 * closing run of `#` characters (CommonMark allows `# Title #` / `# Title ###`) is stripped from
 * the returned title, but only when preceded by whitespace, so a title that genuinely ends in a
 * word containing `#` (e.g. `C#`) is left alone.
 */
export function extractTitle(markdown) {
	const lines = markdown.split('\n');
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		if (line.trim() === '') continue;
		const match = HEADING_RE.exec(line);
		if (!match) return { title: null, body: markdown };
		const title = match[1].replace(CLOSING_HEADING_HASHES_RE, '');
		const rest = lines.slice(i + 1).join('\n');
		return { title, body: rest.replace(/^\n+/, '') };
	}
	return { title: null, body: markdown };
}

const SEPARATOR_SPLIT_RE = / · | — | \| /;
const NAV_BACK_RE = /^\[←[^\]]*\]\([^)]*\)$/;
const NAV_NEXT_RE = /^(?:Далі:\s*|Next:\s*|Далі\s*—\s*)?\[[^\]]*→\]\([^)]*\)$/;
const NAV_TARGET_RE = /^\[[^\]]*\]\((?:README\.md|\.\.\/INDEX\.md)\)$/;

function isNavigationSegment(segment) {
	const trimmed = segment.trim();
	return NAV_BACK_RE.test(trimmed) || NAV_NEXT_RE.test(trimmed) || NAV_TARGET_RE.test(trimmed);
}

/**
 * Removes Tabula's in-page navigation from the first non-blank line after the heading — the
 * sidebar replaces it. That line is split on ` · ` / ` — ` / ` | ` into segments, and every
 * segment that is *pure* navigation is dropped: a link whose label starts with `←`; a link whose
 * label ends with `→` (with an optional `Далі:`/`Next:`/`Далі —` prefix before it); or any link
 * (regardless of label) whose target is `README.md` or `../INDEX.md`. Only lines whose first
 * segment is a leading `←` link are touched at all — everything else is returned unchanged,
 * matching how every real back-link line in the docs is written. Surviving segments are
 * rejoined with ` · ` and go through normal link rewriting like the rest of the body — several
 * real Tabula pages put a genuine cross-reference on this line (e.g.
 * `docs/dev/architecture.md`'s `[← Developer docs](README.md) · Deep reference:
 * [\`CLAUDE.md\`](../../CLAUDE.md)`), and only the navigation itself should disappear. When
 * nothing survives, the whole line is dropped, along with the blank line(s) that leaves at the
 * top.
 */
export function removeBackLink(body) {
	const lines = body.split('\n');
	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i];
		if (line.trim() === '') continue;

		const segments = line.split(SEPARATOR_SPLIT_RE);
		if (!NAV_BACK_RE.test(segments[0].trim())) return body;

		const kept = segments.filter((segment) => !isNavigationSegment(segment));

		if (kept.length === 0) {
			return lines
				.slice(i + 1)
				.join('\n')
				.replace(/^\n+/, '');
		}

		const newLines = [...lines];
		newLines[i] = kept.join(' · ');
		return newLines.join('\n');
	}
	return body;
}

/**
 * 1-based order of each file's first appearance as `](<folder>/<file>)` in docs/INDEX.md.
 * `README.md` is not looked up — it is always order 0 (handled by the caller). Files never
 * mentioned in INDEX.md get the next integers after the highest found order, alphabetically.
 *
 * @returns {Map<string, number>} fileName -> order, README.md not included.
 */
export function computeOrder(indexMarkdown, folder, fileNames) {
	const seen = new Map();
	const re = new RegExp(`\\]\\(${escapeRegExp(folder)}/([^)]+\\.md)\\)`, 'g');
	let match;
	while ((match = re.exec(indexMarkdown))) {
		const fileName = match[1];
		if (!seen.has(fileName)) seen.set(fileName, seen.size + 1);
	}

	const order = new Map();
	const others = [];
	for (const fileName of fileNames) {
		if (fileName === 'README.md') continue;
		if (seen.has(fileName)) {
			order.set(fileName, seen.get(fileName));
		} else {
			others.push(fileName);
		}
	}
	others.sort((a, b) => a.localeCompare(b));
	let next = seen.size + 1;
	for (const fileName of others) {
		order.set(fileName, next);
		next += 1;
	}
	return order;
}

function escapeRegExp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Serialises a frontmatter value the way YAML needs it: strings are JSON-stringified (a JSON
 * string literal is always a valid, unambiguous YAML flow scalar — safe for embedded quotes,
 * colons, and `#`), numbers and booleans are written bare, and a one-level-deep plain object
 * (used for `sidebar: { order }`) is written as an indented block.
 */
function serializeYamlValue(value, indent = '') {
	if (typeof value === 'string') return JSON.stringify(value);
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (value && typeof value === 'object') {
		return Object.entries(value)
			.map(([key, val]) => `\n${indent}  ${key}: ${serializeYamlValue(val, `${indent}  `)}`)
			.join('');
	}
	throw new TypeError(`unsupported frontmatter value: ${value}`);
}

/**
 * Builds the full frontmatter block (including the `---` fences and the trailing blank line)
 * from an ordered list of `[key, value]` entries, so callers control field order.
 */
export function buildFrontmatter(entries) {
	const lines = entries.map(([key, value]) => {
		const isNestedBlock = value && typeof value === 'object';
		const separator = isNestedBlock ? ':' : ': ';
		return `${key}${separator}${serializeYamlValue(value)}`;
	});
	return `---\n${lines.join('\n')}\n---\n\n`;
}

/**
 * Convenience wrapper: the frontmatter for one imported page, in the fixed field order the
 * project uses (title, lang, sidebar.order, editUrl).
 */
export function buildPageFrontmatter({ title, lang, order, editUrl }) {
	const entries = [['title', title]];
	if (lang) entries.push(['lang', lang]);
	entries.push(['sidebar', { order }]);
	entries.push(['editUrl', editUrl]);
	return buildFrontmatter(entries);
}
