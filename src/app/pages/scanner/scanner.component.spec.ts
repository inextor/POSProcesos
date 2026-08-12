import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScannerComponent } from './scanner.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ItemInfo } from '../../modules/shared/Models';

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
