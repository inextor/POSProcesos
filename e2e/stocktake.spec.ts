import { test, expect } from '@playwright/test';
import { loginViaUi, seedStocktake } from './helpers';
import {
	integrationLogin,
	apiRequest,
	fetchStocktakeItems,
	fetchStocktakeItemBatches,
	fetchCurrentBatchRecord,
	closeStocktake
} from '../src/app/modules/shared/test/integration-client';

test.describe.serial('Toma de Inventario (E2E)', () =>
{
	test('login and navigate to the scanner page', async ({ page }) =>
	{
		await loginViaUi(page);

		await page.goto('#/scanner');

		await expect(page.getByRole('heading', { name: 'Escáner de Códigos' })).toBeVisible();
	});

	test('counts a batch item into an active stocktake with lotes', async ({ page }) =>
	{
		const { stocktakeId, batchCode, itemName, itemId } = await seedStocktake();
		await loginViaUi(page);

		await page.goto('#/scanner');
		await expect(page.getByRole('heading', { name: 'Escáner de Códigos' })).toBeVisible();

		// Search the item by its name
		await page.getByPlaceholder('Escanee o escriba el código').fill(itemName);
		await page.getByRole('button', { name: 'Buscar' }).click();

		await expect(page.locator('.scanner-stock-box')).toBeVisible();

		// Set the counted quantity
		await page.locator('input[name="quantity"]').fill('2');

		// Open the stocktake modal
		await page.getByRole('button', { name: 'Toma de inventario' }).click();

		const modal = page.locator('.app-modal');
		await expect(modal.getByPlaceholder('Código de lote')).toBeVisible();

		// Fill the lot row: lote, caducidad and contado
		await modal.getByPlaceholder('Código de lote').fill(batchCode);
		await modal.locator('input[type="date"]').fill('2027-06-30');
		await modal.locator('input[placeholder="0"]').fill('2');

		await modal.getByRole('button', { name: 'Registrar' }).click();

		// Modal closes after registering
		await expect(modal.getByRole('button', { name: 'Registrar' })).toBeHidden();

		// Verify the recorded rows via API
		const session = await integrationLogin();
		const bearer = session.bearer;

		const items = await fetchStocktakeItems(bearer, stocktakeId);
		const item = items.data.find((i: any) => Number(i.item_id) === itemId);
		expect(item).toBeTruthy();
		expect(Number(item.real_qty)).toBe(2);

		const batches = await fetchStocktakeItemBatches(bearer, item.id);
		const lot = batches.data.find((b: any) => b.batch === batchCode);
		expect(lot).toBeTruthy();
		expect(Number(lot.real_qty)).toBe(2);
	});

	test('closes the stocktake and applies the lot difference', async ({ page }) =>
	{
		const { stocktakeId, itemId, batchCode, storeId } = await seedStocktake();
		const session = await integrationLogin();
		const bearer = session.bearer;

		// Record a count of 2 against the lot (system had 20) in one call:
		// the endpoint upserts the stocktake_item and its batch rows atomically.
		await apiRequest('/stocktake_item_info.php', {
			method: 'POST',
			bearer,
			body: {
				stocktake_id: stocktakeId,
				item_id: itemId,
				batches: [
					{
						batch: batchCode,
						expiration_date: '2027-06-30',
						db_qty: 20,
						real_qty: 2
					}
				]
			}
		});

		// Close the stocktake
		await closeStocktake(bearer, stocktakeId);

		const closed = await apiRequest('/stocktake.php?id=' + stocktakeId, { bearer });
		const row = Array.isArray(closed.data) ? closed.data[0] : closed;
		expect(row?.status || closed.status).toBe('CLOSED');

		// The lot must now reflect the counted qty (2), not the original 20
		const current = await fetchCurrentBatchRecord(bearer, itemId, storeId, batchCode);
		expect(Number(current.data[0].qty)).toBe(2);
	});
});
