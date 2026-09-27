#!/usr/bin/env node
// Stub for the real importer (see issue #3: "spec: import Tabula docs into the site").
// It will copy docs/{editor,install,qa,dev}/ from tabula-cms/tabula into the gitignored
// src/content/docs/ folders, rewriting frontmatter and links. Until that lands, this stub
// keeps `npm run docs:fetch` (and the commands documented in README.md/CONTRIBUTING.md)
// from crashing on a fresh clone.
console.log('fetch-docs: not implemented yet — see issue #3');
process.exit(0);
