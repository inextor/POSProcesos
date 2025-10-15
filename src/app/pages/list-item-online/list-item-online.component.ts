import { Component, OnInit, Injector } from '@angular/core';
import { RestService } from '../../modules/shared/services/rest.service';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, SearchObject } from '../../modules/shared/services/Rest';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Item_Online } from '../../modules/shared/RestModels/Item_Online';
import { Category, Item, Store } from '../../modules/shared/RestModels';
import { ParamMap } from '@angular/router';

interface CItemOnline
{
	item_online:Item_Online;
	item:Item;
	store:Store;
}

@Component({
	selector: 'app-list-item-online',
	templateUrl: './list-item-online.component.html',
	styleUrls: ['./list-item-online.component.css'],
	standalone: true,
	imports: [CommonModule, FormsModule]
})
export class ListItemOnlineComponent extends BaseComponent implements OnInit {

	items: CItemOnline[] = [];
	store_list: Store[] = [];
	rest_item_online:Rest<Item_Online,Item_Online> = this.rest.initRestSimple('item_online', ['id', 'item_id', 'store_id']);
	rest_store:Rest<Store,Store> = this.rest.initRestSimple('store');
	rest_item_info:Rest<Item,Item> = this.rest.initRest('item_info');
	//rest_item_info:Rest<Category,Category> = this.rest.initRest('item_info');

	search_object: SearchObject<Item_Online> = this.rest_item_online.getEmptySearch();

	ngOnInit()
	{
		this.subs.sink = this.getQueryParamObservable().pipe
		(
			mergeMap(([query_params,param_map]) =>
			{
				let stores = this.store_list.length > 0
					? of({ data:this.store_list, total: this.store_list.length })
					: this.rest_store.search({ limit:9999999, eq: { status: 'ACTIVE' } });

				let relations = [ this.rest_item_online.getRelation('item_id'), this.rest_store.getRelation('store_id') ];
				let search_object = this.rest_item_online.getSearchObject( query_params );

				return forkJoin
				({
					item_online: this.rest_item_online.searchWithRelations( search_object, relations ),
					stores: stores
				})
			})
		)
		.subscribe
		({
			next: (response) =>
			{
				this.store_list = response.stores.data;
				this.items = response.item_online.data as CItemOnline[];
			},
			error: (error) =>
			{
				this.showError(error);
				this.is_loading = false;
			}
		})
	}
}
