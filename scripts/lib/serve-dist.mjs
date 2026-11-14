// A tiny static server over dist/ for scripts/a11y.mjs and scripts/budget.mjs: maps the site's base
// path (SITE_BASE, default /site as in astro.config.mjs), serves `index.html` for a directory,
// and needs no dependency. Listens on a free port of 127.0.0.1.

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const distDir = path.join(root, 'dist');
export const base = process.env.SITE_BASE ?? '/site';
export const baseNoSlash = base === '/' ? '' : base.replace(/\/$/, '');

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.png': 'image/png',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.wasm': 'application/wasm',
	'.pdf': 'application/pdf',
};

/** Starts the server; resolves to `{ server, origin }` (`origin` has no trailing slash and no base). */
export function serveDist() {
	const server = createServer((req, res) => {
		let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
		if (baseNoSlash && !pathname.startsWith(`${baseNoSlash}/`)) pathname = '/__outside__';
		else pathname = pathname.slice(baseNoSlash.length) || '/';
		let file = path.join(distDir, path.normalize(pathname));
		if (!file.startsWith(distDir)) file = '';
		if (file && existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
		if (!file || !existsSync(file)) {
			res.writeHead(404, { 'content-type': 'text/plain' });
			res.end('not found');
			return;
		}
		res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
		res.end(readFileSync(file));
	});
	return new Promise((resolve) =>
		server.listen(0, '127.0.0.1', () =>
			resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }),
		),
	);
}
