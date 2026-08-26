import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Store } from '../../modules/shared/RestModels';
import { ItemPurchasePrice } from '../../modules/shared/Models';
import { forkJoin, Observable, of } from 'rxjs';
import { CategorySearchComponent } from '../../modules/shared/components/category-search/category-search.component';
import { ItemSearchComponent } from '../../modules/shared/components/item-search/item-search.component';

interface CItemPurchasePrice extends ItemPurchasePrice
{
	category: Category | null;
}

interface ItemPurchasePriceRequest
{
	store_id: number;
	start_timestamp: Date;
	end_timestamp: Date;
	category_id?: number | null;
	item_id?: number | null;
}

@Component({
	selector: 'app-item-purchase-price-report',
	templateUrl: './item-purchase-price-report.component.html',
	styleUrl: './item-purchase-price-report.component.css',
	imports: [CommonModule, FormsModule, CategorySearchComponent, ItemSearchComponent],
})
export class ItemPurchasePriceReportComponent extends BaseComponent implements OnInit
{
	item_purchase_price_search: SearchObject<ItemPurchasePriceRequest> = this.getEmptySearch();
	item_purchase_price_array: CItemPurchasePrice[] = [];
	start_date: string = '';
	end_date: string = '';
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name', 'created', 'updated']);
	rest_category: RestSimple<Category> = this.rest.initRestSimple('category', ['id']);
	stores: Store[] = [];
	item_search_str: string = '';
	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';
	sort_select: string = 'item_name';

	get totalCompraQty(): number
	{
		return this.item_purchase_price_array.reduce((sum, item) => sum + (item.purchased_qty || 0), 0);
	}

	get totalVentaQty(): number
	{
		return this.item_purchase_price_array.reduce((sum, item) => sum + (item.sold_qty || 0), 0);
	}

	get totalCompra(): number
	{
		return this.item_purchase_price_array.reduce((sum, item) => sum + (item.purchase_total || 0), 0);
	}

	get totalVenta(): number
	{
		return this.item_purchase_price_array.reduce((sum, item) => sum + (item.sold_total || 0), 0);
	}

	get totalPromedioCompra(): number
	{
		const qty = this.totalCompraQty;
		return qty > 0 ? this.totalCompra / qty : 0;
	}

	get totalPromedioVenta(): number
	{
		const qty = this.totalVentaQty;
		return qty > 0 ? this.totalVenta / qty : 0;
	}

	get totalMax(): number
	{
		if (this.item_purchase_price_array.length === 0) return 0;
		return Math.max(...this.item_purchase_price_array.map(item => item.max_price || 0));
	}

	get totalMin(): number
	{
		if (this.item_purchase_price_array.length === 0) return 0;
		return Math.min(...this.item_purchase_price_array.map(item => item.min_price || 0));
	}

	get totalGanancia(): number
	{
		return this.item_purchase_price_array.reduce((sum, item) => sum + (item.ganancia || 0), 0);
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

				this.setTitle('Precios de Compra por Artículo');
				this.path = '/item-purchase-price-report';
				this.is_loading = true;

				this.item_purchase_price_search = this.getSearch(param_map, ['store_id','start_timestamp','end_timestamp','category_id','item_id'], ['item_search','_sort','sort']);

				if (this.item_purchase_price_search.eq.store_id as any === 'undefined' || this.item_purchase_price_search.eq.store_id as any === 'null')
				{
					this.item_purchase_price_search.eq.store_id = undefined as any;
				}

				if (this.item_purchase_price_search.eq.category_id as any === 'undefined' || this.item_purchase_price_search.eq.category_id as any === 'null')
				{
					this.item_purchase_price_search.eq.category_id = undefined;
				}

				if (this.item_purchase_price_search.eq.item_id as any === 'undefined' || this.item_purchase_price_search.eq.item_id as any === 'null')
				{
					this.item_purchase_price_search.eq.item_id = undefined;
				}

				this.item_search_str = (this.item_purchase_price_search.search_extra['item_search'] as string) || '';

				if (!this.item_purchase_price_search.eq.store_id && this.rest.user?.store_id)
				{
					this.item_purchase_price_search.eq.store_id = this.rest.user.store_id;
				}

				let start: Date = new Date();
				let end: Date = new Date();

				if (this.item_purchase_price_search.eq.start_timestamp)
				{
					start = this.item_purchase_price_search.eq.start_timestamp;
				}
				else
				{
					start = new Date();
					start.setDate(start.getDate() - 30);
					start.setHours(0, 0, 0, 0);
					this.item_purchase_price_search.eq.start_timestamp = start;
				}

				if (this.item_purchase_price_search.eq.end_timestamp)
				{
					end = this.item_purchase_price_search.eq.end_timestamp;
				}
				else
				{
					end = new Date();
					end.setHours(23, 59, 59, 0);
					this.item_purchase_price_search.eq.end_timestamp = end;
				}

				this.start_date = Utils.getLocalMysqlStringFromDate(start);
				this.end_date = Utils.getLocalMysqlStringFromDate(end);

				let sort_param = (this.item_purchase_price_search.search_extra['_sort'] as string) || (this.item_purchase_price_search.search_extra['sort'] as string) || 'item_name_ASC';

				if (!this.item_purchase_price_search.search_extra['_sort'] && !this.item_purchase_price_search.search_extra['sort'])
				{
					this.item_purchase_price_search.search_extra['_sort'] = sort_param;
				}

				return this.rest.getReportByPath('ItemPurchasePriceReport',
				{
					store_id: this.item_purchase_price_search.eq['store_id'],
					start_timestamp: start,
					end_timestamp: end,
					category_id: this.item_purchase_price_search.eq['category_id'],
					item_id: this.item_purchase_price_search.eq['item_id'],
					item_search: this.item_purchase_price_search.eq['item_id'] ? null : this.item_search_str,
					_sort: sort_param,
				}) as Observable<RestResponse<ItemPurchasePrice>>;
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
				this.item_purchase_price_array = response.report.data.map(x=>{
					let category = response.category.data.find(c=>c.id==x.category_id);
					return { ...x, category: category || null };
				});

				this.is_loading = false;
			}
		});
	}

	performSearch()
	{
		this.item_purchase_price_search.search_extra['item_search'] = this.item_purchase_price_search.eq['item_id']
			? null
			: (this.item_search_str.trim() || null);

		super.search(this.item_purchase_price_search);
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

		this.item_purchase_price_array.sort((a, b) =>
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
				case 'purchased_qty':
					aValue = a.purchased_qty || 0;
					bValue = b.purchased_qty || 0;
					break;
				case 'sold_qty':
					aValue = a.sold_qty || 0;
					bValue = b.sold_qty || 0;
					break;
				case 'purchase_total':
					aValue = a.purchase_total || 0;
					bValue = b.purchase_total || 0;
					break;
				case 'sold_total':
					aValue = a.sold_total || 0;
					bValue = b.sold_total || 0;
					break;
				case 'average_price':
					aValue = a.average_price || 0;
					bValue = b.average_price || 0;
					break;
				case 'sold_average_price':
					aValue = a.sold_average_price || 0;
					bValue = b.sold_average_price || 0;
					break;
				case 'max_price':
					aValue = a.max_price || 0;
					bValue = b.max_price || 0;
					break;
				case 'min_price':
					aValue = a.min_price || 0;
					bValue = b.min_price || 0;
					break;
				case 'ganancia':
					aValue = a.ganancia || 0;
					bValue = b.ganancia || 0;
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
