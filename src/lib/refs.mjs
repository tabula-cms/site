// Spec 84: the source numbers of a page. `refParts()` splits a spec string into text, source numbers («[n]», with the
// space before it dropped: the number sits right after the word) and article indexes («41¹» -> «41» + sup «1»).
// `firstRefIds()` gives the first link to each source of a rendered page the id `ref-n` that SourceList.astro's
// «↑ до тексту» points to, unless the page already has one. Pure functions; test/refs.test.mjs covers them.

const SUPERSCRIPT = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

export function refParts(text) {
	const parts = [];
	const re = /\s?\[(\d+)\]|([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g;
	let last = 0;
	for (const m of text.matchAll(re)) {
		if (m.index > last) parts.push({ text: text.slice(last, m.index) });
		if (m[1]) parts.push({ ref: Number(m[1]) });
		else parts.push({ sup: [...m[2]].map((ch) => SUPERSCRIPT[ch]).join('') });
		last = m.index + m[0].length;
	}
	if (last < text.length) parts.push({ text: text.slice(last) });
	return parts;
}

export function firstRefIds(html) {
	const seen = new Set([...html.matchAll(/\bid="ref-(\d+)"/g)].map((m) => m[1]));
	return html.replace(/<a href="#source-(\d+)"(?![^>]*\bid=)/g, (whole, n) => {
		if (seen.has(n)) return whole;
		seen.add(n);
		return `<a href="#source-${n}" id="ref-${n}"`;
	});
}

/** The numbers of the sources a rendered page cites ([n] links) and the numbers its «Джерела» list has. */
export function refNumbers(html) {
	const cited = new Set([...html.matchAll(/<a href="#source-(\d+)"/g)].map((m) => Number(m[1])));
	const listed = new Set([...html.matchAll(/<li id="source-(\d+)"/g)].map((m) => Number(m[1])));
	return { cited, listed };
}
