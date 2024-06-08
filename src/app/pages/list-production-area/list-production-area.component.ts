import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestSimple } from '../../modules/shared/services/Rest';
import { Production_Area } from '../../modules/shared/RestModels';
import { RouterModule } from '@angular/router';
import { mergeMap } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';

@Component({
	selector: 'app-list-production-area',
	standalone: true,
	imports: [CommonModule,RouterModule],
	templateUrl: './list-production-area.component.html',
	styleUrl: './list-production-area.component.css'
})
export class ListProductionAreaComponent extends BaseComponent implements OnInit
{
	production_area_rest: RestSimple<Production_Area> = this.rest.initRestSimple<Production_Area>('production_area');
	production_area_list:Production_Area[] = [];

	ngOnInit()
	{	
		this.is_loading = true;
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((_paramMap)=>
			{
				return this.production_area_rest.search({limit:99999})
			}),
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.production_area_list = response.data;
		})
	}

}
