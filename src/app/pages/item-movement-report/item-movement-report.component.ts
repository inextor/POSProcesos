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
import { forkJoin,Observable, of } from 'rxjs';
import {RouterLink} from '@angular/router';


interface CItemMovement extends ItemMovement
{
	total_gain: string|number;
	total_loss: string|number;
	category: Category | null;
}

interface ItemMovementRequest
{
	start_timestamp: Date;
	end_timestamp: Date;
	store_id: number;
}

@Component({
	selector: 'app-item-movement-report',
	templateUrl: './item-movement-report.component.html',
	styleUrl: './item-movement-report.component.css',
	imports: [CommonModule, FormsModule, RouterLink],
})
export class ItemMovementReportComponent extends BaseComponent implements OnInit
{
	item_movement_search: SearchObject<ItemMovementRequest> = this.getEmptySearch();
	item_movement_list: CItemMovement[] = [];
	start_date: string = '';
	end_date: string = '';
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name', 'created', 'updated']);
	stores: Store[] = [];
	rest_category: RestSimple<Category> = this.rest.initRestSimple('category', ['id']);
	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';

	get totalReceived(): number
	{
		return this.item_movement_list.reduce((sum, item) => sum + (item.total_received || 0), 0);
	}

	get totalRequested(): number
	{
		return this.item_movement_list.reduce((sum, item) => sum + (item.total_requested || 0), 0);
	}

	get totalMerma(): number
	{
		return this.item_movement_list.reduce((sum, item) => sum + (item.total_merma || 0), 0);
	}

	get totalMermaAmount(): number
	{
		return this.item_movement_list.reduce((sum, item) => sum + (item.reference_price || 0) * (item.total_merma || 0), 0);
	}


	get totalSold(): number
	{
		return this.item_movement_list.reduce((sum, item) => sum + (item.total_sold || 0), 0);
	}

	get totalUtilidad(): number
	{
		return this.item_movement_list.reduce((sum, item) =>{
			let utilidad = item.sold_amount - (item.reference_price * (item.total_merma || 0 + item.total_sold || 0));
			return sum + utilidad;
		}, 0);
	}

	get totalAmount(): number
	{
		return this.item_movement_list.reduce((sum, item) => sum + (item.sold_amount || 0), 0);
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

				this.setTitle('Reporte de Movimientos de Items');
				this.path = '/item-movement-report';
				this.is_loading = true;

				this.item_movement_search = this.getSearch(param_map, ['store_id','start_timestamp','end_timestamp']);

				// Si el usuario tiene un store_id asignado y no se ha especificado uno en los parámetros, usarlo por defecto
				if (!this.item_movement_search.eq.store_id && this.rest.user?.store_id)
				{
					this.item_movement_search.eq.store_id = this.rest.user.store_id;
				}

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


				if (this.item_movement_search.eq.end_timestamp )
				{
					end = this.item_movement_search.eq.end_timestamp;
				}
				else
				{
					end = new Date();
					end.setHours(23, 59, 59,0);
					this.item_movement_search.eq.end_timestamp = end;
				}

				this.start_date = Utils.getLocalMysqlStringFromDate(start);
				this.end_date = Utils.getLocalMysqlStringFromDate(end);

				return this.rest.getReportByPath('getItemMovement',
				{
					start_timestamp: start,
					end_timestamp: end,
					store_id: this.item_movement_search.eq['store_id'],
				}) as Observable<RestResponse<ItemMovement>>
			})
			,mergeMap((report)=>
			{
				let map = new Map<number,number>();

				let categories_map = report.data
					.filter((item)=>item.category_id!=null)
					.map((item)=>map.set(item.category_id as number,item.category_id as number));

				let categories = Array.from(map.keys());
				categories.sort((a,b)=>a-b);


				let category_obs = categories.length
					? this.rest_category.search
					({
						csv: { id: categories },
						limit: 999999
					})
					: of({total: categories.length, data: []})

				return forkJoin
				({
					category: category_obs,
					report: of( report ),
				})
			})
		)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (response) =>
			{
				this.item_movement_list = response.report.data.map(x=>{
					let category = response.category.data.find(c=>c.id==x.category_id);
					let total_loss = x.total_merma*x.reference_price;
					let total_gain = x.sold_amount-(x.total_merma+x.total_sold)*x.reference_price;
					return { ...x, category: category || null, total_loss, total_gain };
				});

				this.is_loading = false;
			}
		});
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


				default:
					return 0;
			}

			if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
			if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	}
}
