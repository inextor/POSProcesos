import { Component, OnInit } from '@angular/core';
import { RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Item_Online, Store } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from "../../components/loading/loading.component";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-save-item-online',
	standalone: true,
	imports: [CommonModule, FormsModule, LoadingComponent],
	templateUrl: './save-item-online.component.html',
	styleUrls: ['./save-item-online.component.css']
})
export class SaveItemOnlineComponent extends BaseComponent implements OnInit {

	item_online: Item_Online = GetEmpty.item_online();
	rest_item_online: RestSimple<Item_Online> = this.rest.initRestSimple('item_online', ['item_id', 'store_id']);
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store');
	search_item_online: SearchObject<Item_Online> = this.rest_item_online.getEmptySearch();
	store_list: Store[] = [];

	ngOnInit() {
		this.sink = this.route.paramMap.pipe
		(
			mergeMap(param_map =>
			{
				this.search_item_online = this.rest_item_online.getSearchObject(param_map);
				this.search_item_online.limit = this.page_size;
				this.current_page = this.search_item_online.page;

				let item_online_obs = param_map.has('item_id')
					? this.rest_item_online.get(this.search_item_online)
					: of(GetEmpty.item_online());

				let stores = this.store_list.length > 0
					? of({ data: this.store_list, total: this.store_list.length })
					: this.rest_store.search({ limit: 9999999, eq: { status: 'ACTIVE' } });

				return forkJoin
				({
					item_online: item_online_obs,
					stores: this.rest_store.search({ limit: 9999999, eq: { status: 'ACTIVE' } })
				});
			})
		).subscribe
		({
			next: (response) => {
				this.is_loading = false;
				this.item_online = response.item_online;
				this.store_list = response.stores.data;
			},
			error: (error: any) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		});
	}

	save($event: Event) {
		let on_response = {
			next: (response: Item_Online) => {
				this.is_loading = false;
				this.location.back();
			},
			error: (error: any) => {
				this.is_loading = false;
				this.rest.showError(error);
			}
		};

		this.subs.sink = this.item_online.id
			? this.rest_item_online.update(this.item_online).subscribe(on_response)
			: this.rest_item_online.create(this.item_online).subscribe(on_response);
	}
}
