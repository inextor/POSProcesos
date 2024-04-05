import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rest, RestResponse, SearchObject} from '../../modules/shared/services/Rest';
import { RouterModule } from '@angular/router';
import { forkJoin,mergeMap, of } from 'rxjs';
import { RestSimple } from '../../modules/shared/services/Rest';
import { FormsModule } from '@angular/forms';
import { Store,Check_In, User, Production, ItemInfo, Serial, SerialInfo, SerialItemInfo, Item} from '../../modules/shared/RestModels';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';
import { ModalComponent } from '../../components/modal/modal.component';

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
	item: Item;
	production: CProduction | null;
	input_production: Production;
	requisition: CRequistionItem | null;
}

@Component({
	selector: 'app-list-requisition',
	standalone: true,
	imports: [CommonModule,RouterModule,FormsModule, SearchItemsComponent, ModalComponent],
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
	rest_serial_info:Rest<Serial,SerialInfo> = this.rest.initRest('serial_info');

	user_list:User[] = [];
	new_production:Production = GetEmpty.production();
	fecha_inicial:string = '';
	fecha_final:string = '';
	requisition_search:SearchObject<CRequisitionItem> = this.getEmptySearch();
	requsition_obj_list: CRequisitionItem[] = [];

	total_pending:number = 0;
	
	serial_list:SerialItemInfo[] = [];
	tmp_serial_list: SerialItemInfo[] = [];
	show_serial_numbers: boolean = false;

	search_str:string = '';
	search_by_code:boolean = false;

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
				if( cri.requisition != null)
					cri.requisition.required_by_store = this.store_list.find(s=>cri.requisition?.required_by_store_id) || null;
				cri.input_production = GetEmpty.production();
				return cri;
			});

			//calculando el total de requeridos que proviene de cri.requisition.sum_qty
			this.calculateTotalPending(this.requsition_obj_list);

			this.user_list = response.users.data;

		});
	}

	calculateTotalPending(requsition_obj_list:CRequisitionItem[])
	{
		let total_required = 0;
		requsition_obj_list.map((cri)=>
		{
			total_required += cri.requisition?.sum_qty || 0;
		});

		if( total_required == 0 )
		{
			this.total_pending = 0;
			return;
		}
		
		//solo se tomara en cuenta la produccion de los items que su cantidad requerida sea mayor a 0
		let total_produced = 0;
		requsition_obj_list.map((cri)=>
		{
			if( cri.requisition && cri.requisition?.sum_qty > 0 )
			{
				total_produced += cri.production?.produced || 0;
			}
		});

		this.total_pending = Math.round((total_produced / total_required) * 100);
	}

	onItemSelected(item_info:ItemInfo):void
	{
		if( item_info.item.has_serial_number == 'NO' )
		{
			//se construye el objeto crequisition_item para agregar la produccion
			let cri:CRequisitionItem = {
				item: item_info.item,
				production: null,
				input_production: GetEmpty.production(),
				requisition: null
			};

			this.selected_crequistion_item = cri;
			return;
		}

		let search_obj:SearchObject<Serial> =	this.getEmptySearch();

		search_obj.eq.item_id = item_info.item.id;
		search_obj.eq.store_id = this.rest.user?.store_id as number;
		search_obj.eq.status = 'ACTIVE';
		search_obj.limit = 99999999;

		this.subs.sink = this.rest_serial_info.search( search_obj )
		.subscribe((response)=>
		{
			this.serial_list = response.data.map((si)=>
			{
				return {
					serial_info: si,
					item_info: item_info
				};
			});
			this.tmp_serial_list = this.serial_list;

			this.show_serial_numbers = true;
		});
	}

	closeModal()
	{
		this.show_add_production = false;
		this.selected_crequistion_item = null;
	}
	filterValidations(str:string)
	{
		if(str == '')
		{
			this.requsition_obj_list = this.requsition_obj_list.sort((a,b)=> a.item.name.localeCompare(b.item.name));
			return;
		}
		if ( this.search_by_code )
		{
			this.requsition_obj_list = this.requsition_obj_list.sort((a,b)=>
			{
				//si el item no tiene codigo, se va al final
				if(a.item.code == null)
				{
					return 1;
				}
				if(b.item.code == null)
				{
					return -1;
				}
				let a_code = a.item.code.toLowerCase();
				let b_code = b.item.code.toLowerCase();
				let a_index = a_code.indexOf(str.toLowerCase());
				let b_index = b_code.indexOf(str.toLowerCase());
				if(a_index == -1 && b_index == -1)
				{
					return a_code.localeCompare(b_code);
				}
				if(a_index == -1)
				{
					return 1;
				}
				if(b_index == -1)
				{
					return -1;
				}
				return a_index - b_index;
			});
		}
		else
		{
			this.requsition_obj_list = this.requsition_obj_list.sort((a,b)=>
			{
				let a_name = a.item.name.toLowerCase();
				let b_name = b.item.name.toLowerCase();
				let a_index = a_name.indexOf(str.toLowerCase());
				let b_index = b_name.indexOf(str.toLowerCase());
				if(a_index == -1 && b_index == -1)
				{
					return a_name.localeCompare(b_name);
				}
				if(a_index == -1)
				{
					return 1;
				}
				if(b_index == -1)
				{
					return -1;
				}
				return a_index - b_index;
			})
		}
	}

	changeSearch()
	{
		this.search_by_code = !this.search_by_code;
		this.filterValidations(this.search_str);
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

	addProduction(cri:CRequisitionItem)
	{
		//evt.preventDefault();
		//evt.stopPropagation();
		this.is_loading = true;
		
		this.new_production = GetEmpty.production();

		let user = this.rest.user as User;

		this.new_production.store_id = user.store_id as number;
		this.new_production.item_id = cri.item.id as number;
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

				//si aun no existe el cri en la lista, se añade a this,requsition_obj_list
				if( this.requsition_obj_list.find(cri=>cri.item.id == response.item_id) == null )
				{
					this.requsition_obj_list.push(
					{
						item: cri.item,
						production: {
							item_id: response.item_id,
							produced: response.qty,
							production_merma_qty: response.merma_qty
						},
						input_production: GetEmpty.production(),
						requisition: null
					}
					);
				}
				else
				{
					//si ya existe el cri en la lista, se suma la produccion
					this.requsition_obj_list.map((req_obj)=>
					{
						if( req_obj.item.id == response.item_id )
						{
							if( req_obj.production != null)
							{
								//si ya hay produccion, se suma la produccion
								req_obj.production.produced += response.qty;
								req_obj.production.production_merma_qty = response.merma_qty;
							}
							else
							{
								//si no hay produccion, se añade la produccion en donde este el item
								req_obj.production = {
									item_id: response.item_id,
									produced: response.qty,
									production_merma_qty: response.merma_qty
								};
							}
						}
					});

					cri.input_production.qty = 0;
					cri.input_production.merma_qty = 0;
					cri.input_production.merma_reason = '';
				}
				this.calculateTotalPending(this.requsition_obj_list);
				this.show_add_production = false;
				this.showSuccess('Produccion agregada');
			},
			error: (error:any) =>
			{
				this.showError(error);
			}
		});
	}
}
