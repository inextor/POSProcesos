import { defineConfig } from '@playwright/test';

const APP_URL = process.env.E2E_APP_URL || 'http://127.0.0.205:4001';
const runWebServer = process.env.E2E_WEBSERVER !== '0';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	workers: 1,
	timeout: 180000,
	expect: { timeout: 20000 },
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: APP_URL,
		channel: 'chrome',
		headless: process.env.E2E_HEADLESS === '1',
		viewport: { width: 1440, height: 900 },
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: runWebServer ? {
		command: 'npm start',
		url: APP_URL,
		reuseExistingServer: true,
		timeout: 180000
	} : undefined
});
