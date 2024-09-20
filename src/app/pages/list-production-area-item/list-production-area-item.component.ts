import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { debounceTime, forkJoin, mergeMap, of } from 'rxjs';
import { Category, Item, Production_Area, Production_Area_Item } from '../../modules/shared/RestModels';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { FormsModule } from '@angular/forms';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from '../../components/loading/loading.component';
import { ItemInfo } from '../../modules/shared/Models';

interface CProduction_Area_Item extends Production_Area_Item
{
	item:Item;
	category:Category | null;
	production_area_name:string;
}

@Component({
  selector: 'app-list-production-area-item',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SearchItemsComponent, LoadingComponent],
  templateUrl: './list-production-area-item.component.html',
  styleUrl: './list-production-area-item.component.css'
})
export class ListProductionAreaItemComponent extends BaseComponent implements OnInit
{
	rest_production_area_item: RestSimple<Production_Area_Item> = this.rest.initRestSimple<Production_Area_Item>('production_area_item');
	rest_production_area: RestSimple<Production_Area> = this.rest.initRestSimple<Production_Area>('production_area');
	rest_item_info:Rest<Item, ItemInfo> = this.rest.initRest('item_info');
	production_area_item_list:CProduction_Area_Item[] = [];
	production_area_list:Production_Area[] = [];
	production_area_item_search: SearchObject<Production_Area_Item> = this.getEmptySearch();

	ngOnInit()
	{
		this.path = 'list-production-area-item';
		this.is_loading = true;

		this.subs.sink = this.route.queryParamMap.pipe
		(
			debounceTime(1500),
			mergeMap((param_map)=>
			{
				let fields = ['production_area_id'];
				let extra_fields = ['category_name'];
				this.production_area_item_search = this.rest_production_area_item.getSearchObject(param_map, fields, extra_fields)
				this.production_area_item_search.eq.status = 'ACTIVE';
				this.production_area_item_search.limit = 99999;

				return forkJoin
				({
					production_area_item: this.rest_production_area_item.search(this.production_area_item_search),
					production_area: this.rest_production_area.search({eq:{status: 'ACTIVE'} ,limit:99999})
				});
			}),
			mergeMap((response)=>
			{
				let ids = response.production_area_item.data.map((item)=>item.item_id);

				return forkJoin
				({
					production_area_item: of(response.production_area_item),
					production_area: of(response.production_area),
					item_info: this.rest_item_info.search({csv: { id: ids }, limit: 99999})
				})
			}),
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.production_area_item_list = response.production_area_item.data.map((production_area_item)=>
			{
				let item_info = response.item_info.data.find((item_info)=>item_info.item.id === production_area_item.item_id);
				let production_area = response.production_area.data.find((production_area)=>production_area.id === production_area_item.production_area_id);

				return {
					...production_area_item,
					item: item_info?.item || GetEmpty.item(),
					production_area_name: production_area?.name || '',
					category: item_info?.category || null
				}
			});
			this.production_area_list = response.production_area.data;
		})
	}

	onItemSelected(item_info:ItemInfo):void
	{
		this.production_area_item_search.eq.item_id = item_info.item.id;
	}
}
