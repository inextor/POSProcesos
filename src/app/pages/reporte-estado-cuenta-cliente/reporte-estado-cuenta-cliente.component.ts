import { Component, OnInit } from '@angular/core';
import { Address, Billing_Data, Order, Payment, Preferences, Store, User } from '../../modules/shared/RestModels';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rest } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, of } from 'rxjs';
import { LoadingComponent } from '../../components/loading/loading.component';
import { map, mergeMap } from 'rxjs/operators';
import { OrderInfo, PaymentInfo } from '../../modules/shared/Models';
import { environment } from '../../../environments/environment';
import { Utils } from '../../modules/shared/Utils';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

interface ReporteItem {
	fecha: Date;
	folio: number;
	concepto: string;
	forma_pago: string;
	metodo_pago: string;
	cargo: number;
	abono: number;
	saldo: number;
	dias_vencimiento: number;
	type: 'order' | 'payment';
}

const DIAS_CREDITO = 30;
//Una venta liquidada antes de estas horas despues de cerrarse se reporta como Contado
const HORAS_CONTADO = 8;
const MS_POR_HORA = 60 * 60 * 1000;

@Component({
	selector: 'app-reporte-estado-cuenta-cliente',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent, ShortDatePipe],
	templateUrl: './reporte-estado-cuenta-cliente.component.html',
	styleUrl: './reporte-estado-cuenta-cliente.component.css'
})
export class ReporteEstadoCuentaClienteComponent extends BaseComponent implements OnInit
{
	start_date: string = '';
	end_date: string = '';

	client_user: User | null = null;
	billing_address: Address | null = null;
	billing_address_full: string = '';
	store: Store | null = null;
	store_address: string = '';
	billing_data: Billing_Data | null = null;
	preferences: Preferences | null = null;
	logo_url: string = '';
	emission_date: Date = new Date();

	report_item_array: ReporteItem[] = [];
	saldo_inicial: number = 0;
	total_cargos: number = 0;
	total_abonos: number = 0;
	saldo_final: number = 0;

	rest_order_info: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order_info');
	rest_payment_info: Rest<Payment, PaymentInfo> = this.rest.initRest<Payment, PaymentInfo>('payment_info');
	rest_user: Rest<User, User> = this.rest.initRest<User, User>('user');
	rest_address: Rest<Address, Address> = this.rest.initRest<Address, Address>('address');
	rest_store: Rest<Store, Store> = this.rest.initRest<Store, Store>('store');
	rest_billing_data: Rest<Billing_Data, Billing_Data> = this.rest.initRest<Billing_Data, Billing_Data>('billing_data');
	rest_preferences: Rest<Preferences, Preferences> = this.rest.initRest<Preferences, Preferences>('preferences');

	ngOnInit(): void {
		this.path = '/reporte-estado-cuenta-cliente';
		this.setTitle('Reporte de Estado de Cuenta de Cliente');

		this.subs.sink = this.getParamsAndQueriesObservable().pipe
		(
			mergeMap(params =>
			{
				let start = new Date();

				start.setDate(1);
				start.setHours(0,0,0,0);

				this.start_date = (params.query.get('start_date') || Utils.getLocalMysqlStringFromDate(start)).substring(0,10);
				this.end_date = (params.query.get('end_date') || Utils.getLocalMysqlStringFromDate(Utils.getEndOfMonth(start))).substring(0,10);

				const client_user_id = parseInt(params.query.get('client_user_id') as string);
				const start_date = Utils.getDateFromLocalMysqlString(this.start_date+' 00:00:00');
				const end_date = Utils.getDateFromLocalMysqlString(this.end_date+' 23:59:59');
				const store_id = this.rest.user?.store_id;

				if( store_id == null )
				{
					this.showError('No tienes configurado una sucursal, por favor habla con tu administrador');
				}

				this.is_loading = true;

				return forkJoin
				({
					client_user: this.rest_user.get(client_user_id),
					order_info: this.rest_order_info.search({
						eq: { client_user_id: client_user_id, status: 'CLOSED' },
						ge: { closed_timestamp: start_date },
						le: { closed_timestamp: end_date },
						limit: 999999
					}),
					//Sin limit el backend regresa solo 20 pagos y se perderian abonos
					payment_info: this.rest_payment_info.search({
						eq: { paid_by_user_id: client_user_id, type: 'income' },
						ge: { created: start_date },
						le: { created: end_date },
						limit: 999999
					}),
					store: store_id ? this.rest_store.get(store_id) : of(null),
					preferences: this.rest_preferences.get(1),
					balance: this.rest.getReportByPath('getBalance', { to_date: Utils.getLocalMysqlStringFromDate(start_date), client_user_id: client_user_id })
				});
			}),
			//billing_data y billing_address solo dependen del bloque anterior: se piden en paralelo
			mergeMap(response =>
			{
				const billing_data_id = response.store?.default_billing_data_id;
				const billing_address_id = response.client_user.default_billing_address_id;

				return forkJoin
				({
					billing_data: billing_data_id ? this.rest_billing_data.get(billing_data_id) : of(null),
					billing_address: billing_address_id ? this.rest_address.get(billing_address_id) : of(null)
				})
				.pipe(map(billing => ({ ...response, ...billing })));
			})
		)
		.subscribe
		({
			error:(error:any) =>this.showError(error),
			next: response =>
			{
				this.client_user = response.client_user;
				this.store = response.store;
				this.preferences = response.preferences;
				this.billing_data = response.billing_data;
				this.billing_address = response.billing_address;
				this.store_address = this.formatStoreAddress(response.store);
				this.billing_address_full = this.formatBillingAddress(response.billing_address);
				this.logo_url = response.preferences.logo_image_id ? this.rest.getImagePath(response.preferences.logo_image_id) : '';
				this.emission_date = new Date();
				this.saldo_inicial = Number(response.balance?.balance) || 0;
				this.report_item_array = this.generateReport(response.order_info.data, response.payment_info.data);
				this.calculateTotals();
				this.is_loading = false;
			}
		});
	}

	generateReport(order_info_array: OrderInfo[], payment_info_array: PaymentInfo[]): ReporteItem[] {
		const report_item_array: ReporteItem[] = [];
		const last_payment_by_order = new Map<number, Date>();

		for (const order_info of order_info_array) {
			report_item_array.push({
				fecha: order_info.order.closed_timestamp as Date,
				folio: order_info.order.id,
				concepto: 'Venta',
				forma_pago: '',
				metodo_pago: '',
				cargo: order_info.order.total,
				abono: 0,
				saldo: 0,
				dias_vencimiento: 0,
				type: 'order'
			});
		}

		for (const payment_info of payment_info_array) {
			const created = payment_info.payment.created;

			for (const movement of payment_info.movements) {
				const forma_pago = this.getPaymentMethodName(movement.bank_movement.transaction_type);

				for (const bank_movement_order of movement.bank_movement_orders) {
					report_item_array.push({
						fecha: created,
						folio: bank_movement_order.order_id,
						concepto: 'Abono',
						forma_pago: forma_pago,
						metodo_pago: '',
						cargo: 0,
						abono: bank_movement_order.amount,
						saldo: 0,
						dias_vencimiento: 0,
						type: 'payment'
					});

					const last_payment = last_payment_by_order.get(bank_movement_order.order_id);

					if (!last_payment || created > last_payment)
						last_payment_by_order.set(bank_movement_order.order_id, created);
				}
			}
		}

		// Por folio y luego por fecha: cada venta queda seguida de sus abonos
		report_item_array.sort((a, b) => a.folio - b.folio || a.fecha.getTime() - b.fecha.getTime());

		const order_by_id = new Map(order_info_array.map(order_info => [order_info.order.id, order_info.order]));
		const today = new Date();
		let saldo = this.saldo_inicial;

		for (const item of report_item_array) {
			saldo += item.cargo - item.abono;
			item.saldo = saldo;

			const order = order_by_id.get(item.folio);

			if (item.type != 'order' || !order)
				continue;

			const closed_timestamp = order.closed_timestamp as Date;

			if (order.amount_paid < order.total) {
				item.metodo_pago = 'Crédito';

				const fecha_vencimiento = new Date(closed_timestamp);
				fecha_vencimiento.setDate(fecha_vencimiento.getDate() + DIAS_CREDITO);

				if (today > fecha_vencimiento)
					item.dias_vencimiento = Math.ceil((today.getTime() - fecha_vencimiento.getTime()) / (24 * MS_POR_HORA));
			} else {
				const last_payment = last_payment_by_order.get(item.folio);

				if (last_payment)
					item.metodo_pago = last_payment.getTime() - closed_timestamp.getTime() < HORAS_CONTADO * MS_POR_HORA ? 'Contado' : 'Crédito';
			}
		}

		return report_item_array;
	}

	getPaymentMethodName(transaction_type:string):string
	{
		switch(transaction_type)
		{
			case 'CASH': return 'Efectivo';
			case 'CREDIT_CARD': return 'Tarjeta de Crédito';
			case 'DEBIT_CARD': return 'Tarjeta de Débito';
			case 'CHECK': return 'Cheque';
			case 'COUPON': return 'Cupón';
			case 'TRANSFER': return 'Transferencia';
			case 'DISCOUNT': return 'Descuento';
			case 'RETURN_DISCOUNT': return 'Descuento por Devolución';
			case 'PAYPAL': return 'Transferencia';
			case 'DIGITAL_WALLET': return 'Monedero';
		}
		return transaction_type;
	}

	calculateTotals() {
		this.total_cargos = this.report_item_array.reduce((total, item) => total + item.cargo, 0);
		this.total_abonos = this.report_item_array.reduce((total, item) => total + item.abono, 0);
		this.saldo_final = this.saldo_inicial + this.total_cargos - this.total_abonos;
	}

	doSearch() {
		const query_params: any = {};

		if (this.start_date) {
			query_params.start_date = this.start_date;
		}
		if (this.end_date) {
			query_params.end_date = this.end_date;
		}
		if (this.client_user) {
			query_params.client_user_id = this.client_user.id;
		}
		this.router.navigate([this.path], { queryParams: query_params });
	}

	downloadPdf() {
		const element = document.getElementById('to_pdf');

		if (!element)
			return;

		const download_name = `estado-de-cuenta-${this.client_user?.name}.pdf`;
		const payload = {
			html: element.innerHTML,
			orientation: 'P', // P for Portrait
			default_font_size: 10,
			download_name: download_name
		};
		const url = `${environment.app_settings.pdf_service_url}/index.php`;

		this.subs.sink = this.rest.callPostApi(url, payload, { responseType: 'blob' }).subscribe
		({
			error:(error:any)=>this.showError(error),
			next:(response:any) =>
			{
				const blob_url = window.URL.createObjectURL(new Blob([response], { type: 'application/pdf' }));
				const link = document.createElement('a');
				link.href = blob_url;
				link.download = download_name;
				document.body.appendChild(link);
				link.click();
				window.URL.revokeObjectURL(blob_url);
				document.body.removeChild(link);
			}
		});
	}

	formatStoreAddress(store: Store | null): string {
		if (!store) {
			return '';
		}
		const address_parts = [store.address, store.city, store.state, store.zipcode];
		return address_parts.filter(part => part).join(', ');
	}

	//Solo se muestra cuando la direccion de facturacion esta completa
	formatBillingAddress(address: Address | null): string {
		if (!address?.rfc || !address.address || !address.city || !address.state || !address.zipcode) {
			return '';
		}
		return `${address.address}, ${address.city}, ${address.state}, C.P. ${address.zipcode}`;
	}
}
