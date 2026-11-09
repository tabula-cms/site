// Typography of the site's own text (spec 83, «Мовні правила»): the author writes plain spaces and the code puts
// the no-break ones. `typo()` works on a plain string; `typoHtml()` on rendered HTML (text between tags only,
// never inside <script>, <style>, <pre>, <code> or <textarea>), which is how the reading pages' MDX bodies get it
// (src/components/product/Typo.astro). `slugUk()` makes the Latin anchor of a Ukrainian heading.
//
// Pure functions; test/typo.test.mjs covers them.

export const NBSP = ' ';

const MONTHS = 'січня|лютого|березня|квітня|травня|червня|липня|серпня|вересня|жовтня|листопада|грудня';
const NOT_LETTER_AFTER = '(?![А-Яа-яҐЄІЇґєіїA-Za-z])';

/**
 * No-break spaces where the copy rules want them:
 * - between groups of digits («4 800», «50 000»; a U+202F narrow one becomes U+00A0 too);
 * - before «грн», «євро», «%», «₴» and «року» after a number;
 * - after «№», «ст.», «ч.», «п.»;
 * - inside a date («31 грудня», «грудня 2026»);
 * - before a spaced long dash « — ».
 */
export function typo(text) {
	if (typeof text !== 'string' || text === '') return text;
	let out = text;
	// Digit groups: repeat, so «1 000 000» is joined in full.
	const groups = /(\d)[  ](\d{3})(?!\d)/g;
	let previous;
	do {
		previous = out;
		out = out.replace(groups, `$1${NBSP}$2`);
	} while (out !== previous);
	out = out.replace(new RegExp(`(\\d) (грн|євро|року)${NOT_LETTER_AFTER}`, 'g'), `$1${NBSP}$2`);
	out = out.replace(/(\d) (%|₴)/g, `$1${NBSP}$2`);
	out = out.replace(/(^|[\s(«„])(№|ст\.|ч\.|п\.) (?=\S)/g, `$1$2${NBSP}`);
	out = out.replace(new RegExp(`(\\d{1,2}) (${MONTHS})${NOT_LETTER_AFTER}`, 'g'), `$1${NBSP}$2`);
	out = out.replace(new RegExp(`(${MONTHS}) (\\d{4})(?!\\d)`, 'g'), `$1${NBSP}$2`);
	out = out.replace(/ — /g, `${NBSP}— `);
	return out;
}

const SKIP = new Set(['script', 'style', 'pre', 'code', 'textarea']);

/** `typo()` on the text of an HTML fragment; tags, attributes and the content of SKIP elements stay as they are. */
export function typoHtml(html) {
	const parts = html.split(/(<[^>]*>)/);
	let skipping = null;
	let depth = 0;
	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i];
		if (part.startsWith('<')) {
			const m = part.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/);
			if (!m) continue;
			const name = m[2].toLowerCase();
			if (skipping === null && !m[1] && SKIP.has(name) && !part.endsWith('/>')) {
				skipping = name;
				depth = 1;
			} else if (skipping === name) {
				depth += m[1] ? -1 : 1;
				if (depth === 0) skipping = null;
			}
			continue;
		}
		if (skipping === null && part) parts[i] = typo(part);
	}
	return parts.join('');
}

// The national transliteration of Ukrainian (Cabinet of Ministers resolution № 55 of 27.01.2010), as the page
// addresses already use it (dlia-dyrektora, khostynh-i-tsina): «є ї й ю я» are «ye yi y yu ya» at the start of a
// word, «ie i i iu ia» elsewhere; «ь» and the apostrophe are dropped; «зг» is «zgh».
const TRANSLIT = {
	а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
	к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
	ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia',
};
const INITIAL = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' };

/** A Latin anchor for a Ukrainian heading: «Хто ми» -> `khto-my`, «Як оформити: …» -> `yak-oformyty-…`. */
export function slugUk(text) {
	const lower = String(text).toLowerCase().replace(/[ʼ'’`]/g, '');
	let out = '';
	let prev = '';
	for (const ch of lower) {
		const atStart = !/[a-zа-яґєії0-9]/.test(prev);
		if (atStart && INITIAL[ch]) out += INITIAL[ch];
		else if (ch === 'г' && prev === 'з') out += 'gh';
		else if (ch in TRANSLIT) out += TRANSLIT[ch];
		else out += /[a-z0-9]/.test(ch) ? ch : ' ';
		prev = ch;
	}
	return out.trim().replace(/\s+/g, '-');
}
