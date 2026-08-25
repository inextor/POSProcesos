import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Store } from '../../modules/shared/RestModels';
import { ItemPurchaseCoverage } from '../../modules/shared/Models';
import { forkJoin, Observable, of } from 'rxjs';
import { CategorySearchComponent } from '../../modules/shared/components/category-search/category-search.component';
import { ItemSearchComponent } from '../../modules/shared/components/item-search/item-search.component';
import { ItemInfoButtonComponent } from '../../components/item-info-button/item-info-button.component';

interface CItemPurchaseCoverage extends ItemPurchaseCoverage
{
	category: Category | null;
	estatus: string;
	estatus_class: string;
	dias: number;
	dias_display: string;
}

interface ItemPurchaseCoverageRequest
{
	store_id: number;
	start_timestamp: Date;
	end_timestamp: Date;
	category_id?: number | null;
	item_id?: number | null;
}

@Component({
	selector: 'app-item-purchase-coverage-report',
	templateUrl: './item-purchase-coverage-report.component.html',
	styleUrl: './item-purchase-coverage-report.component.css',
	imports: [CommonModule, FormsModule, CategorySearchComponent, ItemSearchComponent, ItemInfoButtonComponent],
})
export class ItemPurchaseCoverageReportComponent extends BaseComponent implements OnInit
{
	item_purchase_coverage_search: SearchObject<ItemPurchaseCoverageRequest> = this.getEmptySearch();
	item_purchase_coverage_array: CItemPurchaseCoverage[] = [];
	start_date: string = '';
	end_date: string = '';
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name', 'created', 'updated']);
	stores: Store[] = [];
	rest_category: RestSimple<Category> = this.rest.initRestSimple('category', ['id']);
	item_search_str: string = '';
	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';
	sort_select: string = 'difference';

	get totalInvFisico(): number
	{
		return this.item_purchase_coverage_array.reduce((sum, item) => sum + (item.inv_fisico || 0), 0);
	}

	get totalDias(): number
	{
		return this.item_purchase_coverage_array.reduce((sum, item) => sum + (item.dias || 0), 0);
	}

	get totalPurchased(): number
	{
		return this.item_purchase_coverage_array.reduce((sum, item) => sum + (item.purchased || 0), 0);
	}

	get totalPurchaseAmount(): number
	{
		return this.item_purchase_coverage_array.reduce((sum, item) => sum + (item.purchase_amount || 0), 0);
	}

	get totalSoldAmount(): number
	{
		return this.item_purchase_coverage_array.reduce((sum, item) => sum + (item.sold_amount || 0), 0);
	}

	get totalDifference(): number
	{
		return this.item_purchase_coverage_array.reduce((sum, item) => sum + (item.difference || 0), 0);
	}

	get totalInvMasPedido(): number
	{
		return this.item_purchase_coverage_array.reduce((sum, item) => sum + (item.inv_mas_pedido || 0), 0);
	}

	get totalSold(): number
	{
		return this.item_purchase_coverage_array.reduce((sum, item) => sum + (item.total_sold || 0), 0);
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
				});
			}),
			mergeMap((response) =>
			{
				this.stores = response.stores.data;

				let param_map = response.param_map;

				this.setTitle('Cobertura de Compras');
				this.path = '/item-purchase-coverage-report';
				this.is_loading = true;

				this.item_purchase_coverage_search = this.getSearch(param_map, ['store_id','start_timestamp','end_timestamp','category_id','item_id'], ['item_search','_sort','sort']);

				if (this.item_purchase_coverage_search.eq.store_id as any === 'undefined' || this.item_purchase_coverage_search.eq.store_id as any === 'null')
				{
					this.item_purchase_coverage_search.eq.store_id = undefined as any;
				}

				if (this.item_purchase_coverage_search.eq.category_id as any === 'undefined' || this.item_purchase_coverage_search.eq.category_id as any === 'null')
				{
					this.item_purchase_coverage_search.eq.category_id = undefined;
				}

				if (this.item_purchase_coverage_search.eq.item_id as any === 'undefined' || this.item_purchase_coverage_search.eq.item_id as any === 'null')
				{
					this.item_purchase_coverage_search.eq.item_id = undefined;
				}

				this.item_search_str = (this.item_purchase_coverage_search.search_extra['item_search'] as string) || '';

				if (!this.item_purchase_coverage_search.eq.store_id && this.rest.user?.store_id)
				{
					this.item_purchase_coverage_search.eq.store_id = this.rest.user.store_id;
				}

				let start: Date = new Date();
				let end: Date = new Date();

				if (this.item_purchase_coverage_search.eq.start_timestamp)
				{
					start = this.item_purchase_coverage_search.eq.start_timestamp;
				}
				else
				{
					start = new Date();
					start.setDate(start.getDate() - 30);
					start.setHours(0, 0, 0, 0);
					this.item_purchase_coverage_search.eq.start_timestamp = start;
				}

				if (this.item_purchase_coverage_search.eq.end_timestamp)
				{
					end = this.item_purchase_coverage_search.eq.end_timestamp;
				}
				else
				{
					end = new Date();
					end.setHours(23, 59, 59, 0);
					this.item_purchase_coverage_search.eq.end_timestamp = end;
				}

				this.start_date = Utils.getLocalMysqlStringFromDate(start);
				this.end_date = Utils.getLocalMysqlStringFromDate(end);

				// Sorting: _sort preferred, fallback to sort, else default
				let sort_param = (this.item_purchase_coverage_search.search_extra['_sort'] as string) || (this.item_purchase_coverage_search.search_extra['sort'] as string) || 'difference_DESC,item_name_ASC';

				// Keep default in search_extra so URL reflects it if not already present
				if (!this.item_purchase_coverage_search.search_extra['_sort'] && !this.item_purchase_coverage_search.search_extra['sort'])
				{
					this.item_purchase_coverage_search.search_extra['_sort'] = sort_param;
				}

				return this.rest.getReportByPath('ItemPurchaseCoverage',
				{
					store_id: this.item_purchase_coverage_search.eq['store_id'],
					start_timestamp: start,
					end_timestamp: end,
					category_id: this.item_purchase_coverage_search.eq['category_id'],
					item_id: this.item_purchase_coverage_search.eq['item_id'],
					item_search: this.item_purchase_coverage_search.eq['item_id'] ? null : this.item_search_str,
					_sort: sort_param,
				}) as Observable<RestResponse<ItemPurchaseCoverage>>;
			}),
			mergeMap((report)=>
			{
				let map = new Map<number,number>();
				report.data
					.filter((item)=>item.category_id!=null)
					.forEach((item)=>map.set(item.category_id as number,item.category_id as number));

				let categories = Array.from(map.keys());
				categories.sort((a,b)=>a-b);

				let category_obs = categories.length
					? this.rest_category.search
					({
						csv: { id: categories },
						limit: 999999
					})
					: of({total: categories.length, data: [] as Category[]});

				return forkJoin
				({
					category: category_obs,
					report: of( report ),
				});
			})
		)
		.subscribe
		({
			error: (error) => this.showError(error),
			next: (response) =>
			{
				this.item_purchase_coverage_array = response.report.data.map(x=>{
					let category = response.category.data.find(c=>c.id==x.category_id);
					let estatus = x.porcentaje_pedido_inv >= 80 ? 'Bajo' : x.porcentaje_pedido_inv >= 30 ? 'Normal' : 'Excesivo';
					let estatus_class = x.porcentaje_pedido_inv >= 80 ? 'badge bg-danger' : x.porcentaje_pedido_inv >= 30 ? 'badge bg-warning text-dark' : 'badge bg-success';
					let dias = x.venta_prom_diaria > 0 ? x.inv_fisico / x.venta_prom_diaria : 0;
					let dias_display = x.venta_prom_diaria > 0 ? Math.round(dias).toString() : '∞';
					return { ...x, category: category || null, estatus, estatus_class, dias, dias_display };
				});

				this.is_loading = false;
			}
		});
	}

	performSearch()
	{
		this.item_purchase_coverage_search.search_extra['item_search'] = this.item_purchase_coverage_search.eq['item_id']
			? null
			: (this.item_search_str.trim() || null);

		// Validate UTC format will be handled by backend; but pre-validate client side for UX
		// Backend expects YYYY-MM-DD HH:MM:SS UTC; getSearch + _getParams already converts Dates via Utils.getUTCMysqlStringFromDate
		super.search(this.item_purchase_coverage_search);
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

		this.item_purchase_coverage_array.sort((a, b) =>
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
				case 'reference_price':
					aValue = a.reference_price || 0;
					bValue = b.reference_price || 0;
					break;
				case 'inv_fisico':
					aValue = a.inv_fisico || 0;
					bValue = b.inv_fisico || 0;
					break;
				case 'purchased':
					aValue = a.purchased || 0;
					bValue = b.purchased || 0;
					break;
				case 'inv_mas_pedido':
					aValue = a.inv_mas_pedido || 0;
					bValue = b.inv_mas_pedido || 0;
					break;
				case 'dias':
					aValue = a.dias || 0;
					bValue = b.dias || 0;
					break;
				case 'total_sold':
					aValue = a.total_sold || 0;
					bValue = b.total_sold || 0;
					break;
				case 'venta_prom_diaria':
					aValue = a.venta_prom_diaria || 0;
					bValue = b.venta_prom_diaria || 0;
					break;
				case 'purchase_amount':
					aValue = a.purchase_amount || 0;
					bValue = b.purchase_amount || 0;
					break;
				case 'sold_amount':
					aValue = a.sold_amount || 0;
					bValue = b.sold_amount || 0;
					break;
				case 'difference':
					aValue = a.difference || 0;
					bValue = b.difference || 0;
					break;
				case 'estatus':
					aValue = a.estatus?.toLowerCase() || '';
					bValue = b.estatus?.toLowerCase() || '';
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
