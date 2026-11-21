import { Component, EventEmitter, Injector, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { FacturacionRequest, OrderInfo, PaymentInfo } from '../../modules/shared/Models';
import { Address, Billing_Data, Store } from '../../modules/shared/RestModels';
import { RestResponse } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { GetEmpty } from '../../modules/shared/GetEmpty';

@Component({
	selector: 'app-save-order-factura',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './save-order-factura.component.html',
	styleUrl: './save-order-factura.component.css'
})
export class SaveOrderFacturaComponent extends BaseComponent implements OnInit, OnChanges
{
	@Input() order_info: OrderInfo | null = null;
	@Output() onFinish = new EventEmitter<boolean>();
	@Input() billing_data_list: Billing_Data[] = [];
	@Input() payment_info_list: PaymentInfo[] = [];
	@Input() payment_mode: boolean = false;
	@Input() selected_payment: PaymentInfo | null = null;

	rest_billing_data = this.rest.initRestSimple<Billing_Data>('billing_data');
	rest_address = this.rest.initRestSimple<Address>('address');
	rest_store = this.rest.initRestSimple<Store>('store');
	rest_facturacion_request = this.rest.initRest<FacturacionRequest, any>('facturacion_request');

	billing_data_dictionary: Record<number, Billing_Data> = {};
	billing_data_id: number | null = null;
	selected_billing_data: Billing_Data | null = null;
	address_array: Address[] = [];
	client_address: Address | null = null;

	fields_changed: boolean = false;
	update_address: boolean = false;
	is_precision_6: boolean = false;

	version: '4.0' | '3.0' = '4.0';
	apply_rounding_discount_adjustment: boolean = true;

	constructor(injector: Injector)
	{
		super(injector);
	}

	ngOnInit(): void
	{
		this.subs.sink = this.rest_billing_data
		.search({ limit: 989999 })
		.subscribe((responses: RestResponse<Billing_Data>) =>
		{
			this.billing_data_dictionary = Utils.createDictionary(responses.data, 'id');
			this.updatePrecisionFlag();
		});
	}

	ngOnChanges(changes: SimpleChanges): void
	{
		if (this.order_info?.order?.client_user_id)
		{
			this.subs.sink = this.rest_address.search
			({
				eq: { user_id: this.order_info.order.client_user_id },
				nn: ['rfc'],
				limit: 9999,
				sort_order: ['id_DESC']
			})
			.subscribe
			({
				error: (error) => console.log(error),
				next: (response) =>
				{
					if (!this.order_info)
						return;

					if (this.order_info.order.client_user_id)
					{
						this.client_address = response.data.find((address) => address.user_id == this.order_info?.order.client_user_id) || null;
					}
					else
					{
						this.client_address = response.data[0] || null;
					}
					this.address_array = response.data;
					this.setData(this.client_address);
					this.updatePrecisionFlag();
				}
			});
		}

		if (changes['payment_info_list'])
		{
			if (this.order_info)
			{
				if (this.payment_info_list.length == 1)
				{
					this.order_info.order.sat_forma_pago = this.getBiggestPaymentMethod(this.payment_info_list[0]);
				}
				else if (this.payment_info_list.length > 0)
				{
					this.order_info.order.sat_forma_pago = '99';
				}
			}
		}

		this.updatePrecisionFlag();
	}

	getBiggestPaymentMethod(payment_info: PaymentInfo): string
	{
		switch (payment_info.movements[0]?.bank_movement?.transaction_type)
		{
			case 'CASH': return '01';
			case 'CHECK': return '02';
			case 'TRANSFER': return '03';
			case 'CREDIT_CARD': return '04';
			case 'DEBIT_CARD': return '28';
		}

		return '01';
	}

	onBillingDataChange(billing_data_id: number)
	{
		if (!this.order_info)
			return;

		if (billing_data_id == null)
		{
			this.order_info.order.sat_codigo_postal = '';
			this.updatePrecisionFlag();
			return;
		}

		this.selected_billing_data = this.billing_data_dictionary[billing_data_id] || null;
		this.order_info.order.sat_codigo_postal = this.selected_billing_data?.zipcode || '';
		this.updatePrecisionFlag();
	}

	getSelectedBillingData(): Billing_Data | null
	{
		let billing_data_id = this.order_info?.order?.billing_data_id;

		if (billing_data_id == null)
			return null;

		return this.billing_data_dictionary[billing_data_id]
			|| this.billing_data_list.find((b) => b.id == billing_data_id)
			|| null;
	}

	updatePrecisionFlag(): void
	{
		this.is_precision_6 = this.getSelectedBillingData()?.precision == 6;
	}

	checkFieldsChanged()
	{
		if (!this.order_info)
			return;

		if (this.client_address)
		{
			this.fields_changed =
				this.order_info.order.sat_razon_social !== this.client_address.name ||
				this.order_info.order.sat_receptor_rfc !== this.client_address.rfc ||
				this.order_info.order.sat_regimen_capital_receptor !== this.client_address.sat_regimen_capital ||
				this.order_info.order.sat_domicilio_fiscal_receptor !== this.client_address.zipcode ||
				this.order_info.order.sat_regimen_fiscal_receptor !== this.client_address.sat_regimen_fiscal ||
				this.order_info.order.sat_receptor_email !== this.client_address.email ||
				this.order_info.order.sat_uso_cfdi !== this.client_address.sat_uso_cfdi;
		}
		else
		{
			this.fields_changed = !!(this.order_info.order.sat_razon_social || this.order_info.order.sat_receptor_rfc);
		}
	}

	changeAddress(razon_social: string)
	{
		if (!razon_social || !this.address_array.length)
			return;

		this.client_address = this.address_array.find((address) => address.name == razon_social) || null;
		if (this.client_address)
		{
			this.updateData(this.client_address);
		}
	}

	updateData(client_address: Address)
	{
		if (!this.order_info)
			return;

		this.order_info.order.sat_receptor_rfc = client_address.rfc ? client_address.rfc : '';
		this.order_info.order.sat_razon_social = client_address.name ? client_address.name : '';
		this.order_info.order.sat_receptor_email = client_address.email ? client_address.email : '';
		this.order_info.order.sat_regimen_capital_receptor = client_address.sat_regimen_capital ? client_address.sat_regimen_capital : '';
		this.order_info.order.sat_domicilio_fiscal_receptor = client_address.zipcode ? client_address.zipcode : '';
		this.order_info.order.sat_regimen_fiscal_receptor = client_address.sat_regimen_fiscal ? client_address.sat_regimen_fiscal : '';
		this.order_info.order.sat_uso_cfdi = client_address.sat_uso_cfdi ? client_address.sat_uso_cfdi : '';
	}

	setData(client_address: Address | null)
	{
		if (!this.order_info)
			return;

		if (!this.order_info.order.sat_receptor_rfc && client_address?.rfc)
		{
			this.order_info.order.sat_receptor_rfc = client_address.rfc;
		}

		if (!this.order_info.order.sat_codigo_postal && this.order_info?.store?.zipcode)
		{
			this.order_info.order.sat_codigo_postal = this.order_info.store.zipcode;
		}

		if (!this.order_info.order.sat_razon_social && client_address?.name)
		{
			this.order_info.order.sat_razon_social = client_address.name;
		}

		if (!this.order_info.order?.sat_receptor_email && client_address?.email)
		{
			this.order_info.order.sat_receptor_email = client_address.email;
		}

		if (!this.order_info?.order?.sat_regimen_capital_receptor && client_address?.sat_regimen_capital)
		{
			this.order_info.order.sat_regimen_capital_receptor = client_address.sat_regimen_capital;
		}

		if (!this.order_info.order?.sat_domicilio_fiscal_receptor && client_address?.zipcode)
		{
			this.order_info.order.sat_domicilio_fiscal_receptor = client_address.zipcode;
		}

		if (!this.order_info.order?.sat_regimen_fiscal_receptor && client_address?.sat_regimen_fiscal)
		{
			this.order_info.order.sat_regimen_fiscal_receptor = client_address.sat_regimen_fiscal;
		}

		if (!this.order_info.order?.sat_uso_cfdi && client_address?.sat_uso_cfdi)
		{
			this.order_info.order.sat_uso_cfdi = client_address.sat_uso_cfdi;
		}

		if (!this.order_info.order.sat_serie)
		{
			this.subs.sink = this.rest_store
			.get(this.order_info.order.store_id)
			.subscribe((store) =>
			{
				if (this.order_info)
				{
					this.order_info.order.sat_serie = store.default_sat_serie;
				}
			});
		}

		if (this.order_info.order.billing_data_id && !this.order_info.order.sat_codigo_postal && this.billing_data_list.length > 0)
		{
			this.order_info.order.sat_codigo_postal = this.billing_data_dictionary[this.order_info.order.billing_data_id]
				? this.billing_data_dictionary[this.order_info.order.billing_data_id].zipcode
				: '';
		}
	}

	cancel()
	{
		this.onFinish.emit(false);
	}

	save(evt: Event)
	{
		if (!this.order_info)
			return;

		if (this.order_info.order.billing_data_id == null)
		{
			this.showError('Por favor selecciona los datos de facturacion');
			evt.preventDefault();
			evt.stopPropagation();
			return;
		}

		if (this.update_address)
		{
			if (this.client_address)
			{
				this.client_address.name = this.order_info.order.sat_razon_social || '';
				this.client_address.rfc = this.order_info.order.sat_receptor_rfc;
				this.client_address.email = this.order_info.order.sat_receptor_email;
				this.client_address.sat_regimen_capital = this.order_info.order.sat_regimen_capital_receptor;
				this.client_address.zipcode = this.order_info.order.sat_domicilio_fiscal_receptor;
				this.client_address.sat_regimen_fiscal = this.order_info.order.sat_regimen_fiscal_receptor;
				this.client_address.sat_uso_cfdi = this.order_info.order.sat_uso_cfdi;

				this.subs.sink = this.rest_address.update(this.client_address).subscribe();
			}
			else if (this.order_info.order.client_user_id)
			{
				const new_address: Address = {
					...GetEmpty.address(),
					user_id: this.order_info.order.client_user_id,
					name: this.order_info.order.sat_razon_social || '',
					rfc: this.order_info.order.sat_receptor_rfc,
					email: this.order_info.order.sat_receptor_email,
					sat_regimen_capital: this.order_info.order.sat_regimen_capital_receptor,
					zipcode: this.order_info.order.sat_domicilio_fiscal_receptor,
					sat_regimen_fiscal: this.order_info.order.sat_regimen_fiscal_receptor,
					sat_uso_cfdi: this.order_info.order.sat_uso_cfdi,
					type: 'BILLING'
				};

				this.subs.sink = this.rest_address.create(new_address).subscribe
				({
					next: data => { this.client_address = data; },
					error: error => { this.showError(error); }
				});
			}
		}

		this.showWarning('Facturando por favor espere');
		this.is_loading = true;

		let order_info = this.order_info;

		if (this.payment_mode && this.selected_payment)
		{
			let selected_payment = this.selected_payment;
			this.subs.sink = this.rest.updateDatosFacturacion(order_info.order)
			.pipe
			(
				mergeMap(() =>
				{
					let payment = selected_payment.payment;
					let payload =
					{
						payment_id: payment.id,
						email: order_info.order.sat_receptor_email || undefined,
						fecha_de_pago: null,
						sat_serie: order_info.order.sat_serie || undefined,
						transaccion: 'pago-' + Date.now(),
						folio: 'FROM_PAYMENT'
					};

					if (order_info.order.facturacion_mode == 'PER_PAYMENT' || !(order_info.sat_factura || order_info.order.sat_factura_id))
					{
						return this.rest.facturarPagoComun(payload);
					}

					return this.rest.updatePath('facturar_pago', payload);
				})
			)
			.subscribe
			({
				error: (error) => this.showError(error),
				next: (_response) =>
				{
					this.is_loading = false;
					this.onFinish.emit(true);
					this.showSuccess('Se facturo el pago correctamente');
				}
			});
			return;
		}

		this.subs.sink = this.rest.updateDatosFacturacion(order_info.order)
		.pipe
		(
			mergeMap(() =>
			{
				let request: FacturacionRequest = {
					facturacion_code: order_info.order.facturacion_code || '',
					razon_social: order_info.order.sat_razon_social || '',
					email: order_info.order.sat_receptor_email || '',
					rfc: order_info.order.sat_receptor_rfc || '',
					domicilio_fiscal: order_info.order.sat_domicilio_fiscal_receptor || '',
					lugar_de_expedicion: '',
					forma_de_pago: order_info.order.sat_forma_pago || undefined,
					regimen_fiscal: order_info.order.sat_regimen_fiscal_receptor || '',
					regimen_capital: order_info.order.sat_regimen_fiscal_receptor || '',
					uso_cfdi: order_info.order.sat_uso_cfdi || '',
					version: this.version,
					note: order_info.order.note || '',
					apply_rounding_discount_adjustment: this.is_precision_6 ? false : this.apply_rounding_discount_adjustment
				};

				if (order_info.order.facturacion_mode === 'PER_PAYMENT')
				{
					return this.rest.httpPost('facturacion_request_per_payment.php', request);
				}

				return this.rest_facturacion_request.create(request);
			})
		)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (_response) =>
			{
				this.is_loading = false;
				this.onFinish.emit(true);
				this.showSuccess('Se facturo la orden correctamente');
			}
		});
	}

	updateSatSerie(value: string)
	{
		if (this.order_info)
		{
			this.order_info.order.sat_serie = value;
		}
	}
}
