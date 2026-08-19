import { Page, TestInfo, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
	integrationLogin,
	grantConsignmentPermissions,
	grantStocktakePermissions,
	grantOfferPermissions,
	uniqueName,
	uniqueBatch,
	createBatchItem,
	createSimpleItem,
	createOffer,
	createConsignmentReceived,
	addBatchStock,
	createConsignmentDelivered,
	createStocktake,
	integrationApiOverride,
	INTEGRATION_USER,
	INTEGRATION_PASS
} from '../src/app/modules/shared/test/integration-client';

export const SHOTS_ROOT = join(process.cwd(), 'e2e', 'screenshots');

export function moduleKeyFromTestFile(testFile: string): string
{
	const file = basename(testFile).replace(/\.spec\.ts$/, '');
	return file.replace(/-walkthrough$/, '');
}

export function moduleShotDir(moduleKey: string): string
{
	return join(SHOTS_ROOT, moduleKey);
}

export function manifestFile(moduleKey: string): string
{
	return join(moduleShotDir(moduleKey), 'manifest.json');
}

export async function shot(page: Page, testInfo: TestInfo, name: string, caption: string): Promise<string>
{
	const moduleKey = moduleKeyFromTestFile(testInfo.file);
	const dir = moduleShotDir(moduleKey);
	await mkdir(dir, { recursive: true });

	const safeTest = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
	const safeStep = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
	const file = `${safeTest}__${safeStep}.png`;
	const fullPath = join(dir, file);

	await page.screenshot({ path: fullPath, fullPage: true });
	await testInfo.attach(name, { path: fullPath, contentType: 'image/png' });

	const manifest = await readManifest(manifestFile(moduleKey));
	manifest.push({ order: 0, test: testInfo.title, step: name, caption, file });
	const deduped = Array.from(new Map(manifest.map(e => [e.file, e])).values())
		.map((e, i) => ({ ...e, order: i + 1 }));
	await writeFile(manifestFile(moduleKey), JSON.stringify(deduped, null, 2), 'utf8');

	return fullPath;
}

async function readManifest(file: string): Promise<Array<{ order: number; test: string; step: string; caption: string; file: string }>>
{
	try
	{
		const { readFile } = await import('node:fs/promises');
		return JSON.parse(await readFile(file, 'utf8'));
	}
	catch
	{
		return [];
	}
}

export async function loginViaUi(page: Page): Promise<void>
{
	const override = integrationApiOverride();

	if (override.domain)
	{
		await page.addInitScript((domain) => { window.__INTEGRATION_DOMAIN__ = domain; }, override.domain);
	}

	if (override.urlBase)
	{
		await page.addInitScript((urlBase) => { window.__INTEGRATION_URL_BASE__ = urlBase; }, override.urlBase);
	}

	await page.goto('#/login');
	await page.getByPlaceholder('usuario@ejemplo.com').fill(INTEGRATION_USER);
	await page.getByPlaceholder('Contraseña').fill(INTEGRATION_PASS);
	await page.getByRole('button', { name: 'Login' }).click();
	await expect(page.locator('.side-nav-link').first()).toBeVisible();
}

export async function openMenuIfClosed(page: Page): Promise<void>
{
	const menuOpen = await page.locator('.ps-menu').evaluate(el => el.classList.contains('menu-open'));

	if (!menuOpen)
	{
		await page.locator('.hamburger').click();
		await expect(page.locator('.ps-menu')).toHaveClass(/menu-open/);
	}
}

export async function navigateMenuToReceived(page: Page): Promise<void>
{
	await openMenuIfClosed(page);
	await page.locator('.side-nav-link', { hasText: 'Consignaciones' }).click();
	await page.locator('#show_consignments').getByRole('link', { name: 'Recibidas' }).click();
	await page.waitForURL(/#\/list-consignment-received/);
}

export async function navigateMenuToDelivered(page: Page): Promise<void>
{
	await openMenuIfClosed(page);
	await page.locator('.side-nav-link', { hasText: 'Consignaciones' }).click();
	await page.locator('#show_consignments').getByRole('link', { name: 'Entregadas' }).click();
	await page.waitForURL(/#\/list-consignment-delivered/);
}

export async function navigateMenuToOffers(page: Page): Promise<void>
{
	await openMenuIfClosed(page);
	await page.locator('.side-nav-link', { hasText: 'Ofertas y cupones' }).click();
	await page.waitForURL(/#\/list-offer/);
}

export async function seedOffer(): Promise<{ id: number; couponCode: string; itemName: string; itemId: number }>
{
	const session = await integrationLogin();
	await grantOfferPermissions(session.bearer, session.user.id);

	const itemName = uniqueName('E2E Oferta');
	const item = await createSimpleItem(session.bearer, itemName);

	const couponCode = uniqueName('CUPON').toUpperCase().replace(/\s+/g, '');
	const offer = await createOffer(session.bearer, {
		coupon_code: couponCode,
		type: 'N_X_M',
		item_id: item.id,
		n: 3,
		m: 2,
		hour_start: '09:00',
		hour_end: '21:00',
		is_valid_sunday: 1,
		is_valid_monday: 1,
		is_valid_tuesday: 1,
		is_valid_wednesday: 1,
		is_valid_thursday: 1,
		is_valid_friday: 1,
		is_valid_saturday: 1,
		valid_from: '2026-01-01T00:00:00',
		valid_thru: '2036-01-01T00:00:00',
		status: 'ACTIVE'
	});

	return { id: offer.id, couponCode, itemName, itemId: item.id };
}

export async function seedReceivedConsignment(): Promise<{ id: number; batchCode: string; itemName: string }>
{
	const session = await integrationLogin();
	await grantConsignmentPermissions(session.bearer, session.user.id);

	const batchCode = uniqueBatch('E2E');
	const itemName = uniqueName('E2E Recibida Lotes');
	const item = await createBatchItem(session.bearer, itemName, 'BATCH_AND_EXPIRATION');
	const created = await createConsignmentReceived(
		session.bearer,
		Number(session.user.store_id || 1),
		session.user.id,
		item.id,
		10,
		25,
		uniqueName('REF')
	);

	return { id: created.id, batchCode, itemName };
}

export async function seedDeliveredConsignment(): Promise<{ id: number; batchCode: string }>
{
	const session = await integrationLogin();
	await grantConsignmentPermissions(session.bearer, session.user.id);

	const storeId = Number(session.user.store_id || 1);
	const batchCode = uniqueBatch('E2ED');
	const item = await createBatchItem(session.bearer, uniqueName('E2E Entregada Lotes'), 'BATCH_AND_EXPIRATION');
	await addBatchStock(session.bearer, item.id, storeId, batchCode, '2027-06-30', 20);

	const created = await createConsignmentDelivered(
		session.bearer,
		storeId,
		session.user.id,
		item.id,
		4,
		30,
		[{ batch: batchCode, expiration_date: '2027-06-30', qty: 4 }]
	);

	return { id: created.id, batchCode };
}

export async function seedStocktake(): Promise<{ stocktakeId: number; itemId: number; batchCode: string; itemName: string; storeId: number; stockQty: number }>
{
	const session = await integrationLogin();
	await grantStocktakePermissions(session.bearer, session.user.id);

	const storeId = Number(session.user.store_id || 1);
	const batchCode = uniqueBatch('E2EST');
	const itemName = uniqueName('E2E Stocktake Lotes');
	const item = await createBatchItem(session.bearer, itemName, 'BATCH_AND_EXPIRATION');

	const stockQty = 20;
	await addBatchStock(session.bearer, item.id, storeId, batchCode, '2027-06-30', stockQty);

	const stocktake = await createStocktake(session.bearer, storeId, uniqueName('Toma E2E'));

	return { stocktakeId: stocktake.id, itemId: item.id, batchCode, itemName, storeId, stockQty };
}
