import { test } from 'node:test';
import assert from 'node:assert/strict';

const configUrl = new URL('../astro.config.mjs', import.meta.url);

test('astro.config.mjs defaults site and base for the GitHub Pages project URL', async () => {
	delete process.env.SITE_URL;
	delete process.env.SITE_BASE;
	const { default: config } = await import(`${configUrl}?case=defaults`);
	assert.equal(config.site, 'https://tabula-cms.github.io');
	assert.equal(config.base, '/site');
});

test('astro.config.mjs reads SITE_BASE from the environment (custom-domain case)', async () => {
	process.env.SITE_BASE = '/';
	process.env.SITE_URL = 'https://example.test';
	const { default: config } = await import(`${configUrl}?case=custom-domain`);
	assert.equal(config.base, '/');
	assert.equal(config.site, 'https://example.test');
	delete process.env.SITE_URL;
	delete process.env.SITE_BASE;
});
