import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Category, Consumption, Ecommerce, Item } from '../../modules/shared/RestModels';
import { RestResponse, RestSimple } from '../../modules/shared/services/Rest';
import { DataRelation } from '../../modules/shared/services/RelationResponse';

@Component({
	selector: 'app-list-consumption',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './list-consumption.component.html',
	styleUrls: ['./list-consumption.component.css']
})
export class ListConsumptionComponent extends BaseComponent implements OnInit
{
	public consumption_list: Consumption[] = [];
	//rest_consumption:RestSimple<Consumption> = this.rest.initRestSimple<Consumption>('consumption');
	//rest_item:RestSimple<Item> = this.rest.initRestSimple<Item>('item');
    //consumption_info_list: any[] = [];

	rest_ecommerce_info_list: any[] = [];

	rest_ecommerce:RestSimple<Ecommerce> = this.rest.initRestSimple<Ecommerce>('ecommerce');
	rest_ecommerce_item:RestSimple<Item> = this.rest.initRestSimple<Item>('ecommerce_item');


	ngOnInit(): void
	{
		this.is_loading = true;

		let relations:DataRelation<Item>[] = [
			{
				rest: this.rest.initRestSimple<Item>('item'),
				source_field: 'item_id',
				target_field: 'id',
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
				rest: this.rest.initRestSimple<Item>('store'),
				source_field: 'store_id',
				target_field: 'id'
			},
			{
				rest: this.rest.initRestSimple<Item>('ecommerce'),
				source_field: 'ecommerce_id',
				target_field: 'id',

			},

		];


		//this.sink = this.rest_consumption.searchWithRelations({},relations).subscribe
		//({
		//	next: (response:RestResponse<any>) =>
		//	{
		//		console.log('response',response);
		//		this.consumption_info_list = response.data;
		//		this.is_loading = false;
		//	},
		//	error: error => {
		//		this.showError(error);
		//		this.is_loading = false;
		//	}
		//});

		this.rest_ecommerce_item.searchWithRelations({},relations).subscribe
		({
			next: (response:RestResponse<any>) =>
			{
				console.log('response',response);
				this.rest_ecommerce_info_list = response.data;
				this.is_loading = false;
			},
			error: (error:any) => {
				this.showError(error);
				this.is_loading = false;
			}
		});
	}


}
