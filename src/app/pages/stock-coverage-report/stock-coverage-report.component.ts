import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { mergeMap } from 'rxjs/operators';
import { Utils } from '../../modules/shared/Utils';
import { RestResponse, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Store } from '../../modules/shared/RestModels';
import { StockCoverage } from '../../modules/shared/Models';
import { forkJoin, Observable, of } from 'rxjs';
import { CategorySearchComponent } from '../../modules/shared/components/category-search/category-search.component';
import { ItemSearchComponent } from '../../modules/shared/components/item-search/item-search.component';
import { ItemInfoButtonComponent } from '../../components/item-info-button/item-info-button.component';

interface CStockCoverage extends StockCoverage
{
	category: Category | null;
	estatus: string;
	estatus_class: string;
	porcentaje_capped: number;
	porcentaje_display: string;
	porcentaje_tooltip: string;
	porcentaje_multiplier: number;
	dias: number;
	dias_display: string;
	dias_req: number;
	dias_req_display: string;
}

interface StockCoverageRequest
{
	store_id: number;
	start_timestamp: Date;
	end_timestamp: Date;
	category_id?: number | null;
	item_id?: number | null;
}

@Component({
	selector: 'app-stock-coverage-report',
	templateUrl: './stock-coverage-report.component.html',
	styleUrl: './stock-coverage-report.component.css',
	imports: [CommonModule, FormsModule, CategorySearchComponent, ItemSearchComponent, ItemInfoButtonComponent],
})
export class StockCoverageReportComponent extends BaseComponent implements OnInit
{
	stock_coverage_search: SearchObject<StockCoverageRequest> = this.getEmptySearch();
	stock_coverage_array: CStockCoverage[] = [];
	start_date: string = '';
	end_date: string = '';
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store', ['id', 'name', 'created', 'updated']);
	stores: Store[] = [];
	rest_category: RestSimple<Category> = this.rest.initRestSimple('category', ['id']);
	item_search_str: string = '';
	sortColumn: string = '';
	sortDirection: 'asc' | 'desc' = 'asc';
	sort_select: string = 'porcentaje_pedido_inv';

	get totalInvFisico(): number
	{
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.inv_fisico || 0), 0);
	}

	get totalDias(): number
	{
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.dias || 0), 0);
	}

	get totalDiasReq(): number
	{
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.dias_req || 0), 0);
	}

	get totalRequerido(): number
	{
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.requerido || 0), 0);
	}

	get totalInvMasPedido(): number
	{
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.inv_mas_pedido || 0), 0);
	}

	get totalSold(): number
	{
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.total_sold || 0), 0);
	}

	get avgVentaPromDiaria(): number
	{
		if (!this.stock_coverage_array.length) return 0;
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.venta_prom_diaria || 0), 0) / this.stock_coverage_array.length;
	}

	get totalVentaPromDiaria(): number
	{
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.venta_prom_diaria || 0), 0);
	}

	get avgPorcentaje(): number
	{
		if (!this.stock_coverage_array.length) return 0;
		return this.stock_coverage_array.reduce((sum, item) => sum + (item.porcentaje_capped || 0), 0) / this.stock_coverage_array.length;
	}

	get weightedPorcentaje(): number
	{
		let total_inv = this.totalInvFisico;
		if (!total_inv) return 0;
		return this.totalRequerido / total_inv * 100;
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

				this.setTitle('Cobertura de Stock');
				this.path = '/stock-coverage-report';
				this.is_loading = true;

				this.stock_coverage_search = this.getSearch(param_map, ['store_id','start_timestamp','end_timestamp','category_id','item_id'], ['item_search','_sort','sort']);

				if (this.stock_coverage_search.eq.store_id as any === 'undefined' || this.stock_coverage_search.eq.store_id as any === 'null')
				{
					this.stock_coverage_search.eq.store_id = undefined as any;
				}

				if (this.stock_coverage_search.eq.category_id as any === 'undefined' || this.stock_coverage_search.eq.category_id as any === 'null')
				{
					this.stock_coverage_search.eq.category_id = undefined;
				}

				if (this.stock_coverage_search.eq.item_id as any === 'undefined' || this.stock_coverage_search.eq.item_id as any === 'null')
				{
					this.stock_coverage_search.eq.item_id = undefined;
				}

				this.item_search_str = (this.stock_coverage_search.search_extra['item_search'] as string) || '';

				if (!this.stock_coverage_search.eq.store_id && this.rest.user?.store_id)
				{
					this.stock_coverage_search.eq.store_id = this.rest.user.store_id;
				}

				let start: Date = new Date();
				let end: Date = new Date();

				if (this.stock_coverage_search.eq.start_timestamp)
				{
					start = this.stock_coverage_search.eq.start_timestamp;
				}
				else
				{
					start = new Date();
					start.setDate(start.getDate() - 30);
					start.setHours(0, 0, 0, 0);
					this.stock_coverage_search.eq.start_timestamp = start;
				}

				if (this.stock_coverage_search.eq.end_timestamp)
				{
					end = this.stock_coverage_search.eq.end_timestamp;
				}
				else
				{
					end = new Date();
					end.setHours(23, 59, 59, 0);
					this.stock_coverage_search.eq.end_timestamp = end;
				}

				this.start_date = Utils.getLocalMysqlStringFromDate(start);
				this.end_date = Utils.getLocalMysqlStringFromDate(end);

				// Sorting: _sort preferred, fallback to sort, else default
				let sort_param = (this.stock_coverage_search.search_extra['_sort'] as string) || (this.stock_coverage_search.search_extra['sort'] as string) || 'porcentaje_pedido_inv_DESC,item_name_ASC';

				// Keep default in search_extra so URL reflects it if not already present
				if (!this.stock_coverage_search.search_extra['_sort'] && !this.stock_coverage_search.search_extra['sort'])
				{
					this.stock_coverage_search.search_extra['_sort'] = sort_param;
				}

				return this.rest.getReportByPath('getStockCoverage',
				{
					store_id: this.stock_coverage_search.eq['store_id'],
					start_timestamp: start,
					end_timestamp: end,
					category_id: this.stock_coverage_search.eq['category_id'],
					item_id: this.stock_coverage_search.eq['item_id'],
					item_search: this.stock_coverage_search.eq['item_id'] ? null : this.item_search_str,
					_sort: sort_param,
				}) as Observable<RestResponse<StockCoverage>>;
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
				this.stock_coverage_array = response.report.data.map(x=>{
					let category = response.category.data.find(c=>c.id==x.category_id);
					let estatus = x.porcentaje_pedido_inv >= 80 ? 'Bajo' : x.porcentaje_pedido_inv >= 30 ? 'Normal' : 'Excesivo';
					let estatus_class = x.porcentaje_pedido_inv >= 80 ? 'badge bg-danger' : x.porcentaje_pedido_inv >= 30 ? 'badge bg-warning text-dark' : 'badge bg-success';
					let porcentaje_capped = Math.min(x.porcentaje_pedido_inv, 999.99);
					let porcentaje_multiplier = x.inv_fisico > 0 ? x.requerido / x.inv_fisico : 0;
					let porcentaje_display = x.porcentaje_pedido_inv > 999.99 ? '>999%' : x.porcentaje_pedido_inv.toFixed(2)+'%';
					if (x.porcentaje_pedido_inv === 0 && x.inv_fisico === 0 && x.requerido > 0) porcentaje_display = '∞';
					let porcentaje_tooltip = x.porcentaje_pedido_inv > 999.99 ? x.porcentaje_pedido_inv.toFixed(2)+'% ('+porcentaje_multiplier.toFixed(1)+'x)' : '';
					let dias = x.venta_prom_diaria > 0 ? x.inv_fisico / x.venta_prom_diaria : 0;
					let dias_display = x.venta_prom_diaria > 0 ? Math.round(dias).toString() : '∞';
					let dias_req = x.venta_prom_diaria > 0 ? x.inv_mas_pedido / x.venta_prom_diaria : 0;
					let dias_req_display = x.venta_prom_diaria > 0 ? Math.round(dias_req).toString() : '∞';
					return { ...x, category: category || null, estatus, estatus_class, porcentaje_capped, porcentaje_display, porcentaje_tooltip, porcentaje_multiplier, dias, dias_display, dias_req, dias_req_display };
				});

				this.is_loading = false;
			}
		});
	}

	viewRequisitions(item: CStockCoverage)
	{
		let start = this.stock_coverage_search.eq.start_timestamp;
		let end = this.stock_coverage_search.eq.end_timestamp;

		this.router.navigate(['/requisitions-by-item'], {
			queryParams: {
				store_id: this.stock_coverage_search.eq.store_id,
				item_id: item.item_id,
				start_timestamp: start ? Utils.getUTCMysqlStringFromDate(start) : '',
				end_timestamp: end ? Utils.getUTCMysqlStringFromDate(end) : '',
			}
		});
	}

	performSearch()
	{
		this.stock_coverage_search.search_extra['item_search'] = this.stock_coverage_search.eq['item_id']
			? null
			: (this.item_search_str.trim() || null);

		// Validate UTC format will be handled by backend; but pre-validate client side for UX
		// Backend expects YYYY-MM-DD HH:MM:SS UTC; getSearch + _getParams already converts Dates via Utils.getUTCMysqlStringFromDate
		super.search(this.stock_coverage_search);
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

		this.stock_coverage_array.sort((a, b) =>
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
				case 'requerido':
					aValue = a.requerido || 0;
					bValue = b.requerido || 0;
					break;
				case 'inv_mas_pedido':
					aValue = a.inv_mas_pedido || 0;
					bValue = b.inv_mas_pedido || 0;
					break;
				case 'dias':
					aValue = a.dias || 0;
					bValue = b.dias || 0;
					break;
				case 'dias_req':
					aValue = a.dias_req || 0;
					bValue = b.dias_req || 0;
					break;
				case 'total_sold':
					aValue = a.total_sold || 0;
					bValue = b.total_sold || 0;
					break;
				case 'venta_prom_diaria':
					aValue = a.venta_prom_diaria || 0;
					bValue = b.venta_prom_diaria || 0;
					break;
				case 'porcentaje_pedido_inv':
					aValue = a.porcentaje_pedido_inv || 0;
					bValue = b.porcentaje_pedido_inv || 0;
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
