import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Category, Item, Production, Production_Area, Store } from '../../modules/shared/RestModels';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { ProductionInfo } from '../../modules/shared/Models';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../modules/shared/Utils';
import { ModalComponent } from '../../components/modal/modal.component';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { LoadingComponent } from '../../components/loading/loading.component';
import { PageStructureComponent } from "../../modules/shared/page-structure/page-structure.component";

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
	merma_reason?:string | null;
	expand:boolean;
}

@Component({
    selector: 'app-validate-production',
    templateUrl: './validate-production.component.html',
    styleUrl: './validate-production.component.css',
    imports: [CommonModule, FormsModule, LoadingComponent ]
})

export class ValidateProductionComponent extends BaseComponent
{
	rest_production_info:Rest<Production,ProductionInfo> = this.rest.initRest('production_info');
	rest_production:RestSimple<Production> = this.rest.initRest('production');
	rest_production_area:RestSimple<Production_Area> = this.rest.initRest('production_area');
	//rest_production_area:RestSimple<Store> = this.rest.initRest('store');
	production_info_list:CProduction[] = [];
	production_area_list:Production_Area[] = [];
	//production_area_list:Store[] = [];

	search_start_date:string = '';
	search_end_date:string = '';

	search_production:SearchObject<Production> = this.getEmptySearch();

	search_str:string = '';
	search_by_code:boolean = false;

	//item_ids que se estan validando en este momento (evita doble click / doble submit)
	validating_item_ids:Set<number> = new Set<number>();
	// show_merma_option:boolean = false;
	// selected_merma_option:string = '';
	// selected_production:CProduction | null = null;
	// selected_production_info:CProductionInfo | null = null;

	ngOnInit()
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((query_params)=>
			{
				this.setTitle('Validar Producción');

				this.path = 'validate-production';
				this.is_loading = true;

				let fields = ['production_area_id', 'created'];
				this.search_production = this.getSearch(query_params, fields, []);
				let start = new Date();
				let end = new Date();

				if (!query_params.has('le.created'))
				{
					end.setHours(23,59,59);
					this.search_production.le.created = end
				}
				this.search_end_date = Utils.getLocalMysqlStringFromDate(this.search_production.le.created as Date);

				if (!query_params.has('ge.created'))
				{
					start.setHours(0,0,0,0);
					this.search_production.ge.created = start
				}
				this.search_start_date = Utils.getLocalMysqlStringFromDate(this.search_production.ge.created as Date);

				if(!query_params.has('eq.production_area_id'))
				{
					this.search_production.eq.production_area_id = this.rest.user?.production_area_id as number;
				}

				this.search_production.eq.status = 'ACTIVE';

				let search_production_area:SearchObject<Production_Area> = this.getEmptySearch();

				search_production_area.limit = 9999;
				//search_production_area.eq.store_id = this.rest.user?.store_id as number;
				//search_production_area.eq.production_enabled = 1;

				return forkJoin({
					production_area: this.rest_production_area.search(search_production_area),
					production_info: this.rest_production_info.search(this.search_production)
				})
			}),
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			this.production_info_list = this.buildProductionInfoList(response.production_info.data);
			this.production_area_list = response.production_area.data;
			//console.log(this.production_info_list);
			this.sortValidations('');
		})
	}

	buildProductionInfoList(productionInfo:ProductionInfo[])
	{
		let production_info_list:CProduction[] = [];
		for(let r of productionInfo)
		{
			if( r.production.verified_by_user_id != null )
			{
				continue;
			}

			let pl = production_info_list.find(i => i.item_id == r.item.id );

			//meter unicamente las produccion que no han sido validadas
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
					merma: 0,
					merma_reason: ''
				};
				production_info_list.push( pl );
			}

			pl.production_list.push({...r, qty: r.production.qty, merma_qty: r.production.merma_qty });

			pl.merma += r.production.merma_qty;
			//el total deberia de ser unicamente de las producciones que han sido validadas
			pl.total += r.production.qty + r.production.merma_qty;
			pl.validated += r.production.qty;

		}
		return production_info_list;
	}

	changeSearch()
	{
		this.search_by_code = !this.search_by_code;
		this.sortValidations(this.search_str);
	}

	sortValidations(str:string)
	{
		if(str == '')
		{
			this.production_info_list = this.production_info_list.sort((a,b)=> a.item.name.localeCompare(b.item.name));
			return;
		}
		const sort_by = this.search_by_code ? 'code' : 'name';
		const sortFunction =  (a:CProduction,b:CProduction) =>
		{
			const a_lower = a.item[sort_by]?.toLowerCase() || '';
		   const b_lower = b.item[sort_by]?.toLowerCase() || '';
			const a_category_name = `${a.category?.name.toLowerCase() + ' ' || '' }` + a_lower;
		   const b_category_name = `${b.category?.name?.toLowerCase() + ' ' || ''}` + b_lower;
		   const a_index = a_category_name.indexOf(str.toLowerCase());
		   const b_index = b_category_name.indexOf(str.toLowerCase());

		   if (a_index === -1 && b_index === -1) {
			 return a_category_name.localeCompare(b_category_name);
		   }

		   return a_index === -1 ? 1 : b_index === -1 ? -1 : a_index - b_index;
		};

		this.production_info_list.sort(sortFunction);
	}

	validateAll(pi: CProduction)
	{
		//si hay mermas, se abre un modal para seleccionar la opcion de merma
		if(pi.merma > 0 && (pi.merma_reason == '' || pi.merma_reason == null))
		{
			return this.showError('Selecciona una opción de merma');
		}
		if(pi.validated == null || pi.merma == null)
		{
			return this.showError('no puede ser null');
		}

		//A3: evita doble click / doble submit. Cada validacion ingresa al inventario,
		//asi que mientras una esta en proceso no se permite re-disparar la del mismo item
		if( this.validating_item_ids.has( pi.item_id ) )
		{
			return;
		}

		this.subs.sink = this.confirmation.showConfirmAlert(pi,'Validar?' ,'¿Estás seguro de validar la producción?')
		.subscribe((response)=>
		{
			if( !response.accepted )
			{
				return;
			}

			//bloquea el boton de este item mientras se procesa
			this.validating_item_ids.add( pi.item_id );

			//producciones aun no validadas (se marcaran como DELETED al final)
			let production_info_list = pi.production_list.filter(p => !p.production.verified_by_user_id);

			//se arma la nueva produccion consolidada con lo validado y la merma
			let newProduction:Production = GetEmpty.production();
			newProduction.qty = pi.validated;
			newProduction.merma_qty = pi.merma;
			newProduction.item_id = pi.item_id;
			newProduction.produced_by_user_id = pi.production_list[0].production.produced_by_user_id; //usuario de la primera produccion
			newProduction.merma_reason = pi.merma_reason ? pi.merma_reason : null;
			newProduction.qty_reported = pi.validated + pi.merma;
			let production_area = this.production_area_list.find(pa => pa.id == this.search_production.eq.production_area_id);
			newProduction.store_id = production_area?.store_id || pi.production_list[0].production.store_id; //tienda de la primera produccion
			newProduction.verified_by_user_id = this.rest.user?.id as number;
			newProduction.production_area_id = pi.production_list[0].production.production_area_id; //area de la primera produccion

			//A1: primero se CREA la consolidada (que ingresa al inventario).
			//Si esto falla, no se borro nada y se puede reintentar sin perder la produccion.
			this.subs.sink = this.rest_production.create(newProduction)
			.subscribe({
				next: ()=>
				{
					//ya creada la consolidada, ahora si se marcan las anteriores como DELETED
					let production_list = production_info_list.map(p => ({...p.production, qty: p.qty, merma_qty: p.merma_qty, status: 'DELETED'}));

					this.rest_production.batchUpdate(production_list as Partial<Production>[])
					.subscribe({
						//A2: solo cuando TODO termino se limpia la vista y se notifica
						next: ()=>
						{
							this.production_info_list = this.production_info_list.filter(p => p.item_id != pi.item_id);
							this.validating_item_ids.delete( pi.item_id );
							this.showSuccess('Producción validada');
						},
						error: ()=>
						{
							//la consolidada SI se creo, pero no se pudieron eliminar las anteriores
							this.validating_item_ids.delete( pi.item_id );
							this.showError('La validación se registró, pero no se pudieron eliminar las producciones anteriores. Recarga y verifica este producto antes de volver a validar.');
						}
					})
				},
				error: (error)=>
				{
					//no se creo nada: se libera el item para poder reintentar sin perdida
					this.validating_item_ids.delete( pi.item_id );
					this.showError( error );
				}
			})
		})
	}
}
