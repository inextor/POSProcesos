import { forkJoin, of, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { OrderInfo, PaymentInfo } from "../../modules/shared/Models";
import { RestService } from "../../modules/shared/services/rest.service";
import { Order, Order_Item, Payment, Bank_Movement, Bank_Movement_Order } from "../../modules/shared/RestModels";

interface CreateOrderParams
{
	title: string;
	client_user_id: number;
	total: number;
	tax_percent: number;
	amount_paid: number;
	currency_id: string;
	item_id: number;
}

export function createOrder(
	rest: RestService,
	params: CreateOrderParams
): Observable<OrderInfo | PaymentInfo>
{
	const { title, client_user_id, total, tax_percent, amount_paid, currency_id, item_id } = params;

	const subtotal = total / (1 + (tax_percent / 100));
	const tax = subtotal * (tax_percent / 100);

	const order_item: Partial<Order_Item> = {
		discount_percent: 0,
		discount: 0,
		item_option_id: null,
		exceptions: "",
		item_id,
		has_separator: "NO",
		reservation_item_id: null,
		qty: 1,
		offer_id: null,
		tax,
		item_group: Date.now(),
		tax_included: "YES",
		unitary_price_meta: subtotal,
		original_unitary_price: total,
		stock_status: "IN_STOCK",
		unitary_price: subtotal,
		status: "ACTIVE",
		type: "NORMAL",
		total,
		subtotal,
		is_free_of_charge: "NO",
		note: "",
		ieps_type: "RATE",
		ieps_value: 0
	};

	const order: Partial<Order> = {
		amount_paid: 0,
		ares: 0,
		cancellation_timestamp: null,
		billing_data_id: 1,
		cashier_user_id: 3,
		currency_id,
		cancellation_reason: "",
		cancelled_by_user_id: null,
		closed_timestamp: null,
		discount: 0,
		initial_payment: 0,
		sat_isr: 0,
		sat_ieps: 0,
		discount_calculated: 0,
		price_type_id: 1,
		sat_forma_pago: "01",
		sat_serie: "A",
		sat_exchange_rate: 0,
		sat_domicilio_fiscal_receptor: '',
		sat_regimen_fiscal_receptor: '',
		sat_regimen_capital_receptor: "",
		service_type: "QUICK_SALE",
		status: "PENDING",
		paid_status: "PENDING",
		period_id: null,
		store_id: 1,
		subtotal,
		sync_id: `${1}${Date.now()}`,
		system_activated: null,
		table_id: null,
		tag: "",
		tax,
		tax_percent,
		total,
		version_created: "NXT-VIA_API",
		version_updated: "NXT-VIA_API",
		client_name: title,
		client_user_id,
		sat_receptor_rfc: "",
		sat_razon_social: ""
	};

	const payload = {
		items: [
			{
				order_item,
				prices: [],
				commanda_type_id: null
			}
		],
		order
	};

	let rest_order_info = rest.initRest<Order, OrderInfo>('order_info');
	let rest_payment_info = rest.initRest<Payment, PaymentInfo>('payment_info');

	if (amount_paid)
	{
		return rest_order_info.create(payload).pipe
		(
			mergeMap((order_info: OrderInfo) =>
			{
				return forkJoin
				({
					closeOrder: rest.update('closeOrder', { order_id: order_info.order.id }),
					order_info: of(order_info)
				});
			}),
			mergeMap((response) =>
			{
				let order_info: OrderInfo = response.order_info;

				let bank_movement: Partial<Bank_Movement> = {
					amount_received: amount_paid,
					bank_account_id: null,
					card_ending: "",
					client_user_id: null,
					created: new Date(),
					currency_id: order_info.order.currency_id,
					invoice_attachment_id: null,
					note: "",
					origin_bank_name: null,
					paid_date: null,
					payment_id: null,
					provider_user_id: null,
					receipt_attachment_id: null,
					received_by_user_id: null,
					reference: "",
					status: "ACTIVE",
					total: amount_paid,
					transaction_type: "CASH",
					type: "income",
					updated: new Date(),
					exchange_rate: 1
				};

				let bank_movement_order: Partial<Bank_Movement_Order> = {
					currency_amount: amount_paid,
					amount: amount_paid,
					currency_id: order_info.order.currency_id,
					exchange_rate: 1,
					status: "ACTIVE",
					order_id: order_info.order.id
				};

				let payment: Partial<Payment> = {
					type: "income",
					tag: "SALE",
					payment_amount: amount_paid,
					received_amount: amount_paid,
					facturado: "NO",
					store_id: 1,
					sat_pdf_attachment_id: null,
					sat_uuid: null,
					sat_xml_attachment_id: null,
					change_amount: 0,
					currency_id: order_info.order.currency_id,
					sync_id: `3-${Date.now()}`
				};

				let payment_payload = {
					movements: [
						{
							bank_movement,
							bank_movement_orders: [bank_movement_order]
						}
					],
					payment
				};

				return rest_payment_info.create(payment_payload);
			})
		);
	}

	return rest_order_info.create(payload).pipe
	(
		mergeMap((order_info: OrderInfo) =>
		{
			return rest.update<OrderInfo>('closeOrder', { order_id: order_info.order.id });
		})
	);
}