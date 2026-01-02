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

interface CItemMovement extends ItemMovement
{
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
	imports: [CommonModule, FormsModule]
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

	get totalSold(): number
	{
		return this.item_movement_list.reduce((sum, item) => sum + (item.total_sold || 0), 0);
	}

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				this.setTitle('Reporte de Movimientos de Items');
				this.path = '/item-movement-report';
				this.is_loading = true;

				this.item_movement_search = this.getSearch(param_map, ['store_id','start','end']);

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
				}

				this.item_movement_search.eq.start_timestamp = start;

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

				let store_obs = this.stores.length
					? of({total: this.stores.length, data: this.stores})
					: this.rest_store.search({ eq: { status: 'ACTIVE', sales_enabled: 1 }, limit: 999999 });

				return forkJoin
				({
					stores: store_obs,
					report: this.rest.getReportByPath('getItemMovement',
					{
						start_timestamp: this.start_date,
						end_timestamp: this.end_date,
						store_id: this.item_movement_search.eq['store_id'],
					}) as Observable<RestResponse<ItemMovement>>
				})
			})
			,mergeMap((response)=>
			{
				this.stores = response.stores.data;

				let map = new Map<number,number>();

				let categories_map = response.report.data
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
					report: of( response.report ),
				})
			})
		)
		.subscribe
		({
			next: (response) =>
			{
				this.item_movement_list = response.report.data.map(x=>{
					let category = response.category.data.find(c=>c.id==x.category_id);
					return {...x, category: category || null};
				});

				this.is_loading = false;
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}

	performSearch()
	{
		super.search(this.item_movement_search);
	}
}
