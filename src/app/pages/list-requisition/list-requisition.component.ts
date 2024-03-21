import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rest, RestResponse} from '../../modules/shared/services/Rest';
import { RouterModule } from '@angular/router';
import { forkJoin,mergeMap, of } from 'rxjs';
import { RestSimple } from '../../modules/shared/services/Rest';
import { FormsModule } from '@angular/forms';
import { ProductionInfo, RequisitionInfo,RequisitionItemInfo } from '../../modules/shared/Models';
import { Requisition,Store,Category,Item, Check_In, User, Production} from '../../modules/shared/RestModels';
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
	requisition_list:RequisitionInfo[] =[];
	store_list:Store[] = [];
	store_dict:Record<number,Store> = {};
	rest_requistion:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');
	rest_store:RestSimple<Store> = this.rest.initRest('store',['id','name','created','updated']);
	c_req_item_list:CRequisitionItem[] = [];
	show_add_production: boolean = false;
	selected_crequistion_item: CRequisitionItem | null = null;
	rest_check_in:RestSimple<Check_In> = this.rest.initRestSimple('check_in',['current']);
	rest_users:RestSimple<User> = this.rest.initRestSimple('user',['id']);
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);

	user_list:User[] = [];
	production_user_id:number | null = null;
	production:Production = GetEmpty.production();
	search_start_date:string = '';
	search_end_date:string = '';
	search_required_by_store_id:number | null = null;
	production_list:Production[] = [];
	requsition_obj_list: CRequisitionItem[] = [];

	ngOnInit()
	{
		this.route.params.pipe
		(
			mergeMap((param_map)=>
			{
				let start = new Date();
				this.search_end_date = Utils.getLocalMysqlStringFromDate(start);
				start.setHours(0,0,0,0);
				this.search_start_date = Utils.getLocalMysqlStringFromDate(start);
				this.is_loading = true;

				return forkJoin
				({
					stores: this.rest_store.search({limit:999999}),
					requisition: this.rest.getReport('requisition_items',{store_id:this.rest.user?.store_id, start: Utils.getDateFromLocalMysqlString(this.search_start_date), end: Utils.getDateFromLocalMysqlString(this.search_end_date)}),
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

			this.requsition_obj_list = response.requisition as any[];
			//this.requisition_list = response.requisition;
			this.store_list = response.stores.data;
			response.stores.data.forEach((store)=>this.store_dict[store.id]=store);

			this.user_list = response.users.data;

			//let find= (rii:RequisitionItemInfo, r_info:RequisitionInfo, cri:CRequisitionItem, todas:boolean):boolean =>
			//{
			//	if( cri.item.id != rii.item.id )
			//		return false

			//	return todas || cri?.store?.id == r_info.required_by_store.id;
			//};

			//for(let r_info of this.requisition_list)
			//{
			//	for(let r_item_info of r_info.items)
			//	{
			//		let c_req_item =this.c_req_item_list.find( rqi =>
			//		{
			//			return find( r_item_info, r_info, rqi, todas)
			//		});

			//		if( c_req_item )
			//		{
			//			c_req_item.qty += r_item_info.requisition_item.qty;
			//		}
			//		else
			//		{
			//			let store = todas
			//				? null
			//				: this.store_list.find(s=>r_info.required_by_store.id == s.id ) as Store;

			//			this.c_req_item_list.push
			//			({
			//				item: r_item_info.item,
			//				category: r_item_info.category,
			//				store,
			//				qty: r_item_info.requisition_item.qty
			//			});
			//		}
			//	}
			//}
		});
	}

	copyRequisition()
	{

	}

	filterRequisitions()
	{
		let start = Utils.getDateFromLocalMysqlString(this.search_start_date);
		let end = Utils.getDateFromLocalMysqlString(this.search_end_date);
		this.is_loading = true;
		this.rest.getReport('requisition_items',{store_id:this.rest.user?.store_id, start:start, end: end, required_by_store_id: this.search_required_by_store_id})
		.subscribe((response)=>
		{
			this.is_loading = false;

			this.requsition_obj_list = response as any[];

			this.requsition_obj_list = response.map((cri:CRequisitionItem)=>
			{
				cri.requisition.required_by_store = this.store_list.find(s=>cri.requisition.required_by_store_id) || null;
				return cri;
			});
		});
	}

	floor(n:number)
	{
		return Math.floor( n );
	}

	showProduction(cri: CRequisitionItem)
	{
		this.production = GetEmpty.production();

		let user = this.rest.user as User;

		this.show_add_production = true;
		this.selected_crequistion_item = cri;
		this.production.store_id = user.store_id as number;
		this.production.item_id = cri.requisition.item_id;
		this.production.created_by_user_id = user.id;

		this.showModal('modal-add-production');
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

	addProduction(evt: SubmitEvent)
	{
		evt.preventDefault();
		evt.stopPropagation();
		this.is_loading = true;

		if( this.production.qty <= 0 && this.production.merma_qty <= 0 )
		{
			this.showError('La cantidad de produccion + cantidad de merma debe ser mayor o igual a 1');
			return;
		}

		let user = this.user_list.find(user=>user.id == this.production.produced_by_user_id ) as User;
		this.subs.sink = this.rest_production.create( this.production )
		.subscribe(
		{
			next: (response:Production) =>
			{
				this.production = this.production = GetEmpty.production();
				this.production.store_id = this.rest.user?.store_id as number; //Los usuario tienen que tener store_id; Cambiando al usuario de la sesion
				//this.production.produced_by_user_id = this.rest.user?.id as number; //Utilizando el id del usuario de la sesion
				this.show_add_production = false;
				this.selected_crequistion_item = null;
				this.closeModal('modal-add-production');
				console.log( evt );
				let form = evt.target as HTMLFormElement;
				form.reset();
				//we must update the requisition_obj_list
				this.requsition_obj_list.map((req_obj)=>
				{
					if( req_obj.production?.item_id == response.item_id )
					{
						req_obj.production.produced += response.qty;
						console.log( 'req_obj.production.produced', req_obj.production.produced );
						req_obj.production.production_merma_qty = response.merma_qty;
					}
				});

				this.showSuccess('Produccion agregada');
			},
			error: (error:any) =>
			{
				this.showError(error);
			}
		});
	}
}
