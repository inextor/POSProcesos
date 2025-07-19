import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Consumption, Item } from '../../modules/shared/RestModels';
import { RestResponse, RestSimple } from '../../modules/shared/services/Rest';
import { DataRelation } from '../../modules/shared/services/RelationResponse';
import { forkJoin, mergeMap, of } from 'rxjs';

@Component({
	selector: 'app-list-consumption',
	standalone: true,
	imports: [CommonModule, DatePipe],
	templateUrl: './list-consumption.component.html',
	styleUrls: ['./list-consumption.component.css']
})
export class ListConsumptionComponent extends BaseComponent implements OnInit
{
	public consumption_list: Consumption[] = [];
	rest_consumption:RestSimple<Consumption> = this.rest.initRestSimple<Consumption>('consumption');
	rest_item:RestSimple<Item> = this.rest.initRestSimple<Item>('item');
    consumption_info_list: any[] = [];

	ngOnInit(): void
	{
		this.is_loading = true;

		let relations:DataRelation<Item>[] = [
			{
				rest: this.rest.initRestSimple<Item>('item'),
				source_field: 'item_id',
				target_field: 'id',
				is_multiple: true,
				name: 'item_info',
				relations:
				[
					{
						rest: this.rest.initRestSimple<Category>('category'),
						source_field: 'category_id',
						target_field: 'id',
						target_obj: 'category'
					}
				]
			},
			{
				rest: this.rest.initRestSimple<Item>('production_area'),
				source_field: 'production_area_id',
				target_field: 'id'
			},
			{
				rest: this.rest.initRestSimple<Item>('store'),
				source_field: 'store_id',
				target_field: 'id'
			}
		];

		this.sink = this.rest_consumption.searchWithRelations({},relations).subscribe
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
