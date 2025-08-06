import { Component, Injector, OnInit } from '@angular/core';
import { RestService } from '../../modules/shared/services/rest.service';
import { Order, Payment, User } from '../../modules/shared/RestModels';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rest, RestResponse } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, Observable, of } from 'rxjs';
import { SearchUsersComponent } from '../../components/search-users/search-users.component';
import { LoadingComponent } from '../../components/loading/loading.component';
import { mergeMap } from 'rxjs/operators';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { OrderInfo, PaymentInfo } from '../../modules/shared/Models';

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
	imports: [CommonModule, FormsModule, SearchUsersComponent, LoadingComponent],
	templateUrl: './reporte-estado-cuenta-cliente.component.html',
	styleUrl: './reporte-estado-cuenta-cliente.component.css'
})
export class ReporteEstadoCuentaClienteComponent extends BaseComponent implements OnInit {

	start_date: Date | null = null;
	end_date: Date | null = null;
	selectedClient: User | null = null;

	report_items: ReporteItem[] = [];
	unique_orders: OrderInfo[] = [];

	rest_order: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order');
	rest_payment: Rest<Payment, Payment> = this.rest.initRest<Payment, Payment>('payment');
	user_info: Rest<User, User> = this.rest.initRest<User, User>('user');
	rest_payment_info: Rest<Payment, PaymentInfo> = this.rest.initRest<Payment, PaymentInfo>('payment_info');

	ngOnInit(): void {
		this.path = '/reporte-estado-cuenta-cliente';
		this.sink = this.getParamsAndQueriesObservable().pipe
		(
			mergeMap(params =>
			{
				this.setTitle('Reporte de Estado de Cuenta de Cliente');
				this.start_date = params.query.has('start_date') ? new Date(params.query.get('start_date')!) : new Date();
				this.end_date = params.query.has('end_date') ? new Date(params.query.get('end_date')!) : new Date();

				const client_user_id = parseInt( params.query.get('client_user_id') as string) as number;

				if(this.start_date && this.end_date && !params.query.has('start_date'))
				{
					this.start_date.setDate(this.start_date.getDate() - 30);
				}

				this.is_loading = true;
				return this.fetchData(client_user_id, this.start_date, this.end_date);
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
					})
				});
			})
		)
		.subscribe
		({
			error:(error:any) =>this.showError(error),
			next: response =>
			{
				this.selectedClient = response.client_user;
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
		let all_orders = new Map<number, OrderInfo>();

		for(let oi of closed_order_info)
		{
			all_orders.set(oi.order.id, oi);
		}

		for(let pi of payments_to_orders)
		{
			all_orders.set(pi.order.id, pi);
		}

		return Array.from(all_orders.values());
	}

	generateReport(orders: OrderInfo[], payments: PaymentInfo[]): ReporteItem[] {
		let items: ReporteItem[] = [];
		let saldo = 0;

		for (let order_info of orders) {
			saldo += order_info.order.total;
			items.push({
				fecha: order_info.order.closed_timestamp as Date,
				folio: order_info.order.id,
				concepto: 'Venta',
				forma_pago: '',
				metodo_pago: '',
				cargo: order_info.order.total,
				abono: 0,
				saldo: saldo,
				dias_vencimiento: 0
			});

			/*
			for (let movement of order_info.movements) {
				for (let bank_movement_order of movement.bank_movement_orders) {
					saldo -= bank_movement_order.total;
					items.push({
						fecha: movement.bank_movement.created,
						folio: order_info.order.id,
						concepto: 'Abono',
						forma_pago: movement.bank_movement.payment_method,
						metodo_pago: movement.bank_movement.payment_type,
						cargo: 0,
						abono: bank_movement_order.total,
						saldo: saldo,
						dias_vencimiento: 0
					});
				}
			}
			*/
		}

		items.sort((a, b) => {
			if (a.folio < b.folio) return -1;
			if (a.folio > b.folio) return 1;
			if (a.fecha < b.fecha) return -1;
			if (a.fecha > b.fecha) return 1;
			return 0;
		});

		return items;
	}

	doSearch() {
		const queryParams: any = {};

		if (this.start_date) {
			queryParams.start_date = this.start_date.toISOString().split('T')[0];
		}
		if (this.end_date) {
			queryParams.end_date = this.end_date.toISOString().split('T')[0];
		}
		if (this.selectedClient) {
			queryParams.client_user_id = this.selectedClient.id;
		}
		this.router.navigate([this.path], { queryParams });
	}
}
