import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { Category, Item, Production } from '../../modules/shared/RestModels';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';
import { ProductionInfo } from '../../modules/shared/Models';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { FormsModule } from '@angular/forms';

interface CProductionInfo extends ProductionInfo
{
	qty:number;
	merma_qty:number;
}

interface CProduction
{
	production_list:CProductionInfo[];
	item_id:number;
	item:Item;
	category:Category | null;
	total:number;
	validated:number;
	merma:number;
	expand:boolean;
}

@Component({
	selector: 'app-validate-production',
	standalone: true,
	imports: [CommonModule,ShortDatePipe,FormsModule],
	templateUrl: './validate-production.component.html',
	styleUrl: './validate-production.component.css'
})

export class ValidateProductionComponent extends BaseComponent
{
	rest_production_info:Rest<Production,ProductionInfo> = this.rest.initRest('production_info');
	rest_production:RestSimple<Production> = this.rest.initRest('production');
	production_info_list:CProduction[] = [];

	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				let production_area_id = parseInt( param_map.get('production_area_id')	as string ) as number;
				return	this.rest_production_info.search({ eq:{ production_area_id } });
			}),
		)
		.subscribe((response)=>
		{
			for(let r of response.data)
			{
				let pl = this.production_info_list.find(i => i.item_id == r.item.id );

				if( pl == undefined )
				{
					pl = {
						item_id: r.item.id,
						production_list: [],
						item: r.item,
						category: r.category,
						total: 0,
						validated: 0,
						expand: false,
						merma: 0
					};
					this.production_info_list.push( pl );
				}
				pl.production_list.push({...r, qty: r.production.qty, merma_qty: r.production.merma_qty });
				pl.total += r.production.qty;
				pl.validated += r.production.verified_by_user_id ? r.production.qty : 0;
			}
		})
	}

	validate(pi: CProductionInfo)
	{
		let p = {...pi.production};
		p.qty = pi.qty;

		this.subs.sink = this.rest_production
		.update(p)
		.subscribe({
			next: (response)=>
			{
				pi.production = response;
			},
			error: (error)=>
			{
				this.showError( error )
			}
		})
	}
}
