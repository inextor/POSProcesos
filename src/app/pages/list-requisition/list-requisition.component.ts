import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rest, RestResponse, SearchObject} from '../../modules/shared/services/Rest';
import { RouterModule } from '@angular/router';
import { forkJoin,mergeMap, of } from 'rxjs';
import { RestSimple } from '../../modules/shared/services/Rest';
import { FormsModule } from '@angular/forms';
import { Store,Check_In, User, Production, Serial, Item } from '../../modules/shared/RestModels';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Utils } from '../../modules/shared/Utils';
import { SearchItemsComponent } from '../../components/search-items/search-items.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { ItemInfo, SerialInfo, SerialItemInfo } from '../../modules/shared/Models';
import { PageStructureComponent } from "../../modules/shared/page-structure/page-structure.component";

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

@Component
({
	selector: 'app-list-requisition',
	standalone: true,
	templateUrl: './list-requisition.component.html',
	styleUrl: './list-requisition.component.css',
	imports: [CommonModule, RouterModule, FormsModule, SearchItemsComponent, ModalComponent, PageStructureComponent]
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
	search_requisition:SearchObject<CRequisitionItem> = this.getEmptySearch();
	requsition_obj_list: CRequisitionItem[] = [];

	total_pending:number = 0;

	serial_list:SerialItemInfo[] = [];
	tmp_serial_list: SerialItemInfo[] = [];
	show_serial_numbers: boolean = false;

	search_str:string = '';
	search_by_code:boolean = false;

	ngOnInit()
	{
		this.subs.sink = this.route.queryParamMap.pipe
		(
			mergeMap((param_map)=>
			{
				this.path = 'list-requisition';
				this.is_loading = true;
				let fields = ['required_by_store_id', 'end_timestamp', 'start_timestamp']
				this.search_requisition = this.getSearch(param_map, [], fields)
				let start = new Date();
				let end = new Date();

				if( !param_map.has('search_extra.end_timestamp') )
				{
					end.setHours(23,59,59);
					this.search_requisition.search_extra['end_timestamp'] = end;
				}
				this.fecha_final = Utils.getLocalMysqlStringFromDate(this.search_requisition.search_extra['end_timestamp'] as Date);

				if( !param_map.has('search_extra.start_timestamp') )
				{
					start.setHours(0,0,0,0);
					this.search_requisition.search_extra['start_timestamp'] = start;
				}
				this.fecha_inicial = Utils.getLocalMysqlStringFromDate(this.search_requisition.search_extra['start_timestamp'] as Date);

				if( !param_map.has('search_extra.required_by_store_id') )
				{
					this.search_requisition.search_extra['required_by_store_id'] = null;
				}

				//let store_id: number = this.rest.user?.store_id as number;
				let production_area_id: number = this.rest.user?.production_area_id as number;

				return forkJoin
				({
					stores: this.rest_store.search({limit:999999, eq:{status:'ACTIVE', sales_enabled: 1}}),
					requisition: this.rest.getReport('requisitionItems',{required_by_store_id: this.search_requisition.search_extra['required_by_store_id'] , production_area_id ,start_timestamp: this.search_requisition.search_extra['start_timestamp'], end_timestamp: this.search_requisition.search_extra['end_timestamp'], _sort: this.search_requisition.sort_order }),
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
		.subscribe(
		{
			next: (response)=>
			{
				this.is_loading = false;
				this.store_list = response.stores.data;

				this.requsition_obj_list = response.requisition.map((cri:CRequisitionItem)=>
				{
					if( cri.requisition != null)
						cri.requisition.required_by_store = this.store_list.find(s=>cri.requisition?.required_by_store_id) || null;
					cri.input_production = GetEmpty.production();
					return cri;
				});

				//console.log(this.requsition_obj_list);

				//calculando el total de requeridos que proviene de cri.requisition.sum_qty
				this.calculateTotalPending(this.requsition_obj_list);
				//this.sortRequisitions(this.search_str);

				this.user_list = response.users.data;
			},
			error: (error) =>
			{
				this.showError(error);
			}
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
			//ademas, solo se tomara en cuenta como maximo la producion que se requiere
			let required = cri.requisition?.sum_qty || 0;
			let produced = cri.production?.produced || 0;
			total_produced += Math.min(produced, required);
		});

		this.total_pending = Math.floor((total_produced / total_required) * 100);
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
	sortRequisitions(str:string)
	{
		if(str == '')
		{
			this.requsition_obj_list = this.requsition_obj_list.sort((a,b)=> a.item.name.localeCompare(b.item.name));
			return;
		}
		const sort_by = this.search_by_code ? 'code' : 'name';
		const sortFunction = (a:CRequisitionItem,b:CRequisitionItem) =>
		{
			const a_lower = a.item[sort_by]?.toLowerCase() || '';
			const b_lower = b.item[sort_by]?.toLowerCase() || '';
			const a_category_name = `${a.requisition?.category_name?.toLowerCase() + ' ' || '' }` + a_lower;
			const b_category_name = `${b.requisition?.category_name?.toLowerCase() + ' ' || ''}` + b_lower;
			const a_index = a_category_name.indexOf(str.toLowerCase());
			const b_index = b_category_name.indexOf(str.toLowerCase());

			if (a_index === -1 && b_index === -1) {
				return a_category_name.localeCompare(b_category_name);
			}

			return a_index === -1 ? 1 : b_index === -1 ? -1 : a_index - b_index;
		};

		this.requsition_obj_list.sort(sortFunction);
	}

	selectText(evt: MouseEvent)
	{
		let input = evt.target as HTMLInputElement;
		input.select();
	}

	changeSearch()
	{
		this.search_by_code = !this.search_by_code;
		this.sortRequisitions(this.search_str);
	}

	fechaInicialChange(fecha:string)
	{
		if( fecha )
		{
			this.search_requisition.search_extra['start_timestamp'] = Utils.getUTCMysqlStringFromDate(new Date(fecha));
		}
		else
		{
			this.search_requisition.search_extra['start_timestamp'] = null;
		}
	}

	fechaFinalChange(fecha:string)
	{
		if( fecha )
		{
			this.search_requisition.search_extra['end_timestamp']= Utils.getUTCMysqlStringFromDate(new Date(fecha));
		}
		else
		{
			this.search_requisition.search_extra['end_timestamp'] = null;
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
		this.new_production.production_area_id = user.production_area_id as number;

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
				this.selected_crequistion_item = null;
				this.showSuccess('Produccion agregada');
			},
			error: (error:any) =>
			{
				this.showError(error);
			}
		});
	}
}
