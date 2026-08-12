import { test, expect } from '@playwright/test';
import { loginViaUi, shot, openMenuIfClosed, navigateMenuToDelivered, seedReceivedConsignment, seedDeliveredConsignment } from './helpers';

test.describe.serial('Walkthrough Consignaciones', () =>
{
	test('Lista de consignaciones recibidas', async ({ page }, testInfo) =>
	{
		await loginViaUi(page);
		await openMenuIfClosed(page);
		await page.locator('.side-nav-link', { hasText: 'Consignaciones' }).click();
		await page.locator('#show_consignments').getByRole('link', { name: 'Recibidas' }).click();
		await page.waitForURL(/#\/list-consignment-received/);
		await expect(page.getByRole('heading', { name: 'Consignaciones Recibidas' })).toBeVisible();

		await shot(page, testInfo, '01-list-received',
			'Lista de consignaciones recibidas. Desde aquí se accede a todas las consignaciones que la tienda recibió de un proveedor, filtrando por estado y abriendo cada una para ver su detalle.');
	});

	test('Detalle de consignación recibida con formulario de lotes', async ({ page }, testInfo) =>
	{
		const { id, batchCode } = await seedReceivedConsignment();
		await loginViaUi(page);

		await page.goto('#/view-consignment-received/' + id);
		await expect(page.getByText('Consignación Recibida #' + id)).toBeVisible();

		await shot(page, testInfo, '02-received-detail',
			'Detalle de la consignación recibida: proveedor, sucursal, referencia, total, estado e inventario. Las insignias muestran si la consignación sigue activa (ACTIVE) y si el inventario está pendiente de agregar (PENDING).');

		await page.getByRole('button', { name: /Agregar Inventario/ }).first().click();
		const batchCard = page.locator('.card', { hasText: 'Información de Lotes' });
		await expect(batchCard).toBeVisible();

		await batchCard.getByPlaceholder('Código de lote').fill(batchCode);
		await batchCard.locator('input[type="date"]').fill('2027-12-31');
		await batchCard.getByPlaceholder('Cant.').fill('10');

		await shot(page, testInfo, '03-received-batch-form',
			'Formulario "Información de Lotes". Los artículos con manejo de lote/caducidad requieren capturar el código de lote, la fecha de caducidad y la cantidad antes de poder agregarlos al inventario de la tienda.');
	});

	test('Consignación recibida liquidada', async ({ page }, testInfo) =>
	{
		const { id, batchCode } = await seedReceivedConsignment();
		await loginViaUi(page);

		await page.goto('#/view-consignment-received/' + id);
		await expect(page.getByText('Consignación Recibida #' + id)).toBeVisible();

		await page.getByRole('button', { name: /Agregar Inventario/ }).first().click();
		const batchCard = page.locator('.card', { hasText: 'Información de Lotes' });
		await batchCard.getByPlaceholder('Código de lote').fill(batchCode);
		await batchCard.locator('input[type="date"]').fill('2027-12-31');
		await batchCard.getByPlaceholder('Cant.').fill('10');
		await page.locator('button.btn-primary', { hasText: 'Agregar Inventario' }).last().click();
		await page.getByRole('button', { name: 'OK' }).click();
		await expect(page.locator('tr', { hasText: 'Lotes:' })).toContainText(batchCode);

		await page.getByRole('button', { name: /Liquidar/ }).first().click();
		const settleCard = page.locator('.card', { hasText: 'Liquidar Consignación' });
		await expect(settleCard).toBeVisible();

		await shot(page, testInfo, '04-received-settle-form',
			'Formulario de liquidación de una consignación recibida. Por cada artículo se indica cuánto se liquida (queda en tienda generando una compra) y cuánto se devuelve al proveedor. Requiere un folio de compra cuando el total a liquidar es mayor a cero.');

		await page.locator('button.btn-primary', { hasText: 'Liquidar' }).last().click();
		await page.getByRole('button', { name: 'OK' }).click();
		await expect(page.getByText('Liquidada', { exact: true })).toBeVisible();

		await shot(page, testInfo, '05-received-settled',
			'Consignación recibida liquidada. El estado cambia a Liquidada (SETTLED) y el inventario queda marcado como agregado al stock. La fecha de liquidación queda registrada.');
	});

	test('Lista y detalle de consignaciones entregadas', async ({ page }, testInfo) =>
	{
		const { id, batchCode } = await seedDeliveredConsignment();
		await loginViaUi(page);

		await navigateMenuToDelivered(page);
		await expect(page.getByRole('heading', { name: 'Consignaciones Entregadas' })).toBeVisible();

		await shot(page, testInfo, '06-list-delivered',
			'Lista de consignaciones entregadas. Muestra las consignaciones que la tienda entregó a un consignatario para su venta, con su estado y totales.');

		await page.goto('#/view-consignment-delivered/' + id);
		await expect(page.getByText('Consignación Entregada #' + id)).toBeVisible();

		await shot(page, testInfo, '07-delivered-detail',
			'Detalle de la consignación entregada: vendedor, sucursal, total y estado. En la tabla de artículos se muestra la cantidad entregada, el precio unitario y los lotes con su caducidad.');
	});

	test('Liquidación de consignación entregada y orden de venta', async ({ page }, testInfo) =>
	{
		const { id } = await seedDeliveredConsignment();
		await loginViaUi(page);

		await page.goto('#/view-consignment-delivered/' + id);
		await expect(page.getByText('Consignación Entregada #' + id)).toBeVisible();

		await page.getByRole('button', { name: /Liquidar/ }).first().click();
		const settleCard = page.locator('.card', { hasText: 'Liquidar Consignación' });
		await expect(settleCard).toBeVisible();

		await shot(page, testInfo, '08-delivered-settle-form',
			'Formulario de liquidación de una consignación entregada. El consignatario indica cuántos artículos vendió y cuántos devuelve al inventario de la tienda. Al liquidar se genera la venta correspondiente.');

		const inputs = settleCard.locator('input[type="number"]');
		await inputs.nth(0).fill('2');
		await inputs.nth(1).fill('2');

		await page.locator('button.btn-primary', { hasText: 'Liquidar' }).last().click();
		await page.getByRole('button', { name: 'OK' }).click();

		await expect(page.getByText('Liquidada', { exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: /Ver Orden/ })).toBeVisible();

		await shot(page, testInfo, '09-delivered-settled',
			'Consignación entregada liquidada. El estado cambia a Liquidada y aparece el botón "Ver Orden", que abre la orden de venta generada por la liquidación.');
	});
});
