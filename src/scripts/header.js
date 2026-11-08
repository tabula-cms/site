// The sticky header's state (story 80, decision 10): a soft shadow once the page has scrolled.
// A 1 px sentinel at the very top is watched with an IntersectionObserver — no scroll listener.
// Without JavaScript, or where IntersectionObserver is missing, the header simply has no shadow.

/** The header's class for a sentinel's visibility: shadowed once the sentinel has scrolled away. */
export function isScrolled(sentinelIntersecting) {
	return !sentinelIntersecting;
}

if (typeof document !== 'undefined' && 'IntersectionObserver' in globalThis) {
	const header = document.querySelector('[data-site-header]');
	if (header) {
		const sentinel = document.createElement('div');
		sentinel.setAttribute('aria-hidden', 'true');
		sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none';
		document.body.prepend(sentinel);
		new IntersectionObserver(([entry]) => {
			header.classList.toggle('is-scrolled', isScrolled(entry.isIntersecting));
		}).observe(sentinel);
	}
}

// The «Меню» disclosure closes when a link in it is followed (the page does not reload on a #anchor)
// and on Escape. Without JavaScript it simply stays open until the summary is pressed again.
if (typeof document !== 'undefined') {
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
}
