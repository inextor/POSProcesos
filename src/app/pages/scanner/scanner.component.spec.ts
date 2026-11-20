import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScannerComponent } from './scanner.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ItemInfo } from '../../modules/shared/Models';
import { of } from 'rxjs';

function makeItem(batch_option: any): any
{
	const item = GetEmpty.item();
	item.id = 1;
	item.batch_option = batch_option;
	return item;
}

function makeItemInfo(item: any): ItemInfo
{
	return { item } as any;
}

describe('ScannerComponent', () => {
	let component: ScannerComponent;
	let fixture: ComponentFixture<ScannerComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ScannerComponent],
			providers: provideComponentMocks({})
		})
		.compileComponents();

		fixture = TestBed.createComponent(ScannerComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('requiresBatch returns true only for items with batch', () => {
		expect(component.requiresBatch(makeItem('NONE'))).toBe(false);
		expect(component.requiresBatch(makeItem('BATCH_ONLY'))).toBe(true);
		expect(component.requiresBatch(makeItem('EXPIRATION_ONLY'))).toBe(true);
		expect(component.requiresBatch(makeItem('BATCH_AND_EXPIRATION'))).toBe(true);
	});

	it('getStocktakeBatchTotal sums real quantities', () => {
		component.stocktake_batch_rows = [
			{ batch: 'L1', expiration_date: null, db_qty: 0, real_qty: 3 },
			{ batch: 'L2', expiration_date: null, db_qty: 0, real_qty: 2 }
		];
		expect(component.getStocktakeBatchTotal()).toBe(5);
	});

	it('addStocktakeBatchRow adds a row and removeStocktakeBatchRow removes it', () => {
		component.stocktake_batch_rows = [];
		component.addStocktakeBatchRow();
		component.addStocktakeBatchRow();
		expect(component.stocktake_batch_rows.length).toBe(2);
		component.removeStocktakeBatchRow(0);
		expect(component.stocktake_batch_rows.length).toBe(1);
	});

	describe('isStocktakeBatchValid', () => {
		it('requires sum of contado to equal quantity for BATCH_AND_EXPIRATION', () => {
			component.item_info = makeItemInfo(makeItem('BATCH_AND_EXPIRATION'));
			component.quantity = 5;
			component.stocktake_batch_rows = [
				{ batch: 'L1', expiration_date: '2027-01-01', db_qty: 0, real_qty: 3 },
				{ batch: 'L2', expiration_date: '2027-02-01', db_qty: 0, real_qty: 2 }
			];
			expect(component.isStocktakeBatchValid()).toBe(true);

			component.stocktake_batch_rows[0].real_qty = 4;
			expect(component.isStocktakeBatchValid()).toBe(false);
		});

		it('requires batch and expiration for BATCH_AND_EXPIRATION', () => {
			component.item_info = makeItemInfo(makeItem('BATCH_AND_EXPIRATION'));
			component.quantity = 3;
			component.stocktake_batch_rows = [{ batch: '', expiration_date: null, db_qty: 0, real_qty: 3 }];
			expect(component.isStocktakeBatchValid()).toBe(false);

			component.stocktake_batch_rows[0].batch = 'L1';
			expect(component.isStocktakeBatchValid()).toBe(false);

			component.stocktake_batch_rows[0].expiration_date = '2027-01-01';
			expect(component.isStocktakeBatchValid()).toBe(true);
		});

		it('does not require batch for EXPIRATION_ONLY', () => {
			component.item_info = makeItemInfo(makeItem('EXPIRATION_ONLY'));
			component.quantity = 3;
			component.stocktake_batch_rows = [{ batch: '', expiration_date: '2027-01-01', db_qty: 0, real_qty: 3 }];
			expect(component.isStocktakeBatchValid()).toBe(true);
		});

		it('does not require expiration for BATCH_ONLY', () => {
			component.item_info = makeItemInfo(makeItem('BATCH_ONLY'));
			component.quantity = 3;
			component.stocktake_batch_rows = [{ batch: 'L1', expiration_date: null, db_qty: 0, real_qty: 3 }];
			expect(component.isStocktakeBatchValid()).toBe(true);
		});
	});

	describe('loadItemDetails', () => {
		function makeDetailedItem(has_serial_number: any, batch_option: any): any
		{
			const item = makeItem(batch_option);
			item.has_serial_number = has_serial_number;
			return item;
		}

		it('loads serials when the item has serials', () => {
			component.item_info = makeItemInfo(makeDetailedItem('YES', 'NONE'));
			component.store_id = 5;
			const serial_search = spyOn(component.rest_serial, 'search').and.returnValue(of({ data: [{ id: 1 }], total: 1 } as any));
			const batch_search = spyOn(component.rest_batch_record, 'search').and.returnValue(of({ data: [], total: 0 } as any));
			component.loadItemDetails();
			expect(serial_search).toHaveBeenCalled();
			expect(component.serial_array.length).toBe(1);
			expect(batch_search).not.toHaveBeenCalled();
			expect(component.batch_record_array.length).toBe(0);
		});

		it('loads batches when the item uses batches', () => {
			component.item_info = makeItemInfo(makeDetailedItem('NO', 'BATCH_ONLY'));
			component.store_id = 5;
			const serial_search = spyOn(component.rest_serial, 'search').and.returnValue(of({ data: [], total: 0 } as any));
			const batch_search = spyOn(component.rest_batch_record, 'search').and.returnValue(of({ data: [{ id: 7 }], total: 1 } as any));
			component.loadItemDetails();
			expect(serial_search).not.toHaveBeenCalled();
			expect(batch_search).toHaveBeenCalled();
			expect(component.batch_record_array.length).toBe(1);
		});

		it('loads nothing when the item has no serials or batches', () => {
			component.item_info = makeItemInfo(makeDetailedItem('NO', 'NONE'));
			component.store_id = 5;
			const serial_search = spyOn(component.rest_serial, 'search').and.returnValue(of({ data: [], total: 0 } as any));
			const batch_search = spyOn(component.rest_batch_record, 'search').and.returnValue(of({ data: [], total: 0 } as any));
			component.loadItemDetails();
			expect(serial_search).not.toHaveBeenCalled();
			expect(batch_search).not.toHaveBeenCalled();
		});

		it('loads nothing without a store and resetItem clears the lists', () => {
			component.item_info = makeItemInfo(makeDetailedItem('YES', 'BATCH_ONLY'));
			component.store_id = null;
			const serial_search = spyOn(component.rest_serial, 'search').and.returnValue(of({ data: [], total: 0 } as any));
			const batch_search = spyOn(component.rest_batch_record, 'search').and.returnValue(of({ data: [], total: 0 } as any));
			component.loadItemDetails();
			expect(serial_search).not.toHaveBeenCalled();
			expect(batch_search).not.toHaveBeenCalled();

			component.serial_array = [{ id: 1 } as any];
			component.batch_record_array = [{ id: 2 } as any];
			component.resetItem();
			expect(component.serial_array.length).toBe(0);
			expect(component.batch_record_array.length).toBe(0);
		});
	});

	describe('stocktake_confirm_mode', () => {
		it('is true when shipping_receive_type is VALIDATE', () => {
			component.rest.user_permission.shipping_receive_type = 'VALIDATE';
			expect(component.stocktake_confirm_mode).toBe(true);
		});

		it('is false when shipping_receive_type is CAPTURE_QTY', () => {
			component.rest.user_permission.shipping_receive_type = 'CAPTURE_QTY';
			expect(component.stocktake_confirm_mode).toBe(false);
		});
	});
});
