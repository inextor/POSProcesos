import { Component } from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import { Category, Item, Process, Production_Area } from '../../modules/shared/RestModels';
import { RestService } from '../../modules/shared/services/rest.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { forkJoin,mergeMap, of } from 'rxjs';
import { RestSimple } from '../../modules/shared/Rest';
import { FormsModule } from '@angular/forms';

interface CItem
{
	item:Item;
	category:Category | null;
}

@Component({
	selector: 'app-save-process',
	standalone: true,
	imports: [CommonModule,RouterModule,FormsModule],
	templateUrl: './save-process.component.html',
	styleUrl: './save-process.component.css'
})
export class SaveProcessComponent {

	process:Process	= GetEmpty.process();
	is_loading:boolean = false;

	production_area_list:Production_Area[] = [];
	rest_process:RestSimple<Process> = this.rest.initRestSimple('process');
	rest_production_area:RestSimple<Production_Area> = this.rest.initRestSimple('production_area');
	production_area = GetEmpty.production_area();
	rest_category:RestSimple<Category> = this.rest.initRestSimple('category');
	rest_item:RestSimple<Item> = this.rest.initRestSimple('item');
	citem_list:CItem[] = [];
	category_list:Category[] = [];

	constructor(private rest:RestService,private route:ActivatedRoute,private router:Router,private location:Location)
	{

	}

	ngOnInit()
	{
		this.route.paramMap.pipe
		(
			mergeMap((paramMap)=>
			{
				this.is_loading = true;
				return forkJoin({
					process: paramMap.has('id')
						? this.rest_process.get( paramMap.get('id' ) )
						: of( GetEmpty.process() ),
					production_area: paramMap.has('production_area_id')
						? this.rest_production_area.get( paramMap.get('production_area_id') )
						: of( GetEmpty.production_area() ),
					category: this.rest_category.getAll(),
					item: this.rest_item.getAll()
				})
			}),
			mergeMap((response)=>
			{
				this.category_list = response.category.data;

				this.citem_list = response.item.data.map((item:Item)=>
				{
					let category = this.category_list.find(c=>c.id == item.category_id) || null;

					return { category, item };
				});
				if( response.process.id )
				{
					return forkJoin
					({
						process: of( response.process ),
						production_area: this.rest_production_area.get( response.process.production_area_id )
					})
				}
				response.process.production_area_id = response.production_area.id;
				return of( response );
			})
		)
		.subscribe( response=>
		{
			this.is_loading = false;
			this.process = response.process;
			this.production_area = response.production_area;
		});
	}

	showError(a:any)
	{

	}
	showSuccess(s:any)
	{

	}

	save()
	{
		this.is_loading = true;

		if( this.process.id	)
		{
			this.rest_process.update( this.process )
			.subscribe((process:any)=>
			{
				this.is_loading = false;
				//this.showSuccess('process se actualizo exitosamente');
				this.location.back();
			},(error:any)=>this.showError(error));
		}
		else
		{
			this.rest_process.create( this.process )
			.subscribe((process:any)=>{
				this.is_loading = false;
				this.showSuccess('process se guardo exitosamente');
				this.location.back();
			},(error:any)=>this.showError(error));
		}
	}
}
