import { test, expect } from '@playwright/test';
import { loginViaUi, navigateMenuToReceived, seedReceivedConsignment } from './helpers';

test.describe.serial('Consignación Recibida (E2E)', () =>
{
	test('login and navigate to Recibidas via the sidebar menu', async ({ page }) =>
	{
		await loginViaUi(page);

		await expect(page.getByText('Consignaciones')).toBeVisible();

		await navigateMenuToReceived(page);

		await expect(page.getByRole('heading', { name: 'Consignaciones Recibidas' })).toBeVisible();
	});

	test('view shows batches with expiration and adds them to stock', async ({ page }) =>
	{
		const { id, batchCode } = await seedReceivedConsignment();
		await loginViaUi(page);

		await page.goto('#/view-consignment-received/' + id);
		await expect(page.getByText('Consignación Recibida #' + id)).toBeVisible();

		await page.getByRole('button', { name: /Agregar Inventario/ }).click();

		const batchCard = page.locator('.card', { hasText: 'Información de Lotes' });
		await expect(batchCard).toBeVisible();

		await batchCard.getByPlaceholder('Código de lote').fill(batchCode);
		await batchCard.locator('input[type="date"]').fill('2027-12-31');
		await batchCard.getByPlaceholder('Cant.').fill('10');

		await page.locator('button.btn-primary', { hasText: 'Agregar Inventario' }).click();
		await page.getByRole('button', { name: 'OK' }).click();

		const lotesRow = page.locator('tr', { hasText: 'Lotes:' });
		await expect(lotesRow).toContainText(batchCode);
		await expect(lotesRow).toContainText('x 10');
	});

	test('settles the consignment through the UI', async ({ page }) =>
	{
		const { id, batchCode } = await seedReceivedConsignment();
		await loginViaUi(page);

		await page.goto('#/view-consignment-received/' + id);
		await expect(page.getByText('Consignación Recibida #' + id)).toBeVisible();

		await page.getByRole('button', { name: /Agregar Inventario/ }).click();

		const batchCard = page.locator('.card', { hasText: 'Información de Lotes' });
		await expect(batchCard).toBeVisible();

		await batchCard.getByPlaceholder('Código de lote').fill(batchCode);
		await batchCard.locator('input[type="date"]').fill('2027-12-31');
		await batchCard.getByPlaceholder('Cant.').fill('10');

		await page.locator('button.btn-primary', { hasText: 'Agregar Inventario' }).click();
		await page.getByRole('button', { name: 'OK' }).click();
		await expect(page.locator('tr', { hasText: 'Lotes:' })).toContainText(batchCode);

		await page.getByRole('button', { name: /Liquidar/ }).first().click();

		const settleCard = page.locator('.card', { hasText: 'Liquidar Consignación' });
		await expect(settleCard).toBeVisible();

		await page.locator('button.btn-primary', { hasText: 'Liquidar' }).click();
		await page.getByRole('button', { name: 'OK' }).click();

		await expect(page.getByText('Liquidada', { exact: true })).toBeVisible();
	});
});
