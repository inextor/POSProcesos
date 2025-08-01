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
import { OrderInfo } from '../../modules/shared/Models';

@Component({
	selector: 'app-reporte-estado-cuenta-cliente',
	standalone: true,
	imports: [CommonModule, FormsModule, SearchUsersComponent, LoadingComponent],
	templateUrl: './reporte-estado-cuenta-cliente.component.html',
	styleUrl: './reporte-estado-cuenta-cliente.component.css'
})
export class ReporteEstadoCuentaClienteComponent extends BaseComponent implements OnInit {

	constructor(injector: Injector) {
		super(injector);
	}

	startDate: Date | null = null;
	endDate: Date | null = null;
	selectedClient: User | null = null;

	closedOrders: OrderInfo[] = [];
	paymentsReceived: Payment[] = [];
	pendingOrders: OrderInfo[] = [];
	uniqueOrders: OrderInfo[] = [];

	rest_order: Rest<Order, OrderInfo> = this.rest.initRest<Order, OrderInfo>('order');
	rest_payment: Rest<Payment, Payment> = this.rest.initRest<Payment, Payment>('payment');
	user_info: Rest<User, User> = this.rest.initRest<User, User>('user');

	ngOnInit(): void {
		this.path = '/reporte-estado-cuenta-cliente';
		this.sink = this.getParamsAndQueriesObservable().pipe
		(
			mergeMap(params => {
				this.startDate = params.query.has('start_date') ? new Date(params.query.get('start_date')!) : new Date();
				this.endDate = params.query.has('end_date') ? new Date(params.query.get('end_date')!) : new Date();

				const clientId = params.query.get('client_user_id');

				if(this.startDate && this.endDate && !params.query.has('start_date')){
					this.startDate.setDate(this.startDate.getDate() - 30);
				}

				if (clientId) {
					this.is_loading = true;
					return this.user_info.get(clientId).pipe(
						mergeMap(user => {
							this.selectedClient = user as User;
							return this.fetchData(this.selectedClient.id, this.startDate, this.endDate);
						})
					);
				} else {
					this.selectedClient = null;
					this.closedOrders = [];
					this.paymentsReceived = [];
					this.pendingOrders = [];
					this.uniqueOrders = [];
					return of(null);
				}
			})
		).subscribe(response => {
			if (response) {
				this.closedOrders = response.closedOrders.data;
				this.paymentsReceived = response.paymentsReceived.data;
				this.pendingOrders = response.pendingOrders.data;
				this.createUniqueOrderList();
			}
			this.is_loading = false;
		}, error => {
			this.showError(error);
			this.is_loading = false;
		});
	}

	fetchData(user_id: number | null, startDate: Date | null, endDate: Date | null) {
		return forkJoin({
			closedOrders: this.getClosedOrders(user_id, startDate, endDate),
			paymentsReceived: this.getPaymentsReceived(user_id, startDate, endDate),
			pendingOrders: this.getPendingOrders(user_id)
		});
	}

	getClosedOrders(user_id: number | null, startDate: Date | null, endDate: Date | null): Observable<RestResponse<OrderInfo>> {
		return this.rest_order.search({
			eq: { client_user_id: user_id, status: 'CLOSED' },
			ge: { created: startDate || undefined },
			le: { created: endDate || undefined }
		});
	}

	getPaymentsReceived(user_id: number | null, startDate: Date | null, endDate: Date | null): Observable<RestResponse<Payment>> {
		return this.rest_payment.search({
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
		const allOrders = [...this.closedOrders, ...this.pendingOrders];
		const orderMap = new Map<number, OrderInfo>();
		allOrders.forEach(order => {
			if (order.order && order.order.id && !orderMap.has(order.order.id)) {
				orderMap.set(order.order.id, order);
			}
		});
		this.uniqueOrders = Array.from(orderMap.values());
	}

	doSearch() {
		const queryParams: any = {};
		if (this.startDate) {
			queryParams.start_date = this.startDate.toISOString().split('T')[0];
		}
		if (this.endDate) {
			queryParams.end_date = this.endDate.toISOString().split('T')[0];
		}
		if (this.selectedClient) {
			queryParams.client_user_id = this.selectedClient.id;
		}
		this.router.navigate([this.path], { queryParams });
	}
}
