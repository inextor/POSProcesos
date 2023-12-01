import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { Production_Area,Item,Production_Area_Item, Process } from '../../modules/shared/RestModels';
import { forkJoin,of,mergeMap, Observable, Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RestSimple } from '../../modules/shared/Rest';
import { RestService } from '../../modules/shared/services/rest.service';


interface CItem
{
	item: Item,
	production_area_item:Production_Area_Item;
}

@Component({
	selector: 'app-view-production-area',
	standalone: true,
	imports: [CommonModule,RouterModule],
	templateUrl: './view-production-area.component.html',
	styleUrl: './view-production-area.component.css'
})
export class ViewProductionAreaComponent
{
	production_area_rest: RestSimple<Production_Area> = this.rest.initRestSimple<Production_Area>('production_area');
	production_area_item_rest: RestSimple<Production_Area_Item> = this.rest.initRestSimple<Production_Area_Item>('production_area_item');
	process_rest:RestSimple<Process> = this.rest.initRestSimple<Process>('process');
	item_rest:RestSimple<Item> = this.rest.initRestSimple<Item>('item');


	citem_list:CItem[] = [];
	process_list:Process[] = [];
	production_area = GetEmpty.production_area();
	is_loading = false;

	constructor(private rest:RestService,private route:ActivatedRoute,private router:Router)
	{

	}

	ngOnInit()
	{
		//this.subs.sync =
		this.route.paramMap.pipe
		(
			mergeMap((paramMap)=>
			{
				let production_area_id = parseInt( paramMap.get('id') as string) as number;
				return forkJoin
				({
						production_area: paramMap.has('id')
								? this.production_area_rest.get( paramMap.get('id' ) )
								: of( GetEmpty.production_area() ),
						process	: this.process_rest.search({eq:{production_area_id }, limit: 20 }),
						items	: this.production_area_item_rest.search({eq:{production_area_id }, limit: 20 }).pipe
						(
							mergeMap((response)=>
							{
								return forkJoin({
									items: this.item_rest.search({csv:{ id: response.data.map((pai:Production_Area_Item)=>pai.item_id)}, limit: response.data.length}),
									production_area_items: of( response )
								})
							})
						)
					});

			}),
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.production_area = response.production_area;
			this.citem_list = response.items.production_area_items.data.map((pai:Production_Area_Item)=>
			{
				return {
					item: response.items.items.data.find((i:Item)=>pai.item_id == i.id) as Item,
					production_area_item: pai
				};
			});
		})
	}

}
