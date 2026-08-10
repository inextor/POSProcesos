import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	workers: 1,
	timeout: 180000,
	expect: { timeout: 20000 },
	reporter: [['list']],
	use: {
		baseURL: 'http://127.0.0.205:4001',
		channel: 'chrome',
		headless: process.env.E2E_HEADLESS === '1',
		viewport: { width: 1440, height: 900 },
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'npm start',
		url: 'http://127.0.0.205:4001',
		reuseExistingServer: true,
		timeout: 180000
	}
});
