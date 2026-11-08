import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	offer,
	includes,
	operatorLine,
	parseIsoDate,
	formatDate,
	formatDateLong,
	formatNumber,
	nextDay,
	privacyEmail,
} from '../src/config/offer.mjs';

test('offer: the fields exist with the right types', () => {
	assert.ok(Object.isFrozen(offer));
	for (const key of ['pilotUntil', 'asOf']) assert.ok(parseIsoDate(offer[key]), `${key} is a real date`);
	for (const key of ['priceYearUah', 'priceQuarterUah', 'requestReplyDays', 'supportReplyDays']) {
		assert.ok(Number.isInteger(offer[key]) && offer[key] > 0, `${key} is a positive integer`);
	}
	assert.ok(offer.pilotValueUah === null || Number.isInteger(offer.pilotValueUah));
	assert.match(offer.contactEmail, /^[^@\s]+@[^@\s]+\.[a-z]+$/);
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
	for (const text of [operatorLine, offer.copiesWhere, ...includes.flatMap((i) => [i.title, i.text])]) {
		assert.doesNotMatch(text, bad, text);
	}
});

test('operatorLine: names the operator by kind only', () => {
	assert.match(operatorLine, /^Послуги надає фізична особа — підприємець, платник єдиного податку 3-ї групи, без ПДВ\./);
	assert.doesNotMatch(operatorLine, /ФОП/);
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

test('privacyEmail: operatorEmail when set, else contactEmail', () => {
	assert.equal(privacyEmail(), offer.operatorEmail || offer.contactEmail);
});
