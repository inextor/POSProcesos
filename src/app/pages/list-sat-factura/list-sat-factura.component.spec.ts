import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListSatFacturaComponent } from './list-sat-factura.component';
import { provideComponentMocks } from '../../modules/shared/test/test-mocks';
import { Order, Sat_Factura } from '../../modules/shared/RestModels';

function makeFactura(overrides: Partial<Sat_Factura> = {}): Sat_Factura
{
	return {
		folio: null,
		serie: null,
		created: new Date('2025-01-01T10:00:00'),
		created_by_user_id: null,
		cancelado_por_sat: 'NO',
		id: 1,
		order_id: 10,
		payment_id: null,
		pdf_attachment_id: 0,
		solicitud_cancelacion_sat_timestamp: null,
		system_cancelled_timestamp: null,
		updated: new Date('2025-01-01T10:00:00'),
		type: 'NORMAL',
		updated_by_user_id: null,
		uuid: 'uuid-123',
		xml_attachment_id: null,
		...overrides
	};
}

describe('ListSatFacturaComponent', () =>
{
	let component: ListSatFacturaComponent;
	let fixture: ComponentFixture<ListSatFacturaComponent>;

	beforeEach(async () =>
	{
		await TestBed.configureTestingModule({
			imports: [ListSatFacturaComponent],
			providers: provideComponentMocks()
		})
		.compileComponents();

		fixture = TestBed.createComponent(ListSatFacturaComponent);
		component = fixture.componentInstance;
		component.external_base_url = 'http://localhost:4000';
		fixture.detectChanges();
	});

	it('should create', () =>
	{
		expect(component).toBeTruthy();
	});

	it('should compute agent_name when the order has a client with an agent', () =>
	{
		const factura = makeFactura({ id: 7, order_id: 10, type: 'NORMAL' });
		const order = {
			id: 10,
			client_user_id: 42,
			client_name: 'Cliente SA',
			total: 1200,
			discount: 200
		} as unknown as Order;
		const agent_by_client = new Map<number, string>([[42, 'Agente Vega']]);

		const result = component.getType(factura, [order], [], agent_by_client);

		expect(result.agent_name).toBe('Agente Vega');
		expect(result.client_name).toBe('Cliente SA');
		expect(result.total).toBe(1000);
		expect(result.name_type).toBe('Facturación');
		expect(result.link).toBe('http://localhost:4000/#/view-order/10');
	});

	it('should leave agent_name empty when the order has no client', () =>
	{
		const factura = makeFactura({ id: 8, order_id: 11, type: 'NORMAL' });
		const order = {
			id: 11,
			client_user_id: null,
			client_name: 'Sin Cliente',
			total: 500,
			discount: 0
		} as unknown as Order;

		const result = component.getType(factura, [order], [], new Map<number, string>());

		expect(result.agent_name).toBe('');
	});
});
