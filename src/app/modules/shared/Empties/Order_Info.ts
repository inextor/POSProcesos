import { OrderInfo, OrderItemInfo } from '../Models';
import { Order, User, Store, Price_Type } from '../RestModels';
import { RestService } from '../services/rest.service';

export function order_info(rest: RestService, store: Store, price_type: Price_Type): OrderInfo {
	let tax_percent = 0;

	if (!rest.user) {
		throw new Error('No user');
	}

	let user = rest.user as User;

	let version_created = rest.getVersion();
	let items: OrderItemInfo[] = [];
	let order: Order = {
		id: 0,
		address: "",
		amount_paid: 0,
		ares: 0,
		client_name: "",
		marked_for_billing: 'NO',
		delivery_user_id: null,
		note: "",
		sat_codigo_postal: null,
		sat_pdf_attachment_id: null,
		sat_razon_social: null,
		authorized_by: null,
		cancellation_timestamp: null,
		billing_data_id: null,
		billing_address_id: null,
		city: "",
		delivery_status: 'PENDING',
		client_user_id: null,
		facturacion_code: "",
		paid_timetamp: null,
		sat_serie_consecutive: null,
		sat_receptor_rfc: '',
		sat_uso_cfdi: '',
		facturado: 'NO',
		guests: 1,
		lat: null,
		lng: null,
		cashier_user_id: user.id,
		created: new Date(),
		currency_id: 'MXN',
		cancellation_reason: '',
		cancelled_by_user_id: null,
		closed_timestamp: null,
		discount: 0,
		initial_payment: 0,
		sat_isr: 0,
		sat_ieps: 0,
		discount_calculated: 0,
		price_type_id: price_type.id,
		sat_forma_pago: '99',
		sat_serie: 'A',
		sat_factura_id: null,
		sat_exchange_rate: 1,
		sat_domicilio_fiscal_receptor: '',
		sat_regimen_fiscal_receptor: '',
		sat_regimen_capital_receptor: '',
		service_type: 'QUICK_SALE',
		status: 'PENDING',
		paid_status: 'PENDING',
		period_id: null,
		store_id: user.store_id as number,
		subtotal: 0,
		sync_id: rest.getSyncId(),
		system_activated: null,
		table_id: null,
		tag: '',
		tax: 0,
		tax_percent: 16,
		total: 0,
		updated: new Date(),
		version_created,
		version_updated: version_created,
		quote_id: null,
		sat_receptor_email: null,
		sat_xml_attachment_id: null,
		shipping_address_id: null,
		shipping_cost: 0,
		state: null,
		store_consecutive: null,
		suburb: null
	};

	let empty: OrderInfo = {
		items,
		order,
		cashier: rest.user,
		delivery_user: null,
		client: null,
		store,
		purchase: null,
		offers: [],
		price_type
	};
	return empty;
}
