import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	offer,
	includes,
	includesShort,
	withinWorkingDays,
	formatDateLongYear,
	formatUah,
	formatGrn,
	yearOf,
	footerLine,
	exitText,
	parseIsoDate,
	formatDate,
	formatDateLong,
	formatNumber,
	nextDay,
	privacyEmail,
	complaintEmail,
	demoHref,
	demoPageState,
} from '../src/config/offer.mjs';

test('offer: the fields exist with the right types', () => {
	assert.ok(Object.isFrozen(offer));
	for (const key of ['pilotUntil', 'asOf']) assert.ok(parseIsoDate(offer[key]), `${key} is a real date`);
	for (const key of ['priceYearUah', 'priceQuarterUah', 'requestReplyDays', 'supportReplyDays']) {
		assert.ok(Number.isInteger(offer[key]) && offer[key] > 0, `${key} is a positive integer`);
	}
	assert.ok(offer.pilotValueUah === null || Number.isInteger(offer.pilotValueUah));
	assert.ok(offer.contactPhone === null || typeof offer.contactPhone === 'string');
	assert.ok(offer.operatorEmail === null || /^[^@\s]+@[^@\s]+\.[a-z]+$/.test(offer.operatorEmail));
});

test('offer: pilotValueUah is the monthly value, priceYearUah / 12', () => {
	if (offer.pilotValueUah !== null) assert.equal(offer.pilotValueUah * 12, offer.priceYearUah);
	assert.equal(typeof offer.cpUrl, 'string');
	assert.equal(typeof offer.turnstileSiteKey, 'string');
	assert.equal(typeof offer.requestsOpen, 'boolean');
	assert.ok(offer.copiesWhere.length > 0);
});

test('offer: the quarter price is a quarter of the year price', () => {
	assert.equal(offer.priceQuarterUah * 4, offer.priceYearUah);
});

test('offer: the checked date is not after the end of the pilot', () => {
	assert.ok(offer.asOf <= offer.pilotUntil);
});

test('offer: no ASCII or right-quote apostrophe between Cyrillic letters in the shared texts', () => {
	const bad = /[А-ЯҐЄІЇа-яґєії]['’][А-ЯҐЄІЇа-яґєії]/;
	for (const text of [footerLine, exitText, offer.copiesWhere, ...includes.flatMap((i) => [i.title, i.text])]) {
		assert.doesNotMatch(text, bad, text);
	}
});

test('footerLine: who made Tabula, verbatim from the spec, no operator details', () => {
	assert.equal(
		footerLine,
		'Tabula зробили вчителі з досвідом програмування — для інших шкіл. Щоб сайт закладу вів його працівник, а не найнятий програміст.',
	);
	assert.doesNotMatch(footerLine, /ФОП|підприєм|ПДВ/);
});

test('exit: copies on Hetzner for 30 days; the exit text takes its number from offer', () => {
	assert.equal(offer.copiesWhere, 'Hetzner, ЄС');
	assert.equal(offer.backupRetentionDays, 30);
	assert.ok(exitText.includes(`через ${offer.exitClosedDays} днів видаляємо разом із копіями`));
	assert.doesNotMatch(exitText, /Backblaze|відкрит|власн\S* сервер/);
});

test('includes: nothing about open code or an own server', () => {
	for (const item of includes) assert.doesNotMatch(`${item.title} ${item.text}`, /[Вв]ідкритий код|власний сервер/);
});

test('includes: nine items with a title, a text and an icon', () => {
	assert.equal(includes.length, 9);
	for (const item of includes) {
		assert.ok(item.title && item.text && item.icon);
	}
});

test('formatDate / formatDateLong / nextDay', () => {
	assert.equal(formatDate('2026-12-31'), '31.12.2026');
	assert.equal(formatDate('2026-03-05'), '05.03.2026');
	assert.equal(formatDateLong('2027-01-01'), '1 січня 2027');
	assert.equal(nextDay('2026-12-31'), '2027-01-01');
	assert.equal(nextDay('2028-02-28'), '2028-02-29');
	assert.throws(() => formatDate('2026-02-30'));
	assert.throws(() => formatDate('31.12.2026'));
});

test('formatNumber: a narrow no-break space between thousands', () => {
	assert.equal(formatNumber(4800), '4 800');
	assert.equal(formatNumber(1200), '1 200');
	assert.equal(formatNumber(52800), '52 800');
	assert.equal(formatNumber(950), '950');
	assert.throws(() => formatNumber(1.5));
});

test('privacyEmail: operatorEmail when set, else supportEmail', () => {
	assert.equal(privacyEmail(), offer.operatorEmail || offer.supportEmail);
});

test('complaintEmail: the owner’s address when set, else privacyEmail()', () => {
	assert.ok(offer.complaintEmail === null || /^[^@\s]+@[^@\s]+\.[a-z]+$/.test(offer.complaintEmail));
	assert.equal(complaintEmail(null), privacyEmail());
	assert.equal(complaintEmail('abuse@example.org'), 'abuse@example.org');
	assert.equal(complaintEmail(), offer.complaintEmail || privacyEmail());
});

test('offer: story 80 fields — assistantStatus, demoSiteUrl, supportEmail', () => {
	assert.ok(['testing', 'on'].includes(offer.assistantStatus));
	assert.ok(offer.demoSiteUrl === null || /^https:\/\//.test(offer.demoSiteUrl));
	assert.match(offer.supportEmail, /^[^@\s]+@[^@\s]+\.[a-z]+$/);
});

test('includesShort: five lines, each covered by valid, non-empty indexes of includes', () => {
	assert.equal(includesShort.length, 5);
	for (const item of includesShort) {
		assert.ok(item.text.length > 0);
		assert.ok(Array.isArray(item.coveredBy) && item.coveredBy.length > 0, item.text);
		for (const index of item.coveredBy) {
			assert.ok(Number.isInteger(index) && index >= 0 && index < includes.length, `${item.text}: index ${index}`);
		}
	}
});

test('includesShort: the reply time line says «зазвичай» and takes its number from offer', () => {
	const line = includesShort.find((item) => item.text.startsWith('Відповідь на листи'));
	assert.equal(line.text, `Відповідь на листи — зазвичай ${withinWorkingDays(offer.supportReplyDays)}`);
});

test('withinWorkingDays: the number in words, genitive', () => {
	assert.equal(withinWorkingDays(1), 'протягом одного робочого дня');
	assert.equal(withinWorkingDays(2), 'протягом двох робочих днів');
	assert.equal(withinWorkingDays(5), 'протягом пʼяти робочих днів');
	assert.throws(() => withinWorkingDays(0));
	assert.throws(() => withinWorkingDays(11));
});

test('formatDateLongYear, yearOf, formatUah: no-break spaces where the copy rules want them', () => {
	assert.equal(formatDateLongYear('2026-12-31'), '31\u00a0грудня\u00a02026\u00a0року');
	assert.equal(yearOf(nextDay('2026-12-31')), 2027);
	assert.equal(formatUah(4800), '4\u00a0800\u00a0₴');
	assert.equal(formatUah(0), '0\u00a0₴');
	assert.equal(formatUah(offer.priceQuarterUah), '1\u00a0200\u00a0₴');
});

test('includesShort: no apostrophe but ʼ between Cyrillic letters', () => {
	const bad = /[А-ЯҐЄІЇа-яґєії]['’][А-ЯҐЄІЇа-яґєії]/;
	for (const item of includesShort) assert.doesNotMatch(item.text, bad, item.text);
});

test('formatGrn: no-break spaces inside the sum and before «грн»', () => {
	assert.equal(formatGrn(4800), '4\u00a0800\u00a0грн');
	assert.equal(formatGrn(400), '400\u00a0грн');
});

test('demoHref: the page «Демо-сайт» while demoSiteUrl is null, the demo site itself once it is set', () => {
	assert.equal(offer.demoSiteUrl, null);
	assert.equal(demoHref('/site/'), '/site/demo/');
	assert.equal(demoHref('/'), '/demo/');
	assert.equal(demoHref('/site/', null), '/site/demo/');
	assert.equal(demoHref('/site/', 'https://demo.example.org/'), 'https://demo.example.org/');
	assert.equal(demoHref('/', 'https://demo.example.org/'), 'https://demo.example.org/');
});

test('demoPageState: the chip while demoSiteUrl is null, the button (and no chip) once it is set', () => {
	assert.deepEqual(demoPageState(), { chip: true, buttonHref: null });
	assert.deepEqual(demoPageState(null), { chip: true, buttonHref: null });
	assert.deepEqual(demoPageState('https://demo.example.org/'), { chip: false, buttonHref: 'https://demo.example.org/' });
});
