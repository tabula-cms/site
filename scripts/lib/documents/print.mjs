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

/** The whole HTML document of one form: `doc` is `{ title, html, compact }`. */
export function documentHtml(doc) {
	return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>${doc.title}</title>
<style>
${faceRules()}
@page { size: A4; margin: 15mm 16mm 15mm 22mm; }
body { font: 11.5pt/1.42 'Form Serif', 'Times New Roman', Times, serif; color: #000; margin: 0; }
h1 { font-size: 13pt; text-align: center; margin: 0 0 10pt; line-height: 1.3; }
h1.break { break-before: page; }
p { margin: 0 0 7pt; text-align: justify; }
ol, ul { margin: 0 0 8pt; padding-left: 18pt; }
li { margin-bottom: 4pt; text-align: justify; }
.blank { white-space: nowrap; letter-spacing: -0.5pt; }
.hint { font-size: 8.5pt; color: #333; }
.place { text-align: left; }
.center { text-align: center; }
.right { text-align: left; margin-left: 52%; }
.row { display: flex; justify-content: space-between; text-align: left; }
.sign { margin-top: 14pt; text-align: left; }
.compact { font-size: 10pt; line-height: 1.27; }
.compact p, .compact li { margin-bottom: 3pt; }
.compact h1 { font-size: 11.5pt; margin-bottom: 6pt; }
.compact .sign { margin-top: 8pt; }
.sample { font-size: 9pt; color: #333; text-align: right; font-style: italic; }
.boxes { list-style: '☐  '; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 8pt; }
th, td { border: 1px solid #000; padding: 4pt 6pt; text-align: left; vertical-align: top; }
tfoot td { font-weight: bold; }
</style>
</head>
<body${doc.compact ? ' class="compact"' : ''}>${doc.html}</body>
</html>`;
}
