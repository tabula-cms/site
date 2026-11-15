// The whole HTML document of one printed form: A4, a serif face embedded as data URIs, plain black on white.
// Reads the face from ./fonts/ (an edition copy has it there) or, in this repository, from @fontsource/tinos.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Tinos (Apache-2.0 upstream, OFL-1.1 in the Fontsource package): metric-compatible with Times New Roman. */
export const FACE_FILES = Object.freeze([
	{ file: 'tinos-latin-400-normal.woff2', weight: 400, range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
	{ file: 'tinos-cyrillic-400-normal.woff2', weight: 400, range: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' },
	{ file: 'tinos-latin-700-normal.woff2', weight: 700, range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
	{ file: 'tinos-cyrillic-700-normal.woff2', weight: 700, range: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' },
]);

/** The folder the face files are read from: ./fonts/ when it exists, else the Fontsource package of this repository. */
export function fontsDir() {
	const own = path.join(here, 'fonts');
	return existsSync(own) ? own : path.resolve(here, '../../../node_modules/@fontsource/tinos/files');
}

let faceCss;
function faceRules() {
	if (!faceCss) {
		const dir = fontsDir();
		faceCss = FACE_FILES.map(({ file, weight, range }) => {
			const data = readFileSync(path.join(dir, file)).toString('base64');
			return `@font-face { font-family: 'Form Serif'; font-weight: ${weight}; font-style: normal; src: url(data:font/woff2;base64,${data}) format('woff2'); unicode-range: ${range}; }`;
		}).join('\n');
	}
	return faceCss;
}

/** The whole HTML document of one form: `doc` is `{ title, html, compact }`; `compact` is true (10.5 pt, the yearly application) or 'snug' (11.5 pt); without it the type is 12 pt. */
export function documentHtml(doc) {
	return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>${doc.title}</title>
<style>
${faceRules()}
@page { size: A4; margin: 20mm 10mm 20mm 30mm; }
body { font: 12pt/1.12 'Form Serif', 'Times New Roman', Times, serif; color: #000; margin: 0; hyphens: auto; }
h1 { font-size: 12pt; text-align: center; margin: 0 0 10pt; line-height: 1.2; }
h1.break { break-before: page; }
h1 .sub { font-weight: 400; }
p { margin: 0 0 4pt; text-align: left; text-indent: 1.25cm; orphans: 2; widows: 2; }
p.sub { margin-left: 1.25cm; text-indent: 0; }
.filled, table.req { hyphens: none; }
.blank { white-space: nowrap; letter-spacing: -0.5pt; }
.hint { font-size: 9pt; color: #333; font-weight: 400; }
.dateline, .row, .sign { display: flex; justify-content: space-between; align-items: flex-start; text-indent: 0; text-align: left; margin-bottom: 8pt; }
.center, .right { text-indent: 0; }
.center { text-align: center; }
.right { text-align: left; margin-left: 52%; }
.sign { margin-top: 14pt; }
.signdate { margin-top: 8pt; text-indent: 0; text-align: left; }
.blocktitle { font-weight: 700; text-align: center; text-indent: 0; margin: 10pt 0 4pt; break-after: avoid; }
table.req { border: 0; margin: 0; break-inside: avoid; }
table.req td { border: 0; padding: 0 5mm 8pt 0; width: 50%; vertical-align: top; }
table.req p { text-indent: 0; text-align: left; margin: 0 0 2pt; }
table.req p.who { font-weight: 700; }
table.req p.sig { margin-top: 12pt; }
table.req td.note p { margin-top: 12pt; }
.compact { font-size: 10.5pt; line-height: 1.08; }
.snug { font-size: 11.5pt; }
.compact p { margin-bottom: 1.5pt; }
.compact h1 { font-size: 11pt; margin-bottom: 6pt; }
.compact .hint { font-size: 8.5pt; }
.compact .dateline { margin-bottom: 5pt; }
.compact .blocktitle { margin-top: 4pt; margin-bottom: 2pt; }
.compact table.req td { padding-bottom: 2pt; }
.compact table.req p.sig, .compact table.req td.note p { margin-top: 6pt; }
.sample { font-size: 9pt; color: #333; text-align: right; font-style: italic; text-indent: 0; }
.boxes { list-style: '☐  '; margin: 0 0 8pt; padding-left: 18pt; }
.boxes li { text-align: left; margin-bottom: 3pt; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 8pt; }
table:not(.req) th, table:not(.req) td { border: 0.75pt solid #000; padding: 3pt 5pt; text-align: left; vertical-align: top; }
table:not(.req) td.num, table:not(.req) th.num { text-align: right; white-space: nowrap; }
tfoot td { font-weight: bold; }
</style>
</head>
<body${doc.compact ? (doc.compact === 'snug' ? ' class="compact snug"' : ' class="compact"') : ''}>${doc.html}</body>
</html>`;
}
