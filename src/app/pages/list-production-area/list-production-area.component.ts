import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { RestSimple } from '../../modules/shared/Rest';
import { Production_Area } from '../../modules/shared/RestModels';
import { RestService } from '../../modules/shared/services/rest.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { mergeMap, Observable, Subscription } from 'rxjs';
import { BaseComponent } from '../../modules/shared/base/base.component';
import {Location} from '@angular/common';

@Component({
	selector: 'app-list-production-area',
	standalone: true,
	imports: [CommonModule,RouterModule],
	templateUrl: './list-production-area.component.html',
	styleUrl: './list-production-area.component.css'
})
export class ListProductionAreaComponent
{
	production_area_rest: RestSimple<Production_Area> = this.rest.initRestSimple<Production_Area>('production_area');
	production_area_list:Production_Area[] = [];
	is_loading:boolean = false;
	obs: Subscription | null = null;

	constructor(private rest:RestService,private route:ActivatedRoute,private router:Router)
	{
	}

	ngOnInit()
	{
		//this.subs.sync =
		this.obs = this.route.paramMap.pipe
		(
			mergeMap((_paramMap)=>
			{
				return this.production_area_rest.search({})
			}),
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.production_area_list = response.data;
		})
	}

	ngOnDestroy()
	{
		if( this.obs )
			this.obs.unsubscribe();
		//this.subs.unsubscribe();
	}

}
