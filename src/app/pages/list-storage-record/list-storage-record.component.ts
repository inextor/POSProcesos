import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParamMap, RouterModule } from '@angular/router';
import { forkJoin, mergeMap, of } from 'rxjs';

import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import {
	Item,
	Storage,
	Storage_Item,
	Storage_Type,
	Store,
} from '../../modules/shared/RestModels';

import { PaginationComponent } from '../../components/pagination/pagination.component';
import { LoadingComponent } from '../../components/loading/loading.component';

interface StorageInfoItem
{
	storage_item: Storage_Item;
	item: Item;
	leaf_storage: Storage | null;
	leaf_storages: Storage[];
}

interface StorageInfo
{
	storage: Storage;
	store: Store | null;
	storage_type: Storage_Type | null;
	storage_items: StorageInfoItem[];
}

interface CStorageGroup
{
	info: StorageInfo;
	collapsed: boolean;
}

@Component({
	selector: 'app-list-storage-record',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterModule, PaginationComponent, LoadingComponent],
	templateUrl: './list-storage-record.component.html',
	styleUrl: './list-storage-record.component.css'
})
export class ListStorageRecordComponent extends BaseComponent implements OnInit
{
	private readonly storage_search_fields = ['id', 'name', 'store_id', 'storage_type_id', 'item_name'];

	rest_storage_info: Rest<Storage, StorageInfo> = this.rest.initRest<Storage, StorageInfo>('storage_info', this.storage_search_fields);
	rest_store: RestSimple<Store> = this.rest.initRestSimple<Store>('store');
	rest_storage_type: RestSimple<Storage_Type> = this.rest.initRestSimple<Storage_Type>('storage_type');

	storage_search: SearchObject<Storage> = this.rest_storage_info.getEmptySearch();
	storage_groups: CStorageGroup[] = [];

	store_list: Store[] = [];
	storage_type_list: Storage_Type[] = [];

	item_name_filter: string = '';
	storage_name_filter: string = '';

	ngOnInit(): void
	{
		this.path = '/list-storage-record';
		this.setTitle('Articulos por Almacén');

		this.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map: ParamMap) =>
			{
				this.is_loading = true;

				this.storage_search = this.rest_storage_info.getSearchObject(param_map, this.storage_search_fields, []);
				this.storage_search.limit = this.page_size;
				this.current_page = this.storage_search.page;
				this.item_name_filter = ((this.storage_search.lk as any).item_name as string) || '';
				this.storage_name_filter = (this.storage_search.lk.name as string) || '';

				if (!this.storage_search.eq.store_id && !this.rest.user_permission.global_add_stock)
				{
					this.storage_search.eq.store_id = this.rest.user?.store_id ?? undefined;
				}

				let supports_load = forkJoin
				({
					stores: this.store_list.length
						? of({ data: this.store_list, total: this.store_list.length })
						: this.rest_store.search({ limit: 999999, eq: { status: 'ACTIVE' } }),
					storage_types: this.storage_type_list.length
						? of({ data: this.storage_type_list, total: this.storage_type_list.length })
						: this.rest_storage_type.search({ limit: 999999, sort_order: ['sort_weight_ASC', 'name_ASC'] })
				});

				return forkJoin
				({
					supports: supports_load,
					storage_info: this.rest_storage_info.search(this.storage_search)
				});
			})
		).subscribe
		({
			next: (response) =>
			{
				this.is_loading = false;
				this.store_list = response.supports.stores.data;
				this.storage_type_list = response.supports.storage_types.data;

				this.setPages(this.current_page, response.storage_info.total);
				this.storage_groups = response.storage_info.data.map((info) => ({
					info,
					collapsed: false
				}));
			},
			error: (error) =>
			{
				this.showError(error);
			}
		});
	}

	performSearch(): void
	{
		let item_name = this.item_name_filter.trim();
		(this.storage_search.lk as any).item_name = item_name || null;

		let storage_name = this.storage_name_filter.trim();
		this.storage_search.lk.name = storage_name || undefined;

		this.search(this.storage_search);
	}

	clearFilters(): void
	{
		this.item_name_filter = '';
		this.storage_name_filter = '';
		this.storage_search = this.rest_storage_info.getEmptySearch();

		if (!this.rest.user_permission.global_add_stock)
		{
			this.storage_search.eq.store_id = this.rest.user?.store_id ?? undefined;
		}

		this.search(this.storage_search);
	}

	toggleGroup(group: CStorageGroup): void
	{
		group.collapsed = !group.collapsed;
	}

	leafTooltip(leaf_storages: Storage[]): string
	{
		return leaf_storages
			.slice(1)
			.map((s) => s.name || ('Almacén #' + s.id))
			.join(', ');
	}
}
