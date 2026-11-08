// The sticky header's behaviour (story 80, decision 10).
//  - A soft shadow (and compact padding, in CSS) once the page has scrolled: a 1 px sentinel at the
//    very top watched with an IntersectionObserver, no scroll listener for that.
//  - Live header: after ~400 px of scroll it hides (`is-hidden`, translateY(-100%)) while the page
//    is read downwards and comes back on any scroll up. It never hides while focus is inside it or the
//    «Меню» disclosure is open, and it shows when an in-page anchor is followed. Only under
//    `prefers-reduced-motion: no-preference`; otherwise the header simply stays.
//  - The «Меню» disclosure closes when a link in it is followed and on Escape.
// Without JavaScript the header is a plain sticky bar.

export const HIDE_AFTER = 400;
// A downward drift shorter than this (a wheel-up rebound, a rubber band, trackpad momentum) never hides the header.
export const HIDE_DISTANCE = 10;

/** The header's reading progress is CSS-only (animation-timeline: scroll(root)); this is the show/hide rule. */
export function isScrolled(sentinelIntersecting) {
	return !sentinelIntersecting;
}

/**
 * The header's next state after a scroll from `lastY` to `y`: `{ hidden, down }`. `hidden` is true/false, or null to
 * keep the current state; `down` is the downward distance accumulated since the last upward movement, to be fed back
 * in as `down` next time. The header hides only after HIDE_DISTANCE of downward movement, below HIDE_AFTER, and never
 * while focus is inside it, the «Меню» is open, or an anchor scroll is under way (`locked`).
 */
export function nextHidden({ y, lastY, down = 0, focusInside = false, menuOpen = false, locked = false }) {
	if (y <= HIDE_AFTER || focusInside || menuOpen || locked) return { hidden: false, down: 0 };
	if (y < lastY) return { hidden: false, down: 0 };
	if (y === lastY) return { hidden: null, down };
	const total = down + (y - lastY);
	return { hidden: total >= HIDE_DISTANCE ? true : null, down: total };
}

if (typeof document !== 'undefined') {
	const header = document.querySelector('[data-site-header]');
	if (header && 'IntersectionObserver' in globalThis) {
		const sentinel = document.createElement('div');
		sentinel.setAttribute('aria-hidden', 'true');
		sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none';
		document.body.prepend(sentinel);
		new IntersectionObserver(([entry]) => {
			header.classList.toggle('is-scrolled', isScrolled(entry.isIntersecting));
		}).observe(sentinel);
	}

	const menu = document.querySelector('.nav-menu');
	if (menu) {
		menu.addEventListener('click', (event) => {
			if (event.target instanceof Element && event.target.closest('a')) menu.removeAttribute('open');
		});
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && menu.hasAttribute('open')) {
				menu.removeAttribute('open');
				menu.querySelector('summary')?.focus();
			}
		});
	}

	if (header && globalThis.matchMedia) {
		const motion = globalThis.matchMedia('(prefers-reduced-motion: no-preference)');
		let lastY = globalThis.scrollY;
		let down = 0;
		let locked = false;
		let lockTimer = 0;
		let queued = false;
		const show = () => header.classList.remove('is-hidden');
		const rebase = () => {
			lastY = globalThis.scrollY;
			down = 0;
		};
		// An anchor scroll (a click, a hash change, a deep link on load, a restored position) runs downwards
		// for up to ~1.5 s: the header is held visible until the scroll ends (`scrollend`, or no scroll event for
		// 150 ms where it is missing), then the baseline is taken again so nothing that happened counts.
		const release = () => {
			clearTimeout(lockTimer);
			locked = false;
			rebase();
		};
		const lock = (quiet = 300) => {
			locked = true;
			show();
			clearTimeout(lockTimer);
			lockTimer = setTimeout(release, quiet);
		};
		const update = () => {
			queued = false;
			if (locked) {
				// still scrolling: wait for the scroll to settle
				clearTimeout(lockTimer);
				lockTimer = setTimeout(release, 150);
				return;
			}
			const y = globalThis.scrollY;
			const next = motion.matches
				? nextHidden({
						y,
						lastY,
						down,
						focusInside: header.contains(document.activeElement),
						menuOpen: !!menu?.hasAttribute('open'),
						locked,
					})
				: { hidden: false, down: 0 };
			down = next.down;
			if (next.hidden !== null) header.classList.toggle('is-hidden', next.hidden);
			lastY = y;
		};
		globalThis.addEventListener(
			'scroll',
			() => {
				if (!queued) {
					queued = true;
					requestAnimationFrame(update);
				}
			},
			{ passive: true },
		);
		globalThis.addEventListener('scrollend', () => {
			if (locked) release();
		});
		document.addEventListener('click', (event) => {
			if (event.target instanceof Element && event.target.closest('a[href*="#"]')) lock();
		});
		globalThis.addEventListener('hashchange', () => lock());
		// A page opened on a deep link (or at a restored position) starts shown and baselined; the browser's own
		// jump to the anchor happens around load, so the lock holds until it has settled.
		if (location.hash || globalThis.scrollY > 0) lock(600);
		globalThis.addEventListener('load', () => {
			if (location.hash || globalThis.scrollY > 0) lock(400);
		});
		header.addEventListener('focusin', show);
		motion.addEventListener?.('change', () => {
			if (!motion.matches) show();
		});
	}
}
