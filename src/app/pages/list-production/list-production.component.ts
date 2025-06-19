import { Component } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Production, Store } from '../../modules/shared/RestModels';
import { SearchObject } from '../../modules/shared/services/Rest';
import { ProductionInfo } from '../../modules/shared/Models';
import { forkJoin, mergeMap } from 'rxjs';

@Component({
  selector: 'app-list-production',
  imports: [],
  templateUrl: './list-production.component.html',
  styleUrl: './list-production.component.css'
})
export class ListProductionComponent extends BaseComponent
{

	rest_production_info = this.rest.initRest<Production,ProductionInfo>('production_info');
	rest_store = this.rest.initRestSimple<Store>('store');
	production_search: SearchObject<Production> = this.rest_production_info.getEmptySearch();
	production_info_list: ProductionInfo[] = [];
	store_list: Store[] = [];

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

				return forkJoin
				({
					productions: this.rest_production_info.search({limit:999999,sort_order:['name_ASC']}),
					stores: this.rest_store.search({limit:999999,sort_order:['name_ASC']})
				})
			})
		)
		.subscribe
		({
			next:( data )=>
			{
				this.production_info_list = data.productions.data;
				this.store_list = data.stores.data;
				this.setPages( this.current_page, data.productions.total );
			},
			error: error => this.showError(error),
			complete: () => this.is_loading = false
		});
	}
}
