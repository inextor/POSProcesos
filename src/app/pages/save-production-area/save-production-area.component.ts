import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Production_Area, Store } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/services/Rest';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { FormsModule } from '@angular/forms';
import { forkJoin, mergeMap, of } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
	selector: 'app-save-production-area',
	standalone: true,
	imports: [CommonModule,FormsModule, BaseComponent],
	templateUrl: './save-production-area.component.html',
	styleUrl: './save-production-area.component.css'
})

export class SaveProductionAreaComponent extends BaseComponent implements OnInit
{
	production_area_rest: RestSimple<Production_Area> = this.rest.initRestSimple('production_area');
	rest_store: RestSimple<Store> = this.rest.initRestSimple('store');
	production_area = GetEmpty.production_area();
	store_list:Store[] = [];

	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((paramMap)=>
			{
				return forkJoin
				({
					production_area :	paramMap.has('id')
						? this.production_area_rest.get( paramMap.get('id' ) )
						: of( GetEmpty.production_area() ),
					store: this.rest_store.search({limit:9999999})
				})
			}),
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.store_list = response.store.data;
			this.production_area = response.production_area;
		});
	}

	save(evt:Event)
	{
		this.is_loading = true;
		evt.preventDefault();
		evt.stopPropagation();

		if( this.production_area.id )
		{
			this.production_area_rest.update( this.production_area )
			.subscribe((production_area)=>
			{
				this.is_loading = false;
				this.location.back();
			});
			return;
		}
		
		this.production_area_rest
		.create( this.production_area )
		.subscribe((production_area)=>
		{
			this.is_loading = false;
			this.location.back();
		})
		
	}
}
