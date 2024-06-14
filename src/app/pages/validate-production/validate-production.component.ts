import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { forkJoin, mergeMap, of } from 'rxjs';
import { Category, Item, Production, Store } from '../../modules/shared/RestModels';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { ProductionInfo } from '../../modules/shared/Models';
import { ShortDatePipe } from '../../modules/shared/pipes/short-date.pipe';
import { FormsModule } from '@angular/forms';
import { Utils } from '../../modules/shared/Utils';
import { ModalComponent } from '../../components/modal/modal.component';
import { GetEmpty } from '../../modules/shared/GetEmpty';

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
	standalone: true,
	imports: [CommonModule,ShortDatePipe,FormsModule,ModalComponent],
	templateUrl: './validate-production.component.html',
	styleUrl: './validate-production.component.css'
})

export class ValidateProductionComponent extends BaseComponent
{
	rest_production_info:Rest<Production,ProductionInfo> = this.rest.initRest('production_info');
	rest_production:RestSimple<Production> = this.rest.initRest('production');
	//rest_production_area:RestSimple<ProductionArea> = this.rest.initRest('production_area');
	rest_production_area:RestSimple<Store> = this.rest.initRest('store');
	production_info_list:CProduction[] = [];
	// production_area_list:ProductionArea[] = [];
	production_area_list:Store[] = [];

	search_start_date:string = '';
	search_end_date:string = '';

	search_production:SearchObject<Production> = this.getEmptySearch();

	search_str:string = '';
	search_by_code:boolean = false;
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

				let fields = ['store_id', 'created'];
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

				if(!query_params.has('eq.store_id'))
				{
					this.search_production.eq.store_id = this.rest.user?.store_id as number;
				}

				let search_production_area:SearchObject<Store> = this.getEmptySearch();

				search_production_area.limit = 9999;
				//search_production_area.eq.store_id = this.rest.user?.store_id as number;
				search_production_area.eq.production_enabled = 1;

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
		//si hay mermas, se abre un modal para seleccionar la opcion de merma
		if(pi.merma > 0 && pi.merma_reason == '')
		{
			return this.showError('Selecciona una opción de merma');
		}
		if(pi.validated == null || pi.merma == null)
		{
			return this.showError('no puede ser null');
		}	
		//this is not ok, should be just one call, need to find a better way to manage producion validation
		this.subs.sink = this.confirmation.showConfirmAlert(pi,'Validar?' ,'¿Estás seguro de validar la producción?')
		.subscribe((response)=>
		{
			if(response.accepted)
			{
				//se filtran las producciones que no han sido validadas
				let production_info_list = pi.production_list.filter(p => !p.production.verified_by_user_id)
	
				//ya que en el front se totaliza lo validado y la merma
				//ahora tendremos que "repartir" entre cada una de las producciones la cantidad y merma
				//osea, lo de los campos pl.validated y pl.merma

				//se ira restando conforme a lo producido y merma de cada produccion
				//osea que en teoria, si se reparte bien, al final todas las producciones deberian de tener la misma cantidad y merma
				// y si hubo cambios, o salieron menos, se deberia de notificar al usuario

				//por lo pronto, se hara la eliminacion de las producciones y creacion de una nueva con los datos de pl.validated y pl.merma
				//esto poniendo el status de la produccion a DELETED
				let production_list = production_info_list.map(p => ({...p.production, qty: p.qty, merma_qty: p.merma_qty, status: 'DELETED'}));
				this.rest_production
				.batchUpdate(production_list as Partial<Production>[])
				.subscribe({
					next: (response)=>
					{
						//se crea una sola nueva produccion en base a los datos de pl.validated y pl.merma
						let newProduction:Production = GetEmpty.production();
						newProduction.qty = pi.validated;
						newProduction.merma_qty = pi.merma;
						newProduction.item_id = pi.item_id;
						newProduction.produced_by_user_id = pi.production_list[0].production.produced_by_user_id; //se toma el usuario de la primera produccion
						newProduction.merma_reason = pi.merma_reason ? pi.merma_reason : null;
						newProduction.qty_reported = pi.validated + pi.merma;
						newProduction.store_id = pi.production_list[0].production.store_id; //se toma la tienda de la primera produccion
						newProduction.verified_by_user_id = this.rest.user?.id as number;

						//llamada de rest para crear la nueva produccion
						this.subs.sink = this.rest_production.create(newProduction).subscribe({
							next: (response)=>
							{
								this.showSuccess('Nueva produccion validada creada');
							},
							error: (error)=>
							{
								this.showError( error )
							}
						})

						//se eliminan las producciones de la lista
						this.production_info_list = this.production_info_list.filter(p => p.item_id != pi.item_id);
						this.showSuccess('Producción anteriores eliminadas');
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
