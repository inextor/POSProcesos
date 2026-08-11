import { Page, expect } from '@playwright/test';
import {
	integrationLogin,
	grantConsignmentPermissions,
	uniqueName,
	uniqueBatch,
	createBatchItem,
	createConsignmentReceived,
	addBatchStock,
	createConsignmentDelivered,
	integrationApiOverride,
	INTEGRATION_USER,
	INTEGRATION_PASS
} from '../src/app/modules/shared/test/integration-client';

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

export async function navigateMenuToReceived(page: Page): Promise<void>
{
	const menuOpen = await page.locator('.ps-menu').evaluate(el => el.classList.contains('menu-open'));

	if (!menuOpen)
	{
		await page.locator('.hamburger').click();
		await expect(page.locator('.ps-menu')).toHaveClass(/menu-open/);
	}

	await page.locator('.side-nav-link', { hasText: 'Consignaciones' }).click();
	await page.locator('#show_consignments').getByRole('link', { name: 'Recibidas' }).click();
	await page.waitForURL(/#\/list-consignment-received/);
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
