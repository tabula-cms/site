# Third-party licences

What the site ships that is not written here, and under which licence.

## Fonts (self-hosted)

The pages of the site (the home, the reading pages, the guide) use the panel's own faces, **Fixel Display** (headings,
section numbers, big figures) and **Fixel Text** (everything else), plus **Caveat** for the hand notes. Fixel is two
variable WOFF2 files (weights 100-900) copied from tabula's `public/fonts/` into `src/assets/fonts/fixel/`, with its
licence text `OFL-Fixel.txt`; © MacPaw, **SIL Open Font License 1.1** (https://openfontlicense.org). Caveat comes from the
`@fontsource/caveat` package (Cyrillic and Latin subsets of the weight used). They are served from this site's own files;
the visitor's browser makes no request to Google Fonts.

| Family | Weights | Source | Licence |
| --- | --- | --- | --- |
| Fixel Display | 100-900 (variable) | `src/assets/fonts/fixel/FixelDisplay-Variable.woff2` | SIL OFL 1.1, `OFL-Fixel.txt` |
| Fixel Text | 100-900 (variable) | `src/assets/fonts/fixel/FixelText-Variable.woff2` | SIL OFL 1.1, `OFL-Fixel.txt` |
| Caveat | 600 | `@fontsource/caveat` | SIL OFL 1.1 |
| Tinos (Latin and Cyrillic) | 400, 700 | `@fontsource/tinos` | SIL OFL 1.1 (Apache-2.0 upstream) |

Tinos is not served on the site's pages: it is embedded (as data URIs) in the PDF forms of `public/dokumenty/` and copied with
each edition of the forms (`npm run documents:edition`, `fonts/` with the package's `LICENSE`); it is metric-compatible with
Times New Roman, so a form prints the same on a machine that does not have that face.

## Music (CC BY 4.0)

The clips of the school guide (`public/guide/clips/*.mp4`) have one piece of music under the picture.

| | |
| --- | --- |
| Track | «Easy Lemon» |
| Author | Kevin MacLeod (incompetech.com) |
| Source | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Easy%20Lemon.mp3 |
| Licence | **Creative Commons Attribution 4.0** (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/ |
| Taken | 2026-11-14 |
| Changes | Shortened to each clip's length, the volume lowered, a fade in and a fade out |
| Used in | Every clip under `public/guide/clips/` |

The attribution the licence asks for stands under every player on the site, with a link to the licence: «Музика: «Easy Lemon» —
Kevin MacLeod (incompetech.com), ліцензія Creative Commons Attribution 4.0. Трек скорочено й приглушено.» (the import writes it,
`scripts/lib/docs-transform.mjs`; `check-built` fails a player without it). The picture of the clips is a recording of tabula's
own demo site with its invented content; the posters (`*.webp`) are frames of it.

## Photographs (CC0)

Three photographs in `src/assets/shots/` — `classroom-3.webp`, `stage-3.webp` and `food-2.webp` — are copied from tabula's test
fixtures (`test/fixtures/school-seed/photos/` in the `tabula-cms/tabula` repository). Every one is a file whose licence
data says **CC0 1.0** (public domain dedication): no attribution is required. The source of each file and its machine-readable
licence data are listed in tabula's `test/fixtures/school-seed/LICENSES.md` and `sources.json`, next to the photos; they are not
repeated here.

The other files in `src/assets/shots/` are screenshots of tabula's own demo site, taken by `scripts/shots.mjs`; they show
tabula's interface, the demo's invented content and, in the shots of a template, the same CC0 photographs.
