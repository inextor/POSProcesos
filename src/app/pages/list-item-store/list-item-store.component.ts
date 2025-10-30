import { Component, OnInit, Injector } from '@angular/core';
import { RestService } from '../../modules/shared/services/rest.service';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestResponse, SearchObject } from '../../modules/shared/services/Rest';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of, Subject, debounceTime, distinctUntilChanged, switchMap, Observable } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Item_Store } from '../../modules/shared/RestModels/Item_Store';
import { Category, Item, Store } from '../../modules/shared/RestModels';
import { ParamMap, RouterLink } from '@angular/router';
import { ItemInfo } from '../../modules/shared/Models';

interface CItemStore
{
	item_store: Item_Store;
	item_info: ItemInfo;
	store: Store;
}

@Component({
	selector: 'app-list-item-store',
	templateUrl: './list-item-store.component.html',
	styleUrls: ['./list-item-store.component.css'],
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink]
})
export class ListItemStoreComponent extends BaseComponent implements OnInit {

	citem_store: CItemStore[] = [];
	store_list: Store[] = [];
	rest_item_store: Rest<Item_Store, Item_Store> = this.rest.initRestSimple('item_store', ['id', 'item_id', 'store_id']);
	rest_store: Rest<Store, Store> = this.rest.initRestSimple('store');
	rest_item_info: Rest<Item, ItemInfo> = this.rest.initRest('item_info');

	search_object: SearchObject<Item_Store> = this.rest_item_store.getEmptySearch();

	// Modal variables
	show_modal: boolean = false;
	item_search: string = '';
	item_list: ItemInfo[] = [];
	new_item_store: any = GetEmpty.item_store();
	selected_item: ItemInfo | null = null;
	private search_subject: Subject<string> = new Subject<string>();

	ngOnInit()
	{
		this.subs.sink = this.getQueryParamObservable().pipe
		(
			mergeMap(([query_params, param_map]) =>
			{
				let stores = this.store_list.length > 0
					? of({ data: this.store_list, total: this.store_list.length })
					: this.rest_store.search({ limit: 9999999, eq: { status: 'ACTIVE' } });

				let item_relation = this.rest_item_info.getRelation('item_id');

				item_relation.source_field = 'item_id';
				item_relation.target_field = 'id';
				item_relation.target_obj = 'item';


				let relations = [ this.rest_store.getRelation('store_id'), item_relation ];
				let search_object = this.rest_item_store.getSearchObject(query_params);

				return forkJoin
				({
					item_store: this.rest_item_store.searchWithRelations(search_object, relations),
					stores: stores as Observable<RestResponse<Store>>
				})
			})
			//mergeMap((response:any) =>
			//{
			//	let item_info_obs = this.rest_item_info.search({ limit: 9999999, csv: {id: response.item_store.data.map((i:any) => i.item_store.item_id) } });
			//	this.store_list = response.stores.data;

			//	return forkJoin({
			//		item_info: item_info_obs,
			//		item_storec: of( response.item_store )
			//	});
			//}),
			//mergeMap((response) =>
			//{
			//	let x = response.item_storec.data.map((i:any) =>
			//	{
			//		i.item_info = response.item_info.data.find((z:any) => z.item.id == i.item_store.item_id);
			//		return i as CItemStore;
			//	});
			//	return of( x );
			//})
		)
		.subscribe
		({
			next: (response) =>
			{
				console.log('response', response);
				this.citem_store = response.item_store.data
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
		this.new_item_store = GetEmpty.item_store();
		this.new_item_store.pos_preference = 'SHOW';
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
		this.new_item_store.item_id = item_info.item.id;
	}

	clearSelection()
	{
		this.selected_item = null;
		this.new_item_store.item_id = 0;
	}

	saveItemStore()
	{
		// Validar que se haya seleccionado un artículo
		if (!this.new_item_store.item_id || this.new_item_store.item_id === 0) {
			this.rest.showError('Debe seleccionar un artículo');
			return;
		}

		// Validar que se haya seleccionado una tienda
		if (!this.new_item_store.store_id || this.new_item_store.store_id === 0) {
			this.rest.showError('Debe seleccionar una tienda');
			return;
		}

		console.log('Enviando item_store:', this.new_item_store);

		this.is_loading = true;
		this.subs.sink = this.rest_item_store.update(this.new_item_store).subscribe({
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
