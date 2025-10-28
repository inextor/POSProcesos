import { Component, OnInit, Injector } from '@angular/core';
import { RestService } from '../../modules/shared/services/rest.service';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, SearchObject } from '../../modules/shared/services/Rest';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of, Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Item_Online } from '../../modules/shared/RestModels/Item_Online';
import { Category, Item, Store } from '../../modules/shared/RestModels';
import { ParamMap, RouterLink } from '@angular/router';
import { ItemInfo } from '../../modules/shared/Models';

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
	imports: [CommonModule, FormsModule, RouterLink]
})
export class ListItemOnlineComponent extends BaseComponent implements OnInit {

	items: CItemOnline[] = [];
	store_list: Store[] = [];
	rest_item_online:Rest<Item_Online,Item_Online> = this.rest.initRestSimple('item_online', ['id', 'item_id', 'store_id']);
	rest_store:Rest<Store,Store> = this.rest.initRestSimple('store');
	rest_item_info:Rest<Item,ItemInfo> = this.rest.initRest('item_info');
	//rest_item_info:Rest<Category,Category> = this.rest.initRest('item_info');

	search_object: SearchObject<Item_Online> = this.rest_item_online.getEmptySearch();

	// Modal variables
	show_modal: boolean = false;
	item_search: string = '';
	item_list: ItemInfo[] = [];
	new_item_online: Item_Online = GetEmpty.item_online();
	selected_item: ItemInfo | null = null;
	private search_subject: Subject<string> = new Subject<string>();

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

		// Setup search subject with debounce
		this.subs.sink = this.search_subject.pipe(
			debounceTime(300),
			distinctUntilChanged(),
			switchMap(searchTerm => {
				if (searchTerm.length < 2) {
					this.item_list = [];
					return of({ data: [], total: 0 });
				}
				return this.rest_item_info.search({
					limit: 5,
					search_extra: { category_name: searchTerm },
					eq: { status: 'ACTIVE' }
				});
			})
		).subscribe({
			next: (response) => {
				this.item_list = response.data;
			},
			error: (error) => {
				this.showError(error);
			}
		});
	}

	openModal()
	{
		this.show_modal = true;
		this.new_item_online = GetEmpty.item_online();
		this.new_item_online.preference = 'SHOW';
		this.item_search = '';
		this.item_list = [];
		this.selected_item = null;
	}

	closeModal()
	{
		this.show_modal = false;
	}

	onSearchInput()
	{
		this.search_subject.next(this.item_search);
	}

	selectItem(item_info: ItemInfo)
	{
		this.selected_item = item_info;
		this.new_item_online.item_id = item_info.item.id;
	}

	clearSelection()
	{
		this.selected_item = null;
		this.new_item_online.item_id = 0;
	}

	saveItemOnline()
	{
		// Validar que se haya seleccionado un artículo
		if (!this.new_item_online.item_id || this.new_item_online.item_id === 0) {
			this.rest.showError('Debe seleccionar un artículo');
			return;
		}

		// Validar que se haya seleccionado una tienda
		if (!this.new_item_online.store_id || this.new_item_online.store_id === 0) {
			this.rest.showError('Debe seleccionar una tienda');
			return;
		}

		console.log('Enviando item_online:', this.new_item_online);

		this.is_loading = true;
		this.subs.sink = this.rest_item_online.create(this.new_item_online).subscribe({
			next: (response) => {
				this.is_loading = false;
				this.closeModal();
				this.ngOnInit(); // Reload the list
			},
			error: (error) => {
				this.is_loading = false;
				this.showError(error);
			}
		});
	}
}
