import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Consumption, Item, Production_Area, Store } from '../../modules/shared/RestModels';
import { RestResponse, RestSimple } from '../../modules/shared/services/Rest';
import { forkJoin, mergeMap, of } from 'rxjs';

@Component({
	selector: 'app-list-consumption',
	standalone: true,
	imports: [CommonModule ],
	templateUrl: './list-consumption.component.html',
	styleUrls: ['./list-consumption.component.css']
})
export class ListConsumptionComponent extends BaseComponent implements OnInit
{
	public consumption_list: Consumption[] = [];
	consumption_info_list: any[] = [];

	rest_consumption:RestSimple<Consumption> = this.rest.initRestSimple<Consumption>('consumption');
	rest_category:RestSimple<Category> = this.rest.initRestSimple<Category>('category');
	rest_item:RestSimple<Item> = this.rest.initRestSimple<Item>('item');
	rest_production_area:RestSimple<Production_Area> = this.rest.initRestSimple<Production_Area>('production_area');
	rest_store:RestSimple<Store> = this.rest.initRestSimple<Store>('store');

	ngOnInit(): void
	{
		this.is_loading = true;

		let item_relation = this.rest_item.getRelation('item_id');
		item_relation.name = 'item_info';
		item_relation.target_obj = 'item';
		item_relation.relations = [this.rest_category.getRelation('category_id')];

		this.sink = this.rest_consumption.searchWithRelations
		(
			{},
			[
				item_relation,
				this.rest_production_area.getRelation('production_area_id'),
				this.rest_store.getRelation('store_id'),
			]
		)
		.subscribe
		({
			next: (response:RestResponse<any>) =>
			{
				console.log('response',response);
				this.consumption_info_list = response.data;
				this.is_loading = false;
			},
			error: error => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}
}
