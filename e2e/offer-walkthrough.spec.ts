import { test, expect } from '@playwright/test';
import { loginViaUi, shot, seedOffer } from './helpers';

test.describe.serial('Walkthrough Ofertas y cupones', () =>
{
	test('Listado de ofertas', async ({ page }, testInfo) =>
	{
		await seedOffer();
		await loginViaUi(page);

		await page.goto('#/list-offer');
		await expect(page.getByRole('heading', { name: 'Ofertas' })).toBeVisible();

		await shot(page, testInfo, '01-list-offer',
			'Listado de ofertas y cupones. Cada renglón muestra el cupón, el artículo, el horario, los días hábiles, la sucursal, el tipo y la vigencia. Desde aquí se agrega una oferta o se desactiva una existente.');
	});

	test('Formulario para agregar oferta', async ({ page }, testInfo) =>
	{
		const { itemName } = await seedOffer();
		await loginViaUi(page);

		await page.goto('#/add-offer');
		await expect(page.getByRole('heading', { name: 'Agregar nueva Oferta' })).toBeVisible();

		await page.locator('input[name="coupon_code"]').fill('CUPON-DEMO');
		await page.locator('input[name="n"]').fill('3');
		await page.locator('input[name="m"]').fill('2');

		await shot(page, testInfo, '02-add-offer',
			'Formulario para crear una oferta. Se captura el código del cupón, el tipo, el artículo (con buscador), la sucursal y el tipo de precio, la vigencia, el horario y los días válidos.');
	});

	test('Artículo seleccionado en la oferta', async ({ page }, testInfo) =>
	{
		const { itemName } = await seedOffer();
		await loginViaUi(page);

		await page.goto('#/add-offer');

		await page.getByPlaceholder('Seleccionar artículo').fill(itemName);
		const dropdownItem = page.locator('.search-item', { hasText: itemName }).first();
		await expect(dropdownItem).toBeVisible();
		await dropdownItem.click();

		await shot(page, testInfo, '03-item-selected',
			'El buscador de artículos resuelve el nombre y lo deja seleccionado en la oferta. Al guardar, la oferta queda ligada al artículo.');
	});

	test('Detalle de una oferta', async ({ page }, testInfo) =>
	{
		const { id, couponCode } = await seedOffer();
		await loginViaUi(page);

		await page.goto('#/view-offer/' + id);
		await expect(page.getByRole('heading', { name: 'Oferta ' + couponCode })).toBeVisible();

		await shot(page, testInfo, '04-view-offer',
			'Página de detalle de la oferta: código del cupón, tipo, artículo, sucursal, vigencia, horario, días válidos y estatus. Desde aquí también se puede desactivar la oferta.');
	});
});
