import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { mergeMap, of } from 'rxjs';
import { Category, Item, Production } from '../../modules/shared/RestModels';
import { Rest, RestSimple } from '../../modules/shared/services/Rest';
import { ProductionInfo } from '../../modules/shared/Models';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../modules/shared/Utils';

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

	search_start_date:string = '';
	search_end_date:string = '';

	ngOnInit()
	{
		this.subs.sink = this.route.paramMap.pipe
		(
			mergeMap((param_map)=>
			{
				let date = new Date();
				this.search_end_date = Utils.getLocalMysqlStringFromDate( date );
				date.setHours(0,0,0,0);
				this.search_start_date = Utils.getLocalMysqlStringFromDate( date );
				let production_area_id = parseInt( param_map.get('production_area_id')	as string ) as number;
				return	this.rest_production_info.search({ eq:{ production_area_id } });
			}),
		)
		.subscribe((response)=>
		{
			this.production_info_list = this.buildProductionInfoList(response.data);
		})
	}

	search()
	{
		let start = Utils.getDateFromLocalMysqlString( this.search_start_date );
		let end = Utils.getDateFromLocalMysqlString( this.search_end_date );
		this.subs.sink = this.rest_production_info.search({ ge:{ created:start }, le:{ created:end }})
		.subscribe((response)=>
		{
			this.production_info_list = this.buildProductionInfoList(response.data);
		})
	}

	buildProductionInfoList(productionInfo:ProductionInfo[])
	{
		let production_info_list:CProduction[] = [];
		for(let r of productionInfo)
		{
			let pl = production_info_list.find(i => i.item_id == r.item.id );

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
				production_info_list.push( pl );
			}
			if( r.production.verified_by_user_id == null )
			{
				pl.production_list.push({...r, qty: r.production.qty, merma_qty: r.production.merma_qty });
			}
			pl.merma += r.production.merma_qty;
			//el total deberia de ser unicamente de las producciones que han sido validadas
			if(r.production.verified_by_user_id)
			{
				pl.total += r.production.qty;
				pl.validated += r.production.qty;
			}
		}
		return production_info_list;
	}

	validate(pi: CProductionInfo)
	{
		let p = {...pi.production};
		p.qty = pi.qty;
		p.merma_qty = pi.merma_qty;

		this.subs.sink = this.rest_production
		.update(p)
		.subscribe({
			next: (response)=>
			{
				pi.production = response;
				this.showSuccess('Producción validada');
			},
			error: (error)=>
			{
				this.showError( error )
			}
		})
	}

	validateAll(pi: CProduction)
	{
		this.subs.sink = this.confirmation.showConfirmAlert(pi,'Validar todo?' ,'¿Estás seguro de validar todas las producciones?')
		.subscribe((response)=>
		{
			if(response.accepted)
			{
				//se filtran las producciones que no han sido validadas
				let production_info_list = pi.production_list.filter(p => !p.production.verified_by_user_id)
				//se obtiene la lista de producciones con la cantidad y merma
				let production_list = production_info_list.map(p => ({...p.production, qty: p.qty, merma_qty: p.merma_qty}));

				this.rest_production
				.batchUpdate(production_list)
				.subscribe({
					next: (response)=>
					{
						//se actualizan las producciones con la respuesta del servidor
						for(let p of production_info_list)
						{
							p.production = response.find(r => r.id == p.production.id) as Production;
						}
						//se actualiza el cProduction para que no muestre el boton de validar todo
						pi.validated = pi.total;
						this.showSuccess('Producción validada');
					},
					error: (error)=>
					{
						this.showError( error )
					}
				})
			}
		})
	}
}
