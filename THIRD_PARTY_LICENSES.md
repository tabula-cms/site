# Third-party licences

What the site ships that is not written here, and under which licence.

## Fonts (self-hosted)

The product pages (the home, and from slice S2 of story 80 the other pages of the site's own) use three
typefaces. They are served from this site's own files, taken from the `@fontsource/*` packages
(Cyrillic and Latin subsets of the weights used only); the visitor's browser makes no request to Google
Fonts. Each family is licensed under the **SIL Open Font License 1.1** (https://openfontlicense.org);
the licence text ships in each package's `LICENSE` file.

| Family | Weights | Package | Licence |
| --- | --- | --- | --- |
| Unbounded | 600 | `@fontsource/unbounded` | SIL OFL 1.1 |
| Manrope | 400, 500, 600, 700, 800 | `@fontsource/manrope` | SIL OFL 1.1 |
| Caveat | 600 | `@fontsource/caveat` | SIL OFL 1.1 |
| Tinos (Latin and Cyrillic) | 400, 700 | `@fontsource/tinos` | SIL OFL 1.1 (Apache-2.0 upstream) |

Tinos is not served on the site's pages: it is embedded (as data URIs) in the PDF forms of `public/dokumenty/` and copied with
each edition of the forms (`npm run documents:edition`, `fonts/` with the package's `LICENSE`); it is metric-compatible with
Times New Roman, so a form prints the same on a machine that does not have that face.

## Photographs (CC0)

Three photographs in `src/assets/shots/` — `classroom-3.webp`, `stage-3.webp` and `food-2.webp` — are copied from tabula's test
fixtures (`test/fixtures/school-seed/photos/` in the `tabula-cms/tabula` repository). Every one is a file whose licence
data says **CC0 1.0** (public domain dedication): no attribution is required. The source of each file and its machine-readable
licence data are listed in tabula's `test/fixtures/school-seed/LICENSES.md` and `sources.json`, next to the photos; they are not
repeated here.

The other files in `src/assets/shots/` are screenshots of tabula's own demo site, taken by `scripts/shots.mjs`; they show
tabula's interface, the demo's invented content and, in the shots of a template, the same CC0 photographs.
