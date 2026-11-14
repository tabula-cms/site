// `npm run documents:edition`: writes dist-documents/<contractEdition>/ (gitignored) — a frozen copy of the forms of this
// edition: the folder scripts/lib/documents/ as it is (the forms, the formatters, the print frame) with the face's
// files, terms.json (the edition's numbers and codes) and manifest.json (the forms' fields and titles, the sha256
// of every file). Pure Node: no network, no Chromium. The copy is generated, never edited by hand.

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TERMS } from './lib/document-templates.mjs';
import { FORMS } from './lib/documents/forms.mjs';
import { FACE_FILES, fontsDir } from './lib/documents/print.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourceDir = path.join(root, 'scripts/lib/documents');

function listFiles(dir, base = dir) {
	return readdirSync(dir)
		.flatMap((name) => {
			const full = path.join(dir, name);
			return statSync(full).isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
		})
		.sort();
}

/** Writes the edition folder under `outRoot` and returns `{ dir, manifest }`. */
export function writeEdition(outRoot = path.join(root, 'dist-documents'), terms = TERMS) {
	const dir = path.join(outRoot, terms.contractEdition);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	cpSync(sourceDir, dir, { recursive: true, filter: (src) => !src.split(path.sep).includes('fonts') });
	const fonts = path.join(dir, 'fonts');
	mkdirSync(fonts);
	const faceDir = fontsDir();
	for (const { file } of FACE_FILES) cpSync(path.join(faceDir, file), path.join(fonts, file));
	const licence = path.join(faceDir, '..', 'LICENSE');
	if (existsSync(licence)) cpSync(licence, path.join(fonts, 'LICENSE'));
	writeFileSync(path.join(dir, 'terms.json'), `${JSON.stringify(terms, null, '\t')}\n`);
	const forms = Object.fromEntries(Object.entries(FORMS).map(([kind, form]) => [kind, { fields: [...form.fields], title: form.title(terms) }]));
	const files = Object.fromEntries(
		listFiles(dir).map((rel) => [rel, createHash('sha256').update(readFileSync(path.join(dir, rel))).digest('hex')]),
	);
	const manifest = { edition: terms.contractEdition, forms, files };
	writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, '\t')}\n`);
	return { dir, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const { dir, manifest } = writeEdition();
	console.log(`documents:edition: ${path.relative(root, dir)} (${Object.keys(manifest.files).length} files)`);
}
