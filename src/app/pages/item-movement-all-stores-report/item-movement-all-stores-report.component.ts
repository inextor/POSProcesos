import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category } from '../../modules/shared/RestModels';
import { ItemMovement } from '../../modules/shared/Models';
import { forkJoin, Observable, of } from 'rxjs';

interface CItemMovement extends ItemMovement
{
	category: Category | null;
	total_gain: number;
	production_cost: number;
	text_danger: boolean;
}

interface ItemMovementRequest
{
	start_timestamp: Date;
	end_timestamp: Date;
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

	ngOnInit(): void
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				this.setTitle('Reporte de Movimientos de Items - Todas las Sucursales');
				this.path = '/item-movement-all-stores-report';
				this.is_loading = true;

				this.item_movement_search = this.getSearch(param_map, ['start_timestamp', 'end_timestamp']);

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
					let production_cost = x.total_merma*x.reference_price;
					let total_gain = x.sold_amount-(x.total_merma+x.total_sold)*x.reference_price;
					return { ...x, category: category || null, production_cost, total_gain,text_danger: total_gain<0 }
				});


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
				});

				this.is_loading = false;
			},
		});
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
				case 'total_gain':
					aValue = a.total_gain || 0;
					bValue = b.total_gain || 0;
					break;

				case 'total_produced':
					aValue = a.total_produced || 0;
					bValue = b.total_produced || 0;
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
