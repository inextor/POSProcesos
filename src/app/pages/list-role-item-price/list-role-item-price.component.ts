import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Item, Role, Role_Item_Price } from '../../modules/shared/RestModels';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { filter, forkJoin, mergeMap, of } from 'rxjs';
import { ItemInfo } from '../../modules/shared/Models';
import { SharedModule } from '../../modules/shared/SharedModule';
import { PaginationComponent } from "../../components/pagination/pagination.component";
import { LoadingComponent } from "../../components/loading/loading.component";
import { ShortDatePipe } from "../../modules/shared/pipes/short-date.pipe";
import { ItemNamePipe } from "../../modules/shared/pipes/item-name.pipe";
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { ModalComponent } from "../../components/modal/modal.component";
import { SearchItemsComponent } from "../../components/search-items/search-items.component";
import { FormsModule } from '@angular/forms';
import { ConfirmationResult } from '../../modules/shared/services/confirmation.service';

interface RoleItemPriceInfo
{
	role_item_price: Role_Item_Price;
	item: Item;
	category: Category | null;
}

@Component
({
	selector: 'app-list-role-item-price',
	imports: [CommonModule, SharedModule, PaginationComponent, LoadingComponent, ShortDatePipe, ItemNamePipe, ModalComponent, SearchItemsComponent, FormsModule],
	templateUrl: './list-role-item-price.component.html',
	styleUrl: './list-role-item-price.component.css'
})
export class ListRoleItemPriceComponent extends BaseComponent implements OnInit
{
	search_props =['id','created','updated','price','item_id','role_id'];
	rest_role_item_price:RestSimple<Role_Item_Price> = this.rest.initRestSimple('role_item_price', this.search_props);
	role_item_price_search:SearchObject<Role_Item_Price> = this.rest_role_item_price.getEmptySearch();
	role_item_price_info_list: RoleItemPriceInfo[] = []; // Changed from production_role_price_info_list to role_item_price_info_list
	rest_item_info: Rest<Item,ItemInfo> = this.rest.initRest('item_info',['id','name','created','updated']);

	role = GetEmpty.role();
	show_dialog: boolean = false;
	item_info: ItemInfo = GetEmpty.item_info();
	rest_role:  Rest<Role,Role> = this.rest.initRest('role',['id','name','created','updated']);
	price:number | ''  = '';

	ngOnInit(): void
	{
		this.path = '/list-role-item-price';

		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map:any)=>
			{
				this.role_item_price_search = this.rest_role_item_price.getSearchObject(param_map);
				this.role_item_price_search.eq.role_id = param_map.get('role_id');

				this.current_page = this.role_item_price_search.page;
				let role_id = param_map.get('role_id');

				return forkJoin
				({
					role_item_price : this.rest_role_item_price.search( this.role_item_price_search ),
					role: this.rest_role.get( role_id )
				})
			})
			,mergeMap((response)=>
			{
				this.setPages(this.current_page,response.role_item_price.total);
				this.role = response.role;

				console.log("Role ", response.role);

				let search_item = this.rest_item_info.getEmptySearch();
				search_item.csv['id'] = response.role_item_price.data.map((i:any)=>i.item_id);
				search_item.limit = 999999;

				return forkJoin
				({
					role_item_price_list: of( response.role_item_price.data ),
					item_list: this.rest_item_info.search(search_item as any)
				});
			})
		)
		.subscribe((response)=>
		{
			this.is_loading = false;

			this.role_item_price_info_list = response.role_item_price_list.map((i:any)=> // Changed from production_role_price_info_list to role_item_price_info_list
			{
				let item_info = response.item_list.data.find((ii:ItemInfo)=>ii.item.id == i.item_id) as ItemInfo;
				return { role_item_price: i, item: item_info.item, category: item_info.category };
			});
		});
	}

	onSubmit(evt: SubmitEvent)
	{
		this.is_loading = true;

		this.sink = this.rest_role_item_price.create
		({
			role_id: this.role.id,
			item_id: this.item_info.item.id,
			price: this.price
		})
		.subscribe
		({
			error:(error:any)=>this.rest.showError(error),
			next:(response)=>
			{
				this.is_loading = false;
				this.show_dialog = false;
				this.price = '';
				this.role_item_price_info_list.unshift
				({
					item: this.item_info.item,
					category: this.item_info.category,
					role_item_price: response
				});
				this.item_info = GetEmpty.item_info();
			}
		});
	}

	onItemSelected(item_info:ItemInfo)
	{
		if( item_info )
		{
			this.item_info = item_info;
			this.show_dialog = true;
		}
	}

	reset()
	{
		this.item_info = GetEmpty.item_info();
	}

	removeRoleItemPrice(role_item_price:Role_Item_Price)
	{
		this.sink = this.confirmation.showConfirmAlert
		(
			role_item_price,
			'Eliminar Precio',
			'¿Está seguro que desea eliminar este precio?',
			'Eliminar',
			'Cancelar'
		)
		.pipe
		(
			filter((response:ConfirmationResult)=>response.accepted),
			mergeMap(()=>
			{
				this.is_loading = true;
				return this.rest_role_item_price.delete(role_item_price)
			})
		)
		.subscribe
		({
			complete:()=>this.is_loading = false,
			error:(error:any)=>this.rest.showError(error),
			next:(role_item_price:Role_Item_Price)=>
			{
				this.is_loading = false;
				this.role_item_price_info_list = this.role_item_price_info_list.filter((i:any)=>i.role_item_price.id != role_item_price.id);
			}
		});
	}
}
