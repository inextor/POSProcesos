import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { forkJoin, of, Observable } from 'rxjs';
import { Utils } from '../../modules/shared/Utils';
import { SearchObject, RestSimple } from '../../modules/shared/services/Rest';
import { Store } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';

interface StorePaymentRecord {
	fecha: string;
	folio: string;
	cliente: string | null;
	concepto: string;
	dc: string;
	monto: number;
	tienda: string | null;
}

interface StorePaymentResponse {
	total_records: number;
	total_amount: number;
	data: StorePaymentRecord[];
}

interface StorePaymentRequest {
	date?: string;
	store_id?: number | null;
}

@Component({
	selector: 'app-report-store-payments',
	templateUrl: './report-store-payments.component.html',
	styleUrl: './report-store-payments.component.css',
	imports: [CommonModule, FormsModule],
})
export class ReportStorePaymentsComponent extends BaseComponent implements OnInit
{
	store_list: Store[] = [];
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name']);
	store_payment_search: SearchObject<StorePaymentRequest> = this.getEmptySearch();
	store_payment_list: StorePaymentRecord[] = [];
	selected_date: string = '';

	total_records: number = 0;
	total_amount: number = 0;

	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				this.setTitle('Reporte de Pagos por Tienda');
				this.path = '/report-store-payments';
				this.is_loading = true;

				this.store_payment_search = this.getSearch(param_map, ['date', 'store_id']);

				let selected: Date;

				if (this.store_payment_search.eq.date)
				{
					selected = Utils.getDateFromLocalMysqlString(this.store_payment_search.eq.date as unknown as string);
				}
				else
				{
					selected = new Date();
				}

				selected.setHours(0, 0, 0, 0);
				this.selected_date = Utils.getLocalMysqlStringFromDate(selected).substring(0, 10);

				if (!this.store_payment_search.eq.store_id && this.rest.user?.store_id)
				{
					this.store_payment_search.eq.store_id = this.rest.user.store_id;
				}

				const start = new Date(selected);
				start.setHours(0, 0, 0, 0);

				const end = new Date(selected);
				end.setHours(23, 59, 59, 0);

				const query: Record<string, any> = {
					start: start,
					end: end,
					store_id: this.store_payment_search.eq.store_id,
				};

				const store_obs = this.store_list.length
					? of({ total: this.store_list.length, data: this.store_list })
					: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 999999 });

				return forkJoin({
					stores: store_obs,
					report: this.rest.getReportByPath('getStorePaymentReport', query) as Observable<StorePaymentResponse>,
				});
			})
		)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (response) =>
			{
				this.store_list = response.stores.data;
				this.store_payment_list = response.report.data;
				this.total_records = response.report.total_records;
				this.total_amount = response.report.total_amount;
				this.is_loading = false;
			}
		});
	}

	formatTime(fecha: string): string
	{
		if (!fecha) return '';
		const d = Utils.getDateFromUTCMysqlString(fecha);
		let hours = d.getHours();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		hours = hours % 12 || 12;
		return hours + ':' + Utils.zero(d.getMinutes()) + ' ' + ampm;
	}

	performSearch()
	{
		this.store_payment_search.eq.date = this.selected_date as any;
		super.search(this.store_payment_search);
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

		this.store_payment_list.sort((a, b) =>
		{
			let aValue: any;
			let bValue: any;

			switch (column)
			{
				case 'fecha':
					aValue = a.fecha || '';
					bValue = b.fecha || '';
					break;
				case 'folio':
					aValue = parseInt(a.folio) || 0;
					bValue = parseInt(b.folio) || 0;
					break;
				case 'cliente':
					aValue = (a.cliente || '').toLowerCase();
					bValue = (b.cliente || '').toLowerCase();
					break;
				case 'concepto':
					aValue = (a.concepto || '').toLowerCase();
					bValue = (b.concepto || '').toLowerCase();
					break;
				case 'dc':
					aValue = a.dc || '';
					bValue = b.dc || '';
					break;
				case 'monto':
					aValue = a.monto || 0;
					bValue = b.monto || 0;
					break;
				case 'tienda':
					aValue = (a.tienda || '').toLowerCase();
					bValue = (b.tienda || '').toLowerCase();
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
