import { test, expect } from '@playwright/test';
import { loginViaUi } from './helpers';

// Regression coverage for colors_fix.md: the shell must consume the theme
// variables written by RestService.applyTheme(), exactly like legacy POS.
// Requires the e2e backend (E2E_API_URL / E2E_API_BASE); run with:
//   npx playwright test e2e/theme-colors.spec.ts

function parseRgba(value: string): [number, number, number, number]
{
	const m = value.match(/rgba?\(([^)]+)\)/);

	if (!m)
	{
		throw new Error(`Not a color value: ${value}`);
	}

	const parts = m[1].split(',').map(p => parseFloat(p.trim()));

	return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}

function sameColor(a: string, b: string): boolean
{
	const pa = parseRgba(a);
	const pb = parseRgba(b);

	return pa.length === pb.length && pa.every((v, i) => Math.abs(v - pb[i]) < 0.01);
}

test('menu background uses the themed --menu-background-color', async ({ page }) =>
{
	await loginViaUi(page);

	const { cssVar, computed } = await page.evaluate(() =>
	{
		const menu = document.querySelector('.ps-menu') as HTMLElement;
		const cs = getComputedStyle(menu);

		return {
			cssVar: cs.getPropertyValue('--menu-background-color').trim(),
			computed: cs.backgroundColor
		};
	});

	expect(cssVar, 'theme variable --menu-background-color is set').not.toBe('');
	expect(
		sameColor(computed, cssVar),
		`computed .ps-menu background (${computed}) must equal --menu-background-color (${cssVar})`
	).toBe(true);
});

test('header background uses the themed --header-background-color', async ({ page }) =>
{
	await loginViaUi(page);

	const { cssVar, computed } = await page.evaluate(() =>
	{
		const header = document.querySelector('.header_container') as HTMLElement;
		const cs = getComputedStyle(header);

		return {
			cssVar: cs.getPropertyValue('--header-background-color').trim(),
			computed: cs.backgroundColor
		};
	});

	expect(cssVar, 'theme variable --header-background-color is set').not.toBe('');
	expect(
		sameColor(computed, cssVar),
		`computed header background (${computed}) must equal --header-background-color (${cssVar})`
	).toBe(true);
});
