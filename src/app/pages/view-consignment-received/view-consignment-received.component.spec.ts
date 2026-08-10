import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ViewConsignmentReceivedComponent } from './view-consignment-received.component';
import { provideComponentMocks, createRestMock, createRestInstanceMock } from '../../modules/shared/test/test-mocks';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ConfirmationService } from '../../modules/shared/services/confirmation.service';
import { ConsignmentReceivedInfo } from '../../modules/shared/Models';

function makeInfo(): ConsignmentReceivedInfo
{
	const now = new Date('2026-01-10T12:00:00');

	const empty_item = (name: string, batch_option: any) =>
	{
		const it = GetEmpty.item();
		it.name = name;
		it.batch_option = batch_option;
		return it;
	};

	return {
		consignment_received: {
			id: 1,
			provider_user_id: 1,
			store_id: 1,
			reference: 'REF-100',
			total: 250,
			stock_status: 'PENDING',
			status: 'ACTIVE',
			closed_timestamp: null,
			created: now,
			updated: now,
			created_by_user_id: 1,
			updated_by_user_id: 1
		},
		provider: { ...GetEmpty.user(), name: 'Proveedor A' } as any,
		store: { ...GetEmpty.store(), name: 'Sucursal A' } as any,
		items: [
			{
				consignment_received_item: {
					id: 1,
					consignment_received_id: 1,
					item_id: 1,
					qty: 10,
					settled_qty: 0,
					returned_qty: 0,
					unitary_cost: 10,
					total: 100,
					created: now,
					updated: now
				},
				consignment_received_item_batches: [
					{
						id: 1,
						consignment_received_item_id: 1,
						batch: 'LOT-A',
						expiration_date: '2027-06-30',
						qty: 6,
						created: now,
						created_by_user_id: 1,
						updated: now,
						updated_by_user_id: 1
					},
					{
						id: 2,
						consignment_received_item_id: 1,
						batch: 'LOT-B',
						expiration_date: null,
						qty: 4,
						created: now,
						created_by_user_id: 1,
						updated: now,
						updated_by_user_id: 1
					}
				],
				item: empty_item('Artículo con lotes', 'BATCH_AND_EXPIRATION'),
				category: null
			},
			{
				consignment_received_item: {
					id: 2,
					consignment_received_id: 1,
					item_id: 2,
					qty: 5,
					settled_qty: 0,
					returned_qty: 0,
					unitary_cost: 30,
					total: 150,
					created: now,
					updated: now
				},
				consignment_received_item_batches: [],
				item: empty_item('Artículo normal', 'NONE'),
				category: null
			}
		]
	};
}

describe('ViewConsignmentReceivedComponent', () => {
	let component: ViewConsignmentReceivedComponent;
	let fixture: ComponentFixture<ViewConsignmentReceivedComponent>;
	let rest: any;
	let confirmation: ConfirmationService;
	let updateSpy: jasmine.Spy;

	beforeEach(async () => {
		const info = makeInfo();
		updateSpy = jasmine.createSpy('update').and.returnValue(of({}));
		rest = createRestMock({
			user_permission: {
				...GetEmpty.user_permission(),
				add_consignment_received: 1,
				add_consignment_delivered: 1
			},
			initRestSimple: () => createRestInstanceMock({ get: () => of(info) }),
			update: updateSpy
		});

		await TestBed.configureTestingModule({
			imports: [ViewConsignmentReceivedComponent],
			providers: provideComponentMocks({ rest, routeParams: { id: '1' } })
		})
		.compileComponents();

		fixture = TestBed.createComponent(ViewConsignmentReceivedComponent);
		component = fixture.componentInstance;
		confirmation = TestBed.inject(ConfirmationService);
		fixture.detectChanges();
	});

	it('should create and load info', () => {
		expect(component).toBeTruthy();
		expect(component.info).not.toBeNull();
	});

	it('renders provider, store, and batch rows with expiration', () => {
		const el = fixture.nativeElement as HTMLElement;

		expect(el.textContent).toContain('Consignación Recibida #1');
		expect(el.textContent).toContain('Proveedor A');
		expect(el.textContent).toContain('Sucursal A');
		expect(el.textContent).toContain('LOT-A');
		expect(el.textContent).toContain('LOT-B');
		expect(el.textContent).toContain('x 6');
		expect(el.textContent).toContain('x 4');
		expect(el.textContent).toMatch(/LOT-A \([^)]*\)\s*x 6/);

		expect((el.textContent!.match(/Lotes:/g) || []).length).toBe(1);
	});

	it('requiresBatch returns correct value per batch_option', () => {
		expect(component.requiresBatch({ batch_option: 'NONE' })).toBe(false);
		expect(component.requiresBatch({ batch_option: 'BATCH_ONLY' })).toBe(true);
		expect(component.requiresBatch({ batch_option: 'EXPIRATION_ONLY' })).toBe(true);
		expect(component.requiresBatch({ batch_option: 'BATCH_AND_EXPIRATION' })).toBe(true);
		expect(component.requiresBatch(null)).toBe(false);
		expect(component.requiresBatch({})).toBe(false);
	});

	it('addToStock opens batch form when batch items exist', () => {
		component.addToStock();

		expect(component.show_batch_form).toBe(true);
		expect(component.batch_form_items.length).toBe(1);
		expect(component.batch_form_items[0].item_name).toBe('Artículo con lotes');
		expect(component.batch_form_items[0].qty).toBe(10);
		expect(component.batch_form_items[0].batch_option).toBe('BATCH_AND_EXPIRATION');
		expect(component.batch_form_items[0].entries.length).toBe(1);
		expect(component.getBatchTotal(component.batch_form_items[0])).toBe(1);
	});

	it('addToStock adds directly when there are no batch items', () => {
		component.info!.items = component.info!.items.filter(i => !component.requiresBatch(i.item));
		component.addToStock();
		confirmation.onAccept();

		expect(component.show_batch_form).toBe(false);
		expect(updateSpy).toHaveBeenCalledWith('addConsignmentToStock', {
			consignment_received_id: 1,
			batch_details: []
		});
	});

	it('addBatchRow, removeBatchRow and getBatchTotal work', () => {
		const item: any = {
			consignment_received_item_id: 1,
			item_name: 'X',
			qty: 10,
			batch_option: 'BATCH_ONLY',
			entries: [component.newBatchRow(), component.newBatchRow()]
		};

		expect(component.getBatchTotal(item)).toBe(2);
		component.addBatchRow(item);
		expect(item.entries.length).toBe(3);
		expect(component.getBatchTotal(item)).toBe(3);
		component.removeBatchRow(item, 0);
		expect(item.entries.length).toBe(2);
		expect(component.getBatchTotal(item)).toBe(2);
	});

	it('isBatchFormValid requires matching totals', () => {
		component.batch_form_items = [
			{
				consignment_received_item_id: 1,
				item_name: 'X',
				qty: 10,
				batch_option: 'BATCH_ONLY',
				entries: [
					{ ...component.newBatchRow(), batch: 'A', qty: 6 }
				]
			}
		] as any;

		expect(component.isBatchFormValid()).toBe(false);

		(component.batch_form_items[0].entries as any).push({ ...component.newBatchRow(), batch: 'B', qty: 4 });
		expect(component.isBatchFormValid()).toBe(true);
	});

	it('isBatchFormValid requires batch code and expiration per option', () => {
		component.batch_form_items = [
			{
				consignment_received_item_id: 1,
				item_name: 'X',
				qty: 5,
				batch_option: 'BATCH_ONLY',
				entries: [{ ...component.newBatchRow(), batch: '', expiration_date: null, qty: 5 }]
			}
		] as any;

		expect(component.isBatchFormValid()).toBe(false);
		component.batch_form_items[0].entries[0].batch = 'ABC';
		expect(component.isBatchFormValid()).toBe(true);

		component.batch_form_items[0].batch_option = 'EXPIRATION_ONLY';
		component.batch_form_items[0].entries[0].batch = 'ABC';
		expect(component.isBatchFormValid()).toBe(false);
		component.batch_form_items[0].entries[0].expiration_date = '2027-01-01';
		expect(component.isBatchFormValid()).toBe(true);
	});

	it('confirmBatchForm submits batch details on accept', () => {
		component.batch_form_items = [
			{
				consignment_received_item_id: 1,
				item_name: 'X',
				qty: 10,
				batch_option: 'BATCH_AND_EXPIRATION',
				entries: [
					{ ...component.newBatchRow(), batch: 'A', expiration_date: '2027-01-01', qty: 6 },
					{ ...component.newBatchRow(), batch: 'B', expiration_date: '2027-05-01', qty: 4 }
				]
			}
		] as any;

		component.confirmBatchForm();
		confirmation.onAccept();

		expect(updateSpy).toHaveBeenCalledWith('addConsignmentToStock', {
			consignment_received_id: 1,
			batch_details: [
				{
					consignment_received_item_id: 1,
					quantities: [
						{ batch: 'A', expiration_date: '2027-01-01', qty: 6 },
						{ batch: 'B', expiration_date: '2027-05-01', qty: 4 }
					]
				}
			]
		});
	});

	it('openSettleForm populates items and isSettleValid requires folio when settling', () => {
		component.openSettleForm();

		expect(component.show_settle_form).toBe(true);
		expect(component.settle_items.length).toBe(2);
		expect(component.getSettleTotal()).toBe(250);
		expect(component.isSettleValid()).toBe(true);

		component.purchase_folio = '';
		expect(component.isSettleValid()).toBe(false);

		component.purchase_folio = 'F-100';
		expect(component.isSettleValid()).toBe(true);
	});

	it('settle submits purchase when total settled is greater than zero', () => {
		component.openSettleForm();
		component.purchase_folio = 'F-100';
		component.settle();
		confirmation.onAccept();

		expect(updateSpy).toHaveBeenCalledWith('settleConsignmentReceived', jasmine.objectContaining({
			consignment_received_id: 1,
			return_items: jasmine.any(Array),
			purchase: jasmine.objectContaining({
				folio: 'F-100',
				store_id: 1,
				provider_user_id: 1
			})
		}));
	});

	it('settle shows error when no item has an action', () => {
		component.openSettleForm();
		component.settle_items.forEach(i =>
		{
			i.settled_qty = 0;
			i.returned_qty = 0;
		});
		component.settle();

		expect(rest.showError).toHaveBeenCalledWith('Debe liquidar o devolver al menos un artículo');
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it('getStatusText and getStockStatusText return expected labels', () => {
		expect(component.getStatusText()).toBe('Activa');
		expect(component.getStockStatusText()).toBe('Pendiente');

		component.info!.consignment_received.status = 'SETTLED';
		expect(component.getStatusText()).toBe('Liquidada');

		component.info!.consignment_received.stock_status = 'ADDED_TO_STOCK';
		expect(component.getStockStatusText()).toBe('En inventario');
	});
});
