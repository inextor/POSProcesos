import { Component,OnInit, Pipe } from '@angular/core';
import {CommonModule, Location} from '@angular/common';
// import { Process, Production_Area } from '../../modules/shared/RestModels';
import { RestService } from '../../modules/shared/services/rest.service';
import { Rest} from '../../modules/shared/Rest';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GetEmpty } from '../../modules/shared/GetEmpty';
import { forkJoin,mergeMap, of } from 'rxjs';
import { RestSimple } from '../../modules/shared/Rest';
import { FormsModule } from '@angular/forms';
import { RequisitionInfo,RequisitionItemInfo } from '../../modules/shared/Models';
import { Requisition,Store,Category,Item} from '../../modules/shared/RestModels';


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
export class ListRequisitionComponent implements OnInit
{
	requisition_list:RequisitionInfo[] =[];
	store_list:Store[] = [];

	rest_requistion:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');

	rest_store:RestSimple<Store> = this.rest.initRest('store',['id','name','created','updated']);
	c_req_item_list:CRequisitionItem[] = [];
	is_loading:boolean = false;

	constructor(private rest:RestService,private route:ActivatedRoute,private router:Router,private location:Location)
	{

	}

	ngOnInit()
	{
		this.route.params.pipe
		(
			mergeMap((param_map)=>
			{
				this.is_loading = true;
				return forkJoin
				({
					stores:this.rest_store.search({limit:999999}),
					requisition: this.rest_requistion.search(param_map),
				})
			})
		)
		.subscribe((response)=>
		{
			this.is_loading = false;
			let todas:boolean = true;

			this.requisition_list = response.requisition.data;
			this.store_list = response.stores.data;

			let find= (rii:RequisitionItemInfo,r_info:RequisitionInfo,cri:CRequisitionItem, todas:boolean):boolean =>
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

	floor(n:number)
	{
		return Math.floor( n );
	}
}
