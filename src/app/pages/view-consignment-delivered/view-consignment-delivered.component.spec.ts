import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ViewConsignmentDeliveredComponent } from './view-consignment-delivered.component';
import { provideComponentMocks, createRestMock, createRestInstanceMock } from '../../modules/shared/test/test-mocks';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ConfirmationService } from '../../modules/shared/services/confirmation.service';
import { ConsignmentDeliveredInfo } from '../../modules/shared/Models';

function makeInfo(): ConsignmentDeliveredInfo
{
	const now = new Date('2026-01-10T12:00:00');

	const empty_item = (name: string, partial_sale: any) =>
	{
		const it = GetEmpty.item();
		it.name = name;
		it.partial_sale = partial_sale;
		return it;
	};

	return {
		consignment_delivered: {
			id: 5,
			seller_user_id: 1,
			store_id: 1,
			total: 280,
			status: 'ACTIVE',
			closed_timestamp: null,
			created: now,
			updated: now,
			created_by_user_id: 1,
			updated_by_user_id: 1
		},
		seller: { ...GetEmpty.user(), name: 'Vendedor A' } as any,
		store: { ...GetEmpty.store(), name: 'Sucursal A' } as any,
		items: [
			{
				consignment_delivered_item: {
					id: 1,
					consignment_delivered_id: 5,
					item_id: 1,
					qty: 10,
					sold_qty: 4,
					returned_qty: 2,
					unitary_price: 20,
					total: 200,
					created: now,
					updated: now
				},
				consignment_delivered_item_batches: [
					{
						id: 1,
						consignment_delivered_item_id: 1,
						batch: 'D-LOT-1',
						expiration_date: '2027-03-15',
						qty: 4,
						created: now,
						created_by_user_id: 1,
						updated: now,
						updated_by_user_id: 1
					}
				],
				item: empty_item('Artículo entregado', 'NO'),
				category: null
			},
			{
				consignment_delivered_item: {
					id: 2,
					consignment_delivered_id: 5,
					item_id: 2,
					qty: 5,
					sold_qty: 0,
					returned_qty: 0,
					unitary_price: 40,
					total: 200,
					created: now,
					updated: now
				},
				consignment_delivered_item_batches: [],
				item: empty_item('Artículo sin lotes', 'YES'),
				category: null
			}
		]
	};
}

describe('ViewConsignmentDeliveredComponent', () => {
	let component: ViewConsignmentDeliveredComponent;
	let fixture: ComponentFixture<ViewConsignmentDeliveredComponent>;
	let rest: any;
	let confirmation: ConfirmationService;
	let updatePathSpy: jasmine.Spy;

	beforeEach(async () => {
		const info = makeInfo();
		updatePathSpy = jasmine.createSpy('updatePath').and.returnValue(of({}));
		rest = createRestMock({
			user_permission: {
				...GetEmpty.user_permission(),
				add_consignment_delivered: 1,
				add_consignment_received: 1
			},
			initRestSimple: () => createRestInstanceMock({ get: () => of(info) }),
			updatePath: updatePathSpy
		});

		await TestBed.configureTestingModule({
			imports: [ViewConsignmentDeliveredComponent],
			providers: provideComponentMocks({ rest, routeParams: { id: '5' } })
		})
		.compileComponents();

		fixture = TestBed.createComponent(ViewConsignmentDeliveredComponent);
		component = fixture.componentInstance;
		confirmation = TestBed.inject(ConfirmationService);
		fixture.detectChanges();
	});

	it('should create and load info', () => {
		expect(component).toBeTruthy();
		expect(component.info).not.toBeNull();
	});

	it('renders seller, store, and batch rows with expiration', () => {
		const el = fixture.nativeElement as HTMLElement;

		expect(el.textContent).toContain('Consignación Entregada #5');
		expect(el.textContent).toContain('Vendedor A');
		expect(el.textContent).toContain('Sucursal A');
		expect(el.textContent).toContain('D-LOT-1');
		expect(el.textContent).toContain('x 4');
		expect(el.textContent).toMatch(/D-LOT-1 \([^)]*\)\s*x 4/);

		expect((el.textContent!.match(/Lotes:/g) || []).length).toBe(1);
	});

	it('openSettleForm populates items and computes totals', () => {
		component.openSettleForm();

		expect(component.show_settle_form).toBe(true);
		expect(component.settle_items.length).toBe(2);
		expect(component.settle_items[0].item_name).toBe('Artículo entregado');
		expect(component.getSoldTotal()).toBe(80);
		expect(component.isSettleValid()).toBe(true);
	});

	it('isSettleValid is false when remaining is negative', () => {
		component.openSettleForm();
		component.settle_items[0].sold_qty = component.settle_items[0].qty + 1;

		expect(component.getItemRemaining(component.settle_items[0])).toBe(-3);
		expect(component.isSettleValid()).toBe(false);
	});

	it('settle submits sold and returned items', () => {
		component.openSettleForm();
		component.settle();
		confirmation.onAccept();

		expect(updatePathSpy).toHaveBeenCalledWith('consignment_delivered_settle', {
			consignment_delivered_id: 5,
			return_items: [
				{ id: 1, sold_qty: 4, returned_qty: 2 }
			]
		});
	});

	it('settle shows error when no item has an action', () => {
		component.openSettleForm();
		component.settle_items.forEach(i =>
		{
			i.sold_qty = 0;
			i.returned_qty = 0;
		});
		component.settle();

		expect(rest.showError).toHaveBeenCalledWith('Debe marcar al menos un artículo como vendido o devuelto');
		expect(updatePathSpy).not.toHaveBeenCalled();
	});

	it('getStatusText returns expected labels', () => {
		expect(component.getStatusText()).toBe('Activa');

		component.info!.consignment_delivered.status = 'SETTLED';
		expect(component.getStatusText()).toBe('Liquidada');

		component.info!.consignment_delivered.status = 'DELETED';
		expect(component.getStatusText()).toBe('Eliminada');
	});
});
