import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Title } from '@angular/platform-browser';

import { ViewConsignmentDeliveredComponent } from './view-consignment-delivered.component';
import { RestService } from '../../modules/shared/services/rest.service';
import { ConfirmationService } from '../../modules/shared/services/confirmation.service';
import { createActivatedRouteMock, createRouterMock } from '../../modules/shared/test/test-mocks';
import {
	INTEGRATION_HOST,
	integrationLogin,
	pingBackend,
	grantConsignmentPermissions,
	seedSession,
	uniqueName,
	uniqueBatch,
	createBatchItem,
	addBatchStock,
	createConsignmentDelivered,
	fetchDeliveredInfo,
	apiRequest,
	waitFor
} from '../../modules/shared/test/integration-client';

describe('ViewConsignmentDeliveredComponent (integration)', () => {
	let component: ViewConsignmentDeliveredComponent;
	let fixture: ComponentFixture<ViewConsignmentDeliveredComponent>;
	let rest: RestService;
	let confirmation: ConfirmationService;

	let backendAvailable = false;
	let session: any;
	let consignmentId = 0;
	let consignmentItemId = 0;
	let batchCode = '';
	let unitaryPrice = 30;
	let deliveredQty = 4;

	beforeAll(async () => {
		backendAvailable = await pingBackend();

		if (!backendAvailable)
		{
			return;
		}

		jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

		session = await integrationLogin();
		await grantConsignmentPermissions(session.bearer, session.user.id);
		session = await integrationLogin();
		seedSession(session);
	});

	beforeEach(async () => {
		if (!backendAvailable)
		{
			return;
		}

		batchCode = uniqueBatch('INTGD');
		const storeId = Number(session.user.store_id || 1);
		const item = await createBatchItem(session.bearer, uniqueName('INTG Entregada Lotes'));
		await addBatchStock(session.bearer, item.id, storeId, batchCode, '2027-06-30', 20);

		const created = await createConsignmentDelivered(
			session.bearer,
			storeId,
			session.user.id,
			item.id,
			deliveredQty,
			unitaryPrice,
			[{ batch: batchCode, expiration_date: '2027-06-30', qty: deliveredQty }]
		);
		consignmentId = created.id;
		consignmentItemId = created.consignmentDeliveredItemId;

		await TestBed.configureTestingModule({
			imports: [ViewConsignmentDeliveredComponent],
			providers: [
				provideHttpClient(),
				{ provide: ActivatedRoute, useValue: createActivatedRouteMock({ id: String(consignmentId) }) },
				{ provide: Router, useValue: createRouterMock() },
				{ provide: Title, useValue: { setTitle: jasmine.createSpy('setTitle') } },
				{ provide: Location, useValue: { back: jasmine.createSpy('back'), replaceState: jasmine.createSpy('replaceState') } }
			]
		})
		.compileComponents();

		fixture = TestBed.createComponent(ViewConsignmentDeliveredComponent);
		rest = TestBed.inject(RestService);
		rest.domain_configuration.domain = INTEGRATION_HOST;
		confirmation = TestBed.inject(ConfirmationService);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	function backendOrSkip(): boolean
	{
		if (!backendAvailable)
		{
			pending('Backend no disponible en ' + INTEGRATION_HOST + '/PointOfSale');
			return false;
		}
		return true;
	}

	it('carga la consignación entregada y muestra los lotes con fecha de expiración', async () => {
		if (!backendOrSkip())
		{
			return;
		}

		await waitFor(() => component.info != null);
		fixture.detectChanges();

		expect(component.info!.items[0].consignment_delivered_item_batches.length).toBe(1);

		const text = fixture.nativeElement.textContent;
		expect(text).toContain('Consignación Entregada #' + consignmentId);
		expect(text).toContain('Lotes:');
		expect(text).toContain(batchCode);
		expect(text).toMatch(/\(\d{1,2}\/\d{1,2}\/\d{2,4}\)/);
		expect(text).toContain('x ' + deliveredQty);

		const reloaded = await fetchDeliveredInfo(session.bearer, consignmentId);
		const batches = reloaded.items[0].consignment_delivered_item_batches;
		expect(batches[0].batch).toBe(batchCode);
		expect(batches[0].expiration_date).toBe('2027-06-30');
		expect(Number(batches[0].qty)).toBe(deliveredQty);
	});

	it('liquida la consignación entregada y genera la orden de venta', async () => {
		if (!backendOrSkip())
		{
			return;
		}

		await waitFor(() => component.info != null);
		fixture.detectChanges();

		component.openSettleForm();
		expect(component.show_settle_form).toBe(true);

		component.settle_items[0].sold_qty = 2;
		component.settle_items[0].returned_qty = 2;

		expect(component.isSettleValid()).toBe(true);
		expect(component.getSoldTotal()).toBe(2 * unitaryPrice);

		component.settle();
		confirmation.onAccept();

		await waitFor(() => !component.is_settling);
		await waitFor(() => component.info!.consignment_delivered.status === 'SETTLED');

		const reloaded = await fetchDeliveredInfo(session.bearer, consignmentId);
		expect(reloaded.consignment_delivered.status).toBe('SETTLED');
		expect(reloaded.consignment_delivered.closed_timestamp).toBeTruthy();

		const orders = await apiRequest('/order_info.php?consignment_delivered_id=' + consignmentId, { bearer: session.bearer });
		expect(orders.data.length).toBe(1);
		expect(Number(orders.data[0].order.total)).toBe(2 * unitaryPrice);
		expect(orders.data[0].order.status).toBe('CLOSED');
		expect(orders.data[0].order.delivery_status).toBe('DELIVERED');
	});
});
