// Spec 83: the two buttons of the role pages that need JavaScript (data-page-tools; check-built allows this bundle on
// product pages). Both are `hidden` in the HTML and shown here, so without JavaScript nothing is offered that cannot work.
//  - [data-copy="<id>"] copies the text of #<id> (CopyBlock.astro) and says «Скопійовано» in its status line.
//  - [data-print="summary"] prints only the blocks marked [data-print-summary] (the class `print-summary` on <html>,
//    audience.css), on one A4 sheet; [data-print="page"] prints the page as it is.
//  - Before any print the closed questions (details.faq) are opened, and closed again after.

function setup() {
	for (const button of document.querySelectorAll('[data-copy]')) {
		const source = document.getElementById(button.dataset.copy);
		if (!source || !navigator.clipboard) continue;
		const status = button.parentElement?.querySelector('[role="status"]');
		button.hidden = false;
		button.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(source.textContent.trim().replace(/\s+/g, ' '));
				if (status) status.textContent = 'Скопійовано';
			} catch {
				if (status) status.textContent = 'Не вдалося скопіювати: виділіть текст і скопіюйте його вручну';
			}
		});
	}
	for (const button of document.querySelectorAll('[data-print]')) {
		if (typeof window.print !== 'function') continue;
		button.hidden = false;
		button.addEventListener('click', () => {
			const summary = button.dataset.print === 'summary';
			document.documentElement.classList.toggle('print-summary', summary);
			window.print();
		});
	}
	// Print the questions open (a closed <details> prints closed), then put them back as they were.
	let opened = [];
	window.addEventListener('beforeprint', () => {
		opened = [...document.querySelectorAll('details.faq:not([open])')];
		for (const details of opened) details.open = true;
	});
	window.addEventListener('afterprint', () => {
		for (const details of opened) details.open = false;
		opened = [];
		document.documentElement.classList.remove('print-summary');
	});
}

document.documentElement.setAttribute('data-page-tools', 'on');
setup();
