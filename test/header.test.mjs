import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isScrolled, initMenu } from '../src/scripts/header.js';

test('isScrolled: compact once the sentinel has left the screen', () => {
	assert.equal(isScrolled(true), false);
	assert.equal(isScrolled(false), true);
});

// A minimal stand-in for the DOM: only what initMenu touches.
function fakeMenu() {
	const listeners = {};
	let focused = false;
	const summary = { focus: () => (focused = true) };
	const menu = {
		open: true,
		addEventListener: (type, fn) => (listeners.menu = { ...listeners.menu, [type]: fn }),
		removeAttribute: (name) => name === 'open' && (menu.open = false),
		hasAttribute: (name) => name === 'open' && menu.open,
		querySelector: () => summary,
	};
	const doc = { addEventListener: (type, fn) => (listeners.doc = { ...listeners.doc, [type]: fn }) };
	return { menu, doc, listeners, wasFocused: () => focused };
}

test('initMenu: Escape closes the open menu and returns focus to the summary; other keys do not', () => {
	const f = fakeMenu();
	initMenu(f.menu, f.doc);
	f.listeners.doc.keydown({ key: 'a' });
	assert.equal(f.menu.open, true);
	f.listeners.doc.keydown({ key: 'Escape' });
	assert.equal(f.menu.open, false);
	assert.equal(f.wasFocused(), true);
});
