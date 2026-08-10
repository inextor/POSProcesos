import { test, expect } from '@playwright/test';
import { loginViaUi, seedDeliveredConsignment } from './helpers';

test.describe.serial('Consignación Entregada (E2E)', () =>
{
	test('view shows batches with expiration', async ({ page }) =>
	{
		const { id, batchCode } = await seedDeliveredConsignment();
		await loginViaUi(page);

		await page.goto('/#/view-consignment-delivered/' + id);
		await expect(page.getByText('Consignación Entregada #' + id)).toBeVisible();

		const lotesRow = page.locator('tr', { hasText: 'Lotes:' });
		await expect(lotesRow).toContainText(batchCode);
		await expect(lotesRow).toContainText('x 4');
	});

	test('settles through the UI and generates the sale order', async ({ page }) =>
	{
		const { id } = await seedDeliveredConsignment();
		await loginViaUi(page);

		await page.goto('/#/view-consignment-delivered/' + id);
		await expect(page.getByText('Consignación Entregada #' + id)).toBeVisible();

		await page.getByRole('button', { name: /Liquidar/ }).first().click();

		const settleCard = page.locator('.card', { hasText: 'Liquidar Consignación' });
		await expect(settleCard).toBeVisible();

		const inputs = settleCard.locator('input[type="number"]');
		await inputs.nth(0).fill('2');
		await inputs.nth(1).fill('2');

		await page.locator('button.btn-primary', { hasText: 'Liquidar' }).click();
		await page.getByRole('button', { name: 'OK' }).click();

		await expect(page.getByText('Liquidada', { exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: /Ver Orden/ })).toBeVisible();
	});
});
