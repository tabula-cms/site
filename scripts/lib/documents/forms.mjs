// The forms an institution's accountant downloads from «Для бухгалтерії» — the trial application and its act, the
// yearly application, the act, the invoice and four samples — as pure functions of an edition's terms and of the data
// a caller fills in. Wording lives only here (a form's text changes in this file and nowhere else); numbers, dates and
// codes come from `terms`; `data` is a flat object of strings ready to print. A key that is missing prints the blank
// («____») the printed form has. No operator details here: the parties write them in. This folder is copied whole into
// an edition (scripts/documents-edition.mjs), so it imports nothing outside itself.
//
// The look follows ДСТУ 4163:2020 for a contract-type document (print.mjs holds the page and the type): the heading, one
// line with the place on the left and the date on the right, numbered points as paragraphs («1. …»), a hint («(підпис)»,
// «(населений пункт)») printed only beside a blank — a filled field shows its value alone — and the parties' requisites
// and signatures as one two-column block at the end.

import { formatDateLongYear, formatGrn, nextDay, yearOf } from './format.mjs';

const subject = 'послуги з надання в користування програмного забезпечення вебсайту закладу освіти, його супроводження та обслуговування';

/** `& < > " '` escaped: the values of `data` come from people. */
export function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const blank = (n = 20) => `<span class="blank">${'_'.repeat(n)}</span>`;
const hint = (text) => `<span class="hint">(${text})</span>`;
const dateBlank = '<span class="blank">„__“ ____________ 20__ р.</span>';
// A signature line of a sample: the position on the left, the signature and the name on the right.
const sign = (who) => `<div class="sign"><span>${who}</span><span>${blank(14)} / ${blank(22)}<br>${hint('підпис')} ${hint('власне імʼя, ПРІЗВИЩЕ')}</span></div>`;
const sample = '<p class="sample">Зразок. Заклад може змінити формулювання під свої правила діловодства.</p>';

/** The helpers one render needs: `f(key, n)` is a filled value or the blank of width n. */
function context(kind, terms, data) {
	const has = (key) => data[key] !== undefined && data[key] !== null && data[key] !== '';
	// A filled value, or the blank of width n followed by its hint (a hint stands only beside a blank).
	const f = (key, n, note) => (has(key) ? `<span class="filled">${escapeHtml(data[key])}</span>` : `${blank(n)}${note ? ` ${hint(note)}` : ''}`);
	// A date: the value, or «„__“ ________ 20__ р.».
	const d = (key) => (has(key) ? `<span class="filled">${escapeHtml(data[key])}</span>` : dateBlank);
	// «signature / name» under a party's block: the name as the caller gave it, or a blank and the hint for it.
	const sig = (key) => `<p class="sig">${blank(14)} / ${key ? f(key, 22) : blank(22)}<br>${hint('підпис')}${key && has(key) ? '' : ` ${hint('власне імʼя, ПРІЗВИЩЕ')}`}</p>`;
	const edition = formatDateLongYear(terms.contractEdition);
	const defaultYear = String(yearOf(nextDay(terms.pilotUntil)));
	const given = kind === 'annual-application' ? data.paidYear : undefined;
	const paidYear = given === undefined || given === null || given === '' ? defaultYear : escapeHtml(given);
	const customer = () => `<p><b>Замовник:</b> ${f('customerName', 60)}, код ЄДРПОУ ${f('customerEdrpou', 10)}, в особі ${f('customerRepresentative', 40)}, що діє на підставі ${f('customerBasis', 24)}.</p>`;
	const performer = () => `<p><b>Виконавець:</b> фізична особа — підприємець ${f('performerName', 40)}, реєстраційний номер облікової картки платника податків ${f('performerTaxId', 12)}, платник єдиного податку третьої групи, не платник ПДВ.</p>`;
	const joinSentence = `Замовник приєднується в цілому до договору приєднання про надання послуг Tabula в редакції від ${edition}, опублікованого за адресою ${terms.contractUrl}, і підтверджує, що ознайомився з його текстом і Додатком 3 «Умови обробки персональних даних». Примірник цієї редакції — файл PDF із кваліфікованим електронним підписом Виконавця — додано до заяви.`;
	// The payer of the yearly application: named, so the clause names him and his requisites and signature stand in the
	// block; `noPayer` set, so the clause reduces to its rule and the block has no payer; neither (the form printed blank),
	// so the clause keeps its blanks and the block has a line for his signature.
	// The sentence of a part-year price: with the sum given it prints the sum; `wholeYear` set (a filled form for a whole year) drops it; otherwise (the blank form) its blanks stay.
	const partialSum = () => (has('wholeYear') && !has('partialSum') ? '' : ` Якщо платний період починається посеред року, — ${f('partialSum', 12)} грн (${f('partialSumWords', 40)}) за розрахунком пункту 4.7 договору.`);
	const payerMode = () => (has('payerName') ? 'named' : has('noPayer') ? 'none' : 'blank');
	const payerClause = () => {
		const tail = 'У цьому разі бюджетні зобовʼязання за пунктом 6 бере платник, а не Замовник; платник підписує заяву й акти та оплачує послуги, а Замовник підтверджує в акті, що отримав послуги.';
		const mode = payerMode();
		if (mode === 'named') return `Послуги оплачує орган управління освітою (пункт 1.6 договору): платник — ${f('payerName', 50)}, його реквізити наведено в кінці заяви. ${tail}`;
		if (mode === 'none') return `Якщо послуги оплачує орган управління освітою (пункт 1.6 договору), він зазначається в заяві як платник. ${tail}`;
		return `Якщо послуги оплачує орган управління освітою (пункт 1.6 договору), у заяві зазначено платника: ${f('payerName', 50)}, код ЄДРПОУ ${f('payerEdrpou', 10)}, рахунок ${f('payerAccount', 30)}. ${tail}`;
	};
	const payerCells = () => {
		const mode = payerMode();
		if (mode === 'none') return [];
		if (mode === 'named') return [party('Платник', kind === 'act' ? [f('payerName', 30)] : [f('payerName', 30), `Код ЄДРПОУ: ${f('payerEdrpou', 10)}`, `Рахунок: ${f('payerAccount', 29)}`], sig('payerRepresentative'))];
		return [party('Платник (якщо є)', [], sig('payerRepresentative'))];
	};
	return {
		f, d, sig, has, blank, sign, sample, subject, joinSentence, terms,
		// Read only by the forms that print them, so the keys a form reads are the keys it declares.
		get customer() { return customer(); },
		get performer() { return performer(); },
		get partialSum() { return partialSum(); },
		get payerClause() { return payerClause(); },
		get payerCells() { return payerCells(); }, edition, paidYear, defaultYear,
		pilotEnd: formatDateLongYear(terms.pilotUntil),
		trialDays: terms.trialDays,
		year: formatGrn(terms.priceYearUah),
		quarter: formatGrn(terms.priceQuarterUah),
		trialMonth: formatGrn(terms.pilotValueUah),
		code: `${terms.dk021} «${terms.dk021Name}»`,
		grn: formatGrn,
	};
}

/** One party of the block: its title, its lines (strings of HTML) and its signature. */
const party = (title, lines, signature) => `<td><p class="who">${title}</p>${lines.map((l) => `<p>${l}</p>`).join('')}${signature}</td>`;
/** A cell of the block that is no party: a line of text (the date of signing) beside the signatures. */
const note = (html) => `<td class="note"><p>${html}</p></td>`;
/** The block at the end: its cells in rows of two, side by side, no borders. */
const block = (title, cells) => {
	const rows = [];
	for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));
	return `${title ? `<p class="blocktitle">${title}</p>
` : ''}<table class="req"><tbody>${rows.map((row) => `<tr>${row.join('')}${row.length < 2 ? '<td></td>' : ''}</tr>`).join('')}</tbody></table>`;
};

const defineForm = (title, fields, body) => Object.freeze({ title, fields: Object.freeze(fields), body });

/** Every form: `title(terms)`, `fields` (the data keys it reads) and `body`. */
export const FORMS = Object.freeze({
	'trial-application': defineForm(() => 'Заява про приєднання на пробний період', ['customerAddress', 'customerBasis', 'customerEdrpou', 'customerName', 'customerRepresentative', 'customerSignatory', 'number', 'performerName', 'performerSignatory', 'performerTaxId', 'place', 'signDate', 'siteDomain', 'siteKeeperEmail', 'siteKeeperName', 'siteSubdomain', 'trialEnd'], ({ f, d, sig, subject, customer, performer, joinSentence, pilotEnd, trialDays, trialMonth }) => `<h1>ЗАЯВА № ${f('number', 6)}<br><span class="sub">про приєднання до договору приєднання про надання послуг Tabula<br>(пробний період)</span></h1>
<p class="dateline"><span>${f('place', 24, 'населений пункт')}</span><span>${d('signDate')}</span></p>
${customer}
${performer}
<p class="pt">1. ${joinSentence} Номер цієї заяви й дата її підписання Замовником є номером і датою договору.</p>
<p class="pt">2. <b>Предмет:</b> ${subject}.</p>
<p class="pt">3. <b>Пробний період:</b> ${trialDays} календарних днів із дати підписання цієї заяви Замовником, а якщо заяву підписано не пізніше ${pilotEnd}, — до ${pilotEnd} включно, якщо цей день настає пізніше. Останній день пробного періоду: ${f('trialEnd', 16)}.</p>
<p class="pt">4. <b>Ціна:</b> у пробний період послуги надаються безоплатно. Усі витрати на їх надання несе Виконавець. Замовник не бере бюджетних зобовʼязань. Виконавець не отримує від Замовника винагороди, компенсації чи зустрічних послуг.</p>
<p class="pt">5. <b>Після пробного періоду</b> договір діє далі на платних умовах, лише якщо Замовник підпише річну заяву (Додаток 2 до договору). Замовник не зобовʼязаний цього робити: якщо він не підписує річну заяву, плата не нараховується, а договір припиняється.</p>
<p class="pt">6. <b>Акт:</b> в останній день пробного періоду Виконавець складає акт приймання-передачі безоплатно наданих послуг із зазначенням їхньої вартості для обліку Замовника — ${trialMonth} за кожні ${trialDays} днів, за менший строк — пропорційно дням. Ця вартість оплаті не підлягає й заборгованості не створює.</p>
<p class="pt">7. <b>Адреса сайту:</b> ${f('siteSubdomain', 20)}.tabula.org.ua або ${f('siteDomain', 24)}.</p>
<p class="pt">8. <b>Працівник, який веде сайт:</b> ${f('siteKeeperName', 40)}, електронна адреса ${f('siteKeeperEmail', 24)}.</p>
<p class="pt">9. <b>Адреса Замовника для листування:</b> ${f('customerAddress', 60)}.</p>
<p class="pt">10. Якщо заяву підписує уповноважена особа, до неї додано копію наказу чи довіреності.</p>
${block('Підписи сторін', [
	party('Виконавець', [`Фізична особа — підприємець ${f('performerName', 24)}`, `РНОКПП: ${f('performerTaxId', 12)}`], sig('performerSignatory')),
	party('Замовник', [f('customerName', 30), `Код ЄДРПОУ: ${f('customerEdrpou', 10)}`], sig('customerSignatory')),
])}
<p class="signdate">Дата підписання Замовником (дата договору): ${d('signDate')}</p>`),
	'trial-act': defineForm(() => 'Акт приймання-передачі безоплатно наданих послуг', ['actDate', 'contractDate', 'contractNumber', 'customerEdrpou', 'customerName', 'customerRepresentative', 'customerSignatory', 'number', 'performerName', 'performerSignatory', 'performerTaxId', 'periodFrom', 'periodTo', 'place', 'quantity', 'signDate', 'total', 'totalWords'], ({ f, d, sig, subject, trialDays, trialMonth }) => `<h1>АКТ № ${f('number', 6)}<br><span class="sub">приймання-передачі безоплатно наданих послуг</span></h1>
<p class="dateline"><span>${f('place', 24, 'населений пункт')}</span><span>${d('actDate')}</span></p>
<p>Виконавець, фізична особа — підприємець ${f('performerName', 40)}, реєстраційний номер облікової картки платника податків ${f('performerTaxId', 12)}, і Замовник, ${f('customerName', 50)}, код ЄДРПОУ ${f('customerEdrpou', 10)}, в особі ${f('customerRepresentative', 40)}, склали цей акт до заяви про приєднання № ${f('contractNumber', 6)} від ${f('contractDate', 14)}.</p>
<p class="pt">1. З ${f('periodFrom', 14)} до ${f('periodTo', 14)} Виконавець безоплатно надав, а Замовник прийняв ${subject}.</p>
<p class="pt">2. Одиниця виміру — день; кількість — ${f('quantity', 6)}; довідкова вартість — ${trialMonth} за ${trialDays} днів; разом — ${f('total', 12)} грн (${f('totalWords', 40)}), без ПДВ.</p>
<p class="pt">3. Послуги надано безоплатно. Вартість зазначено довідково — для бухгалтерського обліку Замовника й оприлюднення за статтею 30 Закону України «Про освіту». Оплаті вона не підлягає й заборгованості не створює.</p>
<p class="pt">4. Замовник не має зауважень до обсягу й якості послуг.</p>
${block('Підписи сторін', [
	party('Виконавець', [`Фізична особа — підприємець ${f('performerName', 24)}`, `РНОКПП: ${f('performerTaxId', 12)}`], sig('performerSignatory')),
	party('Замовник', [f('customerName', 30), `Код ЄДРПОУ: ${f('customerEdrpou', 10)}`], sig('customerSignatory')),
])}
<p class="signdate">Дата підписання акта Замовником: ${d('signDate')}</p>`),
	'annual-application': defineForm((terms) => `Річна заява на ${yearOf(nextDay(terms.pilotUntil))} рік`, ['budgetCode', 'customerAccount', 'customerAddress', 'customerBank', 'customerBasis', 'customerEdrpou', 'customerEmail', 'customerName', 'customerRepresentative', 'customerSignatory', 'fundingSource', 'noPayer', 'number', 'paidYear', 'partialSum', 'partialSumWords', 'payerAccount', 'payerEdrpou', 'payerName', 'payerRepresentative', 'performerAddress', 'performerBank', 'performerIban', 'performerName', 'performerSignatory', 'performerTaxId', 'periodStart', 'place', 'signDate', 'wholeYear'], ({ f, d, sig, subject, customer, performer, edition, paidYear, year, quarter, code, payerClause, payerCells, partialSum, terms }) => `<h1>РІЧНА ЗАЯВА № ${f('number', 6)}<br><span class="sub">до договору приєднання про надання послуг Tabula на ${paidYear} рік</span></h1>
<p class="dateline"><span>${f('place', 24, 'населений пункт')}</span><span>${d('signDate')}</span></p>
${customer}
${performer}
<p class="pt">1. Замовник підтверджує приєднання до договору приєднання про надання послуг Tabula в редакції від ${edition}, опублікованого за адресою ${terms.contractUrl}, і бере зобовʼязання за ним на ${paidYear} рік. Примірник цієї редакції — файл PDF із кваліфікованим електронним підписом Виконавця — додано до заяви. Для реєстрації бюджетних зобовʼязань номер цієї заяви й дата її підписання Замовником є номером і датою договору на ${paidYear} рік.</p>
<p class="pt">2. <b>Предмет:</b> ${subject}. Код ДК 021:2015 — ${code}. КЕКВ ${terms.kekv}.</p>
<p class="pt">3. <b>Строк надання послуг:</b> з ${f('periodStart', 16, '1 січня або перший день платного періоду')} до 31 грудня ${paidYear} року. Договір діє безперервно, тому умови цієї заяви застосовуються до відносин сторін із цього дня (частина третя статті 631 Цивільного кодексу України).</p>
<p class="pt">4. <b>Ціна договору на ${paidYear} рік:</b> ${year} (чотири тисячі вісімсот гривень 00 копійок), без ПДВ: Виконавець є платником єдиного податку третьої групи й не є платником ПДВ (пункт 293.3 статті 293 Податкового кодексу України).${partialSum}</p>
<p class="pt">5. <b>Оплата:</b> ${quarter} за кожен квартал, протягом ${terms.paymentBankDays} робочих днів із дня підписання акта приймання-передачі наданих послуг, за наявності бюджетного фінансування, безготівково. Акт за четвертий квартал датується 31 грудня й може бути оплачений у січні наступного року як кредиторська заборгованість за цим договором.</p>
<p class="pt">6. <b>Бюджетні зобовʼязання.</b> Замовник бере бюджетні зобовʼязання та здійснює платежі за договором лише в межах бюджетних асигнувань, установлених кошторисом на ${paidYear} рік (стаття 48 Бюджетного кодексу України). Платіжні зобовʼязання Замовника виникають за наявності відповідних бюджетних асигнувань і фактичного надходження коштів на його рахунок. Джерело фінансування: ${f('fundingSource', 36)}, КПКВК МБ ${f('budgetCode', 10)}, КЕКВ ${terms.kekv}.</p>
<p class="pt">7. <b>Повідомлення Мінцифри.</b> Замовник повідомляє Міністерство цифрової трансформації України про укладений договір відповідно до пункту 8 Положення, затвердженого постановою Кабінету Міністрів України від 2 лютого 2024 р. № 119.</p>
<p class="pt">8. Реквізити сторін наведено в кінці заяви.</p>
<p class="pt">9. Якщо заяву підписує уповноважена особа, до неї додано копію наказу чи довіреності. ${payerClause}</p>
${block('Реквізити та підписи сторін', [
		party('Виконавець', [`Фізична особа — підприємець ${f('performerName', 14)}`, `РНОКПП: ${f('performerTaxId', 12)}`, `Адреса: ${f('performerAddress', 28)}`, `IBAN: ${f('performerIban', 29)}`, `Банк: ${f('performerBank', 24)}`, `Електронна адреса: ${terms.supportEmail}`], sig('performerSignatory')),
		party('Замовник', [f('customerName', 30), `Код ЄДРПОУ: ${f('customerEdrpou', 10)}`, `Адреса: ${f('customerAddress', 28)}`, `Рахунок: ${f('customerAccount', 29)}`, `Банк або орган Казначейства: ${f('customerBank', 14)}`, `Електронна адреса: ${f('customerEmail', 24)}`], sig('customerSignatory')),
	...payerCells,
	note(`Дата підписання Замовником (дата договору): ${d('signDate')}`),
])}`),
	'act': defineForm(() => 'Акт приймання-передачі наданих послуг', ['actDate', 'contractDate', 'contractNumber', 'customerEdrpou', 'customerName', 'customerRepresentative', 'customerSignatory', 'noPayer', 'number', 'payerName', 'payerRepresentative', 'performerBank', 'performerIban', 'performerName', 'performerSignatory', 'performerTaxId', 'periodFrom', 'periodTo', 'place', 'quantity', 'signDate', 'total', 'totalWords'], ({ f, d, sig, subject, quarter, payerCells, terms }) => `<h1>АКТ № ${f('number', 6)}<br><span class="sub">приймання-передачі наданих послуг</span></h1>
<p class="dateline"><span>${f('place', 24, 'населений пункт')}</span><span>${d('actDate')}</span></p>
<p>Виконавець, фізична особа — підприємець ${f('performerName', 40)}, реєстраційний номер облікової картки платника податків ${f('performerTaxId', 12)}, і Замовник, ${f('customerName', 50)}, код ЄДРПОУ ${f('customerEdrpou', 10)}, в особі ${f('customerRepresentative', 40)}, склали цей акт до договору (річної заяви) № ${f('contractNumber', 6)} від ${f('contractDate', 14)}.</p>
<p class="pt">1. З ${f('periodFrom', 14)} до ${f('periodTo', 14)} Виконавець надав, а Замовник прийняв ${subject} (код ДК 021:2015 — ${terms.dk021}).</p>
<p class="pt">2. Одиниця виміру — квартал; кількість — ${f('quantity', 6)}; ціна кварталу — ${quarter}.</p>
<p class="pt">3. Вартість наданих послуг — ${f('total', 12)} грн (${f('totalWords', 40)}), без ПДВ. Оплата — на рахунок Виконавця IBAN ${f('performerIban', 30)} у ${f('performerBank', 24)}.</p>
<p class="pt">4. Замовник не має зауважень до обсягу й якості послуг.</p>
${block('Підписи сторін', [
	party('Виконавець', [`Фізична особа — підприємець ${f('performerName', 24)}`, `РНОКПП: ${f('performerTaxId', 12)}`], sig('performerSignatory')),
	party('Замовник', [f('customerName', 30), `Код ЄДРПОУ: ${f('customerEdrpou', 10)}`], sig('customerSignatory')),
	...payerCells,
	note(`Дата підписання акта Замовником: ${d('signDate')}`),
])}`),
	'invoice': defineForm(() => 'Рахунок на оплату', ['actDate', 'actNumber', 'contractDate', 'contractNumber', 'customerEdrpou', 'customerName', 'invoiceDate', 'number', 'performerBank', 'performerIban', 'performerName', 'performerSignatory', 'performerTaxId', 'period', 'total', 'totalWords'], ({ f, d, sig }) => `<h1>РАХУНОК НА ОПЛАТУ № ${f('number', 6)}<br><span class="sub">від ${d('invoiceDate')}</span></h1>
<p><b>Постачальник:</b> фізична особа — підприємець ${f('performerName', 40)}, реєстраційний номер облікової картки платника податків ${f('performerTaxId', 12)}, рахунок IBAN ${f('performerIban', 30)} у ${f('performerBank', 24)}. Платник єдиного податку третьої групи, не платник ПДВ.</p>
<p><b>Платник:</b> ${f('customerName', 60)}, код ЄДРПОУ ${f('customerEdrpou', 10)}.</p>
<p><b>Підстава:</b> договір (річна заява) № ${f('contractNumber', 6)} від ${f('contractDate', 14)}, акт № ${f('actNumber', 6)} від ${f('actDate', 14)}.</p>
<table>
<thead><tr><th>№</th><th>Послуга</th><th>Період</th><th class="num">Сума без ПДВ, грн</th></tr></thead>
<tbody><tr><td>1</td><td>Надання в користування програмного забезпечення вебсайту закладу освіти, його супроводження та обслуговування</td><td>${f('period', 18)}</td><td class="num">${f('total', 10)}</td></tr></tbody>
<tfoot><tr><td colspan="3">Разом до сплати, без ПДВ</td><td class="num">${f('total', 10)}</td></tr></tfoot>
</table>
<p>Сума словами: ${f('totalWords', 60)}.</p>
${block('', [party('Постачальник', ['Фізична особа — підприємець'], sig('performerSignatory'))])}`),
	'order-free-services': defineForm(() => 'Наказ про прийняття безоплатно отриманих послуг', [], ({ blank, sign, sample, subject, terms }) => `${sample}
<p class="center">${blank(60)}<br><span class="hint">(назва закладу освіти)</span></p>
<h1>НАКАЗ</h1>
<p class="row"><span>${blank(16)}</span><span>${blank(20)}</span><span>№ ${blank(8)}</span></p>
<p><b>Про прийняття до обліку безоплатно отриманих послуг</b></p>
<p>Відповідно до статті 30 Закону України «Про освіту», на підставі заяви про приєднання до договору про надання послуг Tabula від ${blank(14)} № ${blank(6)} та акта приймання-передачі безоплатно наданих послуг від ${blank(14)} № ${blank(6)}</p>
<p><b>НАКАЗУЮ:</b></p>
<p class="pt">1. Прийняти безоплатно отримані ${subject} за період з ${blank(14)} до ${blank(14)} вартістю ${blank(12)} грн.</p>
<p class="pt">2. Бухгалтерії (централізованій бухгалтерії) відобразити отримані послуги в бухгалтерському обліку й подати до органу Казначейства довідку про надходження у натуральній формі в установлений строк.</p>
<p class="pt">3. ${blank(40)} <span class="hint">(посада, прізвище працівника, який веде сайт)</span> оприлюднити на вебсайті закладу перелік отриманих послуг і їхню вартість протягом ${terms.law.art30Days} робочих днів.</p>
<p class="pt">4. Контроль за виконанням наказу залишаю за собою.</p>
${sign('Керівник закладу')}
<p>З наказом ознайомлені: ${blank(50)}</p>`),
	'protocol': defineForm(() => 'Протокол (рішення) уповноваженої особи', [], ({ blank, sign, sample, subject, paidYear, year, code, grn, terms }) => `${sample}
<p class="center">${blank(60)}<br><span class="hint">(назва замовника, код ЄДРПОУ)</span></p>
<h1>ПРОТОКОЛ (РІШЕННЯ)<br>уповноваженої особи</h1>
<p class="row"><span>${blank(16)}</span><span>${blank(20)}</span><span>№ ${blank(8)}</span></p>
<p><b>Порядок денний:</b></p>
<p class="pt">1. Про включення закупівлі до річного плану закупівель на ${paidYear} рік.</p>
<p class="pt">2. Про здійснення закупівлі без використання електронної системи закупівель.</p>
<p>Розглянувши потребу закладу в послугах для роботи офіційного вебсайту, на якому заклад оприлюднює інформацію за статтею 30 Закону України «Про освіту»,</p>
<p><b>ВИРІШИЛА (ВИРІШИВ):</b></p>
<p class="pt">1. Визначити предмет закупівлі: ${subject}. Код ДК 021:2015 — ${code}.</p>
<p class="pt">2. Очікувана вартість закупівлі — ${year} без ПДВ. КЕКВ ${terms.kekv}. Джерело фінансування: ${blank(36)}.</p>
<p class="pt">3. Здійснити закупівлю без використання електронної системи закупівель відповідно до пункту 11 Особливостей здійснення публічних закупівель, затверджених постановою Кабінету Міністрів України від 12 жовтня 2022 р. № 1178: вартість закупівлі є меншою, ніж ${grn(terms.law.tenderLimitUah)}.</p>
<p class="pt">4. Включити закупівлю до річного плану закупівель на ${paidYear} рік і оприлюднити зміни до плану в електронній системі закупівель протягом ${terms.law.planPublishDays} робочих днів із дня їх затвердження.</p>
<p class="pt">5. Після укладення договору повідомити Міністерство цифрової трансформації України про укладений договір.</p>
${sign('Уповноважена особа')}`),
	'order-keeper': defineForm(() => 'Наказ про призначення працівника, який веде сайт', [], ({ blank, sign, sample }) => `${sample}
<p class="center">${blank(60)}<br><span class="hint">(назва закладу освіти)</span></p>
<h1>НАКАЗ</h1>
<p class="row"><span>${blank(16)}</span><span>${blank(20)}</span><span>№ ${blank(8)}</span></p>
<p><b>Про призначення відповідального за ведення вебсайту закладу</b></p>
<p>Відповідно до статті 30 Закону України «Про освіту», щоб забезпечити прозорість та інформаційну відкритість закладу,</p>
<p><b>НАКАЗУЮ:</b></p>
<p class="pt">1. Призначити ${blank(44)} <span class="hint">(посада, прізвище, імʼя)</span> відповідальним за ведення офіційного вебсайту закладу.</p>
<p class="pt">2. Відповідальному за ведення вебсайту:</p>
<p class="sub">— оприлюднювати на вебсайті інформацію й документи, визначені статтею 30 Закону України «Про освіту», та оновлювати їх не пізніше ніж через десять робочих днів із дня затвердження чи внесення змін;</p>
<p class="sub">— оприлюднювати фото й відео дітей лише за наявності згоди батьків або інших законних представників;</p>
<p class="sub">— зберігати в таємниці дані для входу в панель керування сайтом і не передавати їх іншим особам;</p>
<p class="sub">— повідомляти керівника закладу про звернення щодо змісту вебсайту.</p>
<p class="pt">3. На час відсутності відповідального його обовʼязки виконує ${blank(40)}.</p>
<p class="pt">4. Контроль за виконанням наказу залишаю за собою.</p>
${sign('Керівник закладу')}
<p>З наказом ознайомлені: ${blank(50)}</p>`),
	'consent': defineForm(() => 'Згода батьків на фото й відео дитини', [], ({ blank, sample }) => `${sample}
<p class="right">Керівникові ${blank(40)}<br><span class="hint">(назва закладу освіти)</span><br>${blank(40)}<br><span class="hint">(прізвище, імʼя одного з батьків або іншого законного представника)</span></p>
<h1>ЗГОДА<br>на фото- й відеозйомку дитини та оприлюднення зображень</h1>
<p>Я, ${blank(50)}, відповідно до статей 307 і 308 Цивільного кодексу України та Закону України «Про захист персональних даних» даю згоду закладу освіти на фото- й відеозйомку моєї дитини ${blank(44)}, учня (учениці, вихованця) ${blank(10)} класу (групи), під час:</p>
<p>${blank(70)} <span class="hint">(подія, дата)</span></p>
<p>і на оприлюднення цих фото й відео:</p>
<ul class="boxes">
<li>на офіційному вебсайті закладу;</li>
<li>на сторінках закладу в соціальних мережах;</li>
<li>у друкованих матеріалах закладу.</li>
</ul>
<p>Поруч із зображенням:</p>
<ul class="boxes">
<li>можна зазначати імʼя та прізвище дитини;</li>
<li>не можна зазначати імʼя та прізвище дитини.</li>
</ul>
<p>Згода стосується лише названої події. Я можу відкликати її будь-коли письмовою заявою; після цього заклад видаляє зображення з вебсайту й зі своїх сторінок у соціальних мережах протягом пʼяти робочих днів.</p>
<p class="row"><span>${blank(16)} <span class="hint">(дата)</span></span><span>${blank(18)} <span class="hint">(підпис)</span></span></p>`),
});

/** The body HTML of one form: `terms` are the edition's numbers and codes, `data` the strings to print. */
export function renderForm(kind, terms, data = {}) {
	const form = FORMS[kind];
	if (!form) throw new Error(`forms: unknown form ${String(kind)}`);
	return form.body(context(kind, terms, data));
}
