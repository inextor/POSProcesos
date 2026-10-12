import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListObjectSatFacturaComponent } from './list-object-sat-factura.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';
import { Order, Sat_Factura } from '../../modules/shared/RestModels';

describe('ListObjectSatFacturaComponent', () => {
	let component: ListObjectSatFacturaComponent;
	let fixture: ComponentFixture<ListObjectSatFacturaComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [ListObjectSatFacturaComponent],
			providers: provideComponentMocks({ routeParams: { order_id: '37545' } })
		})
		.compileComponents();

		fixture = TestBed.createComponent(ListObjectSatFacturaComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should keep the folio from sat_factura instead of the order consecutive', () => {
		const sat_factura = { id: 1, type: 'NORMAL', folio: 'F-123', serie: 'A', order_id: 37545, cancelado_por_sat: 'NO', system_cancelled_timestamp: null } as Sat_Factura;
		const order = { id: 37545, store_consecutive: 999, client_name: 'Test', total: 100, discount: 0, sat_factura_id: 1 } as Order;

		const result = component.getType(sat_factura, order, null as any);

		expect(result.folio).toBe('F-123');
	});
});
