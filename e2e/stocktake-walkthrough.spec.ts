import { test, expect } from '@playwright/test';
import { loginViaUi, shot, seedStocktake } from './helpers';

test.describe.serial('Walkthrough Toma de Inventario', () =>
{
	test('Página del escáner de códigos', async ({ page }, testInfo) =>
	{
		await loginViaUi(page);
		await page.goto('#/scanner');
		await expect(page.getByRole('heading', { name: 'Escáner de Códigos' })).toBeVisible();

		await shot(page, testInfo, '01-scanner',
			'Página del escáner de códigos. Se escribe o escanea el código del artículo para localizarlo y desde aquí se agrega/elimina stock, se consultan alertas mín/máx y se realiza la toma de inventario.');
	});

	test('Artículo con lotes localizado', async ({ page }, testInfo) =>
	{
		const { itemName } = await seedStocktake();
		await loginViaUi(page);

		await page.goto('#/scanner');
		await page.getByPlaceholder('Escanee o escriba el código').fill(itemName);
		await page.getByRole('button', { name: 'Buscar' }).click();

		await expect(page.locator('.scanner-stock-box')).toBeVisible();

		await shot(page, testInfo, '02-item-found',
			'Artículo con manejo de lotes localizado en el escáner. Se muestra el stock actual, los mínimos/máximos y la cantidad a registrar. El botón "Toma de inventario" abre el conteo.');
	});

	test('Formulario de lotes en la toma de inventario', async ({ page }, testInfo) =>
	{
		const { itemName, batchCode } = await seedStocktake();
		await loginViaUi(page);

		await page.goto('#/scanner');
		await page.getByPlaceholder('Escanee o escriba el código').fill(itemName);
		await page.getByRole('button', { name: 'Buscar' }).click();
		await expect(page.locator('.scanner-stock-box')).toBeVisible();

		await page.locator('input[name="quantity"]').fill('2');

		await page.getByRole('button', { name: 'Toma de inventario' }).click();

		const modal = page.locator('.app-modal');
		await expect(modal.getByPlaceholder('Código de lote')).toBeVisible();

		await modal.getByPlaceholder('Código de lote').fill(batchCode);
		await modal.locator('input[type="date"]').fill('2027-06-30');
		await modal.locator('input[placeholder="0"]').fill('2');

		await shot(page, testInfo, '03-stocktake-lotes-form',
			'Formulario de toma de inventario con detalle por lote. Por cada lote se captura el código, la fecha de caducidad y la cantidad contada. El total contado debe coincidir con la cantidad a registrar.');
	});

	test('Cantidad registrada en la toma de inventario', async ({ page }, testInfo) =>
	{
		const { itemName, batchCode } = await seedStocktake();
		await loginViaUi(page);

		await page.goto('#/scanner');
		await page.getByPlaceholder('Escanee o escriba el código').fill(itemName);
		await page.getByRole('button', { name: 'Buscar' }).click();
		await expect(page.locator('.scanner-stock-box')).toBeVisible();

		await page.locator('input[name="quantity"]').fill('2');

		await page.getByRole('button', { name: 'Toma de inventario' }).click();

		const modal = page.locator('.app-modal');
		await expect(modal.getByPlaceholder('Código de lote')).toBeVisible();

		await modal.getByPlaceholder('Código de lote').fill(batchCode);
		await modal.locator('input[type="date"]').fill('2027-06-30');
		await modal.locator('input[placeholder="0"]').fill('2');
		await modal.getByRole('button', { name: 'Registrar' }).click();

		await expect(modal.getByRole('button', { name: 'Registrar' })).toBeHidden();

		await shot(page, testInfo, '04-count-registered',
			'Conteo registrado. Al confirmar, la toma de inventario guarda el escaneo, el renglón del artículo (cantidad contada) y el detalle por lote con su caducidad. Al cerrar la toma, el sistema ajusta el stock por lote.');
	});
});
