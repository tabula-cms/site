import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepAt } from '../src/scripts/stories.js';

test('stepAt: the first step until half a step past the sticking point', () => {
	assert.equal(stepAt(-500, 200, 4), 0);
	assert.equal(stepAt(0, 200, 4), 0);
	assert.equal(stepAt(99, 200, 4), 0);
	assert.equal(stepAt(100, 200, 4), 1);
});

test('stepAt: one step per step length, clamped to the last', () => {
	assert.equal(stepAt(300, 200, 4), 2);
	assert.equal(stepAt(500, 200, 4), 3);
	assert.equal(stepAt(5000, 200, 4), 3);
});

test('stepAt: no length or no steps means the first step', () => {
	assert.equal(stepAt(300, 0, 4), 0);
	assert.equal(stepAt(300, NaN, 4), 0);
	assert.equal(stepAt(300, 200, 0), 0);
});
