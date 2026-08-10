import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Title } from '@angular/platform-browser';

import { ViewConsignmentReceivedComponent } from './view-consignment-received.component';
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
	createConsignmentReceived,
	fetchReceivedInfo,
	waitFor
} from '../../modules/shared/test/integration-client';

describe('ViewConsignmentReceivedComponent (integration)', () => {
	let component: ViewConsignmentReceivedComponent;
	let fixture: ComponentFixture<ViewConsignmentReceivedComponent>;
	let rest: RestService;
	let confirmation: ConfirmationService;

	let backendAvailable = false;
	let session: any;
	let consignmentId = 0;
	let batchCode = '';

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

		batchCode = uniqueBatch('INTG');
		const item = await createBatchItem(session.bearer, uniqueName('INTG Recibida Lotes'));
		const created = await createConsignmentReceived(
			session.bearer,
			Number(session.user.store_id || 1),
			session.user.id,
			item.id,
			10,
			25,
			uniqueName('REF')
		);
		consignmentId = created.id;

		await TestBed.configureTestingModule({
			imports: [ViewConsignmentReceivedComponent],
			providers: [
				provideHttpClient(),
				{ provide: ActivatedRoute, useValue: createActivatedRouteMock({ id: String(consignmentId) }) },
				{ provide: Router, useValue: createRouterMock() },
				{ provide: Title, useValue: { setTitle: jasmine.createSpy('setTitle') } },
				{ provide: Location, useValue: { back: jasmine.createSpy('back'), replaceState: jasmine.createSpy('replaceState') } }
			]
		})
		.compileComponents();

		fixture = TestBed.createComponent(ViewConsignmentReceivedComponent);
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

	it('carga la consignación, agrega lotes al inventario y los muestra con fecha de expiración', async () => {
		if (!backendOrSkip())
		{
			return;
		}

		await waitFor(() => component.info != null);
		fixture.detectChanges();

		const el = fixture.nativeElement as HTMLElement;
		expect(el.textContent).toContain('Consignación Recibida #' + consignmentId);
		expect(component.info!.items[0].consignment_received_item_batches.length).toBe(0);

		component.addToStock();
		expect(component.show_batch_form).toBe(true);
		expect(component.batch_form_items.length).toBe(1);

		component.batch_form_items[0].entries[0].batch = batchCode;
		component.batch_form_items[0].entries[0].expiration_date = '2027-12-31';
		component.batch_form_items[0].entries[0].qty = 10;

		expect(component.isBatchFormValid()).toBe(true);

		component.confirmBatchForm();
		confirmation.onAccept();

		await waitFor(() => !component.is_saving);
		await waitFor(() => component.info!.items[0].consignment_received_item_batches.length === 1);
		fixture.detectChanges();

		expect(component.info!.items[0].consignment_received_item_batches.length).toBe(1);
		expect(component.info!.items[0].consignment_received_item_batches[0].batch).toBe(batchCode);
		expect(component.info!.items[0].consignment_received_item_batches[0].expiration_date).toBeTruthy();

		const textAfter = fixture.nativeElement.textContent;
		expect(textAfter).toContain('Lotes:');
		expect(textAfter).toContain(batchCode);
		expect(textAfter).toMatch(/\(\d{1,2}\/\d{1,2}\/\d{2,4}\)/);
		expect(textAfter).toContain('x 10');
	});

	it('liquida la consignación y genera la compra contra el backend real', async () => {
		if (!backendOrSkip())
		{
			return;
		}

		await waitFor(() => component.info != null);
		fixture.detectChanges();

		component.openSettleForm();
		expect(component.show_settle_form).toBe(true);
		expect(component.getSettleTotal()).toBe(250);

		component.purchase_folio = 'FOLIO-' + Date.now();
		expect(component.isSettleValid()).toBe(true);

		component.settle();
		confirmation.onAccept();

		await waitFor(() => !component.is_settling);
		await waitFor(() => component.info!.consignment_received.status === 'SETTLED');

		const reloaded = await fetchReceivedInfo(session.bearer, consignmentId);
		expect(reloaded.consignment_received.status).toBe('SETTLED');
		expect(reloaded.consignment_received.closed_timestamp).toBeTruthy();
	});
});
