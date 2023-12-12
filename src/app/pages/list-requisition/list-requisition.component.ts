import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rest, RestResponse} from '../../modules/shared/Rest';
import { RouterModule } from '@angular/router';
import { forkJoin,mergeMap, of } from 'rxjs';
import { RestSimple } from '../../modules/shared/Rest';
import { FormsModule } from '@angular/forms';
import { RequisitionInfo,RequisitionItemInfo } from '../../modules/shared/Models';
import { Requisition,Store,Category,Item, Check_In, User, Production} from '../../modules/shared/RestModels';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { BaseComponent } from '../../modules/shared/base/base.component';

interface CRequisitionItem
{
	item:Item;
	category:Category | null;
	qty:number;
	store:Store | null
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
	production = GetEmpty.production();
	production_list:Production[] = [];

	ngOnInit()
	{
		this.route.params.pipe
		(
			mergeMap((param_map)=>
			{
				this.is_loading = true;

				return forkJoin
				({
					stores: this.rest_store.search({limit:999999}),
					requisition: this.rest_requistion.search(param_map).pipe
					(
						mergeMap((response)=>
						{

						})
					),
					users: this.rest_check_in.search({eq:{current:1},limit:999999}).pipe
					(
						mergeMap((response)=>
						{
							if( response.total == 0 )
								return of({total:0, data:[]} as RestResponse<User>);

							let user_ids = response.data.map(ci=>ci.user_id);
							return this.rest_users.search({csv:{ id: user_ids },limit:response.total });
						})
					)
				})
			})
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			let todas:boolean = true;

			this.requisition_list = response.requisition.data;
			this.store_list = response.stores.data;
			this.user_list = response.users.data;

			let find= (rii:RequisitionItemInfo, r_info:RequisitionInfo, cri:CRequisitionItem, todas:boolean):boolean =>
			{
				if( cri.item.id != rii.item.id )
					return false

				return todas || cri?.store?.id == r_info.required_by_store.id;
			};

			for(let r_info of this.requisition_list)
			{
				for(let r_item_info of r_info.items)
				{
					let c_req_item =this.c_req_item_list.find( rqi =>
					{
						return find( r_item_info, r_info, rqi, todas)
					});

					if( c_req_item )
					{
						c_req_item.qty += r_item_info.requisition_item.qty;
					}
					else
					{
						let store = todas
							? null
							: this.store_list.find(s=>r_info.required_by_store.id == s.id ) as Store;

						this.c_req_item_list.push
						({
							item: r_item_info.item,
							category: r_item_info.category,
							store,
							qty: r_item_info.requisition_item.qty
						});
					}
				}
			}
		});
	}

	copyRequisition()
	{

	}

	floor(n:number)
	{
		return Math.floor( n );
	}

	showProduction(cri: CRequisitionItem)
	{
		let user = this.rest.user as User;

		this.show_add_production = true;
		this.selected_crequistion_item = cri;
		this.production.store_id = user.store_id as number;
		this.production.item_id = cri.item.id;
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
			this.showSuccess('La cantidad de produccion + cantidad de merma debe ser mayor o igual a 1');
			return;
		}

		let user = this.user_list.find(user=>user.id == this.production.produced_by_user_id ) as User;

		this.subs.sink = this.rest_production.create( this.production )
		.subscribe(()=>
		{
			this.production = this.production = GetEmpty.production();
			this.production.store_id = user.store_id as number; //Los usuario tienen que tener store_id;
			this.show_add_production = false;
			this.selected_crequistion_item = null;
			this.closeModal('modal-add-production');

			console.log( evt );
			let form = evt.target as HTMLFormElement;
			form.reset();
		});
	}
}
