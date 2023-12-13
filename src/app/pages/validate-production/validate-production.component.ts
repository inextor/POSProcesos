import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Production } from '../../modules/shared/RestModels';
import { Rest, RestSimple } from '../../modules/shared/Rest';

interface CProduction
{
	production_list:Production[];
	item_id:number;
}

@Component({
	selector: 'app-validate-production',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './validate-production.component.html',
	styleUrl: './validate-production.component.css'
})

export class ValidateProductionComponent extends BaseComponent
{
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production');
	production_list:CProduction[] = [];
	rest_item:Rest<Item,Item

	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				let production_area_id = parseInt( param_map.get('production_area_id')  as string ) as number;
				return  this.rest_production.search({ eq:{ production_area_id } });
			}),
			mergeMap((response)=>{

				let ids = new Map<number,number>();

				response.data.forEach((i)=>ids.set(i.item_id, i.item_id ));

				return forkJoin
				({
					production: of( response )
					items: of(
				})
			})
		)
		.subscribe((response)=>
		{
			for(let r of response.production.data)
			{
				let pl = this.production_list.find(i => i.item_id == r.item_id );

				if( pl )
				{
					pl.production_list.push( r );
				}
				else
				{
					this.production_list.push
					({
						item_id: r.item_id,
						production_list: [ r ]
					});
				}
			}
		})
	}
}
