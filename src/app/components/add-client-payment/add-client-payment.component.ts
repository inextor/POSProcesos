import { Component, EventEmitter, Injector, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovementInfo, OrderInfo, PaymentInfo } from '../../modules/shared/Models';
import { Bank_Movement, Bank_Movement_Order, Currency_Rate, Payment } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { GetEmpty } from '../../modules/shared/GetEmpty';

@Component({
	selector: 'app-add-client-payment',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './add-client-payment.component.html',
	styleUrl: './add-client-payment.component.css'
})
export class AddClientPaymentComponent extends BaseComponent implements OnInit, OnChanges
{
	@Input() order_item_qty_dictionary: Record<number, number> = {};
	@Input() partial_amount: number = 0;
	@Input() tag: string = 'SALE';
	@Input() order_info_list: OrderInfo[] = [];
	@Input() currency_rate_list: Currency_Rate[] = [];
	@Output() onPayment = new EventEmitter<PaymentInfo | null>();

	rest_payment_info = this.rest.initRest<Partial<PaymentInfo>, PaymentInfo>('payment_info');

	cash: number = 0;
	dolares: number = 0;
	points: number = 0;
	card_amount: number = 0;
	transfer: number = 0;
	check: number = 0;
	is_credit_card: boolean = false;
	card_ending: string | null = null;
	reference: string | null = null;
	factura_enabled: boolean = false;
	transfer_reference: string = '';
	origin_bank_name: string = '';
	check_reference: string = '';
	is_partial_payment: boolean = false;
	order_info: OrderInfo | null = null;
	remaining_label: string = 'Restan';
	remaining_amount: number = 0;

	payment_info: { movements: MovementInfo[]; payment: Partial<Payment> & { received_amount: number; payment_amount: number; change_amount: number } } =
	{
		movements: [],
		payment:
		{
			change_amount: 0,
			currency_id: 'MXN',
			facturado: 'NO',
			payment_amount: 0,
			received_amount: 0,
			sat_pdf_attachment_id: null,
			sat_factura_id: null,
			sat_xml_attachment_id: null,
			sync_id: '',
			tag: 'PAYMENT',
			type: 'income',
		},
	};

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit(): void
	{
		this.payment_info.payment.sync_id = this.rest.getSyncId();
		if (this.order_info_list.length === 1 && !this.order_info)
		{
			this.order_info = this.order_info_list[0];
			this.updatePaymentData();
		}
	}

	ngOnChanges(changes: SimpleChanges): void
	{
		if (changes['partial_amount'])
		{
			this.is_partial_payment = true;
		}
		if (changes['order_info_list'] && this.order_info_list.length === 1 && !this.order_info)
		{
			this.order_info = this.order_info_list[0];
			this.updatePaymentData();
		}
	}

	onOrderInfoChange(): void
	{
		this.updatePaymentData();
	}

	updatePaymentData()
	{
		if (!this.order_info)
			return;

		let movements: MovementInfo[] = [];
		let bank_movement: Bank_Movement = GetEmpty.bank_movement();

		if (this.card_amount)
		{
			movements.push
			({
				bank_movement:
				{
					...bank_movement,
					amount_received: this.card_amount,
					transaction_type: this.is_credit_card ? 'CREDIT_CARD' : 'DEBIT_CARD',
					client_user_id: this.order_info.order.client_user_id,
					total: this.card_amount,
					origin_bank_name: null,
					currency_id: 'MXN',
					exchange_rate: this.getExchangeRate('MXN'),
					status: 'ACTIVE',
					type: 'income',
					card_ending: this.card_ending,
				},
				bank_movement_orders: [{
					id: 0,
					bank_movement_id: 0,
					created_by_user_id: 0,
					updated_by_user_id: 0,
					created: new Date(),
					updated: new Date(),
					currency_amount: this.card_amount,
					amount: Utils.truncate(this.card_amount, 2) * this.getExchangeRate('MXN'),
					currency_id: 'MXN',
					status: 'ACTIVE',
					exchange_rate: this.getExchangeRate('MXN'),
					order_id: this.order_info.order.id
				}],
				bank_movement_bills: []
			});
		}

		if (this.transfer)
		{
			movements.push
			({
				bank_movement:
				{
					...bank_movement,
					transaction_type: 'TRANSFER',
					client_user_id: this.order_info.order.client_user_id,
					total: this.transfer,
					amount_received: this.transfer,
					origin_bank_name: this.origin_bank_name,
					status: 'ACTIVE',
					currency_id: 'MXN',
					exchange_rate: this.getExchangeRate('MXN'),
					type: 'income',
					reference: this.reference || this.transfer_reference
				},
				bank_movement_orders: [{
					id: 0,
					bank_movement_id: 0,
					created_by_user_id: 0,
					updated_by_user_id: 0,
					created: new Date(),
					updated: new Date(),
					currency_amount: this.transfer,
					amount: this.transfer * this.getExchangeRate('MXN'),
					status: 'ACTIVE',
					currency_id: 'MXN',
					exchange_rate: this.getExchangeRate('MXN'),
					order_id: this.order_info.order.id
				}],
				bank_movement_bills: []
			});
		}

		if (this.check)
		{
			movements.push
			({
				bank_movement:
				{
					...bank_movement,
					transaction_type: 'CHECK',
					client_user_id: this.order_info.order.client_user_id,
					total: this.check,
					exchange_rate: this.getExchangeRate('MXN'),
					status: 'ACTIVE',
					origin_bank_name: this.origin_bank_name,
					amount_received: this.check,
					currency_id: 'MXN',
					type: 'income',
				},
				bank_movement_orders: [{
					id: 0,
					bank_movement_id: 0,
					created_by_user_id: 0,
					updated_by_user_id: 0,
					created: new Date(),
					updated: new Date(),
					currency_amount: this.check,
					amount: this.check * this.getExchangeRate('MXN'),
					currency_id: 'MXN',
					status: 'ACTIVE',
					exchange_rate: this.getExchangeRate('MXN'),
					order_id: this.order_info.order.id
				}],
				bank_movement_bills: []
			});
		}

		if (this.cash)
		{
			movements.push
			({
				bank_movement:
				{
					...bank_movement,
					transaction_type: 'CASH',
					client_user_id: this.order_info.order.client_user_id,
					total: this.cash,
					status: 'ACTIVE',
					amount_received: this.cash,
					origin_bank_name: null,
					currency_id: 'MXN',
					exchange_rate: this.getExchangeRate('MXN'),
					type: 'income',
				},
				bank_movement_orders: [{
					id: 0,
					bank_movement_id: 0,
					created_by_user_id: 0,
					updated_by_user_id: 0,
					created: new Date(),
					updated: new Date(),
					currency_amount: this.cash,
					amount: Utils.truncate(this.cash, 2) * this.getExchangeRate('MXN'),
					currency_id: 'MXN',
					status: 'ACTIVE',
					exchange_rate: this.getExchangeRate('MXN'),
					order_id: this.order_info.order.id
				}],
				bank_movement_bills: []
			});
		}

		if (this.dolares)
		{
			movements.push
			({
				bank_movement:
				{
					...bank_movement,
					transaction_type: 'CASH',
					client_user_id: this.order_info.order.client_user_id,
					total: this.dolares,
					amount_received: this.dolares,
					origin_bank_name: null,
					exchange_rate: this.getExchangeRate('USD'),
					status: 'ACTIVE',
					currency_id: 'USD',
					type: 'income',
				},
				bank_movement_orders: [{
					id: 0,
					bank_movement_id: 0,
					created_by_user_id: 0,
					updated_by_user_id: 0,
					created: new Date(),
					updated: new Date(),
					currency_id: 'USD',
					currency_amount: this.dolares,
					amount: Utils.truncate(this.dolares * this.getExchangeRate('USD'), 2),
					status: 'ACTIVE',
					exchange_rate: this.getExchangeRate('USD'),
					order_id: this.order_info.order.id
				}],
				bank_movement_bills: []
			});
		}

		let received_amount: number = 0;
		let payment_amount: number = 0;
		let total_to_pay: number = (this.order_info.order.total - this.order_info.order.discount) - this.order_info.order.amount_paid;

		movements.forEach((bmi: MovementInfo) =>
		{
			let total = 0;
			bmi.bank_movement_orders.forEach((bmo: Bank_Movement_Order) =>
			{
				received_amount += bmo.amount;

				if (payment_amount >= total_to_pay)
					return;

				if (total_to_pay < (payment_amount + bmo.amount))
				{
					let new_amount = total_to_pay - payment_amount;
					bmo.amount = new_amount;
					bmo.currency_amount = new_amount / bmo.exchange_rate;
					payment_amount = total_to_pay;
				}
				else
				{
					payment_amount += bmo.amount;
				}
				total += bmo.currency_amount;
			});
			bmi.bank_movement.total = total;
		});

		this.payment_info.payment.payment_amount = payment_amount;
		this.payment_info.payment.received_amount = received_amount;
		this.payment_info.payment.change_amount = received_amount > payment_amount ? received_amount - payment_amount : 0;
		this.payment_info.movements = movements;

		let is_remaining = (this.order_info.order.total - this.order_info.order.amount_paid) > received_amount;
		this.remaining_label = is_remaining ? 'Restan' : 'Cambio';
		this.remaining_amount = (this.order_info.order.total - (this.order_info.order.discount + this.order_info.order.amount_paid)) > received_amount
			? (this.order_info.order.total - (this.order_info.order.discount + this.order_info.order.amount_paid + received_amount))
			: this.payment_info.payment.change_amount;
	}

	getExchangeRate(currency_id: string): number
	{
		if (!this.order_info)
			return 1;

		if (this.order_info.order.currency_id == currency_id)
			return 1;

		let default_currency_id = this.order_info.store.default_currency_id;

		let currency_rate = this.currency_rate_list.find((r: Currency_Rate) =>
		{
			if (r.store_id != this.order_info?.order.store_id)
				return false;

			if (this.order_info?.order.currency_id == default_currency_id)
			{
				return r.currency_id == currency_id;
			}

			return r.currency_id == this.order_info?.order.currency_id;
		});

		if (!currency_rate)
			return 1;

		return default_currency_id == this.order_info.order.currency_id
			? currency_rate.rate
			: 1 / currency_rate.rate;
	}

	makePayment(_evt: Event): void
	{
		if (!this.order_info)
			return;

		this.is_loading = true;
		this.updatePaymentData();
		this.payment_info.payment.paid_by_user_id = this.order_info.order.client_user_id;

		if (this.payment_info.payment.payment_amount > 0)
		{
			let order_id = this.order_info.order.id;
			this.subs.sink = this.rest_payment_info
			.create(this.payment_info as Partial<PaymentInfo>)
			.subscribe
			({
				next: (response: PaymentInfo) =>
				{
					this.is_loading = false;
					this.showSuccess('El pago se registro correctamente');
					this.onPayment.emit(response);
					window.open(`${this.rest.getExternalAppUrl()}/#/print-payment-receipt/${response.payment.id}/${order_id}/1`);
				},
				error: (error) =>
				{
					this.is_loading = false;
					this.showError(error);
				}
			});
		}
	}

	addEfectivo(amount: number)
	{
		this.cash += amount;
		this.updatePaymentData();
	}

	efectivoExacto()
	{
		if (!this.order_info)
			return;

		this.cleanAmounts();
		let rate = this.getExchangeRate('MXN');
		let paid_amount = this.order_info.order.amount_paid;
		this.cash = Math.ceil((((this.order_info.order.total - this.order_info.order.discount) - paid_amount) * 100) / rate) / 100;
		this.updatePaymentData();
	}

	dolarsExacto()
	{
		if (!this.order_info)
			return;

		this.cleanAmounts();
		let rate = this.getExchangeRate('USD');
		let paid_amount = this.order_info.order.amount_paid;
		this.dolares = Math.ceil((((this.order_info.order.total - this.order_info.order.discount) - paid_amount) / rate * 100)) / 100;
		this.updatePaymentData();
	}

	cleanAmounts()
	{
		this.cash = 0;
		this.transfer = 0;
		this.check = 0;
		this.card_amount = 0;
		this.dolares = 0;
		this.updatePaymentData();
	}

	transferenciaExacta()
	{
		if (!this.order_info)
			return;

		this.cleanAmounts();
		let rate = this.getExchangeRate('MXN');
		let paid_amount = this.order_info.order.amount_paid;
		this.transfer = Math.ceil((((this.order_info.order.total - this.order_info.order.discount) - paid_amount) * 100) / rate) / 100;
		this.updatePaymentData();
	}

	tarjetaExacta()
	{
		if (!this.order_info)
			return;

		this.cleanAmounts();
		let rate = this.getExchangeRate('MXN');
		let paid_amount = this.order_info.order.amount_paid;
		this.card_amount = Math.ceil((((this.order_info.order.total - this.order_info.order.discount) - paid_amount) * 100) / rate) / 100;
		this.updatePaymentData();
	}

	toggleTarjetaCredito(evt: Event)
	{
		let target = evt.target as HTMLInputElement;
		this.is_credit_card = target.checked;
	}

	emitClose()
	{
		if (this.is_loading)
			return;

		this.onPayment.emit(null);
	}
}
