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

// A disclosure that knows which nodes are inside it, for the click-outside and focus-out rules.
function fakeDisclosure(inside) {
	const f = fakeMenu();
	f.menu.contains = (node) => inside.includes(node);
	return f;
}

test('initMenu: a click outside closes the open disclosure; a click inside does not', () => {
	const inside = {};
	const f = fakeDisclosure([inside]);
	initMenu(f.menu, f.doc);
	f.listeners.doc.click({ target: inside });
	assert.equal(f.menu.open, true);
	f.listeners.doc.click({ target: {} });
	assert.equal(f.menu.open, false);
});

test('initMenu: focus moving outside closes it; focus moving within, or to nowhere, does not', () => {
	const inside = {};
	const f = fakeDisclosure([inside]);
	initMenu(f.menu, f.doc);
	f.listeners.menu.focusout({ relatedTarget: inside });
	assert.equal(f.menu.open, true);
	f.listeners.menu.focusout({ relatedTarget: null });
	assert.equal(f.menu.open, true);
	f.listeners.menu.focusout({ relatedTarget: {} });
	assert.equal(f.menu.open, false);
});
