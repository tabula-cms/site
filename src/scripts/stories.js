// The two pinned stories of the home, «Харчування» (#meals) and «Панель» (#panel) (owner's request of
// 2026-11-09, second round). The heading, the points and the device stay pinned while the page scrolls past an
// invisible track; the scroll only decides WHICH step is current, and the change itself is a short timed
// transition in CSS (product.css §18, items 5 and 6). The first version scrubbed every crossfade with the scroll,
// so between two steps the stage looked stuck half-way; now a short scroll past a threshold switches the step and
// the new screen plays in by itself.
//
// Still no scroll hijacking: the script only reads positions on a passive scroll listener and never changes the
// scroll. It marks the section with `data-story` (the CSS gates the pinned layout on it, so without JavaScript the
// section is the static layout) and toggles `is-on` on every `[data-at]` element of the section whose value is the
// current step and `is-past` on those of the steps already passed (#28's look, kept: the points after the first
// appear one by one, and each new screen is laid on top of the previous ones, which stay underneath, smaller and
// darker). Under `prefers-reduced-motion: reduce` the CSS ignores `data-story` and the section stays static.

/**
 * The current step from how far (px) the track has scrolled past the point where the pin sticks, the length of one
 * step (px) and the number of steps. A step switches half-way through its predecessor's length, so the first
 * switch comes after a short scroll.
 */
export function stepAt(scrolled, stepPx, count) {
	if (count < 1 || !(stepPx > 0)) return 0;
	const step = Math.round(scrolled / stepPx);
	return Math.min(Math.max(step, 0), count - 1);
}

/** Wires one story section. Returns a function that recomputes the step (used by the listeners). */
export function initStory(section, win = globalThis) {
	const track = section.querySelector('[data-story-track]');
	const pin = section.querySelector('[data-story-pin]');
	if (!track || !pin) return null;
	const spacers = track.children;
	const count = spacers.length;
	const parts = Array.from(section.querySelectorAll('[data-at]'));
	let current = -1;

	const show = (step) => {
		if (step === current) return;
		current = step;
		for (const el of parts) {
			const at = Number(el.dataset.at);
			el.classList.toggle('is-on', at === step);
			el.classList.toggle('is-past', at < step);
		}
	};
	const update = () => {
		const stepPx = spacers[0]?.getBoundingClientRect().height ?? 0;
		const stickTop = parseFloat(win.getComputedStyle(pin).top) || 0;
		show(stepAt(stickTop - track.getBoundingClientRect().top, stepPx, count));
	};

	section.setAttribute('data-story', '');
	show(0);
	update();
	return update;
}

if (typeof document !== 'undefined') {
	const updates = Array.from(document.querySelectorAll('[data-story-section]'))
		.map((section) => initStory(section, window))
		.filter(Boolean);
	if (updates.length) {
		let queued = false;
		const run = () => {
			queued = false;
			for (const update of updates) update();
		};
		const queue = () => {
			if (!queued) {
				queued = true;
				requestAnimationFrame(run);
			}
		};
		addEventListener('scroll', queue, { passive: true });
		addEventListener('resize', queue, { passive: true });
	}
}
