import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, withFetch } from '@angular/common/http';
import { RestService } from '../../modules/shared/services/rest.service';
import { Production_Area } from '../../modules/shared/RestModels';
import { RestSimple } from '../../modules/shared/Rest';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { mergeMap, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Signal } from '@angular/core';

@Component({
	selector: 'app-save-production-area',
	standalone: true,
	imports: [CommonModule,HttpClientModule,FormsModule],
	templateUrl: './save-production-area.component.html',
	styleUrl: './save-production-area.component.css'
})

export class SaveProductionAreaComponent implements OnInit
{
	production_area_rest: RestSimple<Production_Area>;
	production_area = GetEmpty.production_area();
	is_loading:boolean = false;

	constructor(private rest:RestService,private route:ActivatedRoute,private router:Router)
	{
		this.production_area_rest = rest.initRestSimple<Production_Area>('production_area');
	}

	ngOnInit()
	{
		this.subs.sync = this.route.paramMap.pipe
		(
			mergeMap((paramMap)=>
			{
				return paramMap.has('id')
					? this.production_area_rest.get( paramMap.get('id' ) )
					: of( GetEmpty.production_area() );
			}),
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.production_area = response;
		})
	}

	ngOnDestroy()
	{
		//this.subs.unsubscribe();
	}

	save(evt:Event)
	{
		evt.preventDefault();

		this.is_loading = true;

		this.production_area_rest
		.create( this.production_area )
		.subscribe((production_area)=>
		{
			//location.back();
		})
	}
}
