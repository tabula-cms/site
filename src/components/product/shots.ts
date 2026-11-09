// The screenshots of src/assets/shots/ (taken by scripts/shots.mjs), imported once for the home
// page's sections. `facts` is what scripts/shots.mjs read off the demo's screen.
import adminAlbums from '../../assets/shots/admin-albums.webp';
import adminDocuments from '../../assets/shots/admin-documents.webp';
import adminEvents from '../../assets/shots/admin-events.webp';
import adminNewsEditor from '../../assets/shots/admin-news-editor.webp';
import adminOverview from '../../assets/shots/admin-overview.webp';
import adminPages from '../../assets/shots/admin-pages.webp';
import adminLaw from '../../assets/shots/admin-law.webp';
import adminMeals from '../../assets/shots/admin-m-meals.webp';
import classroom3 from '../../assets/shots/classroom-3.webp';
import food2 from '../../assets/shots/food-2.webp';
import kepLine from '../../assets/shots/kep-line.webp';
import phoneMealDay from '../../assets/shots/phone-meal-day.webp';
import phoneMealAllergens from '../../assets/shots/phone-meal-allergens.webp';
import phonePanorama from '../../assets/shots/phone-panorama.webp';
import phoneShkilna from '../../assets/shots/phone-shkilna.webp';
import phoneStend from '../../assets/shots/phone-stend.webp';
import phoneVitryna from '../../assets/shots/phone-vitryna.webp';
import stage3 from '../../assets/shots/stage-3.webp';
import tplPanorama from '../../assets/shots/tpl-panorama.webp';
import tplShkilna from '../../assets/shots/tpl-shkilna.webp';
import tplStend from '../../assets/shots/tpl-stend.webp';
import tplVitryna from '../../assets/shots/tpl-vitryna.webp';
import phoneHazeta from '../../assets/shots/phone-hazeta.webp';
import tplHazeta from '../../assets/shots/tpl-hazeta.webp';
import phoneAfisha from '../../assets/shots/phone-afisha.webp';
import tplAfisha from '../../assets/shots/tpl-afisha.webp';
import phonePortal from '../../assets/shots/phone-portal.webp';
import tplPortal from '../../assets/shots/tpl-portal.webp';
import phoneZoshyt from '../../assets/shots/phone-zoshyt.webp';
import tplZoshyt from '../../assets/shots/tpl-zoshyt.webp';
import facts from '../../assets/shots/facts.json';

export const shots = {
	adminAlbums,
	adminDocuments,
	adminEvents,
	adminNewsEditor,
	adminOverview,
	adminPages,
	adminLaw,
	adminMeals,
	classroom3,
	food2,
	kepLine,
	phoneMealDay,
	phoneMealAllergens,
	phonePanorama,
	phoneShkilna,
	phoneStend,
	phoneVitryna,
	stage3,
	tplPanorama,
	tplShkilna,
	tplStend,
	tplVitryna,
	phoneHazeta,
	tplHazeta,
	phoneAfisha,
	tplAfisha,
	phonePortal,
	tplPortal,
	phoneZoshyt,
	tplZoshyt,
};

export { facts };

// The hero's laptop is the page's LCP image: the page's <head> preloads exactly these variants
// (src/pages/index.astro) and Hero.astro renders the <img> with the same options.
export const HERO = {
	widths: [480, 640, 800, 1080],
	// The displayed width of the image: side by side from 1180 px (the visual is vw - 668 px wide up to 580 px, minus its
	// 30 px padding and the laptop's 24 px bezel: 526 px at most), stacked below (the row's width, vw - 48 px, minus the
	// same 54 px: vw - 102 px, 1078 px at most, which the 1080 px variant covers at DPR 1).
	sizes: '(min-width: 1248px) 526px, (min-width: 1180px) calc(100vw - 722px), calc(100vw - 102px)',
	quality: 72,
} as const;
