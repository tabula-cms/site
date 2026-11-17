import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMealDay } from '../src/lib/meal-day.mjs';

test('formatMealDay: weekday, day and month in Ukrainian with a no-break space inside the date', () => {
	assert.equal(formatMealDay('2026-11-17'), 'вівторок, 17 листопада');
	assert.equal(formatMealDay('2026-11-06'), 'пʼятниця, 6 листопада');
	assert.equal(formatMealDay('2026-11-15'), 'неділя, 15 листопада');
	assert.equal(formatMealDay('2027-03-01'), 'понеділок, 1 березня');
});

test('formatMealDay: the apostrophe is U+02BC and a bad date is an error', () => {
	assert.ok(!formatMealDay('2026-11-06').includes("'"));
	assert.throws(() => formatMealDay('2026-02-30'));
	assert.throws(() => formatMealDay('17.11.2026'));
});
