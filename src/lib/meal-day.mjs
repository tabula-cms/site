// The weekday and date of the day shown on `phone-meal-day` (facts.json `mealDay`, an ISO date), for the chat card of
// the home's «Харчування»: «вівторок, 17 листопада», with a no-break space inside the date (the typography rules of
// the site). Pure; no time zone is involved: the ISO date is read as a calendar date.

const WEEKDAYS = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота'];
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

/** `2026-11-17` -> `вівторок, 17 листопада` (U+00A0 between the day and the month). */
export function formatMealDay(iso) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
	if (!match) throw new Error(`formatMealDay: "${iso}" is not an ISO date`);
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`formatMealDay: "${iso}" is not a real date`);
	return `${WEEKDAYS[date.getUTCDay()]}, ${day} ${MONTHS_GENITIVE[month - 1]}`;
}
