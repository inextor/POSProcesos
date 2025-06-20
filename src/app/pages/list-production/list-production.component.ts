import { Component } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Production, Store } from '../../modules/shared/RestModels';
import { SearchObject } from '../../modules/shared/services/Rest';
import { ProductionInfo } from '../../modules/shared/Models';
import { forkJoin, mergeMap } from 'rxjs';
import {DatePipe} from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CProductionInfo extends ProductionInfo
{
	store:Store;
}

@Component({
	selector: 'app-list-production',
	imports: [DatePipe, FormsModule],
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

	start_date:string = '';
	end_date:string = '';

	ngOnInit()
	{
		this.path = '/list-production';

		this.sink = this.getQueryParamObservable()
		.pipe
		(
			mergeMap(([_params,query_param_map])=>
			{
				this.production_search = this.rest_production_info.getSearchObject(query_param_map);
				this.current_page = this.production_search.page;

				console.log(this.production_search);

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
				//this.production_info_list = data.productions.data.map(p=>this.mapProductionInfo(p));
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
}
