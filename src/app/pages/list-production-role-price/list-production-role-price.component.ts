import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Item, Production_Role_Price } from '../../modules/shared/RestModels';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { forkJoin, mergeMap, of } from 'rxjs';
import { ItemInfo } from '../../modules/shared/Models';
import { SharedModule } from '../../modules/shared/SharedModule';
import { PaginationComponent } from "../../components/pagination/pagination.component";
import { LoadingComponent } from "../../components/loading/loading.component";
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";
import { ItemNamePipe } from "../../modules/shared/pipes/item-name.pipe";

interface ProductionRolePriceInfo
{
	production_role_price: Production_Role_Price;
	item: Item;
	category: Category | null;
}

@Component({
	selector: 'app-list-production-role-price',
	standalone: true,
	imports: [CommonModule, SharedModule, PaginationComponent, LoadingComponent, ShortDatePipe, ItemNamePipe],
	templateUrl: './list-production-role-price.component.html',
	styleUrl: './list-production-role-price.component.css'
})
export class ListProductionRolePriceComponent extends BaseComponent implements OnInit
{
	search_props  =['id','created','updated','price','item_id','production_role_id'];
	rest_production_role_price:RestSimple<Production_Role_Price> = this.rest.initRestSimple('production_role_price', this.search_props);
	production_role_price_search:SearchObject<Production_Role_Price> = this.rest_production_role_price.getEmptySearch();
	production_role_price_info_list: ProductionRolePriceInfo[] = [];
	rest_item_info: Rest<Item,ItemInfo> = this.rest.initRest('item_info',['id','name','created','updated']);

	ngOnInit(): void
	{
		this.path = '/list-production-role-price';
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.production_role_price_search = this.rest_production_role_price.getSearchObject(param_map);
				this.current_page = this.production_role_price_search.page;
				return this.rest_production_role_price.search( this.production_role_price_search );
			})
			,mergeMap((response)=>
			{
				this.setPages(this.current_page,response.total);

				let search_item = this.rest_item_info.getEmptySearch();
				search_item.csv['id'] = response.data.map((i)=>i.item_id);
				search_item.limit = 999999;

				return forkJoin
				({
					production_role_price_list: of( response.data ),
					item_list: this.rest_item_info.search(search_item)
				});
			})
		)
		.subscribe((response)=>
		{
			this.is_loading = false;

			this.production_role_price_info_list = response.production_role_price_list.map((i)=>
			{
				let item_info = response.item_list.data.find((ii:ItemInfo)=>ii.item.id == i.item_id) as ItemInfo;
				return { production_role_price: i, item: item_info.item, category: item_info.category };
			});
		});
	}
}
