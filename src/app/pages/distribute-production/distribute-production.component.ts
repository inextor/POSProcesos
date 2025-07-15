import { Component } from '@angular/core';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Item, Production } from '../../modules/shared/RestModels';
import { ItemInfo, ProductionInfo } from '../../modules/shared/Models';
import { forkJoin, mergeMap } from 'rxjs';
import { RestResponse } from '../../modules/shared/services/Rest';
import { Utils } from '../../modules/shared/Utils';

@Component
({
	selector: 'app-distribute-production',
	imports: [],
	templateUrl: './distribute-production.component.html',
	styleUrl: './distribute-production.component.css'
})
export class DistributeProductionComponent extends BaseComponent
{

	production_info_vars:string[] = ['name','description','production_type','production_area','production_date','quantity','price','total','status','user_id','created','modified'];
	rest_production_info = this.rest.initRest<Production,ProductionInfo>('production-info', this.production_info_vars);
	rest_item_info = this.rest.initRest<Item,ItemInfo>('item_info');
	search_production_info = this.rest_production_info.getEmptySearch();

	ngOnInit()
	{
		this.path = '/distribuir-produccion';

		this.getQueryParamObservable().pipe
		(
			mergeMap(([query,_params])=>
			{
				this.search_production_info = this.rest_production_info.getSearchObject(query);
				this.search_production_info.limit = this.page_size;
				this.current_page = this.search_production_info.page;
				return this.rest_production_info.search(this.search_production_info);
			})
			,mergeMap((response:RestResponse<ProductionInfo>)=>
			{
				let cat_ids = response.data.map(pi=>pi.item.category_id).filter(i=>i!=null);

				let category_ids = Utils.getUnique(cat_ids);

				return forkJoin
				({
					items: this.rest_item_info.search({csv:{category_id:category_ids}, limit:999999}),
					productions: response
				});
			}
		)
		.subscribe((response:any)=>
		{
			this.setPages(this.current_page, response.productions.total);
		});
	}
}
