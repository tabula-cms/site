// `npm run documents`: writes the PDFs of offer.documents into public/dokumenty/ (committed).
//
//   - the forms and samples of scripts/lib/document-templates.mjs, printed from their HTML;
//   - dohovir.pdf, the contract, printed from the built page dist/dohovir/ (so run `npx astro build` first; the
//     contract's text lives in one place, src/content/pages/dohovir.mdx).
//
// Run it again whenever the contract, a form or a number of offer.mjs changes, then build and commit the PDFs.
// Needs Chromium: `npx playwright install chromium`.

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { DOCUMENTS, documentHtml } from './lib/document-templates.mjs';
import { serveDist, distDir, baseNoSlash } from './lib/serve-dist.mjs';

const outDir = fileURLToPath(new URL('../public/dokumenty/', import.meta.url));

// What the contract page hides on paper: the site's chrome, the band above the footer and the links' decoration.
const CONTRACT_PRINT_CSS = `
header, footer, .prefooter, .skip-link, .page-progress, [data-screen-only] { display: none !important; }
body { background: #fff !important; }
main { padding: 0 !important; }
.reading { max-width: none !important; font: 11pt/1.45 'Times New Roman', Times, serif !important; color: #000 !important; }
.reading h1 { font: bold 15pt 'Times New Roman', Times, serif !important; text-align: center; }
.reading h2 { font: bold 12pt 'Times New Roman', Times, serif !important; margin-top: 12pt !important; break-after: avoid; }
.reading a { color: #000 !important; text-decoration: none !important; }
`;

async function main() {
	if (!existsSync(path.join(distDir, 'dohovir', 'index.html'))) {
		console.error('documents: dist/dohovir/ not found — run "npx astro build" first');
		process.exit(1);
	}
	mkdirSync(outDir, { recursive: true });
	const { server, origin } = await serveDist();
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		for (const doc of DOCUMENTS) {
			await page.setContent(documentHtml(doc), { waitUntil: 'load' });
			await page.pdf({ path: path.join(outDir, doc.file), format: 'A4', printBackground: false, preferCSSPageSize: true });
			console.log(`documents: ${doc.file}`);
		}
		await page.goto(`${origin}${baseNoSlash}/dohovir/`, { waitUntil: 'load' });
		await page.emulateMedia({ media: 'print' });
		await page.addStyleTag({ content: CONTRACT_PRINT_CSS });
		await page.pdf({
			path: path.join(outDir, 'dohovir.pdf'),
			format: 'A4',
			margin: { top: '18mm', bottom: '18mm', left: '22mm', right: '18mm' },
		});
		console.log('documents: dohovir.pdf');
	} finally {
		await browser.close();
		server.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
