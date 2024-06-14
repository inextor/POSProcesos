import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Item, Production_Area_Item } from '../../modules/shared/RestModels';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin } from 'rxjs';
import { RestSimple } from '../../modules/shared/services/Rest';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-save-production-area-item',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseComponent],
  templateUrl: './save-production-area-item.component.html',
  styleUrl: './save-production-area-item.component.css'
})
export class SaveProductionAreaItemComponent extends BaseComponent implements OnInit{

	//CURRENTLY NOT BEING USED
	@Input() production_area_id:number = 0;
	rest_production_area_item:RestSimple<Production_Area_Item> = this.rest.initRestSimple<Production_Area_Item>('production_area_item');
	rest_item:RestSimple<Item> = this.rest.initRestSimple<Item>('item');

	production_area_item:Partial<Production_Area_Item>	= {};
	item_list:Item[] = [];
	production_area_item_list:Production_Area_Item[] = [];


	ngOnInit()
	{
		this.route.paramMap.subscribe( params =>
		{
			//this.company = this.rest.getCompanyFromSession();
				this.is_loading = true;
				if( params.has('id') )
				{
					this.subs.sink = forkJoin({
						production_area_item : this.rest_production_area_item.search({ eq:{id:parseInt(params.get('id') as string )} }),
						item : this.rest_item.search({limit:9999}),
					})
					.subscribe((responses)=>
					{
						this.production_area_item = responses.production_area_item.data[0];
						this.item_list = responses.item.data;
						this.production_area_item_list = responses.production_area_item.data;
						this.is_loading = false;
					},(error)=>this.showError(error));
				}
				else
				{
					this.subs.sink	= forkJoin({
						item : this.rest_item.search({limit:9999}),
						production_area_item : this.rest_production_area_item.search({limit:9999})
					})
					.subscribe((responses)=>
					{
						this.item_list = responses.item.data;
						this.production_area_item_list = responses.production_area_item.data;
						this.is_loading = false;
					},(error)=>this.showError(error));
				}
		});
	}

	save()
	{
		this.is_loading = true;

		if( this.production_area_item.id	)
		{
			this.subs.sink	= this.rest_production_area_item.update( this.production_area_item ).subscribe((production_area_item)=>{
				this.is_loading = false;
				this.showSuccess('production area item se actualizo exitosamente');
				this.location.back();
			},(error)=>this.showError(error));
		}
		else
		{
			this.subs.sink	= this.rest_production_area_item.create( this.production_area_item ).subscribe((production_area_item)=>{
				this.is_loading = false;
				this.showSuccess('production area item se guardo exitosamente');
				this.location.back();
			},(error)=>this.showError(error));
		}
	}
}
