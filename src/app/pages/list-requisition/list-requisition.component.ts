import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestResponse, SearchObject} from '../../modules/shared/services/Rest';
import { RouterModule } from '@angular/router';
import { forkJoin,mergeMap, of } from 'rxjs';
import { RestSimple } from '../../modules/shared/services/Rest';
import { FormsModule } from '@angular/forms';
import { Store,Check_In, User, Production} from '../../modules/shared/RestModels';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';

interface CRequistionItem
{
	item_id:number,
	item_name:string;
	category_name:string | null;
	min_created: string;
	requisition_ids: string;
	sum_qty:number;
	required_by_store_id:number;
	required_by_store:Store | null;
}

interface CProduction
{
	item_id:number;
	produced:number;
	production_merma_qty:number;
}


interface CRequisitionItem
{
	production: CProduction | null;
	input_production: Production;
	requisition: CRequistionItem;
}

@Component({
	selector: 'app-list-requisition',
	standalone: true,
	imports: [CommonModule,RouterModule,FormsModule],
	templateUrl: './list-requisition.component.html',
	styleUrl: './list-requisition.component.css'
})
export class ListRequisitionComponent extends BaseComponent implements OnInit
{
	store_list:Store[] = [];
	rest_store:RestSimple<Store> = this.rest.initRest('store',['id','name','created','updated']);
	show_add_production: boolean = false;
	selected_crequistion_item: CRequisitionItem | null = null;
	rest_check_in:RestSimple<Check_In> = this.rest.initRestSimple('check_in',['current']);
	rest_users:RestSimple<User> = this.rest.initRestSimple('user',['id']);
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);

	user_list:User[] = [];
	new_production:Production = GetEmpty.production();
	fecha_inicial:string = '';
	fecha_final:string = '';
	requisition_search:SearchObject<CRequisitionItem> = this.getEmptySearch();
	requsition_obj_list: CRequisitionItem[] = [];

	ngOnInit()
	{
		this.route.queryParamMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.path = 'list-requisition';
				this.is_loading = true;
				let fields = ['required_by_store_id', 'end_timestamp', 'start_timestamp']
				this.requisition_search = this.getSearch(param_map, [], fields)
				let start = new Date();
				let end = new Date();

				if( !param_map.has('search_extra.end_timestamp') )
				{
					end.setHours(23,59,59);
					this.requisition_search.search_extra['end_timestamp'] = end;
				}
				this.fecha_final = Utils.getLocalMysqlStringFromDate(this.requisition_search.search_extra['end_timestamp'] as Date);

				if( !param_map.has('search_extra.start_timestamp') )
				{
					start.setHours(0,0,0,0);
					this.requisition_search.search_extra['start_timestamp'] = start;
			
				}
				this.fecha_inicial = Utils.getLocalMysqlStringFromDate(this.requisition_search.search_extra['start_timestamp'] as Date);

				if( !param_map.has('search_extra.required_by_store_id') )
				{
					this.requisition_search.search_extra['required_by_store_id'] = null;
				}

				return forkJoin
				({
					stores: this.rest_store.search({limit:999999}),
					requisition: this.rest.getReport('requisition_items',{required_by_store_id: this.requisition_search.search_extra['required_by_store_id'] , requested_to_store_id: this.rest.user?.store_id ,start_timestamp: this.requisition_search.search_extra['start_timestamp'], end_timestamp: this.requisition_search.search_extra['end_timestamp'], _sort: this.requisition_search.sort_order }),
					users: this.rest_check_in.search({eq:{current:1},limit:999999}).pipe
					(
						mergeMap((response)=>
						{
							if( response.total == 0 )
								return of({total:0, data:[]} as RestResponse<User>);

							let user_ids = response.data.map(ci=>ci.user_id);
							return this.rest_users.search({csv:{ id: user_ids },eq:{store_id:this.rest.user?.store_id},limit:response.total });
						})
					)
				})
			})
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			let todas:boolean = true;

			this.store_list = response.stores.data;

			this.requsition_obj_list = response.requisition.map((cri:CRequisitionItem)=>
			{
				cri.requisition.required_by_store = this.store_list.find(s=>cri.requisition.required_by_store_id) || null;
				cri.input_production = GetEmpty.production();
				return cri;
			});

			this.user_list = response.users.data;

		});
	}

	copyRequisition()
	{

	}

	fechaInicialChange(fecha:string)
	{
		if( fecha )
		{
			this.requisition_search.search_extra['start_timestamp'] = Utils.getUTCMysqlStringFromDate(new Date(fecha));
		}
		else
		{
			this.requisition_search.search_extra['start_timestamp'] = null;
		}
	}

	fechaFinalChange(fecha:string)
	{
		if( fecha )
		{
			this.requisition_search.search_extra['end_timestamp']= Utils.getUTCMysqlStringFromDate(new Date(fecha));
		}
		else
		{
			this.requisition_search.search_extra['end_timestamp'] = null;
		}
	}

	floor(n:number)
	{
		return Math.floor( n );
	}

	showModal(id:string)
	{
		let e = document.getElementById(id) as HTMLDialogElement;

		if( e )
			e.showModal();
	}

	closeModal(id:string)
	{
		let e = document.getElementById(id) as HTMLDialogElement;

		if( e )
			e.close();

		this.is_loading = false;
	}

	addProduction(cri:CRequisitionItem)
	{
		//evt.preventDefault();
		//evt.stopPropagation();
		this.is_loading = true;
		
		this.new_production = GetEmpty.production();

		let user = this.rest.user as User;

		this.new_production.store_id = user.store_id as number;
		this.new_production.item_id = cri.requisition.item_id;
		this.new_production.created_by_user_id = user.id;
		this.new_production.qty = cri.input_production.qty;
		this.new_production.merma_qty = cri.input_production.merma_qty;
		this.new_production.merma_reason = cri.input_production.merma_reason;

		if( this.new_production.qty <= 0 && this.new_production.merma_qty <= 0 )
		{
			this.showError('La cantidad de produccion + cantidad de merma debe ser mayor o igual a 1');
			return;
		}

		if( this.new_production.merma_reason == '' && this.new_production.merma_qty > 0 )
		{
			this.showError('La razon de la merma es requerida');
			return;
		}

		this.subs.sink = this.rest_production.create( this.new_production )
		.subscribe(
		{
			next: (response:Production) =>
			{
				this.new_production = this.new_production = GetEmpty.production();
				this.requsition_obj_list.map((req_obj)=>
				{
					if( req_obj.production?.item_id == response.item_id )
					{
						req_obj.production.produced += response.qty;
						console.log( 'req_obj.production.produced', req_obj.production.produced );
						req_obj.production.production_merma_qty = response.merma_qty;
					}
				});

				cri.input_production.qty = 0;
				cri.input_production.merma_qty = 0;
				cri.input_production.merma_reason = '';

				this.showSuccess('Produccion agregada');
			},
			error: (error:any) =>
			{
				this.showError(error);
			}
		});
	}
}
