import { Component, OnInit, Injector } from '@angular/core';
import { RestService } from '../../modules/shared/services/rest.service';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestResponse, SearchObject } from '../../modules/shared/services/Rest';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of, Subject, debounceTime, distinctUntilChanged, switchMap, Observable } from 'rxjs';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Category_Store } from '../../modules/shared/RestModels/Category_Store';
import { Category, Store } from '../../modules/shared/RestModels';
import { ParamMap, RouterLink } from '@angular/router';

interface CCategoryStore
{
	category_store: Category_Store;
	category: Category;
	store: Store;
}

@Component({
	selector: 'app-list-category-store',
	templateUrl: './list-category-store.component.html',
	styleUrls: ['./list-category-store.component.css'],
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink]
})
export class ListCategoryStoreComponent extends BaseComponent implements OnInit {

	ccategory_store: CCategoryStore[] = [];
	store_list: Store[] = [];
	rest_category_store: Rest<Category_Store, Category_Store> = this.rest.initRestSimple('category_store', ['id', 'category_id', 'store_id']);
	rest_store: Rest<Store, Store> = this.rest.initRestSimple('store');
	rest_category: Rest<Category, Category> = this.rest.initRestSimple('category');

	search_object: SearchObject<Category_Store> = this.rest_category_store.getEmptySearch();

	// Modal variables
	show_modal: boolean = false;
	category_search: string = '';
	category_list: Category[] = [];
	new_category_store: any = GetEmpty.category_store();
	selected_category: Category | null = null;
	private search_subject: Subject<string> = new Subject<string>();

	ngOnInit()
	{
		this.subs.sink = this.getQueryParamObservable().pipe
		(
			mergeMap(([query_params, param_map]) =>
			{
				let stores = this.store_list.length > 0
					? of({ data: this.store_list, total: this.store_list.length })
					: this.rest_store.search({ limit: 9999999 });

				let category_relation = this.rest_category.getRelation('category_id');
				let relations = [ this.rest_store.getRelation('store_id'), category_relation ];
				let search_object = this.rest_category_store.getSearchObject(query_params);

				return forkJoin
				({
					category_store: this.rest_category_store.searchWithRelations(search_object, relations),
					stores: stores as Observable<RestResponse<Store>>
				})
			})
		)
		.subscribe
		({
			next: (response) =>
			{
				console.log('response', response);
				this.store_list = response.stores.data;
				this.ccategory_store = response.category_store.data;
			},
			error: (error) =>
			{
				this.showError(error);
				this.is_loading = false;
			}
		})

		//j// Setup search subject with debounce
		//jthis.subs.sink = this.search_subject.pipe(
		//j	debounceTime(300),
		//j	distinctUntilChanged(),
		//j	switchMap(searchTerm => {
		//j		if (searchTerm.length < 2) {
		//j			this.category_list = [];
		//j			return of({ data: [], total: 0 });
		//j		}
		//j		return this.rest_category.search({
		//j			limit: 10,
		//j			like: { name: searchTerm }
		//j		});
		//j	})
		//j).subscribe({
		//j	next: (response) => {
		//j		this.category_list = response.data;
		//j	},
		//j	error: (error) => {
		//j		this.showError(error);
		//j	}
		//j});
	}

	openModal()
	{
		this.show_modal = true;
		this.new_category_store = GetEmpty.category_store();
		this.new_category_store.pos_preference = 'SHOW';
		this.category_search = '';
		this.category_list = [];
		this.selected_category = null;
	}

	closeModal()
	{
		this.show_modal = false;
	}

	onSearchInput()
	{
		this.search_subject.next(this.category_search);
	}

	selectCategory(category: Category)
	{
		this.selected_category = category;
		this.new_category_store.category_id = category.id;
	}

	clearSelection()
	{
		this.selected_category = null;
		this.new_category_store.category_id = 0;
	}

	saveCategoryStore()
	{
		// Validar que se haya seleccionado una categoría
		if (!this.new_category_store.category_id || this.new_category_store.category_id === 0) {
			this.rest.showError('Debe seleccionar una categoría');
			return;
		}

		// Validar que se haya seleccionado una tienda
		if (!this.new_category_store.store_id || this.new_category_store.store_id === 0) {
			this.rest.showError('Debe seleccionar una tienda');
			return;
		}

		console.log('Enviando category_store:', this.new_category_store);

		this.is_loading = true;
		this.subs.sink = this.rest_category_store.update(this.new_category_store).subscribe({
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
