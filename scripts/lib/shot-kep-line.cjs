// Takes `kep-line.webp` for scripts/shots.mjs: the public line of a document signed with a КЕП
// signature («Електронний підпис: …, Перевірити підпис, Файл підпису»).
//
// The running demo cannot show it: the seed holds no signature, and a signature the demo cannot
// chain to a trusted provider reads «сайт не встановив, чий». So this script starts its own
// throwaway seeded school site from a tabula checkout (TABULA_DIR, default ../tabula; read only,
// like the demo), with a КЕП list that trusts a fictitious chain made in memory by tabula's
// test/helpers/kepFixtures.js (the way tabula's own scripts/guide-screens.js does), signs the
// seeded statute with a fictitious director's key through the panel, and shoots the line.
// Needs `npm ci` in the tabula checkout. Usage: node shot-kep-line.cjs <out.webp>
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tabulaDir = path.resolve(process.env.TABULA_DIR || path.join(__dirname, '..', '..', '..', 'tabula'));
const outFile = process.argv[2];
if (!outFile) {
	console.error('usage: node shot-kep-line.cjs <out.webp>');
	process.exit(2);
}
// The site's own dependencies first; tabula's helpers resolve theirs from the checkout.
const { chromium } = require('playwright');
const sharp = require('sharp');
const here = (file) => path.join(tabulaDir, file);
const SIGNED_AT = '2026-10-24T09:30:00Z';
const STATUTE = 'Статут ліцею (нова редакція)';

async function main() {
	process.chdir(tabulaDir);
	const kep = require(here('test/helpers/kepFixtures'));
	const { tlv, utf8 } = require(here('test/helpers/cmsSignature'));
	const { startSeededSite, signIn } = require(here('test/helpers/seededSite'));
	const { loadBundledList } = require(here('src/lib/kep/caList'));

	const printable = (text) => tlv(0x13, Buffer.from(text, 'latin1'));
	const issuer = [
		['country', printable('UA')],
		['organizationName', utf8('Вигаданий засвідчувальний центр')],
	];
	const root = kep.makeIdentity('guide-root', {
		subject: [...issuer, ['commonName', utf8('Вигаданий кореневий центр')]],
		selfSigned: true,
		extensions: [kep.basicConstraints(true), kep.KEY_CERT_SIGN],
	});
	const ca = kep.makeIdentity('guide-ca', {
		subject: [...issuer, ['commonName', utf8('Вигаданий надавач довірчих послуг')]],
		issuedBy: root,
		extensions: [kep.basicConstraints(true, 0), kep.KEY_CERT_SIGN],
	});
	const tsa = kep.makeIdentity('guide-tsa', {
		subject: [...issuer, ['commonName', utf8('Вигаданий сервер позначок часу')]],
		issuedBy: ca,
		extensions: [kep.DIGITAL_SIGNATURE, kep.TIMESTAMPING],
	});
	const person = kep.makeIdentity('guide-person', {
		subject: [
			['country', printable('UA')],
			['surname', utf8('Коваленко')],
			['givenName', utf8('Олена Петрівна')],
			['commonName', utf8('Коваленко Олена Петрівна')],
			['serialNumber', printable('TINUA-0000000000')],
			['title', utf8('директорка')],
		],
		issuedBy: ca,
		extensions: [kep.DIGITAL_SIGNATURE],
	});
	const bundled = loadBundledList();
	const caList = {
		...bundled,
		roots: [...bundled.roots, root.certificate],
		certificates: [...bundled.certificates, ca.certificate, tsa.certificate],
	};

	const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabula-shot-kep-'));
	let site = null;
	let browser = null;
	try {
		site = await startSeededSite(dataDir, { seed: 'school', template: 'zoshyt', caList });
		browser = await chromium.launch();
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
			locale: 'uk-UA',
			colorScheme: 'light',
			reducedMotion: 'reduce',
		});
		const page = await context.newPage();
		await signIn(page, site.baseUrl, site.seeded.admin);
		await page.goto(`${site.baseUrl}/admin/documents?type=zaklad`, { waitUntil: 'networkidle' });
		const rows = await page
			.locator('a[href^="/admin/documents/"]:not([href*="/file"]):not([href*="/new"]):not([href*="/signatures"])')
			.evaluateAll((links) =>
				links
					.filter((link) => !link.getAttribute('aria-label'))
					.map((link) => ({ title: link.textContent.trim(), href: link.getAttribute('href') })),
			);
		const row = rows.find((r) => r.title === STATUTE);
		if (!row) throw new Error(`the seed has no document «${STATUTE}»`);
		const id = row.href.split('/').pop();
		const file = await (await context.request.get(`${site.baseUrl}/admin/documents/${id}/file`)).body();
		const signature = kep.sign(file, person, {
			stampSignature: (value) => [kep.timestampToken(value, SIGNED_AT, { tsa })],
		});
		await page.goto(`${site.baseUrl}/admin/documents/${id}?tab=kep`, { waitUntil: 'networkidle' });
		await page.setInputFiles('input[name=p7s]', {
			name: 'signature.p7s',
			mimeType: 'application/pkcs7-signature',
			buffer: signature,
		});
		await page.fill('input[name=signer_note]', 'директорка');
		await Promise.all([page.waitForLoadState('networkidle'), page.click('#doc-kep button[type=submit]')]);

		await page.goto(`${site.baseUrl}/ustanovchi-dokumenty`, { waitUntil: 'networkidle' });
		await page.evaluate(() => globalThis.document.fonts.ready);
		const line = page.getByText('Електронний підпис:').first().locator('xpath=ancestor::li[1]');
		const box = await line.boundingBox();
		if (!box) throw new Error('the signature line is not on the page');
		const pad = 16;
		const png = await page.screenshot({
			type: 'png',
			fullPage: true,
			clip: {
				x: Math.max(0, box.x - pad),
				y: Math.max(0, box.y + (await page.evaluate(() => globalThis.scrollY)) - pad),
				width: Math.min(1440, box.width + 2 * pad),
				height: box.height + 2 * pad,
			},
		});
		const webp = await sharp(png).webp({ quality: 80 }).toBuffer();
		fs.writeFileSync(outFile, webp);
		console.log(`kep-line: ${outFile} (${webp.length} bytes)`);
	} finally {
		if (browser) await browser.close();
		if (site) await site.stop();
		fs.rmSync(dataDir, { recursive: true, force: true });
	}
}

main().then(
	() => process.exit(0),
	(error) => {
		console.error(error);
		process.exit(1);
	},
);
