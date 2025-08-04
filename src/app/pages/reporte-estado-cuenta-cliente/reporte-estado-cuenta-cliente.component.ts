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

	closed_orders: OrderInfo[] = [];
	payments_received: PaymentInfo[] = [];
	pending_orders: OrderInfo[] = [];
	unique_orders: OrderInfo[] = [];

	rest_order: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order');
	rest_payment: Rest<Payment, Payment> = this.rest.initRest<Payment, Payment>('payment');
	user_info: Rest<User, User> = this.rest.initRest<User, User>('user');
    rest_payment_info: Rest<Payment, PaymentInfo> = this.rest.initRest<Payment, PaymentInfo>('payment_info');

	ngOnInit(): void {
		this.path = '/reporte-estado-cuenta-cliente';
		this.sink = this.getParamsAndQueriesObservable().pipe
		(
			mergeMap(params => {
				this.setTitle('Reporte de Estado de Cuenta de Cliente');
				this.start_date = params.query.has('start_date') ? new Date(params.query.get('start_date')!) : new Date();
				this.end_date = params.query.has('end_date') ? new Date(params.query.get('end_date')!) : new Date();

				const client_user_id = params.query.get('client_user_id');

				if(this.start_date && this.end_date && !params.query.has('start_date')){
					this.start_date.setDate(this.start_date.getDate() - 30);
				}

				if (client_user_id) {
					this.is_loading = true;
					return this.user_info.get(client_user_id).pipe(
						mergeMap(user => {
							this.selectedClient = user as User;
							return this.fetchData(this.selectedClient.id, this.start_date, this.end_date);
						})
					);
				} else {
					this.selectedClient = null;
					this.closed_orders = [];
					this.payments_received = [];
					this.pending_orders = [];
					this.unique_orders = [];
					return of(null);
				}
			})
		).subscribe(response =>
		{
			if (response) {
				this.closed_orders = response.closed_orders.data;
				this.payments_received = response.payments_received.data;
				this.pending_orders = response.pending_orders.data;
				this.createUniqueOrderList();
			}
			this.is_loading = false;
		}, error => {
			this.showError(error);
			this.is_loading = false;
		});
	}

	fetchData(user_id: number | null, startDate: Date | null, endDate: Date | null) {
		return forkJoin
		({
			closed_orders: this.getClosedOrders(user_id, startDate, endDate),
			payments_received: this.getPaymentsReceived(user_id, startDate, endDate),
			pending_orders: this.getPendingOrders(user_id)
		});
	}

	getClosedOrders(user_id: number | null, startDate: Date | null, endDate: Date | null): Observable<RestResponse<OrderInfo>> {
		return this.rest_order.search({
			eq: { client_user_id: user_id, status: 'CLOSED' },
			ge: { created: startDate || undefined },
			le: { created: endDate || undefined }
		});
	}

	getPaymentsReceived(user_id: number | null, startDate: Date | null, endDate: Date | null): Observable<RestResponse<PaymentInfo>> {
		return this.rest_payment_info.search({
			eq: { paid_by_user_id: user_id, type: 'income' },
			ge: { created: startDate || undefined },
			le: { created: endDate || undefined }
		});
	}

	getPendingOrders(user_id: number | null): Observable<RestResponse<OrderInfo>> {
		return this.rest_order.search({
			eq: { client_user_id: user_id, status: 'PENDING' }
		});
	}

	createUniqueOrderList() {
		const all_orders = [...this.closed_orders, ...this.pending_orders];
		const order_map = new Map<number, OrderInfo>();

		all_orders.forEach(order => {
			if (order.order && order.order.id && !order_map.has(order.order.id)) {
				order_map.set(order.order.id, order);
			}
		});

		this.unique_orders = Array.from(order_map.values());
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
