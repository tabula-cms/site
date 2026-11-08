import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextIndex, initTabs } from '../src/scripts/tabs.js';

test('nextIndex: Right and Left wrap around', () => {
	assert.equal(nextIndex('ArrowRight', 0, 6), 1);
	assert.equal(nextIndex('ArrowRight', 5, 6), 0);
	assert.equal(nextIndex('ArrowLeft', 3, 6), 2);
	assert.equal(nextIndex('ArrowLeft', 0, 6), 5);
});

test('nextIndex: Home and End', () => {
	assert.equal(nextIndex('Home', 4, 6), 0);
	assert.equal(nextIndex('End', 1, 6), 5);
});

test('nextIndex: any other key is not ours', () => {
	for (const key of ['Enter', ' ', 'Tab', 'ArrowDown', 'a']) assert.equal(nextIndex(key, 2, 6), null);
	assert.equal(nextIndex('ArrowRight', 0, 0), null);
});

// A tiny fake of the DOM surface initTabs touches.
function fakeElement(attrs = {}) {
	const handlers = {};
	const el = {
		attrs: { ...attrs },
		hidden: false,
		focused: false,
		classes: new Set(),
		children: new Map(),
		textContent: '',
		setAttribute(name, value) {
			el.attrs[name] = String(value);
		},
		getAttribute: (name) => el.attrs[name] ?? null,
		addEventListener(type, fn) {
			handlers[type] = fn;
		},
		fire(type, event = {}) {
			let prevented = false;
			handlers[type]?.({ ...event, preventDefault: () => (prevented = true) });
			return prevented;
		},
		focus() {
			el.focused = true;
		},
		classList: { add: (c) => el.classes.add(c) },
		querySelector: (sel) => el.children.get(sel) ?? null,
		querySelectorAll: (sel) => el.children.get(`all:${sel}`) ?? [],
	};
	return el;
}

function fakeGroup(names, { note = false } = {}) {
	const root = fakeElement();
	const tablist = fakeElement({ role: 'tablist' });
	tablist.hidden = true;
	const tabs = names.map((name, i) =>
		fakeElement({ role: 'tab', id: `t-${i}`, 'aria-controls': `p-${i}`, 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1' }),
	);
	const panels = names.map((name, i) => {
		const panel = fakeElement({ id: `p-${i}` });
		if (note) {
			const n = fakeElement();
			n.textContent = `note ${name}`;
			panel.children.set('[data-note]', n);
		}
		return panel;
	});
	const headings = names.map(() => fakeElement());
	tablist.children.set('all:[role="tab"]', tabs);
	root.children.set('[role="tablist"]', tablist);
	panels.forEach((panel, i) => root.children.set(`#p-${i}`, panel));
	root.children.set('all:[data-tab-heading]', headings);
	const mirror = fakeElement();
	mirror.hidden = true;
	if (note) root.children.set('[data-tabs-note]', mirror);
	return { root, tablist, tabs, panels, headings, mirror };
}

test('initTabs: shows the tablist, hides the headings and every panel but the first', () => {
	const g = fakeGroup(['a', 'b', 'c']);
	initTabs(g.root);
	assert.equal(g.tablist.hidden, false);
	assert.ok(g.headings.every((h) => h.hidden));
	assert.deepEqual(g.panels.map((p) => p.hidden), [false, true, true]);
	assert.deepEqual(g.tabs.map((t) => t.getAttribute('aria-selected')), ['true', 'false', 'false']);
	assert.ok(g.root.classes.has('tabs--js'));
});

test('initTabs: roving tabindex, arrows wrap, focus follows, activation is automatic', () => {
	const g = fakeGroup(['a', 'b', 'c']);
	initTabs(g.root);
	assert.deepEqual(g.tabs.map((t) => t.getAttribute('tabindex')), ['0', '-1', '-1']);
	assert.equal(g.tabs[0].fire('keydown', { key: 'ArrowLeft' }), true);
	assert.ok(g.tabs[2].focused, 'focus moved to the last tab');
	assert.deepEqual(g.tabs.map((t) => t.getAttribute('aria-selected')), ['false', 'false', 'true']);
	assert.deepEqual(g.tabs.map((t) => t.getAttribute('tabindex')), ['-1', '-1', '0']);
	assert.deepEqual(g.panels.map((p) => p.hidden), [true, true, false]);
	g.tabs[2].fire('keydown', { key: 'ArrowRight' });
	assert.ok(g.tabs[0].focused);
	assert.deepEqual(g.panels.map((p) => p.hidden), [false, true, true]);
});

test('initTabs: Home, End, a click, and keys that are not ours', () => {
	const g = fakeGroup(['a', 'b', 'c', 'd']);
	initTabs(g.root);
	g.tabs[0].fire('keydown', { key: 'End' });
	assert.equal(g.tabs[3].getAttribute('aria-selected'), 'true');
	g.tabs[3].fire('keydown', { key: 'Home' });
	assert.equal(g.tabs[0].getAttribute('aria-selected'), 'true');
	g.tabs[2].fire('click');
	assert.equal(g.tabs[2].getAttribute('aria-selected'), 'true');
	assert.equal(g.tabs[2].focused, false, 'a click does not need to move focus');
	assert.equal(g.tabs[2].fire('keydown', { key: 'Enter' }), false, 'Enter is left alone');
});

test('initTabs: the script gives each panel its role, its label and tabindex 0 (the markup has none)', () => {
	const g = fakeGroup(['a', 'b']);
	assert.ok(g.panels.every((p) => p.getAttribute('role') === null), 'no role without the script');
	initTabs(g.root);
	g.panels.forEach((p, i) => {
		assert.equal(p.getAttribute('role'), 'tabpanel');
		assert.equal(p.getAttribute('aria-labelledby'), `t-${i}`);
		assert.equal(p.getAttribute('tabindex'), '0');
	});
});

test('initTabs: the active panel\'s note is mirrored beside the tablist, in-panel notes hidden', () => {
	const g = fakeGroup(['a', 'b'], { note: true });
	initTabs(g.root);
	assert.equal(g.mirror.textContent, 'note a');
	assert.equal(g.mirror.hidden, false);
	assert.ok(g.panels.every((p) => p.querySelector('[data-note]').hidden));
	g.tabs[1].fire('click');
	assert.equal(g.mirror.textContent, 'note b');
});

test('initTabs: a group without a tablist is left alone', () => {
	assert.equal(initTabs(fakeElement()), null);
});
