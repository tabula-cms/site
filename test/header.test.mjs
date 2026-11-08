import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextHidden, isScrolled, HIDE_AFTER, HIDE_DISTANCE } from '../src/scripts/header.js';

test('nextHidden: never before ~400 px; hides only after HIDE_DISTANCE of downward movement', () => {
	assert.deepEqual(nextHidden({ y: HIDE_AFTER, lastY: 0 }), { hidden: false, down: 0 });
	assert.deepEqual(nextHidden({ y: 100, lastY: 50 }), { hidden: false, down: 0 });
	// a 7 px drift is not enough
	assert.deepEqual(nextHidden({ y: 807, lastY: 800 }), { hidden: null, down: 7 });
	// but it adds up
	assert.deepEqual(nextHidden({ y: 812, lastY: 807, down: 7 }), { hidden: true, down: 12 });
	assert.equal(nextHidden({ y: 800 + HIDE_DISTANCE, lastY: 800 }).hidden, true);
});

test('nextHidden: any upward movement shows it and resets the accumulation', () => {
	assert.deepEqual(nextHidden({ y: 795, lastY: 800, down: 8 }), { hidden: false, down: 0 });
	assert.deepEqual(nextHidden({ y: 800, lastY: 800, down: 4 }), { hidden: null, down: 4 });
});

test('nextHidden: not while focus is inside, the menu is open, or an anchor scroll is under way', () => {
	for (const flag of ['focusInside', 'menuOpen', 'locked']) {
		assert.deepEqual(nextHidden({ y: 900, lastY: 700, down: 50, [flag]: true }), { hidden: false, down: 0 });
	}
});

test('isScrolled: shadowed once the sentinel has left the screen', () => {
	assert.equal(isScrolled(true), false);
	assert.equal(isScrolled(false), true);
});
