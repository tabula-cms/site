// The screenshots of src/assets/shots/ (taken by scripts/shots.mjs), imported once for the home
// page's sections. `facts` is what scripts/shots.mjs read off the demo's screen.
import adminLaw from '../../assets/shots/admin-law.webp';
import adminMeals from '../../assets/shots/admin-m-meals.webp';
import classroom3 from '../../assets/shots/classroom-3.webp';
import cropOverview from '../../assets/shots/crop-overview.webp';
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
	adminLaw,
	adminMeals,
	classroom3,
	cropOverview,
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
	sizes: '(min-width: 1030px) 540px, calc(100vw - 78px)',
	quality: 72,
} as const;
