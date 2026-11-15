// The eight files an institution's accountant downloads from «Для бухгалтерії» (offer.documents): the forms of
// scripts/lib/documents/ for this repository's current edition, joined as the downloads are (the trial application
// with its act, the act with the invoice; a page break between). No wording here — it lives in the forms module.
// Pure: no filesystem, no network.

import { offer, nextDay, yearOf } from '../../src/config/offer.mjs';
import { renderForm } from './documents/forms.mjs';
export { documentHtml } from './documents/print.mjs';

/** The edition's numbers and codes, as `renderForm` takes them. */
export const TERMS = Object.freeze({
	contractEdition: offer.contractEdition,
	contractUrl: 'https://tabula.org.ua/dohovir/',
	pilotUntil: offer.pilotUntil,
	trialDays: offer.trialDays,
	priceYearUah: offer.priceYearUah,
	priceQuarterUah: offer.priceQuarterUah,
	pilotValueUah: offer.pilotValueUah,
	paymentBankDays: offer.paymentBankDays,
	dk021: offer.dk021,
	dk021Name: offer.dk021Name,
	kekv: offer.kekv,
	supportEmail: offer.supportEmail,
	law: Object.freeze({
		art30Days: offer.law.art30Days,
		tenderLimitUah: offer.law.tenderLimitUah,
		planPublishDays: offer.law.planPublishDays,
	}),
});

// A form after the first starts a new page.
const join = (...kinds) =>
	`\n${kinds.map((kind, i) => (i ? renderForm(kind, TERMS).replace('<h1>', '<h1 class="break">') : renderForm(kind, TERMS))).join('\n\n')}`;
const paidYear = yearOf(nextDay(offer.pilotUntil));

/** The downloads, in the order of offer.documents; `file` is the name under public/dokumenty/. */
export const DOCUMENTS = [
	{ file: 'zaiava-probnyi-period.pdf', compact: 'snug', title: 'Заява про приєднання на пробний період і акт до неї', html: join('trial-application', 'trial-act') },
	{ file: 'richna-zaiava.pdf', compact: true, title: `Річна заява на ${paidYear} рік`, html: join('annual-application') },
	{ file: 'nakaz-bezoplatni-posluhy.pdf', title: 'Наказ про прийняття безоплатно отриманих послуг', html: join('order-free-services') },
	{ file: 'protokol-upovnovazhenoi-osoby.pdf', title: 'Протокол (рішення) уповноваженої особи', html: join('protocol') },
	{ file: 'akt-i-rakhunok.pdf', title: 'Акт приймання-передачі наданих послуг і рахунок на оплату', html: join('act', 'invoice') },
	{ file: 'zghoda-oplata-inshoiu-osoboiu.pdf', title: 'Згода Замовника на оплату рахунку іншою особою', html: join('third-party-consent') },
	{ file: 'nakaz-vidpovidalnyi-za-sait.pdf', title: 'Наказ про призначення працівника, який веде сайт', html: join('order-keeper') },
	{ file: 'zghoda-batkiv.pdf', title: 'Згода батьків на фото й відео дитини', html: join('consent') },
];
