// The forms an institution's accountant downloads from «Для бухгалтерії» — the trial application and its act, the
// yearly application, the act, the invoice and four samples — as pure functions of an edition's terms and of the data
// a caller fills in. Wording lives only here (a form's text changes in this file and nowhere else); numbers, dates and
// codes come from `terms`; `data` is a flat object of strings ready to print. A key that is missing prints the blank
// («____») the printed form has. No operator details here: the parties write them in. This folder is copied whole into
// an edition (scripts/documents-edition.mjs), so it imports nothing outside itself.

import { formatDateLongYear, formatGrn, nextDay, yearOf } from './format.mjs';

const subject = 'послуги з надання в користування програмного забезпечення вебсайту закладу освіти, його супроводження та обслуговування';

/** `& < > " '` escaped: the values of `data` come from people. */
export function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const blank = (n = 20) => `<span class="blank">${'_'.repeat(n)}</span>`;
const sign = (who) => `<p class="sign">${who} ${blank(18)} ${blank(24)}<br><span class="hint">(підпис) (імʼя, прізвище)</span></p>`;
const sample = '<p class="sample">Зразок. Заклад може змінити формулювання під свої правила діловодства.</p>';

/** The helpers one render needs: `f(key, n)` is a filled value or the blank of width n. */
function context(kind, terms, data) {
	const f = (key, n) => {
		const value = data[key];
		return value === undefined || value === null || value === '' ? blank(n) : `<span class="filled">${escapeHtml(value)}</span>`;
	};
	const edition = formatDateLongYear(terms.contractEdition);
	const defaultYear = String(yearOf(nextDay(terms.pilotUntil)));
	const given = kind === 'annual-application' ? data.paidYear : undefined;
	const paidYear = given === undefined || given === null || given === '' ? defaultYear : escapeHtml(given);
	const customer = () => `<p><b>Замовник:</b> ${f('customerName', 60)}, код ЄДРПОУ ${f('customerEdrpou', 10)}, в особі ${f('customerRepresentative', 40)}, що діє на підставі ${f('customerBasis', 24)}.</p>`;
	const performer = () => `<p><b>Виконавець:</b> фізична особа — підприємець ${f('performerName', 40)}, реєстраційний номер облікової картки платника податків ${f('performerTaxId', 12)}, платник єдиного податку третьої групи, не платник ПДВ.</p>`;
	const joinSentence = `Замовник приєднується в цілому до договору приєднання про надання послуг Tabula в редакції від ${edition}, опублікованого за адресою ${terms.contractUrl}, і підтверджує, що ознайомився з його текстом і Додатком 3 «Умови обробки персональних даних». Примірник цієї редакції — файл PDF із кваліфікованим електронним підписом Виконавця — додано до заяви.`;
	return {
		f, blank, sign, sample, subject, joinSentence, terms,
		// Read only by the forms that print them, so the keys a form reads are the keys it declares.
		get customer() { return customer(); },
		get performer() { return performer(); }, edition, paidYear, defaultYear,
		pilotEnd: formatDateLongYear(terms.pilotUntil),
		trialDays: terms.trialDays,
		year: formatGrn(terms.priceYearUah),
		quarter: formatGrn(terms.priceQuarterUah),
		trialMonth: formatGrn(terms.pilotValueUah),
		code: `${terms.dk021} «${terms.dk021Name}»`,
		grn: formatGrn,
	};
}

const defineForm = (title, fields, body) => Object.freeze({ title, fields: Object.freeze(fields), body });

/** Every form: `title(terms)`, `fields` (the data keys it reads) and `body`. */
export const FORMS = Object.freeze({
	'trial-application': defineForm(() => 'Заява про приєднання на пробний період', ['customerAddress', 'customerBasis', 'customerEdrpou', 'customerName', 'customerRepresentative', 'number', 'performerName', 'performerTaxId', 'place', 'signDate', 'siteDomain', 'siteKeeperEmail', 'siteKeeperName', 'siteSubdomain', 'trialEnd'], ({ f, sign, subject, customer, performer, joinSentence, pilotEnd, trialDays, trialMonth }) => `<h1>ЗАЯВА № ${f('number', 6)}<br>про приєднання до договору приєднання про надання послуг Tabula<br>(пробний період)</h1>
<p class="place">${f('place', 24)} <span class="hint">(населений пункт)</span></p>
${customer}
${performer}
<ol>
<li>${joinSentence} Номер цієї заяви й дата її підписання Замовником є номером і датою договору.</li>
<li><b>Предмет:</b> ${subject}.</li>
<li><b>Пробний період:</b> ${trialDays} календарних днів із дати підписання цієї заяви Замовником, а якщо заяву підписано не пізніше ${pilotEnd}, — до ${pilotEnd} включно, якщо цей день настає пізніше. Останній день пробного періоду: ${f('trialEnd', 16)}.</li>
<li><b>Ціна:</b> у пробний період послуги надаються безоплатно. Усі витрати на їх надання несе Виконавець. Замовник не бере бюджетних зобовʼязань. Виконавець не отримує від Замовника винагороди, компенсації чи зустрічних послуг.</li>
<li><b>Після пробного періоду</b> договір діє далі на платних умовах, лише якщо Замовник підпише річну заяву (Додаток 2 до договору). Замовник не зобовʼязаний цього робити: якщо він не підписує річну заяву, плата не нараховується, а договір припиняється.</li>
<li><b>Акт:</b> в останній день пробного періоду Виконавець складає акт приймання-передачі безоплатно наданих послуг із зазначенням їхньої вартості для обліку Замовника — ${trialMonth} за кожні ${trialDays} днів, за менший строк — пропорційно дням. Ця вартість оплаті не підлягає й заборгованості не створює.</li>
<li><b>Адреса сайту:</b> ${f('siteSubdomain', 20)}.tabula.org.ua або ${f('siteDomain', 24)}.</li>
<li><b>Працівник, який веде сайт:</b> ${f('siteKeeperName', 40)}, електронна адреса ${f('siteKeeperEmail', 24)}.</li>
<li><b>Адреса Замовника для листування:</b> ${f('customerAddress', 60)}.</li>
<li>Якщо заяву підписує уповноважена особа, до неї додано копію наказу чи довіреності.</li>
</ol>
${sign('Виконавець: фізична особа — підприємець')}
${sign('Замовник:')}
<p>Дата підписання Замовником (дата договору): ${f('signDate', 16)}</p>`),
	'trial-act': defineForm(() => 'Акт приймання-передачі безоплатно наданих послуг', ['actDate', 'contractDate', 'contractNumber', 'customerEdrpou', 'customerName', 'customerRepresentative', 'number', 'performerName', 'performerTaxId', 'periodFrom', 'periodTo', 'place', 'quantity', 'signDate', 'total', 'totalWords'], ({ f, sign, subject, trialDays, trialMonth }) => `<h1>АКТ № ${f('number', 6)}<br>приймання-передачі безоплатно наданих послуг</h1>
<p class="place">${f('place', 24)}, ${f('actDate', 16)}</p>
<p>Виконавець, фізична особа — підприємець ${f('performerName', 40)}, реєстраційний номер облікової картки платника податків ${f('performerTaxId', 12)}, і Замовник, ${f('customerName', 50)}, код ЄДРПОУ ${f('customerEdrpou', 10)}, в особі ${f('customerRepresentative', 40)}, склали цей акт до заяви про приєднання № ${f('contractNumber', 6)} від ${f('contractDate', 14)}.</p>
<ol>
<li>З ${f('periodFrom', 14)} до ${f('periodTo', 14)} Виконавець безоплатно надав, а Замовник прийняв ${subject}.</li>
<li>Одиниця виміру — день; кількість — ${f('quantity', 6)}; довідкова вартість — ${trialMonth} за ${trialDays} днів; разом — ${f('total', 12)} грн (${f('totalWords', 40)}), без ПДВ.</li>
<li>Послуги надано безоплатно. Вартість зазначено довідково — для бухгалтерського обліку Замовника й оприлюднення за статтею 30 Закону України «Про освіту». Оплаті вона не підлягає й заборгованості не створює.</li>
<li>Замовник не має зауважень до обсягу й якості послуг.</li>
</ol>
${sign('Виконавець: фізична особа — підприємець')}
${sign('Замовник:')}
<p>Дата підписання акта Замовником: ${f('signDate', 16)}</p>`),
	'annual-application': defineForm((terms) => `Річна заява на ${yearOf(nextDay(terms.pilotUntil))} рік`, ['budgetCode', 'customerAccount', 'customerBank', 'customerBasis', 'customerEdrpou', 'customerEmail', 'customerName', 'customerRepresentative', 'fundingSource', 'number', 'paidYear', 'partialSum', 'partialSumWords', 'payerAccount', 'payerEdrpou', 'payerName', 'performerBank', 'performerIban', 'performerName', 'performerTaxId', 'periodStart', 'place', 'signDate'], ({ f, sign, subject, customer, performer, edition, paidYear, year, quarter, code, terms }) => `<h1>РІЧНА ЗАЯВА № ${f('number', 6)}<br>до договору приєднання про надання послуг Tabula на ${paidYear} рік</h1>
<p class="place">${f('place', 24)} <span class="hint">(населений пункт)</span></p>
${customer}
${performer}
<ol>
<li>Замовник підтверджує приєднання до договору приєднання про надання послуг Tabula в редакції від ${edition}, опублікованого за адресою ${terms.contractUrl}, і бере зобовʼязання за ним на ${paidYear} рік. Примірник цієї редакції — файл PDF із кваліфікованим електронним підписом Виконавця — додано до заяви. Для реєстрації бюджетних зобовʼязань номер цієї заяви й дата її підписання Замовником є номером і датою договору на ${paidYear} рік.</li>
<li><b>Предмет:</b> ${subject}. Код ДК 021:2015 — ${code}. КЕКВ ${terms.kekv}.</li>
<li><b>Строк надання послуг:</b> з ${f('periodStart', 16)} <span class="hint">(1 січня або перший день платного періоду)</span> до 31 грудня ${paidYear} року. Договір діє безперервно, тому умови цієї заяви застосовуються до відносин сторін із цього дня (частина третя статті 631 Цивільного кодексу України).</li>
<li><b>Ціна договору на ${paidYear} рік:</b> ${year} (чотири тисячі вісімсот гривень 00 копійок), без ПДВ: Виконавець є платником єдиного податку третьої групи й не є платником ПДВ (пункт 293.3 статті 293 Податкового кодексу України). Якщо платний період починається посеред року, — ${f('partialSum', 12)} грн (${f('partialSumWords', 40)}) за розрахунком пункту 4.7 договору.</li>
<li><b>Оплата:</b> ${quarter} за кожен квартал, протягом ${terms.paymentBankDays} робочих днів із дня підписання акта приймання-передачі наданих послуг, за наявності бюджетного фінансування, безготівково. Акт за четвертий квартал датується 31 грудня й може бути оплачений у січні наступного року як кредиторська заборгованість за цим договором.</li>
<li><b>Бюджетні зобовʼязання.</b> Замовник бере бюджетні зобовʼязання та здійснює платежі за договором лише в межах бюджетних асигнувань, установлених кошторисом на ${paidYear} рік (стаття 48 Бюджетного кодексу України). Платіжні зобовʼязання Замовника виникають за наявності відповідних бюджетних асигнувань і фактичного надходження коштів на його рахунок. Джерело фінансування: ${f('fundingSource', 36)}, КПКВК МБ ${f('budgetCode', 10)}, КЕКВ ${terms.kekv}.</li>
<li><b>Повідомлення Мінцифри.</b> Замовник повідомляє Міністерство цифрової трансформації України про укладений договір відповідно до пункту 8 Положення, затвердженого постановою Кабінету Міністрів України від 2 лютого 2024 р. № 119.</li>
<li><b>Реквізити Замовника:</b> ${f('customerName', 50)}, рахунок ${f('customerAccount', 30)} в ${f('customerBank', 30)}, електронна адреса ${f('customerEmail', 24)}.</li>
<li><b>Реквізити Виконавця:</b> ${f('performerName', 50)}, рахунок IBAN ${f('performerIban', 30)} у ${f('performerBank', 24)}, електронна адреса ${terms.supportEmail}.</li>
<li>Якщо заяву підписує уповноважена особа, до неї додано копію наказу чи довіреності. Якщо послуги оплачує орган управління освітою (пункт 1.6 договору), у заяві зазначено платника: ${f('payerName', 50)}, код ЄДРПОУ ${f('payerEdrpou', 10)}, рахунок ${f('payerAccount', 30)}. У цьому разі бюджетні зобовʼязання за пунктом 6 бере платник, а не Замовник; платник підписує заяву й акти та оплачує послуги, а Замовник підтверджує в акті, що отримав послуги.</li>
</ol>
${sign('Виконавець: фізична особа — підприємець')}
${sign('Замовник:')}
${sign('Платник (якщо є):')}
<p>Дата підписання Замовником (дата договору): ${f('signDate', 16)}</p>`),
	'act': defineForm(() => 'Акт приймання-передачі наданих послуг', ['actDate', 'contractDate', 'contractNumber', 'customerEdrpou', 'customerName', 'customerRepresentative', 'number', 'performerBank', 'performerIban', 'performerName', 'performerTaxId', 'periodFrom', 'periodTo', 'place', 'quantity', 'signDate', 'total', 'totalWords'], ({ f, sign, subject, quarter, terms }) => `<h1>АКТ № ${f('number', 6)}<br>приймання-передачі наданих послуг</h1>
<p class="place">${f('place', 24)}, ${f('actDate', 16)}</p>
<p>Виконавець, фізична особа — підприємець ${f('performerName', 40)}, реєстраційний номер облікової картки платника податків ${f('performerTaxId', 12)}, і Замовник, ${f('customerName', 50)}, код ЄДРПОУ ${f('customerEdrpou', 10)}, в особі ${f('customerRepresentative', 40)}, склали цей акт до договору (річної заяви) № ${f('contractNumber', 6)} від ${f('contractDate', 14)}.</p>
<ol>
<li>З ${f('periodFrom', 14)} до ${f('periodTo', 14)} Виконавець надав, а Замовник прийняв ${subject} (код ДК 021:2015 — ${terms.dk021}).</li>
<li>Одиниця виміру — квартал; кількість — ${f('quantity', 6)}; ціна кварталу — ${quarter}.</li>
<li>Вартість наданих послуг — ${f('total', 12)} грн (${f('totalWords', 40)}), без ПДВ. Оплата — на рахунок Виконавця IBAN ${f('performerIban', 30)} у ${f('performerBank', 24)}.</li>
<li>Замовник не має зауважень до обсягу й якості послуг.</li>
</ol>
${sign('Виконавець: фізична особа — підприємець')}
${sign('Замовник:')}
${sign('Платник (якщо є):')}
<p>Дата підписання акта Замовником: ${f('signDate', 16)}</p>`),
	'invoice': defineForm(() => 'Рахунок на оплату', ['actDate', 'actNumber', 'contractDate', 'contractNumber', 'customerEdrpou', 'customerName', 'invoiceDate', 'number', 'performerBank', 'performerIban', 'performerName', 'performerTaxId', 'period', 'total', 'totalWords'], ({ f, sign }) => `<h1>РАХУНОК НА ОПЛАТУ № ${f('number', 6)}<br>від ${f('invoiceDate', 16)}</h1>
<p><b>Постачальник:</b> фізична особа — підприємець ${f('performerName', 40)}, реєстраційний номер облікової картки платника податків ${f('performerTaxId', 12)}, рахунок IBAN ${f('performerIban', 30)} у ${f('performerBank', 24)}. Платник єдиного податку третьої групи, не платник ПДВ.</p>
<p><b>Платник:</b> ${f('customerName', 60)}, код ЄДРПОУ ${f('customerEdrpou', 10)}.</p>
<p><b>Підстава:</b> договір (річна заява) № ${f('contractNumber', 6)} від ${f('contractDate', 14)}, акт № ${f('actNumber', 6)} від ${f('actDate', 14)}.</p>
<table>
<thead><tr><th>№</th><th>Послуга</th><th>Період</th><th>Сума без ПДВ, грн</th></tr></thead>
<tbody><tr><td>1</td><td>Надання в користування програмного забезпечення вебсайту закладу освіти, його супроводження та обслуговування</td><td>${f('period', 18)}</td><td>${f('total', 10)}</td></tr></tbody>
<tfoot><tr><td colspan="3">Разом до сплати, без ПДВ</td><td>${f('total', 10)}</td></tr></tfoot>
</table>
<p>Сума словами: ${f('totalWords', 60)}.</p>
${sign('Постачальник: фізична особа — підприємець')}`),
	'order-free-services': defineForm(() => 'Наказ про прийняття безоплатно отриманих послуг', [], ({ blank, sign, sample, subject, terms }) => `${sample}
<p class="center">${blank(60)}<br><span class="hint">(назва закладу освіти)</span></p>
<h1>НАКАЗ</h1>
<p class="row"><span>${blank(16)}</span><span>${blank(20)}</span><span>№ ${blank(8)}</span></p>
<p><b>Про прийняття до обліку безоплатно отриманих послуг</b></p>
<p>Відповідно до статті 30 Закону України «Про освіту», на підставі заяви про приєднання до договору про надання послуг Tabula від ${blank(14)} № ${blank(6)} та акта приймання-передачі безоплатно наданих послуг від ${blank(14)} № ${blank(6)}</p>
<p><b>НАКАЗУЮ:</b></p>
<ol>
<li>Прийняти безоплатно отримані ${subject} за період з ${blank(14)} до ${blank(14)} вартістю ${blank(12)} грн.</li>
<li>Бухгалтерії (централізованій бухгалтерії) відобразити отримані послуги в бухгалтерському обліку й подати до органу Казначейства довідку про надходження у натуральній формі в установлений строк.</li>
<li>${blank(40)} <span class="hint">(посада, прізвище працівника, який веде сайт)</span> оприлюднити на вебсайті закладу перелік отриманих послуг і їхню вартість протягом ${terms.law.art30Days} робочих днів.</li>
<li>Контроль за виконанням наказу залишаю за собою.</li>
</ol>
${sign('Керівник закладу')}
<p>З наказом ознайомлені: ${blank(50)}</p>`),
	'protocol': defineForm(() => 'Протокол (рішення) уповноваженої особи', [], ({ blank, sign, sample, subject, paidYear, year, code, grn, terms }) => `${sample}
<p class="center">${blank(60)}<br><span class="hint">(назва замовника, код ЄДРПОУ)</span></p>
<h1>ПРОТОКОЛ (РІШЕННЯ)<br>уповноваженої особи</h1>
<p class="row"><span>${blank(16)}</span><span>${blank(20)}</span><span>№ ${blank(8)}</span></p>
<p><b>Порядок денний:</b></p>
<ol>
<li>Про включення закупівлі до річного плану закупівель на ${paidYear} рік.</li>
<li>Про здійснення закупівлі без використання електронної системи закупівель.</li>
</ol>
<p>Розглянувши потребу закладу в послугах для роботи офіційного вебсайту, на якому заклад оприлюднює інформацію за статтею 30 Закону України «Про освіту»,</p>
<p><b>ВИРІШИЛА (ВИРІШИВ):</b></p>
<ol>
<li>Визначити предмет закупівлі: ${subject}. Код ДК 021:2015 — ${code}.</li>
<li>Очікувана вартість закупівлі — ${year} без ПДВ. КЕКВ ${terms.kekv}. Джерело фінансування: ${blank(36)}.</li>
<li>Здійснити закупівлю без використання електронної системи закупівель відповідно до пункту 11 Особливостей здійснення публічних закупівель, затверджених постановою Кабінету Міністрів України від 12 жовтня 2022 р. № 1178: вартість закупівлі є меншою, ніж ${grn(terms.law.tenderLimitUah)}.</li>
<li>Включити закупівлю до річного плану закупівель на ${paidYear} рік і оприлюднити зміни до плану в електронній системі закупівель протягом ${terms.law.planPublishDays} робочих днів із дня їх затвердження.</li>
<li>Після укладення договору повідомити Міністерство цифрової трансформації України про укладений договір.</li>
</ol>
${sign('Уповноважена особа')}`),
	'order-keeper': defineForm(() => 'Наказ про призначення працівника, який веде сайт', [], ({ blank, sign, sample }) => `${sample}
<p class="center">${blank(60)}<br><span class="hint">(назва закладу освіти)</span></p>
<h1>НАКАЗ</h1>
<p class="row"><span>${blank(16)}</span><span>${blank(20)}</span><span>№ ${blank(8)}</span></p>
<p><b>Про призначення відповідального за ведення вебсайту закладу</b></p>
<p>Відповідно до статті 30 Закону України «Про освіту», щоб забезпечити прозорість та інформаційну відкритість закладу,</p>
<p><b>НАКАЗУЮ:</b></p>
<ol>
<li>Призначити ${blank(44)} <span class="hint">(посада, прізвище, імʼя)</span> відповідальним за ведення офіційного вебсайту закладу.</li>
<li>Відповідальному за ведення вебсайту:
<ul>
<li>оприлюднювати на вебсайті інформацію й документи, визначені статтею 30 Закону України «Про освіту», та оновлювати їх не пізніше ніж через десять робочих днів із дня затвердження чи внесення змін;</li>
<li>оприлюднювати фото й відео дітей лише за наявності згоди батьків або інших законних представників;</li>
<li>зберігати в таємниці дані для входу в панель керування сайтом і не передавати їх іншим особам;</li>
<li>повідомляти керівника закладу про звернення щодо змісту вебсайту.</li>
</ul></li>
<li>На час відсутності відповідального його обовʼязки виконує ${blank(40)}.</li>
<li>Контроль за виконанням наказу залишаю за собою.</li>
</ol>
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
