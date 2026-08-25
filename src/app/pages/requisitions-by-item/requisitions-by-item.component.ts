import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { catchError, mergeMap } from 'rxjs/operators';
import { forkJoin, Observable, of } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestResponse, RestSimple } from '../../modules/shared/services/Rest';
import { RouterModule } from '@angular/router';
import { Item, Requisition, Requisition_Item, Store, User } from '../../modules/shared/RestModels';
import { Utils } from '../../modules/shared/Utils';
import { ItemSearchComponent } from '../../modules/shared/components/item-search/item-search.component';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';

interface CRequisitionItem
{
	requisition_item: Requisition_Item;
	requisition: Requisition | null;
	item: { id: number; name: string; code: string | null } | null;
	required_by_store: Store | null;
	requested_to_store: Store | null;
	required_by_user: User | null;
}

@Component({
	selector: 'app-requisitions-by-item',
	templateUrl: './requisitions-by-item.component.html',
	styleUrl: './requisitions-by-item.component.css',
	imports: [CommonModule, FormsModule, RouterModule, ItemSearchComponent, ShortDatePipe],
})
export class RequisitionsByItemComponent extends BaseComponent implements OnInit
{
	store_id: number | null = null;
	item_id: number | null = null;
	item_name: string = '';
	store_name: string = '';
	start_timestamp: string = '';
	end_timestamp: string = '';

	stores: Store[] = [];
	search_store_id: number | null = null;
	search_item_id: number | null = null;
	start_date: string = '';
	end_date: string = '';
	search_start: Date | null = null;
	search_end: Date | null = null;

	requisition_array: CRequisitionItem[] = [];

	rest_requisition_item: Rest<Requisition_Item, CRequisitionItem> = this.rest.initRest('requisition_item_info');
	rest_item: RestSimple<Item> = this.rest.initRestSimple('item', ['id', 'name', 'code']);
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name']);

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				let store_obs = this.stores.length
					? of({ total: this.stores.length, data: this.stores })
					: this.rest_store.search({ eq: { status: 'ACTIVE' }, limit: 999999 });

				return forkJoin({
					stores: store_obs,
					param_map: of(param_map),
				});
			}),
			mergeMap((response) =>
			{
				this.stores = response.stores.data;

				let param_map = response.param_map;

				this.setTitle('Requisiciones para Artículo');
				this.path = '/requisitions-by-item';
				this.is_loading = true;

				this.store_id = this.getNumericParam(param_map, 'store_id');
				this.item_id = this.getNumericParam(param_map, 'item_id');
				this.start_timestamp = param_map.get('start_timestamp') || '';
				this.end_timestamp = param_map.get('end_timestamp') || '';

				this.search_store_id = this.store_id;
				this.search_item_id = this.item_id;

				this.search_start = this.start_timestamp ? Utils.getDateFromUTCMysqlString(this.start_timestamp) : null;
				this.start_date = this.search_start ? Utils.getLocalMysqlStringFromDate(this.search_start) : '';

				this.search_end = this.end_timestamp ? Utils.getDateFromUTCMysqlString(this.end_timestamp) : null;
				this.end_date = this.search_end ? Utils.getLocalMysqlStringFromDate(this.search_end) : '';

				if (!this.item_id)
				{
					this.is_loading = false;
					return of(null);
				}

				let query: any =
				{
					eq: { item_id: this.item_id, status: 'ACTIVE' },
					search_extra:
					{
						required_by_store_id: this.store_id ?? '',
						requisition_approved_status: 'APPROVED',
						required_by_timestamp_start: this.start_timestamp,
						required_by_timestamp_end: this.end_timestamp,
					},
					limit: 99999,
				};

				return forkJoin({
					requisitions: this.rest_requisition_item.search(query) as Observable<RestResponse<CRequisitionItem>>,
					item: this.rest_item.get(this.item_id).pipe(catchError(() => of(null))),
					store: this.store_id ? this.rest_store.get(this.store_id).pipe(catchError(() => of(null))) : of(null),
				});
			})
		)
		.subscribe
		({
			next: (response: any) =>
			{
				if (response)
				{
					this.item_name = response.item?.name || '';
					this.store_name = this.store_id ? (response.store?.name || '') : 'Todas las sucursales';
					this.setTitle('Requisiciones para Artículo ' + (this.item_name || ''));

					this.requisition_array = (response.requisitions?.data || [])
						.filter((x: CRequisitionItem) => x.requisition?.status !== 'CANCELLED')
						.map((x: CRequisitionItem) => ({ ...x }));
				}
				this.is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
				this.is_loading = false;
			}
		});
	}

	private getNumericParam(param_map: ParamMap, name: string): number | null
	{
		if (!param_map.has(name)) return null;
		let value = param_map.get(name);
		if (!value || value === 'null' || value === 'undefined') return null;
		let parsed = Number(value);
		return Number.isNaN(parsed) ? null : parsed;
	}

	performSearch()
	{
		if (!this.search_item_id)
		{
			this.showError('Selecciona un artículo');
			return;
		}

		this.router.navigate(['/requisitions-by-item'], {
			queryParams: {
				store_id: this.search_store_id ?? '',
				item_id: this.search_item_id,
				start_timestamp: this.search_start ? Utils.getUTCMysqlStringFromDate(this.search_start) : '',
				end_timestamp: this.search_end ? Utils.getUTCMysqlStringFromDate(this.search_end) : '',
			}
		});
	}

	get totalQty(): number
	{
		return this.requisition_array.reduce((sum, item) => sum + (item.requisition_item?.qty || 0), 0);
	}

	openRequisition(requisition_id: number)
	{
		this.router.navigate(['/view-requisition', requisition_id]);
	}
}
