import { Component, Injector, OnInit } from '@angular/core';
import { RestService } from '../../modules/shared/services/rest.service';
import { Address, Order, Payment, User } from '../../modules/shared/RestModels';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rest, RestResponse } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, Observable, of } from 'rxjs';
import { LoadingComponent } from '../../components/loading/loading.component';
import { mergeMap } from 'rxjs/operators';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { OrderInfo, PaymentInfo } from '../../modules/shared/Models';
import { HttpClient } from '@angular/common/http';
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
}

@Component({
	selector: 'app-reporte-estado-cuenta-cliente',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent, ShortDatePipe],
	templateUrl: './reporte-estado-cuenta-cliente.component.html',
	styleUrl: './reporte-estado-cuenta-cliente.component.css'
})
export class ReporteEstadoCuentaClienteComponent extends BaseComponent implements OnInit {


	start_date: string = '';
	end_date: string = '';

	selectedClient: User | null = null;
	billing_address: Address | null = null;

	report_items: ReporteItem[] = [];
	unique_orders: OrderInfo[] = [];

	rest_order: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order_info');
	rest_payment: Rest<Payment, Payment> = this.rest.initRest<Payment, Payment>('payment');
	user_info: Rest<User, User> = this.rest.initRest<User, User>('user');
	rest_address: Rest<Address, Address> = this.rest.initRest<Address, Address>('address');
	rest_payment_info: Rest<Payment, PaymentInfo> = this.rest.initRest<Payment, PaymentInfo>('payment_info');

	constructor(private http: HttpClient, injector: Injector) { super(injector); }

	ngOnInit(): void {
		this.path = '/reporte-estado-cuenta-cliente';

		this.sink = this.getParamsAndQueriesObservable().pipe
		(
			mergeMap(params =>
			{
				this.setTitle('Reporte de Estado de Cuenta de Cliente');

				let start = new Date();

				start.setDate(1);
				start.setHours(0,0,0,0);

				let end = Utils.getEndOfMonth(start);



				console.log('start'+params.query.get('start_date')+' FOOOOOOOOO');
				console.log('end'+params.query.get('end_date')+' FOOOOOOOOO');

				console.log('start'+Utils.getLocalMysqlStringFromDate(start)+' FOOOOOOOOO');

				this.start_date = (params.query.get('start_date') || Utils.getLocalMysqlStringFromDate(start)).substring(0,10);
				this.end_date = (params.query.get('end_date') || Utils.getLocalMysqlStringFromDate(end)).substring(0,10);


				const client_user_id = parseInt( params.query.get('client_user_id') as string) as number;

				start = Utils.getDateFromLocalMysqlString(this.start_date+' 00:00:00');
				end = Utils.getDateFromLocalMysqlString(this.end_date+' 23:59:59');


				this.is_loading = true;
				return this.fetchData(client_user_id, start, end);
			}),
			mergeMap(response =>
			{
				let orders_ids: number[] = [];

				for(let pi of response.payments_received.data)
				{
					for(let m of pi.movements)
					{
						for(let mo of m.bank_movement_orders)
						{
							orders_ids.push(mo.order_id);
						}
					}
				}

				return forkJoin
				({
					client_user: of( response.client_user ),
					closed_orders: of( response.closed_orders ),
					payments_received: of( response.payments_received ),
					order_info_with_payments: this.rest_order.search
					({
						csv:{ id: orders_ids },
						limit: 99999
					}),
					billing_address: response.client_user.default_billing_address_id ? this.rest_address.get(response.client_user.default_billing_address_id) : of(null)
				});
			})
		)
		.subscribe
		({
			error:(error:any) =>this.showError(error),
			next: response =>
			{
				this.selectedClient = response.client_user;
				this.billing_address = response.billing_address;
				this.unique_orders = this.createUniqueOrderList(response.closed_orders.data, response.order_info_with_payments.data);
				this.report_items = this.generateReport(this.unique_orders, response.payments_received.data);
				this.is_loading = false;
			}
		});
	}

	fetchData(user_id: number | null, start_date: Date | null, end_date: Date | null)
	{
		return forkJoin
		({
			client_user: this.user_info.get(user_id),
			closed_orders: this.getClosedOrders(user_id, start_date, end_date),
			payments_received: this.getPaymentsReceived(user_id, start_date, end_date),
		});
	}

	getClosedOrders(user_id: number | null, start_date: Date | null, end_date: Date | null): Observable<RestResponse<OrderInfo>> {
		return this.rest_order.search({
			eq: { client_user_id: user_id, status: 'CLOSED' },
			ge: { closed_timestamp: start_date },
			le: { closed_timestamp: end_date },
			limit: 999999
		});
	}

	getPaymentsReceived(user_id: number | null, start_date: Date | null, end_date: Date | null): Observable<RestResponse<PaymentInfo>> {
		return this.rest_payment_info.search({
			eq: { paid_by_user_id: user_id, type: 'income' },
			ge: { created: start_date || undefined },
			le: { created: end_date || undefined }
		});
	}

	createUniqueOrderList(closed_order_info:OrderInfo[], payments_to_orders:OrderInfo[]):OrderInfo[]
	{
		console.log('createUniqueOrderList', closed_order_info);
		console.log('create Payments to orders', payments_to_orders);

		let all_orders = new Map<number, OrderInfo>();

		for(let oi of closed_order_info)
		{
			console.log('oi', oi);
			all_orders.set(oi.order.id, oi);
		}

		for(let pi of payments_to_orders)
		{
			all_orders.set(pi.order.id, pi);
		}

		return Array.from(all_orders.values());
	}

	generateReport(orders: OrderInfo[], payments: PaymentInfo[]): ReporteItem[] {
		let all_items: any[] = [];

		// Add orders
		for (const order of orders) {
			all_items.push({
				fecha: order.order.closed_timestamp,
				folio: order.order.id,
				concepto: 'Venta',
				forma_pago: '',
				metodo_pago: '',
				cargo: order.order.total,
				abono: 0,
				type: 'order'
			});
		}

		// Add payments
		for (const payment of payments) {
			for (const movement of payment.movements) {
				for (const bmo of movement.bank_movement_orders) {
					all_items.push({
						fecha: payment.payment.created,
						folio: bmo.order_id,
						concepto: 'Abono',
						forma_pago: this.getPaymentMethodName(movement.bank_movement.transaction_type),
						metodo_pago: '',//movement.bank_movement.payment_type,
						cargo: 0,
						abono: bmo.amount,
						type: 'payment'
					});
				}
			}
		}

		// Sort by folio, then date
		all_items.sort((a, b) => {
			if (a.folio < b.folio) return -1;
			if (a.folio > b.folio) return 1;
			if (a.fecha < b.fecha) return -1;
			if (a.fecha > b.fecha) return 1;
			return 0;
		});

		// Calculate saldo and dias_vencimiento
		let saldo_acumulado = 0;
		const today = new Date();
		const order_info_map = new Map(orders.map(o => [o.order.id, o]));
		const last_payment_map = new Map<number, Date>();

		for (const payment of payments) {
			for (const movement of payment.movements) {
				for (const bmo of movement.bank_movement_orders) {
					last_payment_map.set(bmo.order_id, payment.payment.created);
				}
			}
		}

		return all_items.map(item => {
			saldo_acumulado = saldo_acumulado + item.cargo - item.abono;
			let dias_vencimiento = 0;

			const order_info = order_info_map.get(item.folio);
			if (order_info) {
				const order_is_paid = order_info.order.total <= order_info.order.amount_paid;

				if(item.type === 'order') {
					if (!order_is_paid) {
						item.metodo_pago = 'CREDITO';
						const fecha_vencimiento = new Date(order_info.order.closed_timestamp as Date);
						fecha_vencimiento.setDate(fecha_vencimiento.getDate() + 30); // 30 days credit
						if (today > fecha_vencimiento) {
							const diffTime = today.getTime() - fecha_vencimiento.getTime();
							dias_vencimiento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
						}
					} else {
						const last_payment_date = last_payment_map.get(item.folio);
						if (last_payment_date) {
							const closed_date = new Date(order_info.order.closed_timestamp as Date);
							const diffTime = last_payment_date.getTime() - closed_date.getTime();
							const diffHours = diffTime / (1000 * 60 * 60);
							if (diffHours < 8) {
								item.metodo_pago = 'CONTADO';
							} else {
								item.metodo_pago = 'CREDITO';
							}
						}
					}
				}
			}

			return {
				...item,
				saldo: saldo_acumulado,
				dias_vencimiento: item.type === 'order' ? dias_vencimiento : 0 // Only show for orders
			};
		});
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
		}
		return transaction_type;
	}

	doSearch() {
		const queryParams: any = {};

		if (this.start_date) {
			queryParams.start_date = this.start_date;//.toISOString().split('T')[0];
		}
		if (this.end_date) {
			queryParams.end_date = this.end_date;//.toISOString().split('T')[0];
		}
		if (this.selectedClient) {
			queryParams.client_user_id = this.selectedClient.id;
		}
		this.router.navigate([this.path], { queryParams });
	}

	downloadPdf() {
		const element = document.getElementById('to_pdf');
		if (element) {
			const html = element.innerHTML;
			const payload = {
				html: html,
				orientation: 'P', // P for Portrait
				default_font_size: 10,
				download_name: `estado-de-cuenta-${this.selectedClient?.name}.pdf`
			};

			this.http.post(environment.app_settings.pdf_service_url + '/index.php', payload, { responseType: 'blob' }).subscribe(response => {
				const blob = new Blob([response], { type: 'application/pdf' });
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `estado-de-cuenta-${this.selectedClient?.name}.pdf`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			});
		}
	}
}
