import { test, expect } from '@playwright/test';
import { loginViaUi, seedOffer } from './helpers';
import {
	integrationLogin,
	fetchOffer,
	apiRequest
} from '../src/app/modules/shared/test/integration-client';test.describe.serial('Ofertas (E2E)', () =>
{
	test('login and navigate to the Ofertas list page', async ({ page }) =>
	{
		await loginViaUi(page);

		await page.goto('#/list-offer');

		await expect(page.getByRole('heading', { name: 'Ofertas' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Agregar Oferta' })).toBeVisible();
	});

	test('list shows a seeded offer with its display data', async ({ page }) =>
	{
		const { couponCode, itemName } = await seedOffer();
		await loginViaUi(page);

		await page.goto('#/list-offer');

		const row = page.locator('tr', { hasText: couponCode });
		await expect(row).toBeVisible();
		await expect(row).toContainText(itemName);
		await expect(row).toContainText('Compra X llevate Z');
		await expect(row).toContainText('Todas');
	});

	test('creates an offer through the add-offer page', async ({ page }) =>
	{
		const session = await integrationLogin();
		const bearer = session.bearer;
		const itemName = 'E2E Crear Oferta ' + Date.now();
		const item = await apiRequest('/item_info.php', {
			method: 'POST',
			bearer,
			body: {
				item: {
					applicable_tax: 'DEFAULT',
					availability_type: 'ON_STOCK',
					batch_option: 'NONE',
					clave_sat: '53111603',
					currency_id: 'MXN',
					name: itemName,
					note_required: 'NO',
					on_sale: 'YES',
					reference_price: 100,
					status: 'ACTIVE',
					tax_percent: 16,
					unidad_medida_sat_id: 'H87'
				}
			}
		});
		const itemId = item.item.id;
		const couponCode = 'CUPON' + Date.now();

		await loginViaUi(page);
		await page.goto('#/add-offer');

		await expect(page.getByRole('heading', { name: 'Agregar nueva Oferta' })).toBeVisible();

		await page.locator('input[name="coupon_code"]').fill(couponCode);
		await page.locator('input[name="n"]').fill('3');
		await page.locator('input[name="m"]').fill('2');

		await page.getByPlaceholder('Seleccionar artículo').fill(itemName);
		const dropdownItem = page.locator('.search-item', { hasText: itemName }).first();
		await expect(dropdownItem).toBeVisible();
		await dropdownItem.click();

		await page.getByRole('button', { name: 'Guardar' }).click();

		// The save success toast appears after the offer is created
		await expect(page.locator('.alert-success')).toBeVisible();

		// Verify through the API (poll until the row exists, the save is async)
		let created: any = null;

		for (let attempt = 0; attempt < 20; attempt++)
		{
			const offers = await apiRequest('/offer.php?coupon_code=' + encodeURIComponent(couponCode) + '&limit=1', { bearer });
			created = offers.data.find((o: any) => o.coupon_code === couponCode);

			if (created)
				break;

			await new Promise(resolve => setTimeout(resolve, 500));
		}

		expect(created).toBeTruthy();
		expect(Number(created.item_id)).toBe(itemId);
	});

	test('view page shows the offer details', async ({ page }) =>
	{
		const { id, couponCode, itemName } = await seedOffer();
		await loginViaUi(page);

		await page.goto('#/view-offer/' + id);

		await expect(page.getByRole('heading', { name: 'Oferta ' + couponCode })).toBeVisible();
		await expect(page.getByText('Compra X llevate Z', { exact: true })).toBeVisible();
		await expect(page.getByText(itemName, { exact: true })).toBeVisible();
		await expect(page.locator('.form-group', { hasText: 'Sucursal' }).getByText('Todas', { exact: true })).toBeVisible();
	});

	test('deactivates an offer from the list', async ({ page }) =>
	{
		const { id, couponCode } = await seedOffer();
		await loginViaUi(page);

		await page.goto('#/list-offer');

		const row = page.locator('tr', { hasText: couponCode });
		await expect(row).toBeVisible();
		await row.getByRole('button', { name: 'Desactivar' }).click();

		await page.getByRole('button', { name: 'Sí' }).click();

		await expect(page.locator('tr', { hasText: couponCode })).toHaveCount(0);

		const session = await integrationLogin();
		const fetched = await fetchOffer(session.bearer, id);
		const rowData = Array.isArray(fetched.data) ? fetched.data[0] : fetched;
		expect(rowData?.status || fetched.status).toBe('DELETED');
	});
});
