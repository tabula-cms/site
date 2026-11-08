// WAI-ARIA tabs (story 80, decision 9) for both tablists of the home: `tablist` / `tab` /
// `tabpanel`, `aria-controls` / `aria-labelledby`, roving `tabindex`, Left/Right (wrapping),
// Home/End, automatic activation, focus moves to the tab.
//
// Without JavaScript the page is complete: the tablist is `hidden` in the markup and every panel
// is shown one under another, each under its own heading, and carries no `tabpanel` role (`[data-tab-heading]`). This script
// shows the tablist, hides the headings and every panel but the active one.
//
// Optional markup: an element with `data-tabs-note` inside the group mirrors the active panel's
// `[data-note]` text (the template note beside the tablist); the in-panel notes are then hidden.
//
// The key logic is pure (`nextIndex`) so `node --test` can check it; `initTabs` touches the DOM
// only through the small surface the test's fake implements.

/** The index to activate for `key` from `current` among `count` tabs, or null when the key is not ours. */
export function nextIndex(key, current, count) {
	if (count < 1) return null;
	switch (key) {
		case 'ArrowRight':
			return (current + 1) % count;
		case 'ArrowLeft':
			return (current - 1 + count) % count;
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
		default:
			return null;
	}
}

/** Wires one `[data-tabs]` group; returns `{ activate }` (used by the test). */
export function initTabs(root) {
	const tablist = root.querySelector('[role="tablist"]');
	if (!tablist) return null;
	const tabs = [...tablist.querySelectorAll('[role="tab"]')];
	const panelOf = (tab) => root.querySelector(`#${tab.getAttribute('aria-controls')}`);
	const panels = tabs.map(panelOf);
	const mirror = root.querySelector('[data-tabs-note]');

	root.classList.add('tabs--js');
	tablist.hidden = false;
	for (const heading of root.querySelectorAll('[data-tab-heading]')) heading.hidden = true;
	// Roles are set here, not in the markup: without JavaScript there is no tablist, so a panel is only a section.
	tabs.forEach((tab, i) => {
		panels[i].setAttribute('role', 'tabpanel');
		panels[i].setAttribute('aria-labelledby', tab.getAttribute('id'));
		panels[i].setAttribute('tabindex', '0');
	});

	function activate(index, { focus = false } = {}) {
		tabs.forEach((tab, i) => {
			const selected = i === index;
			tab.setAttribute('aria-selected', selected ? 'true' : 'false');
			tab.setAttribute('tabindex', selected ? '0' : '-1');
			panels[i].hidden = !selected;
		});
		if (mirror) {
			const note = panels[index].querySelector('[data-note]');
			mirror.textContent = note ? note.textContent : '';
			mirror.hidden = !note;
			for (const panel of panels) {
				const own = panel.querySelector('[data-note]');
				if (own) own.hidden = true;
			}
		}
		if (focus) tabs[index].focus();
	}

	tabs.forEach((tab, i) => {
		tab.addEventListener('click', () => activate(i));
		tab.addEventListener('keydown', (event) => {
			const next = nextIndex(event.key, i, tabs.length);
			if (next === null) return;
			event.preventDefault();
			activate(next, { focus: true });
		});
	});

	const initial = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
	activate(initial === -1 ? 0 : initial);
	return { activate, tabs, panels };
}

if (typeof document !== 'undefined') {
	for (const group of document.querySelectorAll('[data-tabs]')) initTabs(group);
}
