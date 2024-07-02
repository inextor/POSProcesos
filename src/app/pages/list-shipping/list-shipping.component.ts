import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseComponent } from '../../modules/shared/base/base.component';
import { Rest, RestSimple, SearchObject } from '../../modules/shared/services/Rest';
import { Production, Requisition, Requisition_Item, Shipping, Shipping_Item, Store } from '../../modules/shared/RestModels';
import { RequisitionInfo, ShippingInfo } from '../../modules/shared/Models';
import { forkJoin, mergeMap, of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { FormsModule, RequiredValidator } from '@angular/forms';
import { Utils } from '../../modules/shared/Utils';


interface CRequisitionByStore
{
	store:Store;
	required:number;
	shipped:number;
	required_shipped:number;
	pending:number;
}

@Component({
	selector: 'app-list-shipping',
	standalone: true,
	imports: [CommonModule,RouterModule,FormsModule, BaseComponent],
	templateUrl: './list-shipping.component.html',
	styleUrl: './list-shipping.component.css'
})

export class ListShippingComponent extends BaseComponent
{
	rest_requsition_info:Rest<Requisition,RequisitionInfo> = this.rest.initRest('requisition_info');
	rest_shipping_info:Rest<Shipping,ShippingInfo> = this.rest.initRest('shipping_info');
	rest_production:RestSimple<Production> = this.rest.initRestSimple('production',['id','created_by_user_id','produced_by_user_id','verified_by_user_id']);
	rest_stores:RestSimple<Store> = this.rest.initRestSimple('store',['id','name']);
	crequisition_by_store_list: CRequisitionByStore[] = [];

	fecha_inicial: string | Date = '';
	fecha_final: string | Date = '';

	requisition_search:SearchObject<Requisition> = this.rest_requsition_info.getEmptySearch();

	total_required:number = 0;
	total_shipped:number = 0;
	total_required_shipped:number = 0;
	total_pending:number = 0;

	ngOnInit()
	{
		this.route.queryParamMap.pipe
		(
			mergeMap((paramMap)=>
			{
				this.path = 'list-shipping';
				this.is_loading = true;

				this.requisition_search.eq.requested_to_store_id = this.rest.user?.store_id;

				if(paramMap.has('ge.date'))
				{
					let start = new Date(paramMap.get('ge.date') as string + 'T00:00:00');
					this.requisition_search.ge.required_by_timestamp = Utils.getUTCMysqlStringFromDate(start);
					this.fecha_inicial = paramMap.get('ge.date') as string;
				}
				else
				{
					let start = new Date();
					start.setHours(0, 0, 0, 0);
					this.fecha_inicial = start.toISOString().split('T')[0];
					this.requisition_search.ge.required_by_timestamp = Utils.getUTCMysqlStringFromDate(start);
				}

				if(paramMap.has('le.date'))
				{
					let end = new Date(paramMap.get('le.date') as string + 'T23:59:59');
					this.requisition_search.le.required_by_timestamp = Utils.getUTCMysqlStringFromDate(end);
					this.fecha_final = paramMap.get('le.date') as string;
				}
				else
				{
					let end = new Date();
					this.fecha_final = end.toISOString().split('T')[0];
					end.setHours(23, 59, 59);
					this.requisition_search.le.required_by_timestamp = Utils.getUTCMysqlStringFromDate(end);
				}

				let search_obj = 
				{
					store_id: this.requisition_search.eq.requested_to_store_id ,
					start_timestamp: this.requisition_search.ge.required_by_timestamp, 
					end_timestamp: this.requisition_search.le.required_by_timestamp
				}

				return forkJoin({
					report: this.rest.getReport('requisition_shipping',search_obj),
				});
			})
		)
		.subscribe((response)=>
		{
			// this.crequisition_by_store_list = response.stores.data.map((store)=>
			// {
			// 	//filter the requisitions that are required by the store
			// 	let requisitions_to_store:RequisitionInfo[] = response.requsitions.data.filter((creq)=>
			// 	{
			// 		return creq.required_by_store.id == store.id;
			// 	});

			// 	//get the total required by the store
			// 	let required = requisitions_to_store.reduce((p,creq)=>
			// 	{
			// 		return p + creq.items.reduce((p,citem)=>
			// 		{
			// 			return p + citem.requisition_item.qty;
			// 		},0);
			// 	},0)
				
			// 	//get the shippings that are going to the store
			// 	let shippings_to_store = response.shippings_info.data.filter((si)=>
			// 	{
			// 		return si.shipping.to_store_id == store.id;
			// 	});

			// 	//if there are no shippings, then return the required amount
			// 	if (shippings_to_store.length == 0)
			// 	{
			// 		return { store, required, shipped: 0, pending: required };
			// 	}

			// 	//get the total shipped to the store
			// 	let shipped = shippings_to_store.reduce((p,si)=>
			// 	{
			// 		return p + si.items.reduce((p,si)=>
			// 		{
			// 			return p + (si.shipping_item?.qty ?? 0);
			// 		},0);
			// 	},0);

			// 	let required_shipped = this.getRequiredShipped(requisitions_to_store,shippings_to_store)

			// 	let pending = required - required_shipped;

			// 	return { store, required, shipped, pending };
			// });

			this.crequisition_by_store_list = response.report as CRequisitionByStore[];
			
			console.log(this.crequisition_by_store_list);
			this.total_required = this.crequisition_by_store_list.reduce((p,c)=>p+c.required,0);
			this.total_shipped = this.crequisition_by_store_list.reduce((p,c)=>p+c.shipped,0);
			this.total_pending = this.crequisition_by_store_list.reduce((p,c)=>p+c.pending,0);
			this.total_required_shipped = this.crequisition_by_store_list.reduce((p,c)=>p+c.required_shipped,0);

		});
	}

	fechaInicialChange(fecha:string)
	{
		this.fecha_inicial = fecha;
		if( fecha )
		{
			this.requisition_search.ge.date = fecha;
		}
		else
		{
			this.requisition_search.ge.date = null;
		}
	}

	fechaFinalChange(fecha:string)
	{
		this.fecha_final = fecha;
		if( fecha )
		{
			this.requisition_search.le.date= fecha;
		}
		else
		{
			this.requisition_search.le.date = null;
		}
	}

	getRequiredShipped(requisitions_to_store:RequisitionInfo[],shippings_to_store:ShippingInfo[])
	{
		let requisition_items:Requisition_Item[] = requisitions_to_store.map((creq)=>
		{
			return creq.items.map((citem)=>
			{
				return citem.requisition_item;
			});
		}).flat();

		//initialize the total required by item
		let total_required_by_item:Record<number,number> = {};

		//calculate the total required by item
		requisition_items.forEach((citem)=>
		{
			if( total_required_by_item[citem.item_id] == undefined )
			{
				total_required_by_item[citem.item_id] = 0;
			}
			total_required_by_item[citem.item_id] += citem.qty;
		});

		console.log('total_required', total_required_by_item);
		
		//the same, but for the shipping items
		let shipping_items:Shipping_Item[] = shippings_to_store.map((si)=>
		{
			return si.items.map((si)=>
			{
				return si.shipping_item;
			});
		}).flat().filter((item): item is Shipping_Item => item !== undefined);
		
		//initializing
		let total_shipped_by_item:Record<number,number> = {};

		//calculate the total shipped by item
		shipping_items.forEach((citem)=>
		{
			//this is terribly wrong, the model is full of "?"
			if( total_shipped_by_item[citem.item_id ?? 0] == undefined )
			{
				total_shipped_by_item[citem.item_id ?? 0] = 0;
			}
			total_shipped_by_item[citem.item_id ?? 0] += citem.qty ?? 0;
		});

		console.log('total_shipped',total_shipped_by_item);

		//finally calculate the required shipped (not exceeding the required amount)
		let required_shipped:number = 0;
		Object.keys(total_required_by_item).forEach((key)=>
		{
			let required = total_required_by_item[parseInt(key)];
			let shipped = total_shipped_by_item[parseInt(key)] ?? 0;
			required_shipped += Math.min(required,shipped);
		});

		return required_shipped;
	}

}
