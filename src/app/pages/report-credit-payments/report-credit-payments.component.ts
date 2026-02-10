import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Store, User } from '../../modules/shared/RestModels';
import { forkJoin, Observable, of } from 'rxjs';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

interface CreditPaymentRecord {
	payment_id: number;
	payment_amount: string;
	received_amount: string;
	payment_created: string;
	concept: string | null;
	created_by_user_id: number;
	bank_movement_id: number;
	transaction_type: string;
	bank_movement_total: string;
	reference: string | null;
	paid_date: string;
	bank_movement_order_id: number;
	amount_applied: string;
	currency_amount: string;
	order_id: number;
	order_total: string;
	order_discount: string;
	order_closed_timestamp: string;
	client_user_id: number;
	store_id: number;
	client_name: string;
	store_name: string;
	order_local_date: string;
	payment_local_date: string;
	days_difference: number;
}

interface CreditPaymentResponse {
	total_records: number;
	total_amount: number;
	offset_minutes: number;
	data: CreditPaymentRecord[];
}

interface CreditPaymentRequest {
	start_date?: string;
	end_date?: string;
	client_user_id?: number;
	store_id?: number;
}

@Component({
	selector: 'app-report-credit-payments',
	templateUrl: './report-credit-payments.component.html',
	styleUrl: './report-credit-payments.component.css',
	imports: [CommonModule, FormsModule, ShortDatePipe],
})
export class ReportCreditPaymentsComponent extends BaseComponent implements OnInit
{
	credit_payment_search: SearchObject<CreditPaymentRequest> = this.getEmptySearch();
	credit_payment_list: CreditPaymentRecord[] = [];
	start_date: string = '';
	end_date: string = '';

	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name', 'created', 'updated']);
	rest_user: RestSimple<User> = this.rest.initRestSimple('user', ['id', 'name', 'type']);

	stores: Store[] = [];
	clients: User[] = [];

	total_records: number = 0;
	total_amount: number = 0;

	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';

	get totalAmountApplied(): number
	{
		return this.credit_payment_list.reduce((sum, item) => sum + parseFloat(item.amount_applied || '0'), 0);
	}

	get totalOrderAmount(): number
	{
		return this.credit_payment_list.reduce((sum, item) => sum + parseFloat(item.order_total || '0'), 0);
	}

	get avgDaysDifference(): number
	{
		if (this.credit_payment_list.length === 0) return 0;
		const totalDays = this.credit_payment_list.reduce((sum, item) => sum + (item.days_difference || 0), 0);
		return totalDays / this.credit_payment_list.length;
	}

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				let store_obs = this.stores.length
					? of({total: this.stores.length, data: this.stores})
					: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 999999 });

				let client_obs = this.clients.length
					? of({total: this.clients.length, data: this.clients})
					: this.rest_user.search({ eq: { status: 'ACTIVE', type: 'CLIENT' }, limit: 999999 });

				return forkJoin
				({
					stores: store_obs,
					clients: client_obs,
					param_map: of(param_map),
				})
			}),
			mergeMap((response) =>
			{
				this.stores = response.stores.data;
				this.clients = response.clients.data;

				let param_map = response.param_map;

				this.setTitle('Reporte de Pagos a Crédito');
				this.path = '/report-credit-payments';
				this.is_loading = true;

				this.credit_payment_search = this.getSearch(param_map, ['store_id', 'client_user_id', 'start_date', 'end_date']);

				let start: Date;
				let end: Date;

				if (this.credit_payment_search.eq.start_date)
				{
					start = Utils.getDateFromLocalMysqlString(this.credit_payment_search.eq.start_date as unknown as string);
				}
				else
				{
					start = new Date();
					start.setDate(1);
					start.setHours(0, 0, 0, 0);
				}

				if (this.credit_payment_search.eq.end_date)
				{
					end = Utils.getDateFromLocalMysqlString(this.credit_payment_search.eq.end_date as unknown as string);
				}
				else
				{
					end = new Date();
					end.setHours(23, 59, 59, 0);
				}

				this.start_date = Utils.getLocalMysqlStringFromDate(start).substring(0, 10);
				this.end_date = Utils.getLocalMysqlStringFromDate(end).substring(0, 10);

				const offset_minutes = new Date().getTimezoneOffset();

				const query: Record<string, any> = {
					offset_minutes: offset_minutes,
					start_date: this.start_date,
					end_date: this.end_date,
				};

				if (this.credit_payment_search.eq.store_id)
				{
					query['store_id'] = this.credit_payment_search.eq.store_id;
				}

				if (this.credit_payment_search.eq.client_user_id)
				{
					query['client_user_id'] = this.credit_payment_search.eq.client_user_id;
				}

				return this.rest.getReportByPath('getCreditPaymentsToOrders', query) as Observable<CreditPaymentResponse>;
			})
		)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (response) =>
			{
				this.credit_payment_list = response.data;
				this.total_records = response.total_records;
				this.total_amount = response.total_amount;
				this.is_loading = false;
			}
		});
	}

	performSearch()
	{
		this.credit_payment_search.eq.start_date = this.start_date as any;
		this.credit_payment_search.eq.end_date = this.end_date as any;
		super.search(this.credit_payment_search);
	}

	getExternalLink(path: string, id: number): string
	{
		return `${this.rest.getExternalAppUrl()}/#/${path}/${id}`;
	}

	getPaymentMethodName(transaction_type: string): string
	{
		switch(transaction_type)
		{
			case 'CASH': return 'Efectivo';
			case 'CREDIT_CARD': return 'Tarjeta de Crédito';
			case 'DEBIT_CARD': return 'Tarjeta de Débito';
			case 'CHECK': return 'Cheque';
			case 'TRANSFER': return 'Transferencia';
			case 'COUPON': return 'Cupón';
			case 'RETURN_DISCOUNT': return 'Descuento por Devolución';
			case 'PAYPAL': return 'Transferencia';
		}
		return transaction_type;
	}

	sortBy(column: string)
	{
		if (this.sortColumn === column)
		{
			this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
		}
		else
		{
			this.sortColumn = column;
			this.sortDirection = 'asc';
		}

		this.credit_payment_list.sort((a, b) =>
		{
			let aValue: any;
			let bValue: any;

			switch (column)
			{
				case 'payment_id':
					aValue = a.payment_id;
					bValue = b.payment_id;
					break;
				case 'order_id':
					aValue = a.order_id;
					bValue = b.order_id;
					break;
				case 'client_name':
					aValue = a.client_name?.toLowerCase() || '';
					bValue = b.client_name?.toLowerCase() || '';
					break;
				case 'store_name':
					aValue = a.store_name?.toLowerCase() || '';
					bValue = b.store_name?.toLowerCase() || '';
					break;
				case 'order_total':
					aValue = parseFloat(a.order_total) || 0;
					bValue = parseFloat(b.order_total) || 0;
					break;
				case 'amount_applied':
					aValue = parseFloat(a.amount_applied) || 0;
					bValue = parseFloat(b.amount_applied) || 0;
					break;
				case 'order_local_date':
					aValue = a.order_local_date || '';
					bValue = b.order_local_date || '';
					break;
				case 'payment_local_date':
					aValue = a.payment_local_date || '';
					bValue = b.payment_local_date || '';
					break;
				case 'days_difference':
					aValue = a.days_difference || 0;
					bValue = b.days_difference || 0;
					break;
				case 'transaction_type':
					aValue = a.transaction_type?.toLowerCase() || '';
					bValue = b.transaction_type?.toLowerCase() || '';
					break;
				default:
					return 0;
			}

			if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
			if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	}
}
