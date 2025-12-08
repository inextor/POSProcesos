import { Component } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Production, Store } from '../../modules/shared/RestModels';
import { SearchObject } from '../../modules/shared/services/Rest';
import { ProductionInfo } from '../../modules/shared/Models';
import { forkJoin, mergeMap } from 'rxjs';
import {DatePipe} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../modules/shared/Utils';
import { PaginationComponent } from "../../components/pagination/pagination.component";

interface CProductionInfo extends ProductionInfo
{
	store:Store;
}

@Component({
	selector: 'app-list-production',
	imports: [DatePipe, FormsModule, PaginationComponent],
	templateUrl: './list-production.component.html',
	styleUrl: './list-production.component.css'
})
export class ListProductionComponent extends BaseComponent
{
	rest_production_info = this.rest.initRest<Production,ProductionInfo>('production_info',['id','name','store_id','created','qty','alternate_qty','status','production_area_id'])
	rest_store = this.rest.initRestSimple<Store>('store');
	production_search: SearchObject<Production> = this.rest_production_info.getEmptySearch();
	production_info_list: CProductionInfo[] = [];
	store_list: Store[] = [];

	fecha_inicial: string | Date = '';
	fecha_final: string | Date = '';

	ngOnInit()
	{
		this.path = '/list-production';

		this.sink = this.route.queryParamMap
		.pipe
		(
			mergeMap((query_param_map)=>
			{
				this.is_loading = true;

				if(query_param_map.has('eq.store_id'))
				{
					let store_id = query_param_map.get('eq.store_id');
					this.production_search.eq.store_id = store_id ? parseInt(store_id) : undefined;
				}

				if(query_param_map.has('page'))
				{
					let page = query_param_map.get('page');
					this.production_search.page = page ? parseInt(page) : 0;
				}
				this.current_page = this.production_search.page;

				if(query_param_map.has('ge.created'))
				{
					let start = Utils.getDateFromUTCMysqlString(query_param_map.get('ge.created') as string);
					this.production_search.ge.created = start;
					this.fecha_inicial = Utils.getLocalMysqlStringFromDate(start).replace(' ', 'T');
				}
				else
				{
					let start = new Date();
					start.setHours(0, 0, 0, 0);
					this.production_search.ge.created = start;
					this.fecha_inicial = Utils.getLocalMysqlStringFromDate(start).replace(' ', 'T');
				}

				if(query_param_map.has('le.created'))
				{
					let end = Utils.getDateFromUTCMysqlString(query_param_map.get('le.created') as string);
					this.production_search.le.created = end;
					this.fecha_final = Utils.getLocalMysqlStringFromDate(end).replace(' ', 'T');
				}
				else
				{
					let end = new Date();
					end.setHours(23, 59, 59);
					this.production_search.le.created = end;
					this.fecha_final = Utils.getLocalMysqlStringFromDate(end).replace(' ', 'T');
				}

				return forkJoin
				({
					productions: this.rest_production_info.search(this.production_search),
					stores: this.rest_store.search({limit:999999,sort_order:['name_ASC']})
				})
			})
		)
		.subscribe
		({
			next:( response )=>
			{
				this.store_list = response.stores.data;
				this.production_info_list = response.productions.data.map(p=>this.mapProductionInfo(p));
				this.setPages( this.current_page, response.productions.total );
			},
			error: error => this.showError(error),
			complete: () => this.is_loading = false
		});
	}

	mapProductionInfo(production_info:ProductionInfo):CProductionInfo
	{
		return {
			...production_info,
			store: this.store_list.find(s=>s.id == production_info.production.store_id) as Store
		}
	}

	fechaInicialChange(fecha: string)
	{
		this.fecha_inicial = fecha;
		if( fecha )
		{
			let dateString = fecha.replace('T', ' ') + ':00';
			this.production_search.ge.created = Utils.getDateFromLocalMysqlString(dateString);
		}
	}

	fechaFinalChange(fecha: string)
	{
		this.fecha_final = fecha;
		if( fecha )
		{
			let dateString = fecha.replace('T', ' ') + ':00';
			this.production_search.le.created = Utils.getDateFromLocalMysqlString(dateString);
		}
	}
}
