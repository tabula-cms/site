#!/usr/bin/env node
// Imports docs/{editor,install,qa,dev} from tabula-cms/tabula into
// src/content/docs/{editor,install,qa,dev} as Starlight content: frontmatter (title, sidebar
// order, editUrl, lang for dev/), link rewriting, and removal of the back-link line the sidebar
// replaces. tabula-cms/tabula's docs/ stays the single source of truth; this script never
// edits the source text, only transforms it at build time. See issue #3 for the full spec.
//
// Source resolution:
//   - TABULA_DOCS_DIR set -> read straight from that folder, no git involved (local dev loop).
//   - otherwise, a shallow sparse clone of TABULA_REPO (default the tabula-cms/tabula GitHub
//     URL; a local path also works, which is how clone mode is exercised offline) at TABULA_REF
//     (default "main") into a temp directory, removed again once the import is done.
//   - TABULA_DOCS_TOKEN, if set, authenticates the clone (fine-grained PAT, while the source
//     repository is private) via a git http.extraheader scoped to github.com, passed through
//     the environment (never argv, never the URL, never logged) — see cloneDocsSparse() below.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
	IMPORTED_FOLDERS,
	buildPageFrontmatter,
	computeOrder,
	extractTitle,
	githubEditUrl,
	outputFileName,
	removeBackLink,
	rewriteLink,
	transformLinks,
} from './lib/docs-transform.mjs';

const TABULA_REPO_SLUG = 'tabula-cms/tabula';
const DEFAULT_REPO = `https://github.com/${TABULA_REPO_SLUG}.git`;
const DEFAULT_REF = 'main';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const contentDocsDir = path.join(projectRoot, 'src', 'content', 'docs');

async function main() {
	const ref = process.env.TABULA_REF || DEFAULT_REF;
	const explicitDir = process.env.TABULA_DOCS_DIR;

	let docsDir = explicitDir;
	let cleanup = () => {};

	if (!docsDir) {
		const repo = process.env.TABULA_REPO || DEFAULT_REPO;
		const token = process.env.TABULA_DOCS_TOKEN;
		const tmpRoot = mkdtempSync(path.join(tmpdir(), 'tabula-docs-'));
		cleanup = () => rmSync(tmpRoot, { recursive: true, force: true });
		try {
			cloneDocsSparse({ repo, ref, token, destination: tmpRoot });
		} catch (err) {
			cleanup();
			console.error(`fetch-docs: ${err.message}`);
			process.exit(1);
		}
		docsDir = path.join(tmpRoot, 'docs');
	}

	try {
		run(docsDir, ref);
	} catch (err) {
		console.error(`fetch-docs: ${err.message}`);
		process.exitCode = 1;
	} finally {
		cleanup();
	}
}

/** Clones only docs/ of `repo` at `ref` into `destination`, sparse and shallow. */
function cloneDocsSparse({ repo, ref, token, destination }) {
	const isRemote = /^(https?:\/\/|git@|ssh:\/\/)/i.test(repo);

	// The token is passed through the environment, not argv and not the URL: process argv (and
	// `-c key=value` on it) can show up in process listings and in some git error messages, but
	// GIT_CONFIG_* environment variables don't. This sets exactly one config value —
	// `http.https://github.com/.extraheader` — scoping the header to github.com specifically
	// (this git config key syntax scopes per-URL config to that URL prefix), so it never leaks
	// onto some other host if TABULA_REPO is ever pointed elsewhere.
	const gitEnv = { ...process.env };
	if (isRemote && token) {
		const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
		gitEnv.GIT_CONFIG_COUNT = '1';
		gitEnv.GIT_CONFIG_KEY_0 = 'http.https://github.com/.extraheader';
		gitEnv.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${basic}`;
	}

	// `--` before the positional repo/destination arguments so a repo path/URL that happens to
	// start with `-` (from TABULA_REPO) can never be parsed as a git option.
	const gitArgs = [
		'clone',
		'--depth',
		'1',
		'--filter=blob:none',
		'--sparse',
		'--branch',
		ref,
		'--',
		repo,
		destination,
	];

	const clone = spawnSync('git', gitArgs, { stdio: ['ignore', 'pipe', 'pipe'], env: gitEnv });
	if (clone.status !== 0) {
		throw new Error(
			`git clone of ${repo} at ${ref} failed:\n${redact(clone.stderr?.toString())}`,
		);
	}

	const sparse = spawnSync('git', ['-C', destination, 'sparse-checkout', 'set', 'docs'], {
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	if (sparse.status !== 0) {
		throw new Error(`git sparse-checkout of docs/ failed:\n${redact(sparse.stderr?.toString())}`);
	}
}

// Defence in depth: the token is never placed in argv or the URL, only in a header passed via
// GIT_CONFIG_VALUE_0 in the environment, which git does not echo back in clone error output —
// but strip any line that could ever carry it before printing, just in case.
function redact(text) {
	return (text ?? '')
		.split('\n')
		.filter((line) => !/authorization|extraheader/i.test(line))
		.join('\n')
		.trim();
}

function run(docsDir, ref) {
	if (!existsSync(docsDir)) {
		throw new Error(`source docs folder not found: ${docsDir}`);
	}

	const indexMdPath = path.join(docsDir, 'INDEX.md');
	const indexMd = existsSync(indexMdPath) ? readFileSync(indexMdPath, 'utf8') : '';
	if (!existsSync(indexMdPath)) {
		console.warn(`fetch-docs: warning: ${indexMdPath} not found, ordering all pages alphabetically`);
	}

	const stats = { githubRewrites: 0, warnings: [] };
	const pagesPerFolder = {};

	for (const folder of IMPORTED_FOLDERS) {
		const sourceFolderDir = path.join(docsDir, folder);
		if (!existsSync(sourceFolderDir)) {
			throw new Error(`source folder not found: ${sourceFolderDir}`);
		}

		const fileNames = readdirSync(sourceFolderDir, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
			.map((entry) => entry.name)
			.sort();

		const order = computeOrder(indexMd, folder, fileNames);
		const outDir = path.join(contentDocsDir, folder);
		rmSync(outDir, { recursive: true, force: true });
		mkdirSync(outDir, { recursive: true });

		const fileExists = (candidateFolder, candidateFileName) =>
			existsSync(path.join(docsDir, candidateFolder, candidateFileName));

		for (const fileName of fileNames) {
			importPage({ sourceFolderDir, outDir, folder, fileName, ref, order, fileExists, stats });
		}

		pagesPerFolder[folder] = fileNames.length;
	}

	printSummary(pagesPerFolder, stats);
}

function importPage({ sourceFolderDir, outDir, folder, fileName, ref, order, fileExists, stats }) {
	// tabula-cms/tabula's docs/ is checked out with CRLF line endings on Windows; normalise to LF
	// before any line-based processing (extractTitle, removeBackLink, transformLinks all assume
	// it). Also strip a leading BOM, in case a file was saved with one — `# Title` with a BOM
	// right before the `#` would otherwise fail extractTitle's heading match.
	const raw = readFileSync(path.join(sourceFolderDir, fileName), 'utf8')
		.replace(/^﻿/, '')
		.replace(/\r\n/g, '\n');
	const { title, body: bodyAfterHeading } = extractTitle(raw);
	if (title === null) {
		stats.warnings.push(`no "# " heading found, page has no title: docs/${folder}/${fileName}`);
	}
	const bodyAfterBackLink = removeBackLink(bodyAfterHeading);

	const fromRepoPath = `docs/${folder}/${fileName}`;
	// Local image targets are collected here rather than by re-scanning the body with a separate
	// regex, so they go through the exact same fenced/inline-code skipping as link rewriting does
	// (an image reference inside inline code, like the one used as an example in
	// docs/editor/storinky.md, must not be treated as a real image to copy).
	const localImages = [];
	const rewrittenBody = transformLinks(
		bodyAfterBackLink,
		(target, isImage) => {
			if (isImage) localImages.push(target);
			return rewriteLink(target, { fromRepoPath, ref, fileExists, isImage });
		},
		stats,
	);

	copyLocalImages({ sourceFolderDir, outDir, images: localImages, folder, fileName, stats });

	const pageOrder = fileName === 'README.md' ? 0 : order.get(fileName);
	const frontmatter = buildPageFrontmatter({
		title: title ?? fileName,
		lang: folder === 'dev' ? 'en' : undefined,
		order: pageOrder,
		editUrl: githubEditUrl(ref, folder, fileName),
	});

	writeFileSync(path.join(outDir, outputFileName(fileName)), frontmatter + rewrittenBody, 'utf8');
}

// No relative images exist in the real docs today (see issue #3, "Images"); this is best-effort
// support for if one appears, copying it next to the imported page and leaving its path as
// written, per the spec. Not exercised by the real content, since none exists today.
function copyLocalImages({ sourceFolderDir, outDir, images, folder, fileName, stats }) {
	for (const rawTarget of images) {
		const target = rawTarget.split('#')[0];
		if (/^([a-z][a-z0-9+.-]*:)/i.test(target)) continue; // http(s):, data:, ...
		const sourcePath = path.join(sourceFolderDir, target);
		if (!existsSync(sourcePath)) {
			stats.warnings.push(`image not found in source: docs/${folder}/${target} (referenced from docs/${folder}/${fileName})`);
			continue;
		}
		const destPath = path.join(outDir, target);
		// A target containing enough `../` to climb out of outDir (e.g. an image reference that
		// escapes the page's own folder) must never be written outside
		// src/content/docs/<folder>/ — checked against outDir, not sourceFolderDir, since outDir
		// is what this function is trusted to write into.
		const relFromOutDir = path.relative(outDir, destPath);
		if (relFromOutDir.startsWith('..') || path.isAbsolute(relFromOutDir)) {
			stats.warnings.push(
				`image path escapes the output folder, not copied (path left as written): docs/${folder}/${target} (referenced from docs/${folder}/${fileName})`,
			);
			continue;
		}
		mkdirSync(path.dirname(destPath), { recursive: true });
		writeFileSync(destPath, readFileSync(sourcePath));
	}
}

function printSummary(pagesPerFolder, stats) {
	console.log('fetch-docs: import summary');
	let total = 0;
	for (const folder of IMPORTED_FOLDERS) {
		const count = pagesPerFolder[folder] ?? 0;
		total += count;
		console.log(`  ${folder}: ${count} page(s)`);
	}
	console.log(`  total: ${total} page(s)`);
	console.log(`  links rewritten to GitHub: ${stats.githubRewrites}`);
	console.log(`  warnings: ${stats.warnings.length}`);
	for (const warning of stats.warnings) {
		console.warn(`fetch-docs: warning: ${warning}`);
	}
}

await main();
