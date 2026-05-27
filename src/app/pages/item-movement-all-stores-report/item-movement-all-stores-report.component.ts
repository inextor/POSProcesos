import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Store } from '../../modules/shared/RestModels';
import { ItemMovement } from '../../modules/shared/Models';
import { forkJoin, Observable, of } from 'rxjs';

interface CItemMovement extends ItemMovement
{
	category: Category | null;
	total_gain: number;
	production_cost: number;
	text_danger: boolean;
	not_received_qty: number;
	received_percentage: number;
}

interface ItemMovementRequest
{
	start_timestamp: Date;
	end_timestamp: Date;
	store_id?: number | null;
	requisitions_or_shippings?: number;
}

@Component({
	selector: 'app-item-movement-all-stores-report',
	templateUrl: './item-movement-all-stores-report.component.html',
	styleUrl: './item-movement-all-stores-report.component.css',
	imports: [CommonModule, FormsModule]
})
export class ItemMovementAllStoresReportComponent extends BaseComponent implements OnInit
{
	item_movement_search: SearchObject<ItemMovementRequest> = this.getEmptySearch();
	item_movement_list: CItemMovement[] = [];
	start_date: string = '';
	end_date: string = '';
	rest_category: RestSimple<Category> = this.rest.initRestSimple('category', ['id']);
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name', 'created', 'updated']);
	stores: Store[] = [];
	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';

	total_received: number = 0;
	total_requested: number = 0;
	total_merma: number = 0;
	total_sold: number = 0;
	total_produced: number = 0;
	total_production_cost: number = 0;
	total_sold_amount: number = 0;
	total_qty_sold: number = 0;
	total_gain: number = 0;
	total_merma_cost: number = 0;
	total_not_received: number = 0;
	total_received_percentage: number = 0;

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				this.setTitle('Reporte de Movimientos de Items - Todas las Sucursales');
				this.path = '/item-movement-all-stores-report';
				this.is_loading = true;

				let store_obs = this.stores.length
					? of({total: this.stores.length, data: this.stores})
					: this.rest_store.search({ eq: { status: 'ACTIVE', sales_enabled: 1 }, limit: 999999 });

				return forkJoin
				({
					stores: store_obs,
					param_map: of(param_map),
				})
			}),
			mergeMap((response) =>
			{
				this.stores = response.stores.data;

				let param_map = response.param_map;

				this.item_movement_search = this.getSearch(param_map, ['start_timestamp', 'end_timestamp', 'requisitions_or_shippings']);
				this.item_movement_search.eq['store_id'] = null;

				let requisitions_or_shippings = this.item_movement_search.eq['requisitions_or_shippings'];
				if (requisitions_or_shippings === undefined || requisitions_or_shippings === null)
				{
					requisitions_or_shippings = 0;
				}
				else
				{
					requisitions_or_shippings = Number(requisitions_or_shippings);
				}
				this.item_movement_search.eq['requisitions_or_shippings'] = requisitions_or_shippings;

				let start: Date = new Date();
				let end: Date = new Date();

				if (this.item_movement_search.eq.start_timestamp)
				{
					start = this.item_movement_search.eq.start_timestamp;
				}
				else
				{
					start = new Date();
					start.setHours(0, 0, 0, 0);
					this.item_movement_search.eq.start_timestamp = start;
				}

				if (this.item_movement_search.eq.end_timestamp)
				{
					end = this.item_movement_search.eq.end_timestamp;
				}
				else
				{
					end = new Date();
					end.setHours(23, 59, 59, 0);
					this.item_movement_search.eq.end_timestamp = end;
				}

				this.start_date = Utils.getLocalMysqlStringFromDate(start);
				this.end_date = Utils.getLocalMysqlStringFromDate(end);

				return this.rest.getReportByPath('getItemMovementAllStores',
				{
					start_timestamp: start,
					end_timestamp: end,
					requisitions_or_shippings: requisitions_or_shippings,
				}) as Observable<RestResponse<ItemMovement>>
			}),
			mergeMap((report) =>
			{
				let map = new Map<number, number>();

				let categories_map = report.data
					.filter((item) => item.category_id != null)
					.map((item) => map.set(item.category_id as number, item.category_id as number));

				let categories = Array.from(map.keys());
				categories.sort((a, b) => a - b);


				let category_obs = categories.length
					? this.rest_category.search
					({
						csv: { id: categories },
						limit: 999999
					})
					: of({ total: categories.length, data: [] })

				return forkJoin
				({
					category: category_obs,
					report: of(report),
				})
			})
		)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (response) =>
			{
				this.item_movement_list = response.report.data.map(x => {
					let category = response.category.data.find(c => c.id == x.category_id);
					let production_cost = x.total_produced*x.reference_price;
					let total_gain = x.sold_amount-(x.total_merma+x.total_sold)*x.reference_price;
					let not_received_qty = x.not_received_qty !== undefined ? x.not_received_qty : (x.total_requested - x.total_received);
					let received_percentage = x.received_percentage !== undefined ? x.received_percentage : (x.total_requested ? (x.total_received / x.total_requested * 100) : 0);
					return { ...x, category: category || null, production_cost, total_gain, text_danger: total_gain<0, not_received_qty, received_percentage }
				});


				this.total_received = 0;
				this.total_requested = 0;
				this.total_merma = 0;
				this.total_merma_cost = 0;
				this.total_sold = 0;
				this.total_produced = 0;
				this.total_production_cost = 0;
				this.total_sold_amount = 0;
				this.total_gain = 0;
				this.total_not_received = 0;
				this.total_received_percentage = 0;

				this.item_movement_list.forEach(x=>{
					this.total_received += x.total_received || 0;
					this.total_requested += x.total_requested || 0;
					this.total_merma += x.total_merma || 0;
					this.total_merma_cost += x.total_merma*x.reference_price || 0;
					this.total_sold += x.total_sold || 0;
					this.total_produced += x.total_produced || 0;
					this.total_production_cost += x.production_cost || 0;
					this.total_sold_amount += x.sold_amount || 0;
					this.total_gain += x.total_gain || 0;
					this.total_not_received += x.not_received_qty || 0;
				});

				this.total_received_percentage = this.total_requested ? (this.total_received / this.total_requested * 100) : 0;

				this.is_loading = false;
			},
		});
	}

	onStoreChange(store_id: any)
	{
		if (store_id !== null && store_id !== undefined)
		{
			this.router.navigate(['/item-movement-report'], {
				queryParams: {
					'eq.store_id': store_id,
					'eq.start_timestamp': Utils.getUTCMysqlStringFromDate(this.item_movement_search.eq['start_timestamp'] as Date),
					'eq.end_timestamp': Utils.getUTCMysqlStringFromDate(this.item_movement_search.eq['end_timestamp'] as Date),
					'eq.requisitions_or_shippings': this.item_movement_search.eq['requisitions_or_shippings'],
				}
			});
		}
	}

	performSearch()
	{
		super.search(this.item_movement_search);
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

		this.item_movement_list.sort((a, b) =>
		{
			let aValue: any;
			let bValue: any;

			switch (column)
			{
				case 'item_id':
					aValue = a.item_id;
					bValue = b.item_id;
					break;
				case 'item_name':
					aValue = a.item_name?.toLowerCase() || '';
					bValue = b.item_name?.toLowerCase() || '';
					break;
				case 'item_code':
					aValue = a.item_code?.toLowerCase() || '';
					bValue = b.item_code?.toLowerCase() || '';
					break;
				case 'category_name':
					aValue = a.category?.name?.toLowerCase() || '';
					bValue = b.category?.name?.toLowerCase() || '';
					break;
				case 'total_received':
					aValue = a.total_received || 0;
					bValue = b.total_received || 0;
					break;
				case 'total_requested':
					aValue = a.total_requested || 0;
					bValue = b.total_requested || 0;
					break;
				case 'not_received_qty':
					aValue = a.not_received_qty || 0;
					bValue = b.not_received_qty || 0;
					break;
				case 'received_percentage':
					aValue = a.received_percentage || 0;
					bValue = b.received_percentage || 0;
					break;
				case 'total_merma':
					aValue = a.total_merma || 0;
					bValue = b.total_merma || 0;
					break;
				case 'total_sold':
					aValue = a.total_sold || 0;
					bValue = b.total_sold || 0;
					break;
				case 'sold_amount':
					aValue = a.sold_amount || 0;
					bValue = b.sold_amount || 0;
					break;
				case 'total_gain':
					aValue = a.total_gain || 0;
					bValue = b.total_gain || 0;
					break;

			case 'total_produced':
				aValue = a.total_produced || 0;
				bValue = b.total_produced || 0;
				break;
			case 'reference_price':
				aValue = a.reference_price || 0;
				bValue = b.reference_price || 0;
				break;
			case 'total_loss':
				aValue = (a.total_merma * a.reference_price) || 0;
				bValue = (b.total_merma * b.reference_price) || 0;
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
