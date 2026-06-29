import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap, RouterLink } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Store } from '../../modules/shared/RestModels';
import { ItemMovement } from '../../modules/shared/Models';
import { forkJoin, Observable, of } from 'rxjs';

interface CategoryMovementSummary
{
	category_id: number;
	category_name: string;
	category: Category | null;
	total_requested: number;
	total_received: number;
	not_received_qty: number;
	received_percentage: number;
	total_merma: number;
	total_merma_amount: number;
	total_sold: number;
	sold_amount: number;
	total_gain: number;
}

interface ItemMovementRequest
{
	start_timestamp: Date;
	end_timestamp: Date;
	store_id: number;
	requisitions_or_shippings?: number;
}

@Component({
	selector: 'app-item-movement-by-category-report',
	templateUrl: './item-movement-by-category-report.component.html',
	styleUrl: './item-movement-by-category-report.component.css',
	imports: [CommonModule, FormsModule, RouterLink],
})
export class ItemMovementByCategoryReportComponent extends BaseComponent implements OnInit
{
	item_movement_search: SearchObject<ItemMovementRequest> = this.getEmptySearch();
	category_summaries: CategoryMovementSummary[] = [];
	start_date: string = '';
	end_date: string = '';
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name', 'created', 'updated']);
	stores: Store[] = [];
	rest_all_categories: RestSimple<Category> = this.rest.initRestSimple('category', ['id', 'name']);
	all_categories: Category[] = [];
	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';

	get totalRequested(): number
	{
		return this.category_summaries.reduce((sum, row) => sum + (row.total_requested || 0), 0);
	}

	get totalReceived(): number
	{
		return this.category_summaries.reduce((sum, row) => sum + (row.total_received || 0), 0);
	}

	get totalNotReceived(): number
	{
		return this.category_summaries.reduce((sum, row) => sum + (row.not_received_qty || 0), 0);
	}

	get totalReceivedPercentage(): number
	{
		let totalReq = this.totalRequested;
		return totalReq ? (this.totalReceived / totalReq * 100) : 0;
	}

	get totalMerma(): number
	{
		return this.category_summaries.reduce((sum, row) => sum + (row.total_merma || 0), 0);
	}

	get totalMermaAmount(): number
	{
		return this.category_summaries.reduce((sum, row) => sum + (row.total_merma_amount || 0), 0);
	}

	get totalSold(): number
	{
		return this.category_summaries.reduce((sum, row) => sum + (row.total_sold || 0), 0);
	}

	get totalAmount(): number
	{
		return this.category_summaries.reduce((sum, row) => sum + (row.sold_amount || 0), 0);
	}

	get totalGain(): number
	{
		return this.category_summaries.reduce((sum, row) => sum + (row.total_gain || 0), 0);
	}

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				let store_obs = this.stores.length
					? of({total: this.stores.length, data: this.stores})
					: this.rest_store.search({ eq: { status: 'ACTIVE', sales_enabled: 1 }, limit: 999999 });

				let category_obs = this.all_categories.length
					? of({total: this.all_categories.length, data: this.all_categories})
					: this.rest_all_categories.search({ eq: { display_status: 'NORMAL' }, limit: 999999 });

				return forkJoin
				({
					stores: store_obs,
					categories: category_obs,
					param_map: of(param_map),
				})
			}),
			mergeMap((response) =>
			{
				this.stores = response.stores.data;
				this.all_categories = response.categories.data;

				let param_map = response.param_map;

				this.setTitle('Reporte de Movimientos por Categoría');
				this.path = '/item-movement-by-category-report';
				this.is_loading = true;

				this.item_movement_search = this.getSearch(param_map, ['store_id','start_timestamp','end_timestamp','requisitions_or_shippings']);

				if (this.item_movement_search.eq.store_id as any === 'undefined' || this.item_movement_search.eq.store_id as any === 'null')
				{
					this.item_movement_search.eq.store_id = undefined;
				}

				if (!this.item_movement_search.eq.store_id && this.rest.user?.store_id)
				{
					this.item_movement_search.eq.store_id = this.rest.user.store_id;
				}

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

				return this.rest.getReportByPath('getItemMovement',
				{
					start_timestamp: start,
					end_timestamp: end,
					store_id: this.item_movement_search.eq['store_id'],
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
					? this.rest_all_categories.search
					({
						csv: { id: categories },
						limit: 999999
					})
					: of({total: categories.length, data: []})

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
				let grouped = new Map<number, CategoryMovementSummary>();

				response.report.data.forEach(x =>
				{
					let catId = x.category_id || 0;
					let total_merma_amount = (x.reference_price || 0) * (x.total_merma || 0);
					let total_gain = x.sold_amount - (x.reference_price || 0) * ((x.total_merma || 0) + (x.total_sold || 0));
					let not_received_qty = x.not_received_qty !== undefined ? x.not_received_qty : (x.total_requested - x.total_received);

					if (!grouped.has(catId))
					{
						let category = response.category.data.find(c => c.id == x.category_id);
						grouped.set(catId, {
							category_id: catId,
							category_name: category ? category.name : 'Sin Categoría',
							category: category || null,
							total_requested: 0,
							total_received: 0,
							not_received_qty: 0,
							received_percentage: 0,
							total_merma: 0,
							total_merma_amount: 0,
							total_sold: 0,
							sold_amount: 0,
							total_gain: 0,
						});
					}
					let g = grouped.get(catId)!;
					g.total_requested += x.total_requested || 0;
					g.total_received += x.total_received || 0;
					g.not_received_qty += not_received_qty || 0;
					g.total_merma += x.total_merma || 0;
					g.total_merma_amount += total_merma_amount;
					g.total_sold += x.total_sold || 0;
					g.sold_amount += x.sold_amount || 0;
					g.total_gain += total_gain;
				});

				grouped.forEach((g) =>
				{
					g.received_percentage = g.total_requested ? (g.total_received / g.total_requested * 100) : 0;
				});

				this.category_summaries = Array.from(grouped.values());

				this.is_loading = false;
			}
		});
	}

	onStoreChange(store_id: any)
	{
		if (store_id === null || store_id === undefined)
		{
			this.router.navigate(['/item-movement-by-category-all-stores-report'], {
				queryParams: {
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

	buildDetailQueryParams(category_id: number): any
	{
		let store_id = this.item_movement_search.eq['store_id'];
		let start = Utils.getUTCMysqlStringFromDate(this.item_movement_search.eq['start_timestamp'] as Date);
		let end = Utils.getUTCMysqlStringFromDate(this.item_movement_search.eq['end_timestamp'] as Date);
		let req = this.item_movement_search.eq['requisitions_or_shippings'];

		let params: any = {
			'eq.category_id': category_id.toString(),
		};
		if (store_id) params['eq.store_id'] = store_id.toString();
		if (start) params['eq.start_timestamp'] = start;
		if (end) params['eq.end_timestamp'] = end;
		if (req !== undefined && req !== null) params['eq.requisitions_or_shippings'] = req.toString();
		return params;
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

		this.category_summaries.sort((a, b) =>
		{
			let aValue: any;
			let bValue: any;

			switch (column)
			{
				case 'category_name':
					aValue = a.category_name?.toLowerCase() || '';
					bValue = b.category_name?.toLowerCase() || '';
					break;
				case 'total_requested':
					aValue = a.total_requested || 0;
					bValue = b.total_requested || 0;
					break;
				case 'total_received':
					aValue = a.total_received || 0;
					bValue = b.total_received || 0;
					break;
				case 'not_received_qty':
					aValue = a.not_received_qty || 0;
					bValue = b.not_received_qty || 0;
					break;
				case 'received_percentage':
					aValue = a.received_percentage || 0;
					bValue = b.received_percentage || 0;
					break;
				case 'total_sold':
					aValue = a.total_sold || 0;
					bValue = b.total_sold || 0;
					break;
				case 'sold_amount':
					aValue = a.sold_amount || 0;
					bValue = b.sold_amount || 0;
					break;
				case 'total_merma':
					aValue = a.total_merma || 0;
					bValue = b.total_merma || 0;
					break;
				case 'total_merma_amount':
					aValue = a.total_merma_amount || 0;
					bValue = b.total_merma_amount || 0;
					break;
				case 'total_gain':
					aValue = a.total_gain || 0;
					bValue = b.total_gain || 0;
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
