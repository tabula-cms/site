// The sticky header's behaviour (story 80, decision 10). The header is always visible.
//  - A soft shadow (and compact padding, in CSS) once the page has scrolled: a 1 px sentinel at the
//    very top watched with an IntersectionObserver, no scroll listener.
//  - The «Меню» disclosure closes when a link in it is followed and on Escape.
// Without JavaScript the header is a plain sticky bar.

/** The compact state: on once the sentinel at the top of the page has left the screen. */
export function isScrolled(sentinelIntersecting) {
	return !sentinelIntersecting;
}

/** The «Меню» disclosure: closes when a link in it is followed, and on Escape (focus returns to its summary). */
export function initMenu(menu, doc) {
	menu.addEventListener('click', (event) => {
		if (event.target instanceof Element && event.target.closest('a')) menu.removeAttribute('open');
	});
	doc.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && menu.hasAttribute('open')) {
			menu.removeAttribute('open');
			menu.querySelector('summary')?.focus();
		}
	});
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
	if (menu) initMenu(menu, document);
}
