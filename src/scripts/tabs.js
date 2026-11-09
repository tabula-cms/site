// WAI-ARIA tabs (story 80, decision 9) for every tablist of the home (the assistant, «Харчування», the templates, «Панель»): `tablist` / `tab` /
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
// The assistant's tab panels also play a short sequence (owner's request of 2026-11-09, product.css §18): when
// the section first enters the viewport and on every tab switch the active panel plays «Ви даєте» → arrow →
// «Готую чернетку…» → the draft building up, in at most 2.5 s, restarting on the new panel when a tab is
// switched. The sequence is CSS (`.is-playing`, animation delays from `--d`); this script only marks the
// parts, sets their delays from the pure schedule below, and toggles the class. Nothing is hidden without
// the script or under `prefers-reduced-motion: reduce` (then the script does nothing at all), and the real
// text stays in the DOM the whole time (words and plan items are wrapped in spans, never changed).
//
// The key logic is pure (`nextIndex`) so `node --test` can check it; `initTabs` touches the DOM
// only through the small surface the test's fake implements.

/** The index to activate for `key` from `current` among `count` tabs, or null when the key is not ours. */
export function nextIndex(key, current, count) {
	if (count < 1) return null;
	switch (key) {
		case 'ArrowRight':
		case 'ArrowDown': // the step tabs of «Харчування» and «Панель» are a vertical list
			return (current + 1) % count;
		case 'ArrowLeft':
		case 'ArrowUp':
			return (current - 1 + count) % count;
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
		default:
			return null;
	}
}

/** The phases of the assistant's sequence, in milliseconds from the start (the CSS reads the same numbers). */
export const PHASES = Object.freeze({
	inSpan: 450, // the pills, files, photos of «Ви даєте» start within this span
	wordsAt: 150, // the message is typed word by word from here ...
	wordsSpan: 420, // ... over this span
	wordDur: 150,
	itemDur: 280, // one part fading in
	arrowAt: 700, // the arrow pulses and draws
	arrowDur: 300,
	thinkAt: 1000, // «Готую чернетку…» with the three dots
	thinkDur: 650,
	outAt: 1650, // the draft builds from here
	outSpan: 500,
	flashLag: 200, // a highlighted part flashes this long after its block appears
	flashDur: 500,
	maxStep: 90, // never a longer gap between two parts
});

/** `count` start times spread over `span` ms from `start`, at most `max` ms apart; one part starts at `start`. */
export function stagger(count, { start = 0, span = 0, max = PHASES.maxStep } = {}) {
	if (count <= 0) return [];
	if (count === 1) return [start];
	const step = Math.min(max, span / (count - 1));
	return Array.from({ length: count }, (_, i) => Math.round(start + i * step));
}

/**
 * The schedule of one panel from the numbers of its parts: delays for the `in` parts, the typed `words` and the
 * `build` parts of the draft, and `end`, the moment the last of them has finished (the whole sequence is at
 * most 2.5 s).
 */
export function buildSchedule({ in: nIn = 0, words = 0, build = 0 } = {}, p = PHASES) {
	const inDelays = stagger(nIn, { start: 0, span: p.inSpan });
	const wordDelays = stagger(words, { start: p.wordsAt, span: p.wordsSpan });
	const buildDelays = stagger(build, { start: p.outAt, span: p.outSpan });
	const ends = [
		...inDelays.map((d) => d + p.itemDur),
		...wordDelays.map((d) => d + p.wordDur),
		...buildDelays.map((d) => d + p.itemDur),
		p.arrowAt + p.arrowDur,
		p.thinkAt + p.thinkDur,
	];
	return { in: inDelays, words: wordDelays, build: buildDelays, end: Math.max(...ends) };
}

// What each panel animates (selectors inside the panel): the parts of «Ви даєте» (`in`), the message whose words
// are typed (`words`), the plan items of the last tab (`units`: the text split at « · »), the parts of the
// draft in document order (`build`) and the highlights that flash once their block has appeared (`flash`).
export const PLAN = Object.freeze({
	news: {
		in: '.pills--above .pill, .thumbs',
		words: '.bubble',
		build: '.news-card, .news-card__title, .news-card__text, .notes li, .pills--actions .pill',
		flash: '.mark',
	},
	meals: {
		in: '.hand-note, .assistant-panel__in .hint',
		build: '.out-title, .out-line, .hint--out',
		flash: '.out-line--unsure small',
	},
	docs: { in: '.file', build: 'tbody tr, .hint--out' },
	alt: { in: '.photos img, .assistant-panel__in .hint', build: '.alt-list li, .hint--out' },
	edit: { in: '.pills--below .pill', words: '.quote-box', build: '.out-card--text, .hint--out' },
	site: { in: '.fields > div', units: '.out-card--lines p:not(.out-title)', build: '.out-card--lines .out-title, .out-card--lines .unit, .hint--out' },
});

/** Wraps every word of `el`'s text nodes in `<span class="w">` (the text itself is unchanged). */
function splitWords(el, doc) {
	const walker = doc.createTreeWalker(el, 4);
	const nodes = [];
	for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
	const spans = [];
	for (const node of nodes) {
		const parts = node.nodeValue.split(/(\s+)/);
		const frag = doc.createDocumentFragment();
		for (const part of parts) {
			if (part === '') continue;
			if (/^\s+$/.test(part)) frag.append(part);
			else {
				const span = doc.createElement('span');
				span.className = 'w';
				span.textContent = part;
				frag.append(span);
				spans.push(span);
			}
		}
		node.replaceWith(frag);
	}
	return spans;
}

/** Wraps each « · »-separated item of `el` in `<span class="unit">`, the separators kept as text. */
function splitUnits(el, doc) {
	const items = el.textContent.split(' · ');
	el.textContent = '';
	return items.map((text, i) => {
		if (i > 0) el.append(' · ');
		const span = doc.createElement('span');
		span.className = 'unit';
		span.textContent = text;
		el.append(span);
		return span;
	});
}

/** Marks the animated parts of one assistant panel (`data-p`) and gives each its delay (`--d`). */
function prepare(panel, doc) {
	const key = panel.id.replace('panel-assistant-', '');
	const plan = PLAN[key];
	if (!plan) return;
	const wordSpans = [];
	for (const el of plan.words ? panel.querySelectorAll(plan.words) : []) wordSpans.push(...splitWords(el, doc));
	for (const el of plan.units ? panel.querySelectorAll(plan.units) : []) splitUnits(el, doc);
	const inEls = plan.in ? [...panel.querySelectorAll(plan.in)] : [];
	const buildEls = plan.build ? [...panel.querySelectorAll(plan.build)] : [];
	const schedule = buildSchedule({ in: inEls.length, words: wordSpans.length, build: buildEls.length });
	const mark = (els, delays, kind) =>
		els.forEach((el, i) => {
			el.setAttribute('data-p', kind);
			el.style.setProperty('--d', `${delays[i]}ms`);
		});
	mark(inEls, schedule.in, 'in');
	mark(wordSpans, schedule.words, 'word');
	mark(buildEls, schedule.build, 'build');
	for (const el of plan.flash ? panel.querySelectorAll(plan.flash) : []) {
		const block = el.closest('[data-p="build"]');
		const at = block ? Number.parseInt(block.style.getPropertyValue('--d'), 10) : PHASES.outAt;
		el.setAttribute('data-p', 'flash');
		el.style.setProperty('--d', `${at + PHASES.flashLag}ms`);
	}
	if (key === 'edit') {
		// «Було» → «Стало»: the original text is laid over the result and fades out (a decoration; hidden from readers).
		const card = panel.querySelector('.out-card--text');
		const was = doc.createElement('p');
		was.className = 'out-was';
		was.setAttribute('aria-hidden', 'true');
		const kicker = doc.createElement('span');
		kicker.className = 'out-kicker';
		kicker.textContent = 'Було';
		was.append(kicker, panel.querySelector('.quote-box')?.textContent ?? '');
		card?.append(was);
	}
	const vars = { '--arrow-at': PHASES.arrowAt, '--arrow-dur': PHASES.arrowDur, '--think-at': PHASES.thinkAt, '--think-dur': PHASES.thinkDur, '--out-at': PHASES.outAt, '--flash-dur': PHASES.flashDur };
	for (const [name, ms] of Object.entries(vars)) panel.style.setProperty(name, `${ms}ms`);
}

/**
 * The assistant's player: `onActivate` goes to `initTabs`. The first panel is hidden-until-played (`is-primed`) and
 * plays once when `section` first enters the viewport; every later tab switch plays the new panel at once.
 */
export function createPlayer(group, doc = globalThis.document, win = globalThis) {
	const motion = win.matchMedia?.('(prefers-reduced-motion: no-preference)');
	if (!motion?.matches) return null;
	const panels = [...group.querySelectorAll('.assistant-panel')];
	let started = false;
	let current = null;
	const play = (panel) => {
		for (const other of panels) other.classList.remove('is-playing', 'is-primed');
		void panel.offsetWidth; // restart: the class comes off and goes on in different frames of style
		panel.classList.add('is-playing');
	};
	return {
		onActivate(index, panel, { initial = false } = {}) {
			current = panel;
			if (initial) {
				for (const p of panels) prepare(p, doc);
				const section = group.closest('section');
				if (section && 'IntersectionObserver' in win) {
					panel.classList.add('is-primed');
					const io = new win.IntersectionObserver((entries) => {
						if (!entries.some((e) => e.isIntersecting)) return;
						io.disconnect();
						started = true;
						play(current);
					}, { threshold: 0.25 });
					io.observe(section);
				}
				return;
			}
			if (started || !panel.classList.contains('is-primed')) play(panel);
		},
	};
}

/** Wires one `[data-tabs]` group; returns `{ activate }` (used by the test). `onActivate(index, panel, { initial })` is optional. */
export function initTabs(root, { onActivate } = {}) {
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

	function activate(index, { focus = false, initial = false } = {}) {
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
		onActivate?.(index, panels[index], { initial });
	}

	// The other panels' pictures are lazy and hidden, so they would only start loading on the click. As soon as a
	// pointer or the keyboard reaches the tablist, they are fetched, so a switch shows its picture at once.
	const preload = () => {
		for (const img of root.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
	};
	tablist.addEventListener('pointerover', preload, { once: true });
	tablist.addEventListener('focusin', preload, { once: true });

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
	activate(initial === -1 ? 0 : initial, { initial: true });
	return { activate, tabs, panels };
}

if (typeof document !== 'undefined') {
	// The hero's AI card types its title word by word on load (product.css §18): the words are wrapped here, not in
	// the markup, so the static page (no script, reduced motion) is byte-for-byte today's and renders identically.
	if (globalThis.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) {
		for (const title of document.querySelectorAll('.hero__card-title')) {
			splitWords(title, document).forEach((span, i) => span.style.setProperty('--w', String(i)));
		}
	}
	for (const group of document.querySelectorAll('[data-tabs]')) {
		const player = group.classList.contains('tabs--assistant') ? createPlayer(group) : null;
		initTabs(group, { onActivate: player?.onActivate });
	}
}
