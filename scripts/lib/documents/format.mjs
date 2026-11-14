// The pure formatters of dates, numbers and sums that the forms and the offer share (the offer's pages import them
// through src/config/offer.mjs). Imports nothing: this folder is copied whole into an edition (docs: CLAUDE.md).

const MONTHS_GENITIVE = [
	'січня',
	'лютого',
	'березня',
	'квітня',
	'травня',
	'червня',
	'липня',
	'серпня',
	'вересня',
	'жовтня',
	'листопада',
	'грудня',
];

/** Parses an ISO date (`YYYY-MM-DD`) as a UTC day; returns null for anything that is not a real date. */
export function parseIsoDate(iso) {
	if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	const same =
		date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
	return same ? date : null;
}

function requireDate(iso) {
	const date = parseIsoDate(iso);
	if (!date) throw new Error(`offer: not a real ISO date: ${String(iso)}`);
	return date;
}

/** `'2026-12-31'` -> `'31.12.2026'`. */
export function formatDate(iso) {
	const date = requireDate(iso);
	const dd = String(date.getUTCDate()).padStart(2, '0');
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
	return `${dd}.${mm}.${date.getUTCFullYear()}`;
}

/** `'2027-01-01'` -> `'1 січня 2027'` (no leading zero, month in the genitive). */
export function formatDateLong(iso) {
	const date = requireDate(iso);
	return `${date.getUTCDate()} ${MONTHS_GENITIVE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** The ISO date one day after `iso` (the first day of the paid period is `nextDay(pilotUntil)`). */
export function nextDay(iso) {
	const date = requireDate(iso);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

/** `4800` -> `'4 800'`, with a narrow no-break space (U+202F) as the thousands separator. */
export function formatNumber(n) {
	if (!Number.isInteger(n) || n < 0) throw new Error(`offer: not a non-negative integer: ${String(n)}`);
	return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** `'2026-12-31'` -> `'31 грудня 2026 року'` with no-break spaces (U+00A0) inside the date. */
export function formatDateLongYear(iso) {
	return `${formatDateLong(iso)} року`.replaceAll(' ', '\u00a0');
}

/** `'2027-01-01'` -> `2027`: the year of that day. */
export function yearOf(iso) {
	return requireDate(iso).getUTCFullYear();
}

/** `4800` -> `'4 800 грн'`: the sum for running text, no-break spaces (U+00A0) inside and before «грн». */
export function formatGrn(n) {
	return `${formatNumber(n).replaceAll(' ', ' ')} грн`;
}

